import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import http from 'node:http';

const widgetJs = readFileSync('./dist-widget/zebra-widget.js','utf8');
const API_BASE = 'http://127.0.0.1:0/api'; // replaced below

// --- tiny static + stub-API server on one origin ---
const server = http.createServer((req, res) => {
  const url = req.url || '/';
  if (url === '/' ) {
    res.writeHead(200, {'content-type':'text/html; charset=utf-8'});
    res.end(`<!doctype html><html lang="ja"><head><meta charset="utf-8">
<style>body{font-family:Georgia,serif;margin:0}#host-h2{color:#222}</style></head>
<body><h2 id="host-h2">ホスト見出し</h2>
<div id="zebra-reservation" data-studio-id="studio_001"
     data-api-base-url="" data-signup-url="http://app.example/signup"></div>
<script src="/widget.js" defer></script></body></html>`);
    return;
  }
  if (url === '/widget.js') {
    res.writeHead(200, {'content-type':'application/javascript; charset=utf-8'});
    res.end(widgetJs); return;
  }
  if (url.includes('/studios/') && url.includes('/calendar')) {
    res.writeHead(200, {'content-type':'application/json','access-control-allow-origin':'*'});
    res.end(JSON.stringify({ reservations: [], blocked_slots: [] })); return;
  }
  if (url.includes('/plans')) { res.writeHead(200,{'content-type':'application/json'}); res.end(JSON.stringify({plans:[]})); return; }
  if (url.includes('/options')) { res.writeHead(200,{'content-type':'application/json'}); res.end(JSON.stringify({options:[]})); return; }
  res.writeHead(404); res.end('nf');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port = server.address().port;
const ORIGIN = `http://127.0.0.1:${port}`;
// inject the actual base url into the page by rewriting html origin handling:
// simplest: the page leaves data-api-base-url empty, so set it via query? Instead patch html to same-origin API.

const browser = await chromium.launch();
const page = await browser.newPage();
const calReqs=[]; const errs=[];
page.on('request', r=>{ if(/\/studios\//.test(r.url())) calReqs.push(r.url()); });
page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
page.on('pageerror', e=>errs.push('PAGEERROR '+e.message));

// set data-api-base-url to same origin before script runs: use route to rewrite html
await page.route(ORIGIN+'/', async route => {
  const resp = await route.fetch();
  let body = await resp.text();
  body = body.replace('data-api-base-url=""', `data-api-base-url="${ORIGIN}"`);
  route.fulfill({ response: resp, body });
});

await page.goto(ORIGIN+'/', { waitUntil:'networkidle' });
await page.waitForSelector('text=新規予約を作成', { timeout:15000 });
await page.waitForTimeout(800);

const hostFont = await page.evaluate(()=>getComputedStyle(document.getElementById('host-h2')).fontFamily);
const out = {
  mounted: (await page.getAttribute('#zebra-reservation','data-zebra-mounted'))==='true',
  calendarHeading: await page.locator('text=予約カレンダー').count()>0,
  signupLink: await page.locator('text=会員登録').count()>0,
  calRequests: calReqs,
  calHitOrigin: calReqs.some(u=>u.startsWith(ORIGIN)),
  hostFontIsGeorgia: /georgia/i.test(hostFont),
  hostFont,
  errors: errs,
};
console.log(JSON.stringify(out,null,2));
await browser.close();
server.close();
