const fs = require('fs');
const path = require('path');
const marked = require('marked');
let puppeteer;
let usingCore = false;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  try {
    puppeteer = require('puppeteer-core');
    usingCore = true;
  } catch (e2) {
    puppeteer = null;
  }
}

async function build() {
  const mdPath = path.join(__dirname, '..', 'docs', 'testbetrieb-bedienungsanleitung.md');
  const outHtml = path.join(__dirname, '..', 'docs', 'testbetrieb-bedienungsanleitung.html');
  const outPdf = path.join(__dirname, '..', 'docs', 'testbetrieb-bedienungsanleitung.pdf');

  const md = fs.readFileSync(mdPath, 'utf8');
  const html = marked.parse(md);

  const css = `
  body { font-family: Inter, Roboto, Arial, sans-serif; color: #0f172a; margin: 32px auto; max-width: 800px; }
  h1,h2,h3 { color: #0b1220; }
  pre { background:#f3f4f6; padding:12px; border-radius:6px; }
  code { background:#f8fafc; padding:2px 4px; border-radius:4px; }
  table { border-collapse: collapse; width:100%; }
  table, th, td { border: 1px solid #e6e9ef; }
  th, td { padding:8px; text-align:left; }
  .meta { color:#475569; font-size:0.95em; }
  `;

  const full = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bedienungsanleitung - Testbetrieb</title><style>${css}</style></head><body>${html}</body></html>`;

  fs.writeFileSync(outHtml, full, 'utf8');

  if (!puppeteer) {
    console.log('Puppeteer not installed. Generated HTML at', outHtml);
    console.log('To create a PDF, open the HTML in a browser and print to PDF (Ctrl+P / Save as PDF).');
    return;
  }

  const launchOptions = { args: ['--no-sandbox', '--disable-setuid-sandbox'] };
  // If using puppeteer-core, try to find system browser executable
  if (usingCore) {
    const possible = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      process.env.CHROME_PATH,
      process.env.MSEDGE_PATH,
    ].filter(Boolean);

    const fs = require('fs');
    for (const p of possible) {
      try {
        if (fs.existsSync(p)) {
          launchOptions.executablePath = p;
          break;
        }
      } catch (e) {
        // ignore
      }
    }
  }

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();
  await page.setContent(full, { waitUntil: 'networkidle0' });

  // Header & footer templates
  // Build a simple header with title, version (from package.json) and date — no logo to avoid embedding issues.
  let pkgVersion = '0.0.0';
  try {
    const pkg = require(path.join(__dirname, '..', 'package.json'));
    if (pkg && pkg.version) pkgVersion = pkg.version;
  } catch (e) {
    // ignore and use default
  }
  const today = new Date().toISOString().split('T')[0];
  const headerTemplate = `
    <div style="width:100%; font-family: Inter, Roboto, Arial, sans-serif; font-size:12px; color:#0b1220; padding:6px 12px; display:flex; justify-content:space-between; align-items:center;">
      <div style="font-weight:600;">Bedienungsanleitung — Testbetrieb</div>
      <div style="font-size:11px; color:#475569;">Version ${pkgVersion} — Stand ${today}</div>
    </div>`;

  const footerTemplate = `
    <div style="font-family: Inter, Roboto, Arial, sans-serif; font-size:10px; width:100%; padding:6px 12px; color:#64748b; display:flex; justify-content:space-between;">
      <div>Erstellt von Andreas Hofreither</div>
      <div>Seite <span class="pageNumber"></span> / <span class="totalPages"></span></div>
    </div>`;

  // Generate PDF as buffer, write to temp file and then replace target atomically.
  const outPdfTemp = outPdf + '.tmp';
  try {
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '32mm', bottom: '32mm', left: '15mm', right: '15mm' },
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
    });

    fs.writeFileSync(outPdfTemp, pdfBuffer);

    // Attempt atomic replace. If final file is locked, keep temp file and warn.
    try {
      if (fs.existsSync(outPdf)) fs.unlinkSync(outPdf);
      fs.renameSync(outPdfTemp, outPdf);
      console.log('PDF generated at', outPdf);
    } catch (e) {
      console.warn('Could not replace final PDF (may be locked). Temporary PDF written at', outPdfTemp);
    }
  } finally {
    await browser.close();
  }
}

build().catch(err => { console.error(err); process.exit(1); });
