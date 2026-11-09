"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import type { InteriorReference } from "@/lib/interior-images";

export function InteriorGallery({ reference }: { reference: InteriorReference }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const current = reference.images[index];
  function reset() { setZoom(1); setOffset({ x: 0, y: 0 }); drag.current = null; }
  function select(next: number) { setIndex((next + reference.images.length) % reference.images.length); setFailed(false); reset(); }
  function changeZoom(amount: number) { setZoom(value => Math.max(1, Math.min(3, value + amount))); setOffset({ x: 0, y: 0 }); }

  return (
    <section className="interior-gallery" aria-label="Vehicle interior photos">
      <div className="interior-gallery-heading"><span>REFERENCE PHOTOS</span></div>
      <div className="interior-photo-stage" tabIndex={0} aria-label={`${current.label}. Use left and right arrow keys to change photos.`}
        onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.key === "ArrowRight") { event.preventDefault(); select(index + 1); } if (event.key === "ArrowLeft") { event.preventDefault(); select(index - 1); } }}>
        <div className="interior-pan-surface" style={{ cursor: zoom > 1 ? "grab" : "default", touchAction: zoom > 1 ? "none" : "pan-y" }}
          onPointerDown={event => { if (zoom <= 1) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, left: offset.x, top: offset.y }; }}
          onPointerMove={event => { if (!drag.current) return; const bounds = event.currentTarget.getBoundingClientRect(); const maxX = bounds.width * (zoom - 1) / 2; const maxY = bounds.height * (zoom - 1) / 2; setOffset({ x: Math.max(-maxX, Math.min(maxX, drag.current.left + event.clientX - drag.current.x)), y: Math.max(-maxY, Math.min(maxY, drag.current.top + event.clientY - drag.current.y)) }); }}
          onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
          <div className="interior-photo-transform" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}>
            <Image key={current.src} src={current.src} alt={current.alt} fill sizes="(max-width: 760px) 90vw, 55vw" draggable={false} onError={() => setFailed(true)} />
          </div>
        </div>
        {failed && <p className="interior-photo-error" role="alert">This photo could not load. Please select another view.</p>}
        <span className="interior-photo-caption" aria-live="polite">{current.label} · {index + 1} / {reference.images.length}</span>
        <div className="interior-photo-navigation"><button type="button" aria-label="Previous interior photo" onClick={() => select(index - 1)}><ChevronLeft size={20} /></button><button type="button" aria-label="Next interior photo" onClick={() => select(index + 1)}><ChevronRight size={20} /></button></div>
        <div className="interior-photo-tools"><button type="button" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => changeZoom(0.5)}><ZoomIn size={17} /></button><button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => changeZoom(-0.5)}><ZoomOut size={17} /></button><button type="button" aria-label="Reset image view" onClick={reset}><RotateCcw size={17} /></button><span>{Math.round(zoom * 100)}%</span></div>
      </div>
      <div className="interior-thumbnails" aria-label="Choose interior photo">{reference.images.map((photo, i) => <button key={photo.src} type="button" aria-pressed={index === i} onClick={() => select(i)}><Image src={photo.src} alt="" width={96} height={64} /><span>{photo.label}</span></button>)}</div>
      <p className="discreet">Zoom in, then drag to inspect. <a href={reference.source} target="_blank" rel="noreferrer">Toyota dealer reference photos</a>; trim and model year may differ from your rental. Exact 2026 specification is unverified.</p>
    </section>
  );
}
