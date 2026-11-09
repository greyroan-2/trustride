"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FileText, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export function DocumentPreview({ src, name, pdf = false, label = "View image", className = "document-preview-link" }: { src: string; name: string; pdf?: boolean; label?: string; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [natural, setNatural] = useState({ width: 1600, height: 1200 });
  useEffect(() => {
    if (!open || !viewport.current) return;
    const element = viewport.current;
    const observer = new ResizeObserver(() => setDimensions({ width: element.clientWidth, height: element.clientHeight }));
    observer.observe(element);
    return () => observer.disconnect();
  }, [open]);
  const fit = Math.max(0, Math.min((dimensions.width - 32) / natural.width, (dimensions.height - 32) / natural.height, 1));
  const imageWidth = natural.width * fit * zoom;
  const imageHeight = natural.height * fit * zoom;
  function resetZoom() { setZoom(1); viewport.current?.scrollTo({ top: 0, left: 0 }); }
  function close() { dialog.current?.close(); }
  return <>
    <button type="button" className={className} onClick={() => { setLoading(true); setError(false); setZoom(1); setOpen(true); dialog.current?.showModal(); }}><FileText size={16} />{label}</button>
    <dialog ref={dialog} className="booking-document-modal" aria-label={`Preview ${name}`} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}>
      <header className="booking-document-modal-header"><div><span>DOCUMENT PREVIEW</span><h3>{name}</h3></div><button type="button" autoFocus aria-label="Close document preview" onClick={close}><X size={22} /></button></header>
      {!pdf && <div className="document-zoom-controls" role="group" aria-label="Document zoom"><button type="button" aria-label="Zoom out" disabled={zoom <= 0.5 || loading || error} onClick={() => setZoom(value => Math.max(0.5, value - 0.25))}><ZoomOut size={18} /></button><output aria-live="polite">{Math.round(zoom * 100)}%</output><button type="button" aria-label="Zoom in" disabled={zoom >= 4 || loading || error} onClick={() => setZoom(value => Math.min(4, value + 0.25))}><ZoomIn size={18} /></button><button type="button" disabled={loading || error} onClick={resetZoom}><RotateCcw size={15} />Fit to view</button></div>}
      <div className="booking-document-modal-body" ref={viewport}>
        {open && <>{loading && <p role="status" className="booking-document-loading">Loading document...</p>}{error ? <p role="alert" className="booking-document-loading">Could not load this document. Close the preview and try again.</p> : pdf ? <iframe src={src} title={name} onLoad={() => setLoading(false)} onError={() => { setLoading(false); setError(true); }} /> : <div className="document-image-stage" style={{ width: Math.max(dimensions.width, imageWidth + 32), height: Math.max(dimensions.height, imageHeight + 32) }}><Image src={src} alt={name} width={1600} height={1200} unoptimized style={{ width: imageWidth, height: imageHeight, visibility: loading ? "hidden" : "visible" }} onLoad={event => { setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }); setLoading(false); }} onError={() => { setLoading(false); setError(true); }} /></div>}</>}
      </div>
      <footer className="booking-document-modal-footer"><span>{pdf ? "Use the PDF viewer controls to zoom or download." : "Use zoom to inspect details, then scroll to move around."} Press Escape to close.</span><button type="button" onClick={close}>Done</button></footer>
    </dialog>
  </>;
}

export function DocumentUpload({ id, name, required, accept = "image/jpeg,image/png", onFileSelect, hideSelectedPreview = false }: { id: string; name: string; required: boolean; accept?: string; hideSelectedPreview?: boolean; onFileSelect?: (file: File | null) => void }) {
  const [preview, setPreview] = useState<{ src: string; name: string; pdf: boolean } | null>(null);
  const objectUrl = useRef<string | null>(null);
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);
  return <>
    <input id={id} type="file" name={name} accept={accept} required={required} onChange={event => {
      if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = null; }
      const file = event.target.files?.[0];
      event.target.setCustomValidity(file && file.size > 5 * 1024 * 1024 ? "Choose a file of 5 MB or smaller." : "");
      if (!file || file.size > 5 * 1024 * 1024) { setPreview(null); onFileSelect?.(null); return; }
      const src = URL.createObjectURL(file);
      objectUrl.current = src;
      setPreview({ src, name: file.name, pdf: file.type === "application/pdf" });
      onFileSelect?.(file);
    }} />
    {preview && !hideSelectedPreview && <div className="document-selected-preview"><DocumentPreview src={preview.src} name={preview.name} pdf={preview.pdf} label={preview.pdf ? "Preview selected PDF" : "Preview selected image"} /><small>Selected · not submitted yet</small></div>}
  </>;
}
