import { innovaPricingReference } from "@/lib/innova-pricing-reference";
import { money } from "@/lib/validation";

export function InnovaPricingReference() {
  return <section className="innova-pricing-reference"><h3>Innova with-driver reference rates</h3><p>Base pickup: Dasmariñas City, Cavite. Trips longer than 24 hours and long-distance destinations require a quotation.</p><div><table><caption className="sr-only">Innova rental reference rates by destination</caption><thead><tr><th>Destination area</th><th>12 hours</th><th>24 hours</th></tr></thead><tbody>{innovaPricingReference.map(rate => <tr key={rate.area}><td>{rate.area}<small>{rate.coverage}</small></td><td>{money(rate.hours12Minor)}</td><td>{money(rate.hours24Minor)}</td></tr>)}<tr><td>Long-distance / Provincial</td><td colSpan={2}>For quotation</td></tr></tbody></table></div><p>Reference rates apply to rentals with a driver. Distance-based pricing requires a configured rate and route origin.</p></section>;
}
