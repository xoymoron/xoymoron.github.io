import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = process.argv.includes('--dist') ? resolve(projectDir, 'dist') : projectDir;
const port = Number(process.env.PORT || 4173);
const publicFiles = new Set(['index.html', 'styles.css', 'app.js', 'glitch.js', 'studio.js', 'content.js', '.nojekyll', 'studio/index.html']);
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  try {
    let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/') pathname = '/index.html';
    const targetPath = resolve(publicDir, '.' + pathname);
    const relativePath = relative(publicDir, targetPath);

    // Requests must stay inside the selected public directory.
    const outsideRoot = relativePath.startsWith('..' + sep)
      || relativePath === '..'
      || isAbsolute(relativePath);
    if (outsideRoot) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    // Serve only site files and assets, excluding Git and other hidden files.
    const publicPath = relativePath.split(sep).join('/');
    const isPublic = publicFiles.has(publicPath) || publicPath.startsWith('assets/');
    const hasPrivateSegment = publicPath.split('/').some((part) => (
      part.startsWith('.') && part !== '.nojekyll'
    ));
    if (!isPublic || hasPrivateSegment) {
      response.writeHead(404).end('Not found');
      return;
    }

    const info = await stat(targetPath);
    if (!info.isFile()) throw new Error('Not a file');
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(targetPath)] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : await readFile(targetPath));
  } catch {
    if (!response.headersSent) response.writeHead(404);
    response.end('Not found');
  }
});

server.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});

// Bind locally; this server is for previewing, not public hosting.
server.listen(port, '127.0.0.1', () => {
  console.log('Local: http://127.0.0.1:' + port);
});
