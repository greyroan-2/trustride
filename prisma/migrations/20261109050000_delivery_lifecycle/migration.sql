ALTER TABLE public."Booking" ADD COLUMN "deliveredAt" TIMESTAMPTZ(3);
ALTER TABLE public."Booking" DROP CONSTRAINT no_confirmed_overlap;
ALTER TABLE public."Booking" ADD CONSTRAINT no_confirmed_overlap EXCLUDE USING gist
("vehicleId" WITH =, daterange("startDate","endDate",'[)') WITH &&)
WHERE (status IN ('CONFIRMED','DELIVERED'));
CREATE INDEX "Booking_due_delivery_idx" ON public."Booking" ("startDate") WHERE status='CONFIRMED';

CREATE OR REPLACE FUNCTION public.guard_vehicle_period() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM id FROM public."Vehicle" WHERE id=NEW."vehicleId" FOR UPDATE;
 IF TG_TABLE_NAME='Booking' THEN
  IF NEW.status IN ('CONFIRMED','DELIVERED') AND EXISTS (SELECT 1 FROM public."AvailabilityBlock" b WHERE b."vehicleId"=NEW."vehicleId" AND b."startDate"<NEW."endDate" AND b."endDate">NEW."startDate") THEN
   RAISE EXCEPTION 'Reservation overlaps unavailable period';
  END IF;
 ELSE
  IF EXISTS (SELECT 1 FROM public."Booking" b WHERE b.status IN ('CONFIRMED','DELIVERED') AND b."vehicleId"=NEW."vehicleId" AND b."startDate"<NEW."endDate" AND b."endDate">NEW."startDate") THEN
   RAISE EXCEPTION 'Unavailable period overlaps confirmed or delivered reservation';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.preserve_confirmed_price() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status IN ('CONFIRMED','DELIVERED','COMPLETED') AND ROW(NEW."dailyMinor",NEW."feeMinor",NEW."depositMinor",NEW."totalMinor",NEW.currency) IS DISTINCT FROM ROW(OLD."dailyMinor",OLD."feeMinor",OLD."depositMinor",OLD."totalMinor",OLD.currency) THEN
  RAISE EXCEPTION 'Confirmed booking price snapshots are immutable';
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION trustride_private.booking_pickup_at(start_date date, data jsonb)
RETURNS timestamptz LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT (start_date + CASE WHEN COALESCE(data #>> '{schedule,pickupTime}',data #>> '{travel,pickupTime}','09:00') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
 THEN COALESCE(data #>> '{schedule,pickupTime}',data #>> '{travel,pickupTime}','09:00')::time ELSE '09:00'::time END) AT TIME ZONE 'Asia/Manila';
$$;
REVOKE ALL ON FUNCTION trustride_private.booking_pickup_at(date,jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.guard_booking_lifecycle() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE workflow jsonb;
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.status IN ('DELIVERED','COMPLETED') THEN RAISE EXCEPTION 'A new booking must be confirmed before delivery'; END IF;
  RETURN NEW;
 END IF;
 IF OLD.status=NEW.status THEN RETURN NEW; END IF;
 IF NOT ((OLD.status='PENDING' AND NEW.status IN ('CONFIRMED','REJECTED','CANCELLED')) OR
         (OLD.status='CONFIRMED' AND NEW.status IN ('DELIVERED','CANCELLED','REJECTED')) OR
         (OLD.status='DELIVERED' AND NEW.status='COMPLETED')) THEN
  RAISE EXCEPTION 'Invalid booking status transition';
 END IF;
 IF NEW.status='DELIVERED' THEN
  SELECT data INTO workflow FROM public."BookingWorkflow" WHERE "bookingId"=NEW.id;
  IF trustride_private.booking_pickup_at(NEW."startDate",COALESCE(workflow,'{}'::jsonb))>now() THEN RAISE EXCEPTION 'Delivery is available only once pickup has started'; END IF;
  NEW."deliveredAt"=now();
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_booking_lifecycle() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER booking_lifecycle_guard BEFORE INSERT OR UPDATE OF status ON public."Booking" FOR EACH ROW EXECUTE FUNCTION public.guard_booking_lifecycle();

CREATE OR REPLACE FUNCTION trustride_private.advance_due_deliveries() RETURNS integer
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE unit uuid; changed integer; total integer:=0;
BEGIN
 -- Match all other booking mutation paths: lock vehicle before booking rows.
 FOR unit IN SELECT DISTINCT b."vehicleId" FROM public."Booking" b
  WHERE b.status='CONFIRMED' AND b."startDate"<=(now() AT TIME ZONE 'Asia/Manila')::date ORDER BY b."vehicleId"
 LOOP
  PERFORM id FROM public."Vehicle" WHERE id=unit FOR UPDATE;
  UPDATE public."Booking" b SET status='DELIVERED'
  WHERE b."vehicleId"=unit AND b.status='CONFIRMED'
    AND trustride_private.booking_pickup_at(b."startDate",COALESCE((SELECT w.data FROM public."BookingWorkflow" w WHERE w."bookingId"=b.id),'{}'::jsonb))<=now();
  GET DIAGNOSTICS changed=ROW_COUNT;
  total:=total+changed;
 END LOOP;
 RETURN total;
END $$;
REVOKE ALL ON FUNCTION trustride_private.advance_due_deliveries() FROM PUBLIC,anon,authenticated;
