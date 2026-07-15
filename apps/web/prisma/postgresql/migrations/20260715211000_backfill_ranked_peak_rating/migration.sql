-- Backfill the best rating that can be proven for already placed players.
UPDATE "RankedSeasonRating"
SET "peakRating" = "rating"
WHERE "placementMatches" >= 5 AND "peakRating" IS NULL;
