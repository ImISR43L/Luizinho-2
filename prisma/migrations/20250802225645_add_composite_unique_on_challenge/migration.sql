/*
  Warnings:

  - A unique constraint covering the columns `[creatorId,title]` on the table `Challenge` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Challenge_creatorId_title_key" ON "public"."Challenge"("creatorId", "title");
