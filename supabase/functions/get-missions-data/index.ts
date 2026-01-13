import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MissionFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink: string;
  createdTime: string;
  modifiedTime: string;
}

interface MissionFolder {
  id: string;
  name: string;
  files: MissionFile[];
  createdTime: string;
  modifiedTime: string;
}

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const serviceAccount = JSON.parse(serviceAccountJson);

  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${headerB64}.${payloadB64}`;

  // Import the private key
  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signatureInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signatureInput}.${signatureB64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

async function fetchJsonOrThrow(response: Response, context: string) {
  const text = await response.text();
  let json: any = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }

  if (!response.ok) {
    throw new Error(`${context} failed: ${response.status} ${response.statusText} - ${text}`);
  }

  return json;
}

async function listFilesInFolder(accessToken: string, folderId: string): Promise<MissionFile[]> {
  const files: MissionFile[] = [];
  let pageToken = '';

  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', `'${folderId}' in parents and trashed = false`);
    url.searchParams.set('fields', 'nextPageToken, files(id, name, mimeType, size, webViewLink, createdTime, modifiedTime)');
    url.searchParams.set('pageSize', '100');
    // Important for Shared Drives / shared folders
    url.searchParams.set('supportsAllDrives', 'true');
    url.searchParams.set('includeItemsFromAllDrives', 'true');

    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const data = await fetchJsonOrThrow(response, `Drive list files (parent=${folderId})`);

    if (data?.files) {
      for (const file of data.files) {
        files.push({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: parseInt(file.size || '0'),
          webViewLink: file.webViewLink || '',
          createdTime: file.createdTime,
          modifiedTime: file.modifiedTime
        });
      }
    }

    pageToken = data?.nextPageToken || '';
  } while (pageToken);

  return files;
}

async function listPdfFilesInFolder(accessToken: string, folderId: string): Promise<MissionFile[]> {
  const files = await listFilesInFolder(accessToken, folderId);
  return files.filter((f) => f.mimeType === 'application/pdf');
}

async function listFolders(accessToken: string, parentFolderId: string): Promise<MissionFolder[]> {
  const folders: MissionFolder[] = [];
  let pageToken = '';

  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    url.searchParams.set('fields', 'nextPageToken, files(id, name, createdTime, modifiedTime)');
    url.searchParams.set('orderBy', 'name desc');
    url.searchParams.set('pageSize', '100');
    // Important for Shared Drives / shared folders
    url.searchParams.set('supportsAllDrives', 'true');
    url.searchParams.set('includeItemsFromAllDrives', 'true');

    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const data = await fetchJsonOrThrow(response, `Drive list folders (parent=${parentFolderId})`);

    if (data?.files) {
      for (const folder of data.files) {
        // Get PDF files in this folder
        const files = await listPdfFilesInFolder(accessToken, folder.id);

        folders.push({
          id: folder.id,
          name: folder.name,
          files,
          createdTime: folder.createdTime,
          modifiedTime: folder.modifiedTime
        });
      }
    }

    pageToken = data?.nextPageToken || '';
  } while (pageToken);

  return folders;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    const missionsFolderId = Deno.env.get('GOOGLE_DRIVE_MISSIONS_FOLDER_ID');

    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON secret not configured');
    }

    if (!missionsFolderId) {
      throw new Error('GOOGLE_DRIVE_MISSIONS_FOLDER_ID secret not configured');
    }

    const accessToken = await getAccessToken(serviceAccountJson);

    // 1) Subfolders = missions
    const folders = await listFolders(accessToken, missionsFolderId);

    // 2) Also include PDFs directly inside the parent folder (common setup)
    const rootPdfFiles = await listPdfFilesInFolder(accessToken, missionsFolderId);
    if (rootPdfFiles.length > 0) {
      folders.unshift({
        id: missionsFolderId,
        name: 'Documents (racine)',
        files: rootPdfFiles,
        createdTime: '',
        modifiedTime: ''
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        folders,
        totalFolders: folders.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error fetching missions data:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

