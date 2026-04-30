import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [
  {
    title: 'index.html',
    filePath: path.join(root, 'index.html'),
  },
  {
    title: 'src/game.js',
    filePath: path.join(root, 'src', 'game.js'),
  },
  {
    title: 'src/styles.css',
    filePath: path.join(root, 'src', 'styles.css'),
  },
];

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const sections = files.map(({ title, filePath }) => {
  const code = fs.readFileSync(filePath, 'utf8');
  return `
    <section class="file-block">
      <h2>${escapeHtml(title)}</h2>
      <pre><code>${escapeHtml(code)}</code></pre>
    </section>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Code Export</title>
  <style>
    :root {
      color-scheme: light;
    }
    body {
      margin: 0;
      padding: 24px;
      font-family: Arial, Helvetica, sans-serif;
      background: #f5f1e8;
      color: #222;
    }
    .page {
      max-width: 1100px;
      margin: 0 auto;
    }
    .card {
      background: #fffdf8;
      border: 1px solid #d8d0c2;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
      margin-bottom: 20px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 28px;
    }
    .note {
      margin: 0;
      line-height: 1.5;
      color: #4b443b;
    }
    .file-block {
      margin: 18px 0 28px;
      break-inside: avoid;
    }
    .file-block h2 {
      margin: 0 0 10px;
      font-size: 18px;
      color: #2d2a26;
    }
    pre {
      margin: 0;
      padding: 18px;
      overflow: auto;
      white-space: pre;
      background: #111827;
      color: #e5e7eb;
      border-radius: 12px;
      font-size: 12px;
      line-height: 1.45;
    }
    code {
      font-family: Consolas, Monaco, 'Courier New', monospace;
    }
    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      .card {
        box-shadow: none;
        border-radius: 0;
        border: 0;
      }
      pre {
        background: #fff;
        color: #000;
        border: 1px solid #bbb;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    ${sections}
  </div>
</body>
</html>`;

const outputPath = path.join(root, 'submission-raw-code.html');
fs.writeFileSync(outputPath, html, 'utf8');
console.log(`Wrote ${outputPath}`);
