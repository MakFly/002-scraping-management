-- CreateTable
CREATE TABLE "ScrapeJob" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapeJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeJobHistory" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "itemsScraped" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT[],
    "logs" TEXT[],
    "results" JSONB,

    CONSTRAINT "ScrapeJobHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScrapeJob_status_idx" ON "ScrapeJob"("status");

-- CreateIndex
CREATE INDEX "ScrapeJob_createdAt_idx" ON "ScrapeJob"("createdAt");

-- CreateIndex
CREATE INDEX "ScrapeJobHistory_jobId_idx" ON "ScrapeJobHistory"("jobId");

-- CreateIndex
CREATE INDEX "ScrapeJobHistory_startTime_idx" ON "ScrapeJobHistory"("startTime");

-- CreateIndex
CREATE INDEX "ScrapeJobHistory_status_idx" ON "ScrapeJobHistory"("status");

-- AddForeignKey
ALTER TABLE "ScrapeJobHistory" ADD CONSTRAINT "ScrapeJobHistory_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ScrapeJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
