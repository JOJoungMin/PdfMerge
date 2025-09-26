-- CreateTable
CREATE TABLE `UserExperienceLog` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metricName` VARCHAR(191) NOT NULL,
    `durationInMs` INTEGER NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `fileCount` INTEGER NULL,
    `totalFileSizeInBytes` BIGINT NULL,
    `githubVersion` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
