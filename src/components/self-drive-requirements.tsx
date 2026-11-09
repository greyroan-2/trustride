import { CarFront, ClipboardList, MapPin, ChevronDown, UserRound, Check } from "lucide-react";
import styles from "./ride-requirements.module.css";
import Image from "next/image";
import activePortal from "../../public/images/active-portal.png";
import driversLicense from "../../public/images/drivers-license.jpg";
import meralcoBill from "../../public/images/meralco-bill.webp";
import validIds from "../../public/images/valid-ids.jpg";

export function SelfDriveRequirements() {
  return (
    <section className={"wrap page requirements-page " + styles.page}>
      <div className={styles.heading}><h1>Our requirements</h1><p>Three simple steps to your next journey.</p></div>
      <ol className={styles.steps}>
        {[{ title: "Select your ride", description: "Choose your vehicle, rental type, and pickup and drop-off dates and times.", Icon: CarFront }, { title: "Provide your information", description: "Add your contact and trip details, upload the required documents, and submit your reservation payment receipt for review.", Icon: ClipboardList }, { title: "Start your journey", description: "Once your reservation is confirmed, meet us at your agreed pickup point and enjoy the ride.", Icon: MapPin }].map(({ title, description, Icon }, index) => <li key={title}><div className={styles.stepTop}><span className={styles.stepIcon}><Icon size={24} aria-hidden="true" /></span><span className={styles.stepNumber}>0{index + 1}</span></div><h2>{title}</h2><p>{description}</p></li>)}
      </ol>
      <div className={styles.typesHeading}><h2>How would you like to travel?</h2><p>Open a rental type below to see what you need to prepare.</p></div>
      <div className={styles.choices}>
      <details className={styles.choice}><summary><span className={styles.typeIcon}><CarFront size={23} aria-hidden="true" /></span><span><strong>Self-drive</strong><small>Take the wheel. Prepare your license and supporting documents.</small></span><ChevronDown size={20} aria-hidden="true" /></summary><div className={styles.documents}>
      <div className="requirements-grid">
        <section className="requirement-card" aria-labelledby="license-heading">
          <h2 id="license-heading">Driver’s license</h2>
          <figure className="requirement-reference">
            <Image src={driversLicense} alt="Reference showing a Philippine driver’s license and the details to include" sizes="(max-width: 760px) 80vw, 40vw" />
            <figcaption>Driver’s license reference</figcaption>
          </figure>
          <p>Provide a clear image of your valid driver’s license. Make sure the photo and license details are readable.</p>
        </section>
        <section className="requirement-card" aria-labelledby="ids-heading">
          <h2 id="ids-heading">Valid Government ID&apos;s</h2>
          <figure className="requirement-reference">
            <Image src={validIds} alt="Examples of valid government-issued identification cards" sizes="(max-width: 760px) 80vw, 40vw" />
            <figcaption>Examples of government-issued IDs</figcaption>
          </figure>
          <p>Your driver’s license counts as your first valid government-issued ID. Prepare a clear image of one additional valid government-issued ID.</p>
          <p className="requirement-examples">Examples: passport, UMID, PhilHealth ID, Pag-IBIG ID, postal ID, PRC ID, TIN ID, voter’s ID, or OFW ID.</p>
        </section>
        <section className="requirement-card" aria-labelledby="ltms-heading">
          <h2 id="ltms-heading">Active license via LTMS Portal</h2>
          <figure className="requirement-reference">
            <Image src={activePortal} alt="LTMS digital driver’s license screen with Digital ID is Active displayed at the top" sizes="(max-width: 760px) 80vw, 40vw" />
            <figcaption>Required LTMS screenshot format</figcaption>
          </figure>
          <p>Upload a screenshot of your own digital driver’s license from the LTMS Portal, showing the <strong>“Digital ID is Active”</strong> status and your license details.</p>
          <div className="requirement-note">Your screenshot must show the same screen as the reference above, with “Digital ID is Active” at the top. Use your own license information, and make sure the entire license is visible and readable.</div>
        </section>
        <section className="requirement-card" aria-labelledby="billing-heading">
          <h2 id="billing-heading">Proof of billing</h2>
          <figure className="requirement-reference">
            <Image src={meralcoBill} alt="Sample Meralco billing statement showing the customer name and billing address" sizes="(max-width: 760px) 80vw, 40vw" />
            <figcaption>Proof of billing reference</figcaption>
          </figure>
          <p>Provide a clear copy of a billing statement, such as an electricity bill, showing the name and address on the bill.</p>
        </section>
      </div>
      <div className={styles.paymentNote}><strong>Reservation payment</strong><p>Upload your money-transfer receipt for exactly 50% of the booking total. This reservation payment is non-refundable and is subject to admin review. Arrange the remaining balance directly with TrustRide.</p></div>
      </div></details>
      <details className={styles.choice}><summary><span className={styles.typeIcon}><UserRound size={23} aria-hidden="true" /></span><span><strong>With driver</strong><small>Sit back and relax. Share your valid ID and travel arrangements.</small></span><ChevronDown size={20} aria-hidden="true" /></summary><div className={styles.documents}>
        <div className={styles.driverGrid}>
          <section><h3>One valid government-issued ID</h3><p>Choose your ID type and upload a clear, readable copy. A driver&apos;s license is accepted, but is not required when booking with a driver.</p><figure className="requirement-reference"><Image src={validIds} alt="Examples of valid government-issued IDs" sizes="(max-width: 760px) 85vw, 45vw" /><figcaption>Examples of government-issued IDs</figcaption></figure></section>
          <section><h3>Your trip details</h3><ul>{["Contact name and phone number", "Pickup location and destination", "Pickup and drop-off dates and times", "Number of passengers", "Driver meetup time"].map(item => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}</ul><p>Include any additional travel or meetup requests when submitting your requirements.</p><div className={styles.paymentNote}><strong>Reservation payment</strong><p>Upload your money-transfer receipt for exactly 50% of the booking total. This reservation payment is non-refundable and is subject to admin review. Arrange the remaining balance directly with TrustRide.</p></div></section>
        </div>
      </div></details>
      </div>
    </section>
  );
}
