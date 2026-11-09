import "server-only";
import { db } from "./db";
let nextCheck=0;
let inFlight: Promise<void> | undefined;
export async function syncDueDeliveries(force=false) {
 if(inFlight)return inFlight;
 if(!force && Date.now()<nextCheck)return;
 inFlight=(async()=>{await db.$queryRaw`SELECT trustride_private.advance_due_deliveries()`;nextCheck=Date.now()+15000;})().finally(()=>{inFlight=undefined;});
 return inFlight;
}
