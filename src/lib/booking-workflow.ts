import { z } from "zod";

export const travelDetailsSchema = z.object({
  contactName: z.string().trim().min(1, "Enter your contact name.").max(100),
  phone: z.string().trim().regex(/^\+63[0-9]{7,11}$/, "Enter 7–11 digits after +63, using numbers only."),
  pickupLocation: z.string().trim().min(1, "Enter a pickup location.").max(300),
  destination: z.string().trim().min(1, "Enter your destination.").max(300),
  pickupTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a pickup time."),
  dropoffTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a drop-off time."),
  passengers: z.coerce.number().int().min(1).max(50),
});
export type TravelDetails = z.infer<typeof travelDetailsSchema>;
export type BookingDocument = { path: string; name: string; uploadedAt: string };
export type PaymentProof = {
  document: BookingDocument;
  amountMinor: number;
  reference: string;
  method: "GCASH" | "BANK_TRANSFER";
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedAt?: string;
  reviewNote?: string;
};
export type WorkflowData = {
  distancePricing?: import("./distance-pricing").DistancePricing;
  routePricing?: { status: "READY" | "QUOTATION_REQUIRED"; reason?: string; baseMinor?: number; distanceMinor?: number; totalMinor?: number; area?: string; billedKm?: number; manual?: boolean };
  schedule?: { pickupTime: string; dropoffTime: string };
  testimonialId?: string;
  rejection?: { reason: string; rejectedAt: string };
  service?: "SELF_DRIVE" | "WITH_DRIVER";
  travel?: TravelDetails;
  documents?: Record<string, BookingDocument>;
  documentOcr?: Record<string, { path: string; name: string; licenseNumber: string; ltmsActive?: boolean; checkedAt: string; scanStartedAt?: number }>;
  governmentIdType?: string;
  driverIdType?: string;
  licenseVerification?: { version: 1; name: string; licenseNumber: string; licensePath: string; ltmsPath: string; ltmsActive: true; checkedAt: string };
  privacyConsent?: { version: 1; acceptedAt: string; service: "SELF_DRIVE" | "WITH_DRIVER" };
  requirementsSubmittedAt?: string;
  driverRequest?: { meetupTime: string; notes: string };
  paymentProof?: PaymentProof;
};
export const governmentIdTypes = [
  "Philippine National ID", "Philippine Passport", "UMID", "SSS ID", "GSIS ID",
  "PRC ID", "Postal ID", "PhilHealth ID", "Pag-IBIG ID", "Voter’s ID",
  "TIN ID", "OFW ID",
] as const;
export const governmentIdTypeSchema = z.enum(governmentIdTypes, { error: "Select the type of additional government ID." });
export const selfDriveDocuments = [
  { key: "license", label: "Driver’s license", hint: "A clear copy of your valid driver’s license. This counts as your first government-issued ID." },
  { key: "governmentId1", label: "Additional government ID", hint: "One other valid government-issued ID, in addition to your driver’s license." },
  { key: "ltms", label: "Active license via LTMS", hint: "Show the digital license screen with “Digital ID is Active” at the top." },
  { key: "billing", label: "Proof of billing", hint: "A billing statement showing your name and address." },
];
export function workflowData(value: unknown): WorkflowData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as WorkflowData;
}

export const driverIdTypes = [...governmentIdTypes, "Driver's license"] as const;
export const driverIdTypeSchema = z.enum(driverIdTypes, { error: "Select your valid ID type." });
export const driverDocuments = [{ key: "driverValidId", label: "Valid ID", hint: "Upload one clear, valid government-issued ID." }];
export function hasRequiredDriverId(data: WorkflowData): boolean {
  return data.service !== "WITH_DRIVER" || (driverIdTypeSchema.safeParse(data.driverIdType).success && Boolean(data.documents?.driverValidId?.path));
}

export function hasSelfDriveLicenseMatch(data: WorkflowData): boolean {
  const check = data.licenseVerification;
  return data.service !== "SELF_DRIVE" || Boolean(check?.version === 1 && check.ltmsActive && check.name && check.licenseNumber && check.licensePath && check.ltmsPath && check.licensePath === data.documents?.license?.path && check.ltmsPath === data.documents?.ltms?.path);
}


