-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatar" TEXT,
    "upiId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN "personId" TEXT;

-- Conservative legacy backfill: create one Person per existing Participant.
-- This intentionally does not merge participants that share the same display
-- name. Explicit linking can later point multiple participants at the same
-- Person without rewriting historical expenses.
INSERT INTO "Person" ("id", "displayName", "createdAt", "updatedAt")
SELECT 'legacy_' || "id", "name", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Participant"
WHERE "personId" IS NULL;

UPDATE "Participant"
SET "personId" = 'legacy_' || "id"
WHERE "personId" IS NULL;

-- CreateTable
CREATE TABLE "DirectGroup" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "personAId" TEXT NOT NULL,
    "personBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Participant_personId_idx" ON "Participant"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectGroup_groupId_key" ON "DirectGroup"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectGroup_personAId_personBId_key" ON "DirectGroup"("personAId", "personBId");

-- CreateIndex
CREATE INDEX "DirectGroup_personBId_idx" ON "DirectGroup"("personBId");

-- AddCheck
ALTER TABLE "DirectGroup" ADD CONSTRAINT "DirectGroup_distinct_people_check" CHECK ("personAId" <> "personBId");

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectGroup" ADD CONSTRAINT "DirectGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectGroup" ADD CONSTRAINT "DirectGroup_personAId_fkey" FOREIGN KEY ("personAId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectGroup" ADD CONSTRAINT "DirectGroup_personBId_fkey" FOREIGN KEY ("personBId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
