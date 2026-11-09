import Link from "next/link";
import { MessageSquareText, ArrowRight, CalendarCheck, CheckCircle2, PenLine } from "lucide-react";
import { currentUserProfile } from "@/lib/auth";
import { getCachedTestimonials } from "@/lib/catalogue-cache";
import { profilePhotoUrl } from "@/lib/profile-photo";
import { db } from "@/lib/db";
import { workflowData } from "@/lib/booking-workflow";
import { canLeaveTestimonial } from "@/lib/reservation-navigation";
import { TestimonialRating } from "./testimonial-rating";
import { UserAvatar } from "./user-avatar";
import { TestimonialWorkspace } from "./testimonial-workspace";
import { ReservationTestimonialForm } from "./reservation-testimonial-form";

export async function TestimonialsPage() {
  const [user,reviews] = await Promise.all([currentUserProfile(), process.env.DATABASE_URL ? getCachedTestimonials() : Promise.resolve([])]);
  const client = user?.role === "CLIENT";
  const [completed,mine] = client ? await Promise.all([
    db.booking.findMany({where:{customerId:user.id,status:"COMPLETED"},select:{id:true,reference:true,status:true,vehicle:{select:{model:{select:{name:true}}}},workflow:{select:{data:true}}},orderBy:{createdAt:"desc"}}),
    db.testimonial.findMany({where:{customerId:user.id},select:{id:true,content:true,rating:true,published:true},orderBy:{id:"desc"}}),
  ]) : [[],[]];
  const eligible = completed.filter(booking=>canLeaveTestimonial(booking.status,workflowData(booking.workflow?.data).testimonialId));
  const stories = <section className="testimonials-stories-view" aria-label="Published customer stories"><div className="testimonial-panel-heading"><div><h2>From our customers</h2><p>Honest feedback from completed journeys.</p></div><span>{reviews.length} {reviews.length===1?"story":"stories"}</span></div>{reviews.length ? <div className="public-testimonial-grid">{reviews.map(review=><article className="public-testimonial-card" key={review.id}><TestimonialRating rating={review.rating}/><blockquote>{review.content}</blockquote><div className="testimonial-author-identity"><UserAvatar src={profilePhotoUrl(review.customer?.avatarPath)} name={review.author} size={40}/><strong>{review.author}</strong></div></article>)}</div> : <div className="testimonial-friendly-empty"><span className="testimonial-empty-icon"><MessageSquareText size={27}/></span><h3>The first story could be yours</h3><p>We are making room for real experiences.<br/>Approved customer reviews will appear here.</p><span className="testimonial-empty-footnote"><CheckCircle2 size={14}/>Reviews from completed rentals</span></div>}</section>;
  const writeReview = client ? <section className="testimonial-compose-card"><div className="testimonial-compose-header"><UserAvatar src={profilePhotoUrl(user.avatarPath)} name={user.name || "Your account"} size={44}/><div><h2>Share your journey</h2><p>{user.name?`Reviewing as ${user.name}`:"Your feedback helps the next traveller."}</p></div></div>{eligible.length ? <><div className="testimonial-compose-steps"><span>1. Choose your rental</span><span>2. Give a rating</span><span>3. Share your experience</span></div><ReservationTestimonialForm key={eligible.map(item=>item.id).join(",")} bookings={eligible.map(item=>({id:item.id,label:`${item.vehicle.model.name} - ${item.reference}`}))}/></> : <div className="testimonial-compose-empty"><CalendarCheck size={30}/><h3>{completed.length?"You are all caught up":"Your next story starts with a ride"}</h3><p>{completed.length?"Thank you for reviewing your completed rentals. You can find your feedback in My reviews.":"A completed rental unlocks your review form. You can check your rental progress in My reservations."}</p><Link href="/bookings" className="testimonial-page-action">View my reservations<ArrowRight size={16}/></Link></div>}</section> : null;
  const myReviews = client ? <section className="testimonials-stories-view"><div className="testimonial-panel-heading"><div><h2>Your reviews</h2><p>Track what you shared and where it stands.</p></div><span>{mine.length} submitted</span></div>{mine.length ? <div className="testimonial-own-list">{mine.map(review=><article key={review.id}><div><TestimonialRating rating={review.rating}/><span className={`testimonial-display-status ${review.published?"displayed":"hidden"}`}>{review.published?"Published":"Awaiting review"}</span></div><p>{review.content}</p><small>{review.published?"Your review is visible to other travellers.":"Your review has been received and is waiting for admin approval."}</small></article>)}</div> : <div className="testimonial-friendly-empty"><span className="testimonial-empty-icon"><PenLine size={26}/></span><h3>Your reviews, all in one place</h3><p>After you submit feedback, you can follow its status here.</p></div>}</section> : null;
  return <section className="wrap page customer-testimonials-page">
    <div className="testimonials-page-heading"><h1>Good journeys. Real stories.</h1><p>Get to know TrustRide through the people who have travelled with us.</p></div>
    <TestimonialWorkspace stories={stories} writeReview={writeReview} myReviews={myReviews} client={Boolean(client)} reviewCount={reviews.length} mineCount={mine.length} eligibleCount={eligible.length}/>
  </section>;
}
