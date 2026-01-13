import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

async function downloadAsPdfFromDrive(accessToken: string, fileId: string): Promise<Uint8Array> {
  // Fetch metadata to decide between direct download (PDF) or export (Google Docs)
  const metaUrl = new URL(`https://www.googleapis.com/drive/v3/files/${fileId}`);
  metaUrl.searchParams.set('fields', 'id,mimeType,name');
  metaUrl.searchParams.set('supportsAllDrives', 'true');

  const metaRes = await fetch(metaUrl.toString(), {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) {
    throw new Error(`Failed to read metadata for file ${fileId}: ${metaRes.status} ${metaRes.statusText}`);
  }

  const meta = await metaRes.json();
  const mimeType = meta?.mimeType as string | undefined;

  // If it's a Google Doc, export to PDF
  let url: string;
  if (mimeType === 'application/vnd.google-apps.document') {
    const exportUrl = new URL(`https://www.googleapis.com/drive/v3/files/${fileId}/export`);
    exportUrl.searchParams.set('mimeType', 'application/pdf');
    exportUrl.searchParams.set('supportsAllDrives', 'true');
    url = exportUrl.toString();
  } else {
    // Default: download as-is (works for PDFs)
    const mediaUrl = new URL(`https://www.googleapis.com/drive/v3/files/${fileId}`);
    mediaUrl.searchParams.set('alt', 'media');
    mediaUrl.searchParams.set('supportsAllDrives', 'true');
    url = mediaUrl.toString();
  }

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to download/export file ${fileId}: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { folderName, mainDocumentId, justificatifsIds } = await req.json();
    
    if (!mainDocumentId) {
      throw new Error('mainDocumentId is required');
    }
    
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON secret not configured');
    }
    
    const accessToken = await getAccessToken(serviceAccountJson);
    
    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();
    
    // Download and add the main document first
    console.log(`Downloading main document: ${mainDocumentId}`);
    const mainPdfBytes = await downloadAsPdfFromDrive(accessToken, mainDocumentId);
    const mainPdfDoc = await PDFDocument.load(mainPdfBytes);
    const mainPages = await mergedPdf.copyPages(mainPdfDoc, mainPdfDoc.getPageIndices());
    mainPages.forEach(page => mergedPdf.addPage(page));

    // Download and add all justificatifs
    if (justificatifsIds && justificatifsIds.length > 0) {
      for (const justificatifId of justificatifsIds) {
        console.log(`Downloading justificatif: ${justificatifId}`);
        try {
          const pdfBytes = await downloadAsPdfFromDrive(accessToken, justificatifId);
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          pages.forEach(page => mergedPdf.addPage(page));
        } catch (err) {
          console.error(`Error processing justificatif ${justificatifId}:`, err);
          // Continue with other files even if one fails
        }
      }
    }
    
    // Serialize the merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    
    // Convert to base64
    const base64Pdf = btoa(String.fromCharCode(...mergedPdfBytes));
    
    // Generate filename
    const sanitizedFolderName = (folderName || 'mission').replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${sanitizedFolderName}_complet.pdf`;
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfBase64: base64Pdf,
        filename,
        pageCount: mergedPdf.getPageCount()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
    
  } catch (error) {
    console.error('Error merging PDFs:', error);
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
