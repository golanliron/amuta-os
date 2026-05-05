import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Extract folder ID from various Google Drive URL formats
function extractFolderId(url: string): string | null {
  // https://drive.google.com/drive/folders/FOLDER_ID
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  // https://drive.google.com/open?id=FOLDER_ID
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { org_id, drive_url } = await request.json();

    if (!org_id || !drive_url) {
      return Response.json({ error: 'Missing org_id or drive_url' }, { status: 400 });
    }

    const folderId = extractFolderId(drive_url);
    if (!folderId) {
      return Response.json({
        error: 'לא הצלחתי לזהות תיקיית Drive. ודאו שהקישור תקין.',
      }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Save Drive connection in org settings
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', org_id)
      .single();

    const settings = (org?.settings as Record<string, unknown>) || {};
    settings.drive_folder_id = folderId;
    settings.drive_url = drive_url;
    settings.drive_connected_at = new Date().toISOString();

    await supabase
      .from('organizations')
      .update({ settings })
      .eq('id', org_id);

    // Try to list files from the public folder (no OAuth needed for shared folders)
    // This uses the Google Drive API with an API key for publicly shared folders
    const apiKey = process.env.GOOGLE_API_KEY;
    let filesImported = 0;

    if (apiKey) {
      try {
        const listUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${apiKey}&fields=files(id,name,mimeType,webContentLink)&pageSize=20`;
        const res = await fetch(listUrl);

        if (res.ok) {
          const data = await res.json();
          const files = data.files || [];

          for (const file of files) {
            // Save each file as a document reference
            await supabase.from('documents').insert({
              org_id,
              filename: file.name,
              file_type: file.mimeType?.includes('pdf') ? 'pdf' :
                         file.mimeType?.includes('document') ? 'docx' :
                         file.mimeType?.includes('spreadsheet') ? 'xlsx' : 'other',
              storage_path: `drive://${file.id}`,
              category: 'other',
              parsed_text: `[קובץ מ-Drive: ${file.name}]`,
              metadata: { drive_file_id: file.id, drive_url, mime_type: file.mimeType },
              status: 'processing',
            });
            filesImported++;
          }
        }
      } catch (e) {
        console.error('Drive API error:', e);
      }
    }

    return Response.json({
      connected: true,
      folder_id: folderId,
      files_found: filesImported,
      message: filesImported > 0
        ? `נמצאו ${filesImported} קבצים ב-Drive. פישגולד מעבד אותם.`
        : 'התיקייה חוברה. ודאו שהתיקייה משותפת (Share > Anyone with the link).',
    });
  } catch (error) {
    console.error('Drive connect error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
