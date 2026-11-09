/* eslint-disable @typescript-eslint/no-require-imports -- Registers the TypeScript loader for a standalone server OCR smoke test. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const sharp = require('sharp');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, filename);
const { checkLicenseImages, extractLicenseImage } = require('../src/lib/license-ocr.ts');
const lines = ["REPUBLIC OF THE PHILIPPINES", "LAND TRANSPORTATION OFFICE", "DRIVER'S LICENSE", "Last Name, First Name, Middle Name", "DOE, JANE MARIE", "Nationality Sex Date of Birth", "PHL F 1990/01/01", "License No. Expiration Date Agency Code", "A01-23-123456 2030/01/01 A01"];
async function image(text) {
  const svg = `<svg width="1500" height="1100" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/>${text.map((line, index) => `<text x="70" y="${80 + index * 85}" font-family="Arial" font-size="34" fill="black">${line}</text>`).join('')}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
(async () => {
  const physical = await image(lines);
  const digital = await image(['Digital ID is Active', ...lines]);
  assert.deepEqual(await checkLicenseImages(physical, digital), { name: 'DOE, JANE MARIE', licenseNumber: 'A01-23-123456' });
  await assert.rejects(checkLicenseImages(physical, await image(['Digital ID is Inactive', ...lines])), /must clearly show/);
  const wrongPosition = await image([...lines, 'Digital ID is Active']);
  await assert.rejects(extractLicenseImage(wrongPosition, true), /upper-left header/);
  const colorHeader = await sharp(Buffer.from(`<svg width="1500" height="1100" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/><text x="70" y="80" font-family="Arial" font-size="34" fill="#0646a3">Digital ID is <tspan fill="#79bb23">Active</tspan></text>${lines.map((line, i) => `<text x="70" y="${165 + i * 85}" font-family="Arial" font-size="34" fill="black">${line}</text>`).join('')}</svg>`)).png().toBuffer();
  assert.equal((await extractLicenseImage(colorHeader, true)).licenseNumber, 'A01-23-123456');
  // Portal-sized header: small blue text with bright green Active, close button and frame.
  async function portal(status) {
    const svg = `<svg width="1024" height="816" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#1442a2"/><rect x="18" y="18" width="988" height="780" fill="white"/><circle cx="54" cy="48" r="8" fill="none" stroke="#0048b5" stroke-width="2"/><text x="78" y="55" font-family="Arial" font-size="20" font-weight="bold" fill="#0048b5">Digital ID is <tspan fill="#8ac629">${status}</tspan></text><circle cx="978" cy="42" r="12" fill="#f8f8f8" stroke="#ddd"/><path d="M974 38 L982 46 M982 38 L974 46" stroke="#333"/><path d="M32 80 H992" stroke="#eee"/>${lines.map((line, i) => `<text x="60" y="${150 + i * 60}" font-family="Arial" font-size="24" fill="black">${line}</text>`).join('')}</svg>`;
    return sharp(Buffer.from(svg)).jpeg({ quality: 75 }).toBuffer();
  }
  assert.equal((await extractLicenseImage(await portal('Active'), true)).licenseNumber, 'A01-23-123456');
  await assert.rejects(extractLicenseImage(await portal('Inactive'), true), /must clearly show/);
  await assert.rejects(checkLicenseImages(Buffer.from('%PDF-1.7'), digital), /JPEG or PNG/);
  console.log('Passed synthetic image OCR: matching identities, upper-left status targeting, colored active header, small bright-green portal header in JPEG, misplaced/inactive status rejection, and unsupported file rejection.');
})().catch(error => { console.error(error); process.exitCode = 1; });
