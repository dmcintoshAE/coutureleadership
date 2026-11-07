const path = require('node:path');
const envPath = path.resolve(__dirname, '../.env');
try { process.loadEnvFile(envPath); } catch (e) {
  try { process.loadEnvFile('.env'); } catch (err) {}
}

const http = require('node:http');
const fs = require('node:fs');
const { createCoachHandler } = require('./coach');
const root = path.join(__dirname, 'public');

function createServer(options) {
  const coach = createCoachHandler({ env: process.env, ...options });
  return http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/api/coach') return void coach(req, res);
    const workspaceRoute = /^\/app(?:\/(?:diagnostic|report|simulator|career|analytics))?\/?$/.test(pathname);
    const file = path.join(root, pathname === '/' ? 'index.html' : workspaceRoute ? 'workspace.html' : pathname);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); return res.end('Not found'); }
      res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'})[path.extname(file)] || 'application/octet-stream');
      res.end(data);
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3002);
  const host = process.env.HOST || '127.0.0.1';
  createServer().listen(port, host, () => {
    console.log(`Server listening on http://${host}:${port}`);
    console.log(`AI Coach Status: ${process.env.OPENAI_API_KEY ? 'CONFIGURED (' + process.env.OPENAI_MODEL + ')' : 'MISSING KEYS'}`);
  });
}

module.exports = { createServer };
