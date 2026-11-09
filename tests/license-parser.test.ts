import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLicenseText, matchLicenseIdentities, normalizeLicenseName } from "../src/lib/license-parser";
import { hasSelfDriveLicenseMatch, type WorkflowData } from "../src/lib/booking-workflow";

const license = `REPUBLIC OF THE PHILIPPINES
LAND TRANSPORTATION OFFICE
DRIVER'S LICENSE
Last Name, First Name, Middle Name
DOE, JANE MARIE
Nationality Sex Date of Birth
PHL F 1990/01/01
License No. Expiration Date Agency Code
A01-23-123456 2030/01/01 A01`;
const ltms = `Digital ID is Active\n${license}`;
test("extracts a license name and number and matches the LTMS image", () => {
  assert.deepEqual(parseLicenseText(license), { name: "DOE, JANE MARIE", licenseNumber: "A01-23-123456" });
  assert.deepEqual(matchLicenseIdentities(parseLicenseText(license), parseLicenseText(ltms, true)), parseLicenseText(license));
});
test("matches case, name order, commas, and license number spacing without fuzzy identity guesses", () => {
  const alternate = ltms.replace("DOE, JANE MARIE", "Jane Marie Doe").replace("A01-23-123456", "a01 23 123456");
  assert.doesNotThrow(() => matchLicenseIdentities(parseLicenseText(license), parseLicenseText(alternate, true)));
  assert.equal(normalizeLicenseName("DOE, JANE MARIE"), normalizeLicenseName("Jane Marie Doe"));
});
test("missing, inactive, and conflicting LTMS status return errors", () => {
  for (const text of [license, `Digital ID is Inactive\n${license}`, `Digital ID is Not Active\n${license}`, `Digital ID is Active\nDigital ID is Revoked\n${license}`]) assert.throws(() => parseLicenseText(text, true), /must clearly show/);
});
test("a different name or license number is rejected in either upload order", () => {
  for (const altered of [license.replace("JANE MARIE", "JANE ANNE"), license.replace("123456", "123457")]) {
    assert.throws(() => matchLicenseIdentities(parseLicenseText(altered), parseLicenseText(ltms, true)), /do not match/);
    assert.throws(() => matchLicenseIdentities(parseLicenseText(license), parseLicenseText(`Digital ID is Active\n${altered}`, true)), /do not match/);
  }
});
test("unreadable fields and ambiguous license numbers fail closed", () => {
  for (const text of ["random upload", license.replace("DOE, JANE MARIE", ""), license.replace("A01-23-123456", "UNKNOWN"), `${license}\nB01-23-654321`]) assert.throws(() => parseLicenseText(text));
});
test("a saved OCR match is bound to both current image paths", () => {
  const data: WorkflowData = { service: "SELF_DRIVE", documents: { license: { path: "license.jpg", name: "license", uploadedAt: "now" }, ltms: { path: "ltms.jpg", name: "ltms", uploadedAt: "now" } }, licenseVerification: { version: 1, name: "DOE, JANE MARIE", licenseNumber: "A01-23-123456", licensePath: "license.jpg", ltmsPath: "ltms.jpg", ltmsActive: true, checkedAt: "now" } };
  assert.equal(hasSelfDriveLicenseMatch({ service: "SELF_DRIVE" }), false);
  assert.equal(hasSelfDriveLicenseMatch(data), true);
  for (const key of ["license", "ltms"]) assert.equal(hasSelfDriveLicenseMatch({ ...data, documents: { ...data.documents, [key]: { path: "replacement.jpg", name: "new", uploadedAt: "now" } } }), false);
  assert.equal(hasSelfDriveLicenseMatch({ service: "WITH_DRIVER" }), true);
});
