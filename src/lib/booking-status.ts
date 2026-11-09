export const bookingStatusTransitions: Record<string, readonly string[]> = {
 PENDING:["CONFIRMED","REJECTED","CANCELLED"],
 CONFIRMED:["DELIVERED","CANCELLED"],
 DELIVERED:["COMPLETED"],
 CANCELLED:[],REJECTED:[],COMPLETED:[],
};
export const canTransitionBooking = (from: string, to: string) => bookingStatusTransitions[from]?.includes(to) ?? false;
export function bookingPickupAt(startDate: string, pickupTime?: string) {
 const time=pickupTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(pickupTime)?pickupTime:"09:00";
 return new Date(`${startDate}T${time}:00+08:00`);
}
export function isDeliveryDue(status: string, startDate: string, pickupTime?: string, now=new Date()) {
 return status==="CONFIRMED" && bookingPickupAt(startDate,pickupTime)<=now;
}
