-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "manager_display_title" TEXT,
ADD COLUMN     "use_manager_display_title" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "divisions" ADD COLUMN     "manager_display_title" TEXT,
ADD COLUMN     "use_manager_display_title" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sections" ADD COLUMN     "manager_display_title" TEXT,
ADD COLUMN     "use_manager_display_title" BOOLEAN NOT NULL DEFAULT false;
