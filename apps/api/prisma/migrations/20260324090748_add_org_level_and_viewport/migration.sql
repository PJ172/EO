-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "org_level" TEXT,
ADD COLUMN     "ui_position_x" DOUBLE PRECISION,
ADD COLUMN     "ui_position_y" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "org_chart_configs" (
    "id" TEXT NOT NULL,
    "nodesep" INTEGER NOT NULL DEFAULT 50,
    "ranksep" INTEGER NOT NULL DEFAULT 120,
    "zoom" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "node_dims" JSONB,
    "node_colors" JSONB,
    "viewport_x" DOUBLE PRECISION,
    "viewport_y" DOUBLE PRECISION,
    "viewport_zoom" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" TEXT,

    CONSTRAINT "org_chart_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_chart_view_overrides" (
    "id" TEXT NOT NULL,
    "chart_key" TEXT NOT NULL,
    "hidden_node_ids" JSONB NOT NULL DEFAULT '[]',
    "custom_edges" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" TEXT,

    CONSTRAINT "org_chart_view_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_chart_overrides" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_manager_id" TEXT NOT NULL,
    "target_handle" TEXT DEFAULT 'top',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "org_chart_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_chart_view_overrides_chart_key_key" ON "org_chart_view_overrides"("chart_key");

-- CreateIndex
CREATE INDEX "org_chart_overrides_employee_id_idx" ON "org_chart_overrides"("employee_id");

-- AddForeignKey
ALTER TABLE "org_chart_configs" ADD CONSTRAINT "org_chart_configs_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_chart_view_overrides" ADD CONSTRAINT "org_chart_view_overrides_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_chart_overrides" ADD CONSTRAINT "org_chart_overrides_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_chart_overrides" ADD CONSTRAINT "org_chart_overrides_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_chart_overrides" ADD CONSTRAINT "org_chart_overrides_target_manager_id_fkey" FOREIGN KEY ("target_manager_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
