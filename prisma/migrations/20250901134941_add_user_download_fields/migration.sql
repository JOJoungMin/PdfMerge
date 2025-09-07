/*
  Warnings:

  - Added the required column `lastDownloadDate` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `User` ADD COLUMN `downloadCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lastDownloadDate` DATETIME(3) NOT NULL;
