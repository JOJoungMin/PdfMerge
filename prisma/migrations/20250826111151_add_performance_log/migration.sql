-- CreateTable
CREATE TABLE `PerformanceLog` (
    `id` VARCHAR(191) NOT NULL,
    `operationType` ENUM('MERGE', 'COMPRESS', 'CONVERT_TO_IMAGE', 'EDIT') NOT NULL,
    `fileCount` INTEGER NOT NULL,
    `totalInputSizeInBytes` BIGINT NOT NULL,
    `outputSizeInBytes` BIGINT NULL,
    `processingTimeInMs` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
