/*
  Warnings:

  - A unique constraint covering the columns `[athleteId,name]` on the table `Tag` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Tag_name_key` ON `tag`;

-- CreateIndex
CREATE UNIQUE INDEX `Tag_athleteId_name_key` ON `Tag`(`athleteId`, `name`);
