export type ReceiptDetails = { amountMinor: number; reference: string };
export class ReceiptReadError extends Error {}

export function parseReceiptText(text: string): ReceiptDetails {
  const lines = text.replace(/\r/g, "").split("\n").map(line => line.trim()).filter(Boolean);
  const priorities = [/\btransfer\s+amount\b/i, /\btotal\s+amount\s+sent\b/i, /^amount\b/i, /\bamount\s+sent\b/i];
  let amountMinor: number | undefined;
  for (const label of priorities) {
    const amounts = new Set<number>();
    lines.forEach((line, index) => {
      if (!label.test(line) || /fee/i.test(line)) return;
      const match = `${line} ${lines[index + 1] ?? ""}`.match(/(?:PHP\s*|₱\s*|\bP\s*)?(\d[\d,]*\.\d{2})(?!\d)/i);
      if (match) {
        const value = Math.round(Number(match[1].replace(/,/g, "")) * 100);
        if (Number.isSafeInteger(value) && value > 0) amounts.add(value);
      }
    });
    if (amounts.size > 1) throw new ReceiptReadError("The receipt contains conflicting transfer amounts. Upload a clearer receipt.");
    if (amounts.size === 1) { amountMinor = [...amounts][0]; break; }
  }
  const references = new Set<string>();
  lines.forEach((line, index) => {
    const label = line.match(/(?:\breference\s*(?:number|no\.?)?|\bref\.?\s*(?:no\.?|number)|\btransaction\s*(?:id|reference))\s*[:#.-]?\s*(.*)$/i);
    if (!label) return;
    const source = label[1] || lines[index + 1] || "";
    const match = source.match(/^([A-Z]{0,5}\d[A-Z\d]*(?:[ -]+\d+)*)/i);
    const reference = match?.[1].replace(/[\s-]/g, "").toUpperCase();
    if (reference && reference.length >= 8 && reference.length <= 64 && (reference.match(/\d/g)?.length ?? 0) >= 6) references.add(reference);
  });
  if (!amountMinor || references.size !== 1) throw new ReceiptReadError("Could not clearly read the amount and reference number. Upload a clear, complete GCash or bank-transfer receipt.");
  return { amountMinor, reference: [...references][0] };
}
