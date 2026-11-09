"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveProfilePhoto } from "@/app/actions/profile-photo";
import { UserAvatar } from "./user-avatar";
export function ProfilePhotoSettings({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const [state,action,pending]=useActionState(saveProfilePhoto,{});
  const [preview,setPreview]=useState<string | null>(null);
  const input=useRef<HTMLInputElement>(null);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
  const saved=state.avatarUrl!==undefined?state.avatarUrl:avatarUrl;
  return <form action={action} className="profile-photo-settings"><UserAvatar src={preview || saved} name={name} size={88} /><label htmlFor="profile-photo">Profile photo<input ref={input} id="profile-photo" type="file" name="photo" accept="image/jpeg,image/png" disabled={pending} onChange={event=>{const file=event.target.files?.[0];setPreview(file?URL.createObjectURL(file):null);}} /></label><p>JPEG or PNG, up to 5 MB. Your photo can appear beside your published testimonials.</p><div className="profile-photo-actions"><button type="submit" name="operation" value="upload" disabled={pending || !preview}>{pending?"Saving...":"Save photo"}</button>{saved && <button type="submit" name="operation" value="remove" disabled={pending} onClick={()=>{setPreview(null);if(input.current)input.current.value="";}}>Remove</button>}</div>{state.error && <p role="alert" className="profile-photo-error">{state.error}</p>}{state.success && <p role="status" className="profile-photo-success">{state.success}</p>}</form>;
}
