-- CreateTable
CREATE TABLE "VehicleAd" (
    "id" TEXT NOT NULL,
    "scrapeJobHistoryId" INTEGER NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "mileage" INTEGER NOT NULL,
    "fuel" TEXT NOT NULL,
    "transmission" TEXT NOT NULL,
    "fiscalPower" INTEGER NOT NULL,
    "dinPower" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "doors" INTEGER NOT NULL,
    "seats" INTEGER NOT NULL,
    "inspectionValidUntil" TEXT NOT NULL,
    "features" TEXT[],
    "condition" TEXT NOT NULL,
    "imageUrls" TEXT[],
    "thumbnail" TEXT,
    "sellerName" TEXT NOT NULL,
    "sellerType" TEXT NOT NULL,
    "hasPhone" BOOLEAN NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleAd_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleAd_platform_externalId_idx" ON "VehicleAd"("platform", "externalId");

-- CreateIndex
CREATE INDEX "VehicleAd_brand_model_idx" ON "VehicleAd"("brand", "model");

-- CreateIndex
CREATE INDEX "VehicleAd_price_idx" ON "VehicleAd"("price");

-- CreateIndex
CREATE INDEX "VehicleAd_year_idx" ON "VehicleAd"("year");

-- CreateIndex
CREATE INDEX "VehicleAd_mileage_idx" ON "VehicleAd"("mileage");

-- CreateIndex
CREATE INDEX "VehicleAd_scrapeJobHistoryId_idx" ON "VehicleAd"("scrapeJobHistoryId");

-- AddForeignKey
ALTER TABLE "VehicleAd" ADD CONSTRAINT "VehicleAd_scrapeJobHistoryId_fkey" FOREIGN KEY ("scrapeJobHistoryId") REFERENCES "ScrapeJobHistory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
