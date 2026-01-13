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
  personName?: string;
}

interface MissionFolder {
  id: string;
  name: string;
  files: MissionFile[];
  createdTime: string;
  modifiedTime: string;
}

// Extract document content as plain text (for Google Docs)
async function getDocumentContent(accessToken: string, fileId: string): Promise<string> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!response.ok) {
    console.warn(`Failed to export document ${fileId}: ${response.status}`);
    return '';
  }
  
  return await response.text();
}

// Extract person name from document content
function extractPersonName(content: string): string {
  // Look for "Nom – Prénom :" pattern (with various dash types)
  const patterns = [
    /Nom\s*[–\-—]\s*Prénom\s*:\s*(.+?)(?:\n|\r|$)/i,
    /Nom\s*[–\-—]\s*Prenom\s*:\s*(.+?)(?:\n|\r|$)/i,
    /Nom\s+Prénom\s*:\s*(.+?)(?:\n|\r|$)/i,
    /Demandeur\s*:\s*(.+?)(?:\n|\r|$)/i,
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Clean up: remove trailing spaces, tabs, or common suffixes
      const cleanName = name.split(/\t/)[0].trim();
      if (cleanName.length > 0 && cleanName.length < 100) {
        // Convert to uppercase
        return cleanName.toUpperCase();
      }
    }
  }
  
  return 'NON IDENTIFIÉ';
}

// Group files by person name
function groupFilesByPerson(files: MissionFile[]): MissionFolder[] {
  const personMap = new Map<string, MissionFile[]>();
  
  for (const file of files) {
    const personName = file.personName || 'Non identifié';
    if (!personMap.has(personName)) {
      personMap.set(personName, []);
    }
    personMap.get(personName)!.push(file);
  }
  
  // Convert to folders, sorted alphabetically by person name
  const folders: MissionFolder[] = [];
  const sortedNames = Array.from(personMap.keys()).sort((a, b) => {
    // "NON IDENTIFIÉ" goes last
    if (a === 'NON IDENTIFIÉ') return 1;
    if (b === 'NON IDENTIFIÉ') return -1;
    return a.localeCompare(b, 'fr');
  });
  
  for (const personName of sortedNames) {
    const personFiles = personMap.get(personName)!;
    // Find the most recent modification date among files
    const latestModified = personFiles.reduce((latest, file) => {
      return file.modifiedTime > latest ? file.modifiedTime : latest;
    }, personFiles[0]?.modifiedTime || '');
    
    folders.push({
      id: `person-${personName.toLowerCase().replace(/\s+/g, '-')}`,
      name: personName,
      files: personFiles,
      createdTime: personFiles[0]?.createdTime || '',
      modifiedTime: latestModified
    });
  }
  
  return folders;
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
  // Accept PDFs + Google Docs (will be exported to PDF during merge)
  return files.filter((f) =>
    f.mimeType === 'application/pdf' || f.mimeType === 'application/vnd.google-apps.document'
  );
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
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const debug = Boolean(body?.debug);

    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    const missionsFolderId = Deno.env.get('GOOGLE_DRIVE_MISSIONS_FOLDER_ID');

    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON secret not configured');
    }

    if (!missionsFolderId) {
      throw new Error('GOOGLE_DRIVE_MISSIONS_FOLDER_ID secret not configured');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const accessToken = await getAccessToken(serviceAccountJson);

    // Optional diagnostics: helps confirm the folder is accessible and reveals the service account email
    // (only when debug=true is sent).
    let diagnostics: any = null;
    if (debug) {
      diagnostics = {
        serviceAccountEmail: serviceAccount?.client_email || null,
        missionsFolderId,
        folderCheck: null as any,
        childrenPreview: null as any,
      };

      try {
        const metaUrl = new URL(`https://www.googleapis.com/drive/v3/files/${missionsFolderId}`);
        metaUrl.searchParams.set('fields', 'id,name,mimeType,driveId,createdTime,modifiedTime,capabilities(canListChildren)');
        metaUrl.searchParams.set('supportsAllDrives', 'true');

        const metaRes = await fetch(metaUrl.toString(), {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        const metaJson = await fetchJsonOrThrow(metaRes, `Drive get folder metadata (id=${missionsFolderId})`);
        diagnostics.folderCheck = { ok: true, metadata: metaJson };

        // Peek at children regardless of mimeType to confirm what's inside (PDF, Google Docs, etc.)
        const allChildren = await listFilesInFolder(accessToken, missionsFolderId);
        diagnostics.childrenPreview = {
          totalChildren: allChildren.length,
          first20: allChildren.slice(0, 20).map((f) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            size: f.size,
            webViewLink: f.webViewLink,
          })),
        };
      } catch (e) {
        diagnostics.folderCheck = { ok: false, error: String(e?.message || e) };
      }
    }

    // Get all Google Docs from the root folder
    const allFiles = await listPdfFilesInFolder(accessToken, missionsFolderId);
    
    // Extract person name from each Google Doc
    console.log(`Processing ${allFiles.length} files to extract person names...`);
    
    for (const file of allFiles) {
      if (file.mimeType === 'application/vnd.google-apps.document') {
        try {
          const content = await getDocumentContent(accessToken, file.id);
          file.personName = extractPersonName(content);
          console.log(`File "${file.name}" -> Person: "${file.personName}"`);
        } catch (e) {
          console.warn(`Could not extract name from ${file.name}:`, e);
          file.personName = 'Non identifié';
        }
      } else {
        // For PDFs, we can't extract content easily, group as "Non identifié"
        file.personName = 'Non identifié';
      }
    }
    
    // Group files by person name
    const folders = groupFilesByPerson(allFiles);
    
    console.log(`Grouped into ${folders.length} person folders`);

    return new Response(
      JSON.stringify({
        success: true,
        folders,
        totalFolders: folders.length,
        totalFiles: allFiles.length,
        ...(debug ? { diagnostics } : {})
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

