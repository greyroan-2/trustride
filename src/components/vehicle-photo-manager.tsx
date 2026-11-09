"use client";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { Trash2, X, Images } from "lucide-react";
import { deleteVehiclePhoto } from "@/app/actions/upload";
import { DocumentPreview } from "./document-upload";
import { SubmitButton } from "./submit-button";

type Photo = { id: string; url: string; alt: string };
export function VehiclePhotoManager({ vehicleId, photos }: { vehicleId: string; photos: Photo[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Photo | null>(null);
  const title = useId();
  return <details className="vehicle-editor vehicle-photo-manager"><summary><Images size={17} />Manage vehicle photos <span className="vehicle-photo-count">{photos.length}</span></summary>{photos.length ? <div className="vehicle-photo-grid">{photos.map(photo => <article className="vehicle-photo-tile" key={photo.id}><div className="vehicle-photo-thumbnail"><Image src={photo.url} alt={photo.alt} fill unoptimized sizes="(max-width: 600px) 100vw, 300px" /></div><p>{photo.alt}</p><div className="vehicle-photo-controls"><DocumentPreview src={photo.url} name={photo.alt} label="View" /><button type="button" className="vehicle-photo-delete" onClick={() => { setSelected(photo); dialog.current?.showModal(); }}><Trash2 size={15} />Delete</button></div></article>)}</div> : <p className="vehicle-photo-empty">No photos uploaded yet. Add one using the upload form above.</p>}<dialog ref={dialog} className="request-delete-dialog vehicle-photo-delete-dialog" aria-labelledby={title}><div className="request-dialog-heading"><h3 id={title}>Delete vehicle photo?</h3><button type="button" aria-label="Close delete confirmation" onClick={() => dialog.current?.close()}><X size={20} /></button></div><p>{selected?.alt}</p><p>This photo will be removed from the vehicle gallery. Uploaded files are permanently deleted; externally linked images are only unlinked.</p>{selected && <form action={deleteVehiclePhoto} onSubmit={() => dialog.current?.close()}><input type="hidden" name="mediaId" value={selected.id} /><input type="hidden" name="vehicleId" value={vehicleId} /><input type="hidden" name="confirmDelete" value="yes" /><div className="request-dialog-buttons"><button type="button" className="button outline" onClick={() => dialog.current?.close()}>Keep photo</button><SubmitButton>Delete photo</SubmitButton></div></form>}</dialog></details>;
}
