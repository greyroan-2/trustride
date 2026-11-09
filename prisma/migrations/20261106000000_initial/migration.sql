-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER,
    "category" TEXT NOT NULL DEFAULT 'MPV',
    "seats" INTEGER,
    "transmission" TEXT,
    "luggage" TEXT,
    "features" TEXT[],
    "description" TEXT NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" UUID NOT NULL,
    "modelId" UUID NOT NULL,
    "unitCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMedia" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "alt" TEXT NOT NULL,

    CONSTRAINT "VehicleMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "dailyMinor" INTEGER NOT NULL,
    "feeMinor" INTEGER NOT NULL DEFAULT 0,
    "depositMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "customerId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "dailyMinor" INTEGER NOT NULL,
    "feeMinor" INTEGER NOT NULL,
    "depositMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "cancellationRequested" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityBlock" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "AvailabilityBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" UUID NOT NULL,
    "customerId" UUID,
    "author" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_email_key" ON "UserProfile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_slug_key" ON "VehicleModel"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_unitCode_key" ON "Vehicle"("unitCode");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_vehicleId_key" ON "PricingRule"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");

-- CreateIndex
CREATE INDEX "Booking_customerId_createdAt_idx" ON "Booking"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_vehicleId_startDate_endDate_idx" ON "Booking"("vehicleId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "AvailabilityBlock_vehicleId_startDate_endDate_idx" ON "AvailabilityBlock"("vehicleId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMedia" ADD CONSTRAINT "VehicleMedia_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Apply through an operator migration role, never the application role.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Booking" ADD CONSTRAINT booking_dates CHECK ("endDate" > "startDate");
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT block_dates CHECK ("endDate" > "startDate");
ALTER TABLE "PricingRule" ADD CONSTRAINT nonnegative_rates CHECK ("dailyMinor" >= 0 AND "feeMinor" >= 0 AND "depositMinor" >= 0);
ALTER TABLE "Booking" ADD CONSTRAINT nonnegative_booking CHECK ("dailyMinor" >= 0 AND "feeMinor" >= 0 AND "depositMinor" >= 0 AND "totalMinor" >= 0);
ALTER TABLE "Booking" ADD CONSTRAINT no_confirmed_overlap EXCLUDE USING gist ("vehicleId" WITH =, daterange("startDate", "endDate", '[)') WITH &&) WHERE (status = 'CONFIRMED');
-- Serialize booking / block mutations on their physical vehicle, including writes outside Prisma.
CREATE FUNCTION guard_vehicle_period() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM id FROM "Vehicle" WHERE id = NEW."vehicleId" FOR UPDATE;
 IF TG_TABLE_NAME = 'Booking' THEN
  IF NEW.status = 'CONFIRMED' AND EXISTS (SELECT 1 FROM "AvailabilityBlock" b WHERE b."vehicleId" = NEW."vehicleId" AND b."startDate" < NEW."endDate" AND b."endDate" > NEW."startDate") THEN
   RAISE EXCEPTION 'Reservation overlaps unavailable period';
  END IF;
 ELSE
  IF EXISTS (SELECT 1 FROM "Booking" b WHERE b."vehicleId" = NEW."vehicleId" AND b.status = 'CONFIRMED' AND b."startDate" < NEW."endDate" AND b."endDate" > NEW."startDate") THEN
   RAISE EXCEPTION 'Unavailable period overlaps confirmed reservation';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER booking_period_guard BEFORE INSERT OR UPDATE ON "Booking" FOR EACH ROW EXECUTE FUNCTION guard_vehicle_period();
CREATE TRIGGER availability_period_guard BEFORE INSERT OR UPDATE ON "AvailabilityBlock" FOR EACH ROW EXECUTE FUNCTION guard_vehicle_period();
-- No direct public Supabase Data API access. Prisma uses an exclusively server-held DB role.
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['UserProfile','VehicleModel','Vehicle','VehicleMedia','Booking','AvailabilityBlock','PricingRule','PaymentRecord','Testimonial','AdminAuditLog'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
 EXECUTE format('REVOKE ALL ON TABLE %I FROM anon, authenticated', t);
 END LOOP; END $$;

ALTER TABLE "Vehicle" ADD CONSTRAINT vehicle_status CHECK (status IN ('ACTIVE','UNAVAILABLE','MAINTENANCE'));
ALTER TABLE "VehicleMedia" ADD CONSTRAINT media_type CHECK (type IN ('IMAGE','MODEL','PANORAMA'));
ALTER TABLE "VehicleModel" ADD CONSTRAINT valid_capacity CHECK (seats IS NULL OR seats > 0);
ALTER TABLE "PaymentRecord" ADD CONSTRAINT payment_amount CHECK ("amountMinor" >= 0);
CREATE FUNCTION preserve_confirmed_price() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status IN ('CONFIRMED','COMPLETED') AND ROW(NEW."dailyMinor",NEW."feeMinor",NEW."depositMinor",NEW."totalMinor",NEW.currency) IS DISTINCT FROM ROW(OLD."dailyMinor",OLD."feeMinor",OLD."depositMinor",OLD."totalMinor",OLD.currency) THEN
  RAISE EXCEPTION 'Confirmed booking price snapshots are immutable';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER booking_price_guard BEFORE UPDATE ON "Booking" FOR EACH ROW EXECUTE FUNCTION preserve_confirmed_price();
