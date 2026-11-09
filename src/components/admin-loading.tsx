"use client";

import { usePathname } from "next/navigation";
import { AdminContentSkeleton } from "./admin-content-skeleton";

export function AdminLoading() {
  const pathname = usePathname();
  return (
    <AdminContentSkeleton section={pathname.split("/")[2] || "overview"} />
  );
}
