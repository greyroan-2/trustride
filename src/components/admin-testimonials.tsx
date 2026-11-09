"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, MessageSquare, Plus } from "lucide-react";
import { adminMutation } from "@/app/actions/admin";
import { SubmitButton } from "./submit-button";

import { TestimonialRating } from "./testimonial-rating";
import { testimonialRatingLabels } from "@/lib/testimonial-rating";

import { UserAvatar } from "./user-avatar";
import { profilePhotoUrl } from "@/lib/profile-photo";

type Testimonial = { customer: { avatarPath: string | null } | null; id: string; rating: number | null; author: string; content: string; published: boolean; sample: boolean; customerId: string | null };
export function AdminTestimonials({ testimonials, administratorId }: { testimonials: Testimonial[]; administratorId: string }) {
  const storageKey = `trustride:testimonials:seen:${administratorId}`;
  const [seen, setSeen] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
        if (Array.isArray(saved)) setSeen(saved.filter((id): id is string => typeof id === "string"));
      } catch { /* Keep highlighting available when browser storage is unavailable. */ }
      setLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey]);
  function markSeen(id: string) {
    if (!loaded || seen.includes(id)) return;
    let saved: unknown = [];
    try { saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]"); } catch { /* Use current state. */ }
    const updated = [...new Set([...seen, ...(Array.isArray(saved) ? saved.filter((value): value is string => typeof value === "string") : []), id])];
    setSeen(updated);
    try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch { /* Seen state remains available for this visit. */ }
  }
  const newCount = loaded ? testimonials.filter(t => t.customerId && !seen.includes(t.id)).length : 0;
  const displayed = testimonials.filter(t => t.published).length;
  return <div className="admin-testimonials">
    <section className="panel testimonial-inbox">
      <div className="testimonial-inbox-heading"><div><h2><MessageSquare size={20} />Customer stories</h2><p>Review submissions and choose which testimonials appear on the website.</p></div><div className="testimonial-counts"><span>{testimonials.length} total</span><span>{displayed} displayed</span>{newCount > 0 && <span className="testimonial-new-count">{newCount} new</span>}</div></div>
      <div className="testimonial-table-scroll"><table className="testimonial-admin-table"><caption className="sr-only">Testimonials and website display controls. New submissions are marked seen when hovered or focused.</caption><thead><tr><th scope="col">Author</th><th scope="col">Testimonial</th><th scope="col">Rating</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody>
        {testimonials.map(t => {
          const isNew = Boolean(loaded && t.customerId && !seen.includes(t.id));
          return <tr key={t.id} data-new={isNew} onMouseEnter={() => markSeen(t.id)} onFocus={() => markSeen(t.id)}>
            <td><div className="testimonial-author-identity"><UserAvatar src={profilePhotoUrl(t.customer?.avatarPath)} name={t.author} size={36} /><div><strong>{t.author}</strong><small>{t.sample ? "Sample content" : t.customerId ? "Client submission" : "Added by admin"}</small>{isNew && <span className="testimonial-new-badge">New</span>}</div></div></td>
            <td><p className="testimonial-content">{t.content}</p></td>
            <td><TestimonialRating rating={t.rating} /></td>
            <td><span className={`testimonial-display-status ${t.published ? "displayed" : "hidden"}`}>{t.published ? "Displayed" : "Not displayed"}</span></td>
            <td><form action={adminMutation}><input type="hidden" name="action" value="publish" /><input type="hidden" name="id" value={t.id} /><input type="hidden" name="published" value={t.published ? "false" : "true"} /><SubmitButton>{t.published ? <EyeOff size={15} /> : <Eye size={15} />}{t.published ? "Hide" : "Display"}</SubmitButton></form></td>
          </tr>;
        })}
      </tbody></table></div>
      {testimonials.length === 0 && <div className="testimonial-empty"><MessageSquare size={28} /><h3>No testimonials yet</h3><p>Client testimonials will appear here after they submit their feedback.</p></div>}
      <p className="testimonial-inbox-help">New client submissions are highlighted until you hover over their row or focus an action. Display makes a testimonial visible on the website.</p>
    </section>
    <details className="panel testimonial-create"><summary><span><Plus size={18} />Add a testimonial</span><span>Optional</span></summary><form className="form" action={adminMutation}><input type="hidden" name="action" value="testimonial" /><label>Author<input name="author" maxLength={100} required /></label><label>Rating (optional)<select name="rating" defaultValue=""><option value="">Not rated</option>{testimonialRatingLabels.map((label, index) => <option key={label} value={index + 1}>{index + 1} {index === 0 ? "star" : "stars"} &mdash; {label}</option>)}</select></label><label>Content<textarea name="content" maxLength={1500} rows={4} required /></label><div className="testimonial-create-actions"><SubmitButton>Create testimonial</SubmitButton></div></form></details>
  </div>;
}
