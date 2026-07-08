-- DropForeignKey
ALTER TABLE "Tariff" DROP CONSTRAINT "Tariff_organizationTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Tariff" DROP CONSTRAINT "Tariff_usageTypeId_fkey";

-- AlterTable
ALTER TABLE "Tariff" ALTER COLUMN "organizationTypeId" DROP NOT NULL,
ALTER COLUMN "usageTypeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Tariff" ADD CONSTRAINT "Tariff_organizationTypeId_fkey" FOREIGN KEY ("organizationTypeId") REFERENCES "OrganizationType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tariff" ADD CONSTRAINT "Tariff_usageTypeId_fkey" FOREIGN KEY ("usageTypeId") REFERENCES "UsageType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
