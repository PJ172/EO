/*
  Warnings:

  - You are about to drop the column `viewport_x` on the `org_chart_configs` table. All the data in the column will be lost.
  - You are about to drop the column `viewport_y` on the `org_chart_configs` table. All the data in the column will be lost.
  - You are about to drop the column `viewport_zoom` on the `org_chart_configs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "position_id" TEXT;

-- AlterTable
ALTER TABLE "job_positions" ADD COLUMN     "show_on_org_chart" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ui_position_x" DOUBLE PRECISION,
ADD COLUMN     "ui_position_y" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "org_chart_configs" DROP COLUMN "viewport_x",
DROP COLUMN "viewport_y",
DROP COLUMN "viewport_zoom";

-- AlterTable
ALTER TABLE "org_chart_overrides" ALTER COLUMN "target_handle" DROP DEFAULT;

-- AlterTable
ALTER TABLE "room_bookings" ADD COLUMN     "recurring_end_date" TIMESTAMP(3),
ADD COLUMN     "recurring_group_id" TEXT,
ADD COLUMN     "recurring_rule" TEXT;

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "department_id" TEXT,
    "section_id" TEXT,
    "parent_position_id" TEXT,
    "ui_position_x" DOUBLE PRECISION,
    "ui_position_y" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_positions" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "position_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_chart_node_positions" (
    "id" TEXT NOT NULL,
    "chart_key" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_chart_node_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "it_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "note" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "it_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "it_locations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "detail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "note" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "it_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "positions_code_key" ON "positions"("code");

-- CreateIndex
CREATE INDEX "positions_department_id_idx" ON "positions"("department_id");

-- CreateIndex
CREATE INDEX "positions_section_id_idx" ON "positions"("section_id");

-- CreateIndex
CREATE INDEX "positions_parent_position_id_idx" ON "positions"("parent_position_id");

-- CreateIndex
CREATE INDEX "employee_positions_employee_id_idx" ON "employee_positions"("employee_id");

-- CreateIndex
CREATE INDEX "employee_positions_position_id_idx" ON "employee_positions"("position_id");

-- CreateIndex
CREATE INDEX "org_chart_node_positions_chart_key_idx" ON "org_chart_node_positions"("chart_key");

-- CreateIndex
CREATE UNIQUE INDEX "org_chart_node_positions_chart_key_node_id_key" ON "org_chart_node_positions"("chart_key", "node_id");

-- CreateIndex
CREATE UNIQUE INDEX "it_categories_code_key" ON "it_categories"("code");

-- CreateIndex
CREATE INDEX "it_categories_status_idx" ON "it_categories"("status");

-- CreateIndex
CREATE INDEX "it_categories_type_idx" ON "it_categories"("type");

-- CreateIndex
CREATE UNIQUE INDEX "it_locations_code_key" ON "it_locations"("code");

-- CreateIndex
CREATE INDEX "it_locations_status_idx" ON "it_locations"("status");

-- CreateIndex
CREATE INDEX "employees_position_id_idx" ON "employees"("position_id");

-- CreateIndex
CREATE INDEX "room_bookings_recurring_group_id_idx" ON "room_bookings"("recurring_group_id");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_parent_position_id_fkey" FOREIGN KEY ("parent_position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_positions" ADD CONSTRAINT "employee_positions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_positions" ADD CONSTRAINT "employee_positions_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_categories" ADD CONSTRAINT "it_categories_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_categories" ADD CONSTRAINT "it_categories_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_locations" ADD CONSTRAINT "it_locations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_locations" ADD CONSTRAINT "it_locations_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
