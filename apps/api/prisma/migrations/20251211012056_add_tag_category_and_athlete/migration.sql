/*
  Warnings:

  - The values [TECHINCAL_STRENGTH] on the enum `Tag_category` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `tag` MODIFY `category` ENUM('TECHNICAL_ERROR', 'TECHNICAL_STRENGTH', 'TACTICAL_DECISION', 'OFFENSIVE', 'DEFENSIVE', 'PHYSICAL', 'MENTAL') NULL;
