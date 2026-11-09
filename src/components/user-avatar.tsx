"use client";
import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { UserRound } from "lucide-react";
export function UserAvatar({ src, name = "User", size = 36 }: { src?: string | null; name?: string; size?: number }) {
  const [failed, setFailed] = useState<string | null>(null);
  const showPhoto = Boolean(src && src !== failed);
  return <span className="user-avatar" style={{ "--avatar-size": `${size}px` } as CSSProperties}>{showPhoto ? <Image src={src!} alt={`${name}'s profile photo`} width={size} height={size} unoptimized onError={() => setFailed(src!)} /> : <UserRound size={Math.round(size * .5)} role="img" aria-label={`${name}'s default profile icon`} />}</span>;
}
