ALTER TABLE "PricingRule" ADD COLUMN "distancePricing" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "PricingRule" ADD CONSTRAINT distance_pricing_object CHECK (jsonb_typeof("distancePricing") = 'object');
