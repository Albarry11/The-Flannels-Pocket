const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lrydzxpimekmvrwhnemm.supabase.co';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';
const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'flannels-songs';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-file-path');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!SUPABASE_SECRET_KEY) {
    return res.status(500).json({
      error: 'SUPABASE_SECRET_KEY environment variable is not configured in Vercel.',
    });
  }

  const action = req.query.action || 'list';
  const cleanUrl = SUPABASE_URL.replace(/\/$/, '');
  const headers = {
    apikey: SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
  };

  try {
    if (req.method === 'GET' && action === 'list') {
      const listRes = await fetch(`${cleanUrl}/storage/v1/object/list/${BUCKET_NAME}`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prefix: '',
          limit: 100,
          sortBy: { column: 'name', order: 'asc' },
        }),
      });

      if (!listRes.ok) {
        const errText = await listRes.text();
        return res.status(listRes.status).json({ error: errText });
      }

      const items = await listRes.json();
      return res.status(200).json({ items });
    }

    if (req.method === 'GET' && action === 'get-upload-url') {
      const filePath = req.query.path || req.headers['x-file-path'];
      if (!filePath) {
        return res.status(400).json({ error: 'Parameter path is required' });
      }

      const signRes = await fetch(`${cleanUrl}/storage/v1/object/upload/sign/${BUCKET_NAME}/${encodeURI(String(filePath))}`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ upsert: true }),
      });

      if (!signRes.ok) {
        const errText = await signRes.text();
        return res.status(signRes.status).json({ error: errText });
      }

      const signData = await signRes.json();
      const signedUploadUrl = signData.url ? `${cleanUrl}/storage/v1${signData.url}` : null;
      const publicUrl = `${cleanUrl}/storage/v1/object/public/${BUCKET_NAME}/${encodeURI(String(filePath))}`;

      return res.status(200).json({
        success: true,
        signedUploadUrl,
        publicUrl,
        token: signData.token || null,
      });
    }

    if (req.method === 'POST' && action === 'upload') {
      const filePath = req.headers['x-file-path'] || req.query.path;
      if (!filePath) {
        return res.status(400).json({ error: 'Header x-file-path is required' });
      }

      const contentType = req.headers['content-type'] || 'application/octet-stream';
      let uploadBody: any = req.body;
      if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        uploadBody = JSON.stringify(req.body);
      }

      const uploadRes = await fetch(`${cleanUrl}/storage/v1/object/${BUCKET_NAME}/${filePath}`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: uploadBody,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        return res.status(uploadRes.status).json({ error: errText });
      }

      const result = await uploadRes.json();
      const publicUrl = `${cleanUrl}/storage/v1/object/public/${BUCKET_NAME}/${filePath}`;
      return res.status(200).json({ success: true, result, publicUrl });
    }

    if (action === 'delete' || action === 'delete-song') {
      const songId = req.query.songId || req.body?.songId;
      const directPaths = req.body?.paths || (req.query.path ? [req.query.path] : []);

      let filesToDelete: string[] = [...directPaths];

      // If songId is provided, list all files in that song folder
      if (songId) {
        try {
          const listRes = await fetch(`${cleanUrl}/storage/v1/object/list/${BUCKET_NAME}`, {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prefix: String(songId),
              limit: 100,
            }),
          });
          if (listRes.ok) {
            const listData = await listRes.json();
            if (Array.isArray(listData)) {
              for (const item of listData) {
                if (item.name) {
                  filesToDelete.push(`${songId}/${item.name}`);
                }
              }
            }
          }
        } catch (listErr) {
          console.warn('Failed to list files for deletion:', listErr);
        }
      }

      // Delete files from Supabase Storage
      let deleteResult = null;
      if (filesToDelete.length > 0) {
        const uniquePaths = Array.from(new Set(filesToDelete));
        const delRes = await fetch(`${cleanUrl}/storage/v1/object/${BUCKET_NAME}`, {
          method: 'DELETE',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefixes: uniquePaths }),
        });
        if (delRes.ok) {
          deleteResult = await delRes.json();
        }
      }

      // If songId is provided, also update songs-index.json
      let remainingSongsCount = 0;
      if (songId) {
        try {
          const indexRes = await fetch(`${cleanUrl}/storage/v1/object/public/${BUCKET_NAME}/songs-index.json?t=${Date.now()}`);
          if (indexRes.ok) {
            const indexJson = await indexRes.json();
            if (Array.isArray(indexJson)) {
              const updatedSongs = indexJson.filter((s: any) => s.id !== songId);
              remainingSongsCount = updatedSongs.length;

              // Upload updated songs-index.json
              await fetch(`${cleanUrl}/storage/v1/object/${BUCKET_NAME}/songs-index.json`, {
                method: 'POST',
                headers: {
                  ...headers,
                  'Content-Type': 'application/json',
                  'x-upsert': 'true',
                },
                body: JSON.stringify(updatedSongs, null, 2),
              });
            }
          }
        } catch (idxErr) {
          console.warn('Failed to update songs-index.json on deletion:', idxErr);
        }
      }

      return res.status(200).json({
        success: true,
        deletedFilesCount: filesToDelete.length,
        deleteResult,
        remainingSongsCount,
        message: songId ? `Lagu ${songId} dan berkas audio berhasil dihapus dari cloud.` : 'Berkas berhasil dihapus.',
      });
    }

    return res.status(404).json({ error: 'Unknown action' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
