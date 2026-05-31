ALTER TABLE "Document"
ADD CONSTRAINT "Document_exactly_one_target_check"
CHECK (
  (CASE WHEN "organizationId" IS NULL THEN 0 ELSE 1 END) +
  (CASE WHEN "buildingId" IS NULL THEN 0 ELSE 1 END) +
  (CASE WHEN "roomId" IS NULL THEN 0 ELSE 1 END) = 1
);
