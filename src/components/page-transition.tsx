"use client";

import { usePathname } from "next/navigation";

export function PageTransition({
  children,
  withinAdmin = false,
}: {
  children: React.ReactNode;
  withinAdmin?: boolean;
}) {
  const pathname = usePathname();
  const preserveShell =
    !withinAdmin && (pathname === "/admin" || pathname.startsWith("/admin/"));

  return (
    <div
      key={preserveShell ? "admin-workspace" : pathname}
      className={preserveShell ? undefined : "page-transition"}
    >
      {children}
    </div>
  );
}
