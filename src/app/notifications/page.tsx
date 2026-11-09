export const dynamic = "force-dynamic";
import { requireUser } from "@/lib/auth";
import { NotificationInbox } from "@/components/notification-inbox";
export default async function Notifications() {
  await requireUser("/notifications");
  return <section className="wrap page notification-page"><h1>Notifications</h1><p>Updates on your reservation requests.</p><NotificationInbox /></section>;
}
