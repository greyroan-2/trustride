/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS bootstrap registers the TypeScript test loader before loading the server OCR module. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const sharp = require('sharp');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, filename);
const { extractReceipt } = require('../src/lib/receipt-ocr.ts');

async function check(lines, expected) {
  const svg = `<svg width="1000" height="800" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/>${lines.map((line, index) => `<text x="40" y="${80 + index * 85}" font-family="Arial" font-size="32" fill="black">${line}</text>`).join('')}</svg>`;
  const image = await sharp(Buffer.from(svg)).png().toBuffer();
  try { assert.deepEqual(await extractReceipt(image), expected); }
  catch (error) {
    const { createWorker } = require('tesseract.js');
    const path = require('node:path');
    const worker = await createWorker('eng', 1, { langPath: path.join(path.dirname(require.resolve('@tesseract.js-data/eng/package.json')), '4.0.0_best_int'), gzip: true, cacheMethod: 'none' });
    console.log('Synthetic test receipt OCR:', (await worker.recognize(image)).data.text);
    await worker.terminate();
    throw error;
  }
}
(async () => {
  await check(['Transfer Successful!', 'Transfer Amount PHP 240.00', 'Transfer Fee FREE', 'Total Amount PHP 240.00', 'Reference Number BC55000001234567890'], { amountMinor: 24000, reference: 'BC55000001234567890' });
  await check(['Express Send', 'Amount 1.00', 'Total Amount Sent PHP 1.00', 'Ref No. 5046 987 490409 Nov 07, 2026'], { amountMinor: 100, reference: '5046987490409' });
  console.log('Passed real-image OCR checks for bank-transfer and GCash receipt layouts.');
})().catch(error => { console.error(error); process.exitCode = 1; });
