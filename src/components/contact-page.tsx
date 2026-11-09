import { ArrowUpRight, Facebook, Instagram, Phone } from "lucide-react";

export function ContactPage() {
  return <section className="wrap page business-contact-page">
    <div className="business-contact-heading"><h1>Let us plan your next journey.</h1><p>Have a question about a rental? Call us or connect with TrustRide Car Rental Services on social media.</p></div>
    <div className="business-contact-grid">
      <a className="business-contact-card" href="tel:+639177001741"><span className="business-contact-icon"><Phone size={24}/></span><span className="business-contact-label">Call us</span><h2>0917 700 1741</h2><p>Speak with us about your rental and travel plans.</p><span className="business-contact-action">Call TrustRide<ArrowUpRight size={17}/></span></a>
      <a className="business-contact-card" href="https://www.facebook.com/profile.php?id=61589850404201" target="_blank" rel="noopener noreferrer"><span className="business-contact-icon"><Facebook size={24}/></span><span className="business-contact-label">Facebook</span><h2>TrustRide Car Rental Services</h2><p>Visit our page for updates and rental enquiries.</p><span className="business-contact-action">Visit Facebook<ArrowUpRight size={17}/><span className="sr-only"> (opens in a new tab)</span></span></a>
      <a className="business-contact-card" href="https://www.instagram.com/trustride_/" target="_blank" rel="noopener noreferrer"><span className="business-contact-icon"><Instagram size={24}/></span><span className="business-contact-label">Instagram</span><h2>TrustRide Car Rental Services</h2><p>@trustride_</p><span className="business-contact-action">Visit Instagram<ArrowUpRight size={17}/><span className="sr-only"> (opens in a new tab)</span></span></a>
    </div>
  </section>;
}
