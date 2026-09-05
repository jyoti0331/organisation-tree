import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(process.argv[2] ?? 'dist/demo');
const types = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
};
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const target = resolve(
      root,
      '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname),
    );
    if (!target.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    const data = await readFile(target);
    res
      .writeHead(200, { 'Content-Type': types[extname(target)] ?? 'application/octet-stream' })
      .end(data);
  } catch {
    res.writeHead(404).end();
  }
}).listen(Number(process.argv[3] ?? 4200), '127.0.0.1', () => console.log(`Serving ${root}`));
