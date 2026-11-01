// Depois do build: cria /index.html e /pro/index.html já com o conteúdo,
// e /app.html (casca vazia) para as páginas de jogador e partida.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const dist = path.resolve('dist');
const {render} = await import(pathToFileURL(path.resolve('dist-ssr/prerender.js')).href);
const {PAGES, SITE_URL} = await import(pathToFileURL(path.resolve('dist-ssr/seo.js')).href).catch(() => ({}));
const shell = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
fs.writeFileSync(path.join(dist, 'app.html'), shell);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
for (const meta of Object.values(PAGES)) {
  let html = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(meta.description)}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${esc(meta.title)}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${esc(meta.description)}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${SITE_URL}${meta.path}"`)
    .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${SITE_URL}${meta.path}"`)
    .replace('<div id="root"></div>', `<div id="root">${render(meta.path)}</div>`);
  const out = meta.path === '/' ? path.join(dist, 'index.html') : path.join(dist, meta.path.slice(1), 'index.html');
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, html);
  console.log('prerender', meta.path, html.length);
}
fs.rmSync(path.resolve('dist-ssr'), {recursive: true, force: true});
