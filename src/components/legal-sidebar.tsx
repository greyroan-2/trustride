"use client";
import { useEffect, useState, type ReactNode } from "react";
import styles from "./legal-page.module.css";

export function LegalSidebar({ title, children }: { title: string; children: ReactNode }) {
  const [showTitle, setShowTitle] = useState(false);
  useEffect(() => {
    const heading = document.getElementById("legal-page-heading");
    if (!heading) return;
    const observer = new IntersectionObserver(([entry]) => {
      setShowTitle(!entry.isIntersecting && entry.boundingClientRect.bottom <= 118);
    }, { rootMargin: "-118px 0px 0px 0px" });
    observer.observe(heading);
    return () => observer.disconnect();
  }, [title]);
  return <aside className={styles.sidebar}>
    {children}
    <div className={styles.readingTitle} data-visible={showTitle} aria-hidden={!showTitle}>
      <p>TRUSTRIDE CAR RENTAL SERVICES</p><strong>{title}</strong><span>Last updated: November 9, 2026</span>
    </div>
  </aside>;
}
