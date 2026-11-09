export class LicenseReadError extends Error {}
export type LicenseIdentity = { name: string; licenseNumber: string };

export function normalizeLicenseName(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase().replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean).sort().join(" ");
}
export function parseLicenseText(text: string, ltms = false): LicenseIdentity {
  const lines = text.replace(/\r/g, "").split("\n").map(line => line.replace(/[ \t]+/g, " ").trim()).filter(Boolean);
  const flat = lines.join(" ");
  if (ltms) assertLtmsActiveText(flat);
  if (!/driver['\u2019]?s?\s+licen[sc]e/i.test(flat)) throw new LicenseReadError("Could not identify a driver's license. Upload a clear, complete front image.");
  const numbers = new Set(Array.from(flat.toUpperCase().matchAll(/\b([A-Z]\d{2})[\s-]*(\d{2})[\s-]*(\d{6})\b/g), match => `${match[1]}-${match[2]}-${match[3]}`));
  if (numbers.size !== 1) throw new LicenseReadError("Could not clearly read one license number. Upload a sharper image showing License No.");
  const names = new Map<string, string>();
  lines.forEach((line, index) => {
    if (!/(?:last\s*name.*first\s*name|full\s*name)/i.test(line)) return;
    const afterLabel = line.replace(/^.*(?:middle\s*name|full\s*name|first\s*name)\s*[:.,-]?\s*/i, "").trim();
    const candidate = afterLabel || lines[index + 1] || "";
    if (/(?:nationality|date of birth|license|address|middle name|first name|last name)/i.test(candidate) || /\d/.test(candidate)) return;
    const name = candidate.replace(/^[^\p{L}]+|[^\p{L}.]+$/gu, "").trim();
    const normalized = normalizeLicenseName(name);
    if (normalized.split(" ").length >= 2 && normalized.length >= 5) names.set(normalized, name);
  });
  if (names.size !== 1) throw new LicenseReadError("Could not clearly read the full name. Upload a sharper image showing Last Name, First Name, Middle Name.");
  return { name: [...names.values()][0], licenseNumber: [...numbers][0] };
}
export function matchLicenseIdentities(license: LicenseIdentity, ltms: LicenseIdentity): LicenseIdentity {
  if (license.licenseNumber !== ltms.licenseNumber) throw new LicenseReadError("The license numbers on the driver's license and LTMS uploads do not match. Upload both documents for the same license.");
  if (normalizeLicenseName(license.name) !== normalizeLicenseName(ltms.name)) throw new LicenseReadError("The names on the driver's license and LTMS uploads do not match. Upload clear documents for the same person.");
  return license;
}

export function assertLtmsActiveText(text: string): void {
  const flat = text.replace(/\s+/g, " ");
  if (!/\bdigital\s+id\s+is\s+active\b/i.test(flat) || /\bdigital\s+id\s+(?:is\s+)?(?:not\s+active|inactive|expired|revoked)\b/i.test(flat)) throw new LicenseReadError('The LTMS image must clearly show "Digital ID is Active" in the upper-left header. Upload the full active digital ID screen without cropping out the header.');
}
