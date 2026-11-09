"use client";

import { useRef } from "react";
import Image from "next/image";
import portalReference from "../../public/images/active-portal.png";

export function PortalReference() {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className="portal-reference-trigger" onClick={() => dialog.current?.showModal()}>View required screenshot reference ↗</button>
      <dialog ref={dialog} className="portal-reference-dialog" aria-label="LTMS active license reference" onClick={() => dialog.current?.close()}>
        <button type="button" className="portal-reference-content" aria-label="Close LTMS reference" onClick={() => dialog.current?.close()}>
          <Image src={portalReference} alt="LTMS digital driver’s license showing Digital ID is Active" sizes="(max-width: 600px) 85vw, 420px" />
          <span>Click anywhere or press Escape to close</span>
        </button>
      </dialog>
    </>
  );
}
