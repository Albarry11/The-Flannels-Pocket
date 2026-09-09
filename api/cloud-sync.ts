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

    return res.status(404).json({ error: 'Unknown action' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
