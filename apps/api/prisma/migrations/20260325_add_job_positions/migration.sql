-- CreateTable
CREATE TABLE "job_positions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "JobTitleStatus" NOT NULL DEFAULT 'ACTIVE',
    "department_id" TEXT,
    "job_title_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_batch_id" TEXT,
    "deleted_by_id" TEXT,

    CONSTRAINT "job_positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_positions_code_key" ON "job_positions"("code");

-- CreateIndex
CREATE INDEX "job_positions_deleted_at_idx" ON "job_positions"("deleted_at");

-- CreateIndex
CREATE INDEX "job_positions_department_id_idx" ON "job_positions"("department_id");

-- AddForeignKey
ALTER TABLE "job_positions" ADD CONSTRAINT "job_positions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_positions" ADD CONSTRAINT "job_positions_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_positions" ADD CONSTRAINT "job_positions_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
