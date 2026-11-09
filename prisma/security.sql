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
