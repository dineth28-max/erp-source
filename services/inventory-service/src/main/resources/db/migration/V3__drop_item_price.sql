-- Pricing moved to master-data-service (price_list_entries) so there is a
-- single source of truth for what an item costs, instead of two independent
-- fields that could drift out of sync. See PriceListEntry in master-data-service.
ALTER TABLE items DROP COLUMN unit_price;
