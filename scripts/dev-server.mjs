import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PIXEL_BLOCK_JAM_PORT || 4173);
const mime = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.m4a', 'audio/mp4'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.mp4', 'video/mp4'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }

  if (pathname === '/') pathname = '/index.html';
  const file = resolve(root, `.${pathname}`);
  if (!file.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const details = await stat(file);
    if (!details.isFile()) throw new Error('Not a file');
    const body = await readFile(file);
    const contentType = mime.get(extname(file)) || 'application/octet-stream';
    const commonHeaders = {
      'Accept-Ranges': 'bytes',
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    };
    const range = request.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) {
        response.writeHead(416, { ...commonHeaders, 'Content-Range': `bytes */${body.length}` }).end();
        return;
      }
      const suffixLength = match[1] ? null : Number(match[2]);
      const start = suffixLength === null ? Number(match[1]) : Math.max(0, body.length - suffixLength);
      const requestedEnd = suffixLength === null && match[2] ? Number(match[2]) : body.length - 1;
      const end = Math.min(requestedEnd, body.length - 1);
      if (start >= body.length || start > end) {
        response.writeHead(416, { ...commonHeaders, 'Content-Range': `bytes */${body.length}` }).end();
        return;
      }
      const slice = body.subarray(start, end + 1);
      response.writeHead(206, {
        ...commonHeaders,
        'Content-Length': slice.length,
        'Content-Range': `bytes ${start}-${end}/${body.length}`,
      });
      response.end(request.method === 'HEAD' ? undefined : slice);
      return;
    }
    response.writeHead(200, { ...commonHeaders, 'Content-Length': body.length });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`像素方块本地网页已启动： http://127.0.0.1:${port}\n`);
});
