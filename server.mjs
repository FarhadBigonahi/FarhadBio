// Minimal static server for the Portrixe clone.
// - Correct MIME types for ES modules (.mjs) and fonts (.woff2)
// - HTTP Range support (required by Framer's .framercms chunked data loader)
import { createServer } from 'node:http';
import { stat, open } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const ROOT = process.cwd();
const PORT = process.env.PORT || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.framercms': 'application/octet-stream',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (pathname === '/' || pathname.endsWith('/')) pathname += 'index.html';
    // Framer's CMS loader resolves data files under /modules/{id}/... but they
    // are stored (and were served by the CDN) under /cms/{id}/... — alias them.
    if (pathname.startsWith('/modules/')) pathname = '/cms/' + pathname.slice('/modules/'.length);
    // prevent path traversal
    const filePath = normalize(join(ROOT, pathname));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }

    let st;
    try { st = await stat(filePath); } catch { res.writeHead(404).end('Not found: ' + pathname); return; }
    // Serve <dir>/index.html for directory requests (clean URLs like /blog/ and /blog/whisp/).
    if (st.isDirectory()) {
      const idx = join(filePath, 'index.html');
      try { st = await stat(idx); filePath = idx; } catch { res.writeHead(404).end('Not found'); return; }
    }

    const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
    const total = st.size;
    const range = req.headers.range;

    const headers = {
      'Content-Type': type,
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store, must-revalidate',
    };

    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let start = m && m[1] ? parseInt(m[1], 10) : 0;
      let end = m && m[2] ? parseInt(m[2], 10) : total - 1;
      if (isNaN(start)) start = 0;
      if (isNaN(end) || end >= total) end = total - 1;
      if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${total}` }).end(); return; }
      const fh = await open(filePath);
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': end - start + 1 });
      fh.createReadStream({ start, end }).pipe(res).on('close', () => fh.close());
    } else {
      const fh = await open(filePath);
      res.writeHead(200, { ...headers, 'Content-Length': total });
      fh.createReadStream().pipe(res).on('close', () => fh.close());
    }
  } catch (e) {
    res.writeHead(500).end('Server error');
  }
}).listen(PORT, () => console.log(`Portrixe clone serving at http://localhost:${PORT}`));
