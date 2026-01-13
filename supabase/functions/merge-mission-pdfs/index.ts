import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument } from "npm:pdf-lib@1.17.1";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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

async function downloadFromUrl(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file from URL: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

async function imageToPdf(imageBytes: Uint8Array, mimeType: string): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.create();
  
  let image;
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    image = await pdfDoc.embedJpg(imageBytes);
  } else if (mimeType === 'image/png') {
    image = await pdfDoc.embedPng(imageBytes);
  } else {
    // For webp and other formats, try to embed as PNG (might not work for all)
    try {
      image = await pdfDoc.embedPng(imageBytes);
    } catch {
      throw new Error(`Unsupported image format: ${mimeType}`);
    }
  }
  
  // Create a page with the image dimensions (max A4 size)
  const maxWidth = 595; // A4 width in points
  const maxHeight = 842; // A4 height in points
  
  let width = image.width;
  let height = image.height;
  
  // Scale down if necessary
  if (width > maxWidth) {
    const scale = maxWidth / width;
    width = maxWidth;
    height = height * scale;
  }
  if (height > maxHeight) {
    const scale = maxHeight / height;
    height = maxHeight;
    width = width * scale;
  }
  
  const page = pdfDoc.addPage([width, height]);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width,
    height,
  });
  
  return pdfDoc;
}

function getMimeTypeFromUrl(url: string): string {
  const lowered = url.toLowerCase();
  if (lowered.includes('.jpg') || lowered.includes('.jpeg')) return 'image/jpeg';
  if (lowered.includes('.png')) return 'image/png';
  if (lowered.includes('.webp')) return 'image/webp';
  if (lowered.includes('.pdf')) return 'application/pdf';
  // Default to PDF
  return 'application/pdf';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { folderName, mainDocumentId, justificatifsIds, uploadedJustificatifsUrls } = await req.json();
    
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

    // Download and add all Drive justificatifs
    if (justificatifsIds && justificatifsIds.length > 0) {
      for (const justificatifId of justificatifsIds) {
        console.log(`Downloading Drive justificatif: ${justificatifId}`);
        try {
          const pdfBytes = await downloadAsPdfFromDrive(accessToken, justificatifId);
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          pages.forEach(page => mergedPdf.addPage(page));
        } catch (err) {
          console.error(`Error processing Drive justificatif ${justificatifId}:`, err);
          // Continue with other files even if one fails
        }
      }
    }

    // Download and add all uploaded justificatifs
    if (uploadedJustificatifsUrls && uploadedJustificatifsUrls.length > 0) {
      for (const url of uploadedJustificatifsUrls) {
        console.log(`Downloading uploaded justificatif from URL`);
        try {
          const fileBytes = await downloadFromUrl(url);
          const mimeType = getMimeTypeFromUrl(url);
          
          let pdfDoc: PDFDocument;
          if (mimeType.startsWith('image/')) {
            // Convert image to PDF
            pdfDoc = await imageToPdf(fileBytes, mimeType);
          } else {
            // Load as PDF
            pdfDoc = await PDFDocument.load(fileBytes);
          }
          
          const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          pages.forEach(page => mergedPdf.addPage(page));
        } catch (err) {
          console.error(`Error processing uploaded justificatif:`, err);
          // Continue with other files even if one fails
        }
      }
    }
    
    // Serialize the merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    
    // Convert to base64 using Deno's built-in encoder (handles large files)
    const base64Pdf = base64Encode(mergedPdfBytes);
    
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
