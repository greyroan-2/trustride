"use client";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { BookOpen, MessageSquareText, PenLine } from "lucide-react";

type Props = { stories: ReactNode; writeReview: ReactNode; myReviews: ReactNode; client: boolean; reviewCount: number; mineCount: number; eligibleCount: number };
export function TestimonialWorkspace({ stories, writeReview, myReviews, client, reviewCount, mineCount, eligibleCount }: Props) {
  const [active,setActive]=useState(0);
  const id=useId();
  const tabsRef=useRef<HTMLDivElement>(null);
  const tabs=[{label:"Reviews",count:reviewCount,Icon:BookOpen},{label:"Write a review",count:eligibleCount,Icon:PenLine},{label:"My reviews",count:mineCount,Icon:MessageSquareText}];
  function navigate(event: KeyboardEvent<HTMLButtonElement>,index:number){
    const next=event.key==="ArrowRight"?(index+1)%3:event.key==="ArrowLeft"?(index+2)%3:event.key==="Home"?0:event.key==="End"?2:null;
    if(next===null)return;
    event.preventDefault();setActive(next);tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }
  if(!client)return <div className="testimonials-stories-view">{stories}</div>;
  return <div className="testimonial-navigation-workspace">
    <div ref={tabsRef} className="testimonial-view-tabs" role="tablist" aria-label="Testimonials">{tabs.map(({label,count,Icon},index)=><button key={label} id={`${id}-tab-${index}`} type="button" role="tab" aria-selected={active===index} aria-controls={`${id}-panel-${index}`} tabIndex={active===index?0:-1} onClick={()=>setActive(index)} onKeyDown={event=>navigate(event,index)}><Icon size={17}/><span>{label}</span>{count>0 && <small>{count}</small>}</button>)}</div>
    <div className="testimonial-workspace-layout">
      <div className="testimonial-view-panels">{[stories,writeReview,myReviews].map((content,index)=><div key={index} id={`${id}-panel-${index}`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`} tabIndex={active===index?0:-1} hidden={active!==index} className="testimonial-view-panel"><div className={active===index?"testimonial-view-enter":undefined}>{content}</div></div>)}</div>

    </div>
  </div>;
}
