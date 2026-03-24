/*
  Warnings:

  - The values [DEFINITE_TERM] on the enum `ContractType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `phone` on the `employee_families` table. All the data in the column will be lost.
  - You are about to drop the column `relation` on the `employee_families` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code,deleted_at]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employee_code,deleted_at]` on the table `employees` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code,deleted_at]` on the table `job_titles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username,deleted_at]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,deleted_at]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[workflow_id,order]` on the table `workflow_steps` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `relationship` to the `employee_families` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `employee_families` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FactoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "JobTitleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "FamilyRelationship" AS ENUM ('SPOUSE', 'WIFE', 'HUSBAND', 'FATHER', 'MOTHER', 'CHILD', 'BROTHER', 'SISTER');

-- CreateEnum
CREATE TYPE "EmploymentEventType" AS ENUM ('PROBATION', 'OFFICIAL', 'RESIGNED', 'MATERNITY_LEAVE', 'RETURN_TO_WORK', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "WorkflowStepType" AS ENUM ('SEQUENTIAL', 'PARALLEL');

-- CreateEnum
CREATE TYPE "MealSessionCode" AS ENUM ('LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'LATE_NIGHT_SNACK');

-- CreateEnum
CREATE TYPE "MealRegStatus" AS ENUM ('REGISTERED', 'CANCELLED', 'USED');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED', 'LOST');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'POOR', 'BROKEN');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('REPAIR', 'UPGRADE', 'INSPECTION', 'REPLACEMENT');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED');

-- AlterEnum
BEGIN;
CREATE TYPE "ContractType_new" AS ENUM ('PROBATION', 'INDEFINITE_TERM', 'SEASONAL', 'ONE_YEAR', 'TWO_YEARS', 'THREE_YEARS');
ALTER TABLE "employees" ALTER COLUMN "contract_type" TYPE "ContractType_new" USING ("contract_type"::text::"ContractType_new");
ALTER TYPE "ContractType" RENAME TO "ContractType_old";
ALTER TYPE "ContractType_new" RENAME TO "ContractType";
DROP TYPE "ContractType_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EducationLevel" ADD VALUE 'GRADE_12_12';
ALTER TYPE "EducationLevel" ADD VALUE 'GRADE_11_12';
ALTER TYPE "EducationLevel" ADD VALUE 'GRADE_10_12';
ALTER TYPE "EducationLevel" ADD VALUE 'GRADE_9_12';
ALTER TYPE "EducationLevel" ADD VALUE 'GRADE_8_12';
ALTER TYPE "EducationLevel" ADD VALUE 'GRADE_7_12';
ALTER TYPE "EducationLevel" ADD VALUE 'GRADE_6_12';
ALTER TYPE "EducationLevel" ADD VALUE 'GRADE_5_12';
ALTER TYPE "EducationLevel" ADD VALUE 'GRADE_4_12';
ALTER TYPE "EducationLevel" ADD VALUE 'GRADE_3_12';
ALTER TYPE "EducationLevel" ADD VALUE 'GRADE_2_12';
ALTER TYPE "EducationLevel" ADD VALUE 'GRADE_1_12';

-- AlterEnum
ALTER TYPE "EmploymentStatus" ADD VALUE 'MATERNITY_LEAVE';

-- DropIndex
DROP INDEX "departments_code_key";

-- DropIndex
DROP INDEX "employee_families_employee_id_idx";

-- DropIndex
DROP INDEX "employees_employee_code_key";

-- DropIndex
DROP INDEX "job_titles_code_key";

-- DropIndex
DROP INDEX "users_email_key";

-- DropIndex
DROP INDEX "users_username_key";

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_batch_id" TEXT,
ADD COLUMN     "deleted_by_id" TEXT,
ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "employee_families" DROP COLUMN "phone",
DROP COLUMN "relation",
ADD COLUMN     "note" TEXT,
ADD COLUMN     "phone_number" TEXT,
ADD COLUMN     "relationship" "FamilyRelationship" NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "access_card_id" TEXT,
ADD COLUMN     "access_card_status" TEXT,
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "contract_number" TEXT,
ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_batch_id" TEXT,
ADD COLUMN     "deleted_by_id" TEXT,
ADD COLUMN     "division_id" TEXT,
ADD COLUMN     "document_file" TEXT,
ADD COLUMN     "emergency_contact_name" TEXT,
ADD COLUMN     "emergency_phone" TEXT,
ADD COLUMN     "factory_id" TEXT,
ADD COLUMN     "marital_status" "MaritalStatus",
ADD COLUMN     "note" TEXT,
ADD COLUMN     "record_code" TEXT,
ADD COLUMN     "referrer" TEXT,
ADD COLUMN     "salary_level" TEXT,
ADD COLUMN     "section_id" TEXT,
ADD COLUMN     "shoe_size" TEXT,
ADD COLUMN     "uniform_pants_size" TEXT,
ADD COLUMN     "uniform_shirt_size" TEXT,
ADD COLUMN     "updated_by_id" TEXT;

-- AlterTable
ALTER TABLE "job_titles" ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_batch_id" TEXT,
ADD COLUMN     "deleted_by_id" TEXT,
ADD COLUMN     "status" "JobTitleStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updated_by_id" TEXT;

-- AlterTable
ALTER TABLE "request_approvals" ADD COLUMN     "step_order" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "step_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "current_step_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "form_data" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_batch_id" TEXT,
ADD COLUMN     "deleted_by_id" TEXT,
ADD COLUMN     "updated_by_id" TEXT;

-- AlterTable
ALTER TABLE "workflow_steps" ADD COLUMN     "condition" JSONB,
ADD COLUMN     "is_final" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "type" "WorkflowStepType" NOT NULL DEFAULT 'SEQUENTIAL';

-- AlterTable
ALTER TABLE "workflows" ADD COLUMN     "form_schema" JSONB;

-- CreateTable
CREATE TABLE "user_permissions" (
    "user_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("user_id","permission_id")
);

-- CreateTable
CREATE TABLE "factories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "status" "FactoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,
    "deleted_batch_id" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "factories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_contracts" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "contract_number" TEXT NOT NULL,
    "contract_type" "ContractType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_events" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "event_type" "EmploymentEventType" NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "decision_number" TEXT,
    "reason" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_sessions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" "MealSessionCode" NOT NULL,
    "time_start" TEXT NOT NULL,
    "time_end" TEXT NOT NULL,
    "cutoff_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_registrations" INTEGER,
    "default_price" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_registrations" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "MealRegStatus" NOT NULL DEFAULT 'REGISTERED',
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    "used_at" TIMESTAMP(3),
    "note" TEXT,
    "registered_by_id" TEXT,

    CONSTRAINT "meal_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_menus" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "session_id" TEXT NOT NULL,
    "main_dish" TEXT,
    "side_dish" TEXT,
    "soup" TEXT,
    "dessert" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "it_assets" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "purchase_date" TIMESTAMP(3),
    "purchase_price" INTEGER,
    "warranty_end_date" TIMESTAMP(3),
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "location" TEXT,
    "specifications" JSONB,
    "note" TEXT,
    "assigned_to_id" TEXT,
    "department_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "it_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_assignments" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "assigned_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returned_date" TIMESTAMP(3),
    "condition_on_assign" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "condition_on_return" "AssetCondition",
    "note" TEXT,
    "assigned_by_id" TEXT,

    CONSTRAINT "asset_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_maintenances" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "completed_date" TIMESTAMP(3),
    "cost" INTEGER,
    "vendor" TEXT,
    "description" TEXT,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sla_hours" INTEGER NOT NULL DEFAULT 24,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "requester_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "sla_deadline" TIMESTAMP(3),
    "resolution" TEXT,
    "rating" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_comments" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_column_configs" (
    "id" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "columns" JSONB NOT NULL,
    "name" TEXT,
    "apply_to" TEXT NOT NULL DEFAULT 'ALL',
    "order" INTEGER NOT NULL DEFAULT 0,
    "target_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "table_column_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "factories_deleted_at_idx" ON "factories"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "factories_code_deleted_at_key" ON "factories"("code", "deleted_at");

-- CreateIndex
CREATE INDEX "employment_events_employee_id_idx" ON "employment_events"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "meal_sessions_code_key" ON "meal_sessions"("code");

-- CreateIndex
CREATE INDEX "meal_registrations_date_session_id_idx" ON "meal_registrations"("date", "session_id");

-- CreateIndex
CREATE INDEX "meal_registrations_employee_id_idx" ON "meal_registrations"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "meal_registrations_employee_id_session_id_date_key" ON "meal_registrations"("employee_id", "session_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "meal_menus_date_session_id_key" ON "meal_menus"("date", "session_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_name_key" ON "asset_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "it_assets_code_key" ON "it_assets"("code");

-- CreateIndex
CREATE UNIQUE INDEX "it_assets_serial_number_key" ON "it_assets"("serial_number");

-- CreateIndex
CREATE INDEX "it_assets_category_id_idx" ON "it_assets"("category_id");

-- CreateIndex
CREATE INDEX "it_assets_status_idx" ON "it_assets"("status");

-- CreateIndex
CREATE INDEX "it_assets_assigned_to_id_idx" ON "it_assets"("assigned_to_id");

-- CreateIndex
CREATE INDEX "asset_assignments_asset_id_idx" ON "asset_assignments"("asset_id");

-- CreateIndex
CREATE INDEX "asset_assignments_employee_id_idx" ON "asset_assignments"("employee_id");

-- CreateIndex
CREATE INDEX "asset_maintenances_asset_id_idx" ON "asset_maintenances"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_categories_name_key" ON "ticket_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_code_key" ON "tickets"("code");

-- CreateIndex
CREATE INDEX "tickets_category_id_idx" ON "tickets"("category_id");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_requester_id_idx" ON "tickets"("requester_id");

-- CreateIndex
CREATE INDEX "tickets_assignee_id_idx" ON "tickets"("assignee_id");

-- CreateIndex
CREATE INDEX "ticket_comments_ticket_id_idx" ON "ticket_comments"("ticket_id");

-- CreateIndex
CREATE INDEX "table_column_configs_module_key_idx" ON "table_column_configs"("module_key");

-- CreateIndex
CREATE UNIQUE INDEX "table_column_configs_module_key_apply_to_target_id_key" ON "table_column_configs"("module_key", "apply_to", "target_id");

-- CreateIndex
CREATE INDEX "departments_deleted_at_idx" ON "departments"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_deleted_at_key" ON "departments"("code", "deleted_at");

-- CreateIndex
CREATE INDEX "employees_deleted_at_idx" ON "employees"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_code_deleted_at_key" ON "employees"("employee_code", "deleted_at");

-- CreateIndex
CREATE INDEX "job_titles_deleted_at_idx" ON "job_titles"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "job_titles_code_deleted_at_key" ON "job_titles"("code", "deleted_at");

-- CreateIndex
CREATE INDEX "request_approvals_approver_id_idx" ON "request_approvals"("approver_id");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_deleted_at_key" ON "users"("username", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_deleted_at_key" ON "users"("email", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_steps_workflow_id_order_key" ON "workflow_steps"("workflow_id", "order");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factories" ADD CONSTRAINT "factories_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factories" ADD CONSTRAINT "factories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factories" ADD CONSTRAINT "factories_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_titles" ADD CONSTRAINT "job_titles_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_titles" ADD CONSTRAINT "job_titles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_titles" ADD CONSTRAINT "job_titles_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_contracts" ADD CONSTRAINT "employee_contracts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_events" ADD CONSTRAINT "employment_events_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_approvals" ADD CONSTRAINT "request_approvals_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "workflow_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_registrations" ADD CONSTRAINT "meal_registrations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_registrations" ADD CONSTRAINT "meal_registrations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "meal_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_menus" ADD CONSTRAINT "meal_menus_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "meal_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_assets" ADD CONSTRAINT "it_assets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_assets" ADD CONSTRAINT "it_assets_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_assets" ADD CONSTRAINT "it_assets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "it_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenances" ADD CONSTRAINT "asset_maintenances_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "it_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ticket_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_column_configs" ADD CONSTRAINT "table_column_configs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_column_configs" ADD CONSTRAINT "table_column_configs_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
