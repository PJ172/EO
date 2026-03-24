/*
  Warnings:

  - The values [OPEN,ASSIGNED,REOPENED] on the enum `TicketStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `parent_id` on the `departments` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `departments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employee_code]` on the table `employees` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `factories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `job_titles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "VisibilityTargetType" AS ENUM ('USER', 'DEPT', 'DIV', 'FACT', 'COMP', 'GLOBAL', 'ROLE');

-- CreateEnum
CREATE TYPE "TicketApproverType" AS ENUM ('SPECIFIC_USER', 'ROLE', 'DIRECT_MANAGER', 'DEPT_MANAGER', 'IT_STAFF');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('COMPLETED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "TicketApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING_L1', 'PENDING_L2', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TicketWorkflowType" AS ENUM ('SIMPLE', 'FULL');

-- AlterEnum
BEGIN;
CREATE TYPE "TicketStatus_new" AS ENUM ('DRAFT', 'DEPT_PENDING', 'IT_PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED');
ALTER TABLE "tickets" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tickets" ALTER COLUMN "status" TYPE "TicketStatus_new" USING ("status"::text::"TicketStatus_new");
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
ALTER TYPE "TicketStatus_new" RENAME TO "TicketStatus";
DROP TYPE "TicketStatus_old";
ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_parent_id_fkey";

-- DropIndex
DROP INDEX "departments_code_deleted_at_key";

-- DropIndex
DROP INDEX "departments_parent_id_idx";

-- DropIndex
DROP INDEX "employees_company_id_idx";

-- DropIndex
DROP INDEX "employees_employee_code_deleted_at_key";

-- DropIndex
DROP INDEX "factories_code_deleted_at_key";

-- DropIndex
DROP INDEX "job_titles_code_deleted_at_key";

-- DropIndex
DROP INDEX "users_email_deleted_at_key";

-- DropIndex
DROP INDEX "users_username_deleted_at_key";

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "exclude_from_filters" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manager_employee_id" TEXT,
ADD COLUMN     "show_on_org_chart" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ui_position_x" DOUBLE PRECISION,
ADD COLUMN     "ui_position_y" DOUBLE PRECISION,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "departments" DROP COLUMN "parent_id",
DROP COLUMN "type",
ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "exclude_from_filters" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_on_org_chart" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ui_position_x" DOUBLE PRECISION,
ADD COLUMN     "ui_position_y" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "divisions" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "exclude_from_filters" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_on_org_chart" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ui_position_x" DOUBLE PRECISION,
ADD COLUMN     "ui_position_y" DOUBLE PRECISION,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_batch_id" TEXT,
ADD COLUMN     "deleted_by_id" TEXT;

-- AlterTable
ALTER TABLE "employee_kpis" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_batch_id" TEXT,
ADD COLUMN     "deleted_by_id" TEXT;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "show_on_org_chart" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "factories" ADD COLUMN     "exclude_from_filters" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manager_employee_id" TEXT,
ADD COLUMN     "show_on_org_chart" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ui_position_x" DOUBLE PRECISION,
ADD COLUMN     "ui_position_y" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_batch_id" TEXT,
ADD COLUMN     "deleted_by_id" TEXT;

-- AlterTable
ALTER TABLE "it_assets" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_batch_id" TEXT,
ADD COLUMN     "deleted_by_id" TEXT;

-- AlterTable
ALTER TABLE "news_articles" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_batch_id" TEXT,
ADD COLUMN     "deleted_by_id" TEXT;

-- AlterTable
ALTER TABLE "project_tasks" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_batch_id" TEXT,
ADD COLUMN     "deleted_by_id" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_batch_id" TEXT,
ADD COLUMN     "deleted_by_id" TEXT;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_batch_id" TEXT,
ADD COLUMN     "deleted_by_id" TEXT;

-- AlterTable
ALTER TABLE "sections" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "exclude_from_filters" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_on_org_chart" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ui_position_x" DOUBLE PRECISION,
ADD COLUMN     "ui_position_y" DOUBLE PRECISION,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_batch_id" TEXT,
ADD COLUMN     "deleted_by_id" TEXT;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "asset_id" TEXT,
ADD COLUMN     "current_step_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_batch_id" TEXT,
ADD COLUMN     "deleted_by_id" TEXT,
ADD COLUMN     "is_approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "workflow_config_id" TEXT,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- DropEnum
DROP TYPE "DepartmentType";

-- CreateTable
CREATE TABLE "module_visibility_configs" (
    "id" TEXT NOT NULL,
    "module_code" TEXT NOT NULL,
    "target_type" "VisibilityTargetType" NOT NULL,
    "target_id" TEXT,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" TEXT,
    "name" TEXT,

    CONSTRAINT "module_visibility_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "document_version_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_workflow_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "category_id" TEXT,
    "department_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_workflow_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_workflow_steps" (
    "id" TEXT NOT NULL,
    "workflow_config_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "approver_type" "TicketApproverType" NOT NULL,
    "approver_id" TEXT,

    CONSTRAINT "ticket_workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_approvals" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "approver_id" TEXT NOT NULL,
    "original_approver_id" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_delegations" (
    "id" TEXT NOT NULL,
    "from_employee_id" TEXT NOT NULL,
    "to_employee_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,

    CONSTRAINT "ticket_delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_history" (
    "id" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "module_type" TEXT,
    "file_name" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "success" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "status" "ImportStatus" NOT NULL DEFAULT 'COMPLETED',
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trash_retention_configs" (
    "id" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "retention_days" INTEGER NOT NULL DEFAULT 30,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" TEXT,

    CONSTRAINT "trash_retention_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_attachments" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_logs" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "module_visibility_configs_target_type_target_id_idx" ON "module_visibility_configs"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_visibility_configs_module_code_target_type_target_id_key" ON "module_visibility_configs"("module_code", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "document_chunks_document_version_id_idx" ON "document_chunks"("document_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_workflow_steps_workflow_config_id_order_key" ON "ticket_workflow_steps"("workflow_config_id", "order");

-- CreateIndex
CREATE INDEX "import_history_module_key_idx" ON "import_history"("module_key");

-- CreateIndex
CREATE INDEX "import_history_user_id_idx" ON "import_history"("user_id");

-- CreateIndex
CREATE INDEX "import_history_created_at_idx" ON "import_history"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "trash_retention_configs_module_key_key" ON "trash_retention_configs"("module_key");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_attachments_ticket_id_file_id_key" ON "ticket_attachments"("ticket_id", "file_id");

-- CreateIndex
CREATE INDEX "ticket_logs_ticket_id_idx" ON "ticket_logs"("ticket_id");

-- CreateIndex
CREATE INDEX "companies_deleted_batch_id_idx" ON "companies"("deleted_batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE INDEX "departments_division_id_idx" ON "departments"("division_id");

-- CreateIndex
CREATE INDEX "departments_deleted_batch_id_idx" ON "departments"("deleted_batch_id");

-- CreateIndex
CREATE INDEX "divisions_deleted_batch_id_idx" ON "divisions"("deleted_batch_id");

-- CreateIndex
CREATE INDEX "documents_deleted_at_idx" ON "documents"("deleted_at");

-- CreateIndex
CREATE INDEX "documents_deleted_batch_id_idx" ON "documents"("deleted_batch_id");

-- CreateIndex
CREATE INDEX "employee_kpis_deleted_at_idx" ON "employee_kpis"("deleted_at");

-- CreateIndex
CREATE INDEX "employee_kpis_deleted_batch_id_idx" ON "employee_kpis"("deleted_batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_code_key" ON "employees"("employee_code");

-- CreateIndex
CREATE INDEX "employees_deleted_batch_id_idx" ON "employees"("deleted_batch_id");

-- CreateIndex
CREATE INDEX "employees_full_name_idx" ON "employees"("full_name");

-- CreateIndex
CREATE INDEX "employees_email_company_idx" ON "employees"("email_company");

-- CreateIndex
CREATE UNIQUE INDEX "factories_code_key" ON "factories"("code");

-- CreateIndex
CREATE INDEX "factories_company_id_idx" ON "factories"("company_id");

-- CreateIndex
CREATE INDEX "factories_deleted_batch_id_idx" ON "factories"("deleted_batch_id");

-- CreateIndex
CREATE INDEX "files_deleted_at_idx" ON "files"("deleted_at");

-- CreateIndex
CREATE INDEX "files_deleted_batch_id_idx" ON "files"("deleted_batch_id");

-- CreateIndex
CREATE INDEX "it_assets_deleted_at_idx" ON "it_assets"("deleted_at");

-- CreateIndex
CREATE INDEX "it_assets_deleted_batch_id_idx" ON "it_assets"("deleted_batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_titles_code_key" ON "job_titles"("code");

-- CreateIndex
CREATE INDEX "job_titles_deleted_batch_id_idx" ON "job_titles"("deleted_batch_id");

-- CreateIndex
CREATE INDEX "news_articles_deleted_at_idx" ON "news_articles"("deleted_at");

-- CreateIndex
CREATE INDEX "news_articles_deleted_batch_id_idx" ON "news_articles"("deleted_batch_id");

-- CreateIndex
CREATE INDEX "project_tasks_deleted_at_idx" ON "project_tasks"("deleted_at");

-- CreateIndex
CREATE INDEX "project_tasks_deleted_batch_id_idx" ON "project_tasks"("deleted_batch_id");

-- CreateIndex
CREATE INDEX "projects_deleted_at_idx" ON "projects"("deleted_at");

-- CreateIndex
CREATE INDEX "projects_deleted_batch_id_idx" ON "projects"("deleted_batch_id");

-- CreateIndex
CREATE INDEX "roles_deleted_at_idx" ON "roles"("deleted_at");

-- CreateIndex
CREATE INDEX "roles_deleted_batch_id_idx" ON "roles"("deleted_batch_id");

-- CreateIndex
CREATE INDEX "sections_deleted_batch_id_idx" ON "sections"("deleted_batch_id");

-- CreateIndex
CREATE INDEX "tasks_deleted_at_idx" ON "tasks"("deleted_at");

-- CreateIndex
CREATE INDEX "tasks_deleted_batch_id_idx" ON "tasks"("deleted_batch_id");

-- CreateIndex
CREATE INDEX "tickets_deleted_at_idx" ON "tickets"("deleted_at");

-- CreateIndex
CREATE INDEX "tickets_deleted_batch_id_idx" ON "tickets"("deleted_batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_deleted_batch_id_idx" ON "users"("deleted_batch_id");

-- AddForeignKey
ALTER TABLE "module_visibility_configs" ADD CONSTRAINT "module_visibility_configs_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factories" ADD CONSTRAINT "factories_manager_employee_id_fkey" FOREIGN KEY ("manager_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_manager_employee_id_fkey" FOREIGN KEY ("manager_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_manager_employee_id_fkey" FOREIGN KEY ("manager_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_manager_employee_id_fkey" FOREIGN KEY ("manager_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_version_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_kpis" ADD CONSTRAINT "employee_kpis_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "it_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_workflow_config_id_fkey" FOREIGN KEY ("workflow_config_id") REFERENCES "ticket_workflow_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_workflow_steps" ADD CONSTRAINT "ticket_workflow_steps_workflow_config_id_fkey" FOREIGN KEY ("workflow_config_id") REFERENCES "ticket_workflow_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_approvals" ADD CONSTRAINT "ticket_approvals_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "ticket_workflow_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_approvals" ADD CONSTRAINT "ticket_approvals_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_delegations" ADD CONSTRAINT "ticket_delegations_from_employee_id_fkey" FOREIGN KEY ("from_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_delegations" ADD CONSTRAINT "ticket_delegations_to_employee_id_fkey" FOREIGN KEY ("to_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_history" ADD CONSTRAINT "import_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trash_retention_configs" ADD CONSTRAINT "trash_retention_configs_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_logs" ADD CONSTRAINT "ticket_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_logs" ADD CONSTRAINT "ticket_logs_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
