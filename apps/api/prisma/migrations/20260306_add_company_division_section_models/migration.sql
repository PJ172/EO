-- Migration: Add Company, Division, Section as separate tables
-- Replaces the type-discriminator approach in departments table

-- =============================================================
-- STEP 1: Create new tables (using existing DepartmentStatus enum)
-- =============================================================

CREATE TABLE IF NOT EXISTS "companies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "note" TEXT,
    "status" "DepartmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,
    "deleted_batch_id" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "companies_code_key" ON "companies"("code");
CREATE INDEX IF NOT EXISTS "companies_deleted_at_idx" ON "companies"("deleted_at");

CREATE TABLE IF NOT EXISTS "divisions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "factory_id" TEXT,
    "note" TEXT,
    "status" "DepartmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "manager_employee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,
    "deleted_batch_id" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "divisions_code_key" ON "divisions"("code");
CREATE INDEX IF NOT EXISTS "divisions_factory_id_idx" ON "divisions"("factory_id");
CREATE INDEX IF NOT EXISTS "divisions_deleted_at_idx" ON "divisions"("deleted_at");

CREATE TABLE IF NOT EXISTS "sections" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department_id" TEXT,
    "note" TEXT,
    "status" "DepartmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "manager_employee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,
    "deleted_batch_id" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sections_code_key" ON "sections"("code");
CREATE INDEX IF NOT EXISTS "sections_department_id_idx" ON "sections"("department_id");
CREATE INDEX IF NOT EXISTS "sections_deleted_at_idx" ON "sections"("deleted_at");

-- =============================================================
-- STEP 2: Migrate existing data from departments table
-- =============================================================

-- 2a. Migrate COMPANY records
INSERT INTO "companies" ("id", "code", "name", "address", "note", "status", "created_at", "updated_at", "deleted_at", "deleted_by_id", "deleted_batch_id", "created_by_id", "updated_by_id")
SELECT "id", "code", "name", NULL, "note", "status", "created_at", "updated_at", "deleted_at", "deleted_by_id", "deleted_batch_id", "created_by", "updated_by"
FROM "departments"
WHERE "type" = 'COMPANY'
ON CONFLICT ("id") DO NOTHING;

-- 2b. Migrate DIVISION records
INSERT INTO "divisions" ("id", "code", "name", "note", "status", "created_at", "updated_at", "deleted_at", "deleted_by_id", "deleted_batch_id", "created_by_id", "updated_by_id")
SELECT "id", "code", "name", "note", "status", "created_at", "updated_at", "deleted_at", "deleted_by_id", "deleted_batch_id", "created_by", "updated_by"
FROM "departments"
WHERE "type" = 'DIVISION'
ON CONFLICT ("id") DO NOTHING;

-- 2c. Migrate SECTION records
INSERT INTO "sections" ("id", "code", "name", "note", "status", "created_at", "updated_at", "deleted_at", "deleted_by_id", "deleted_batch_id", "created_by_id", "updated_by_id")
SELECT "id", "code", "name", "note", "status", "created_at", "updated_at", "deleted_at", "deleted_by_id", "deleted_batch_id", "created_by", "updated_by"
FROM "departments"
WHERE "type" = 'SECTION'
ON CONFLICT ("id") DO NOTHING;

-- =============================================================
-- STEP 3: Add new columns to existing tables
-- =============================================================

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "company_id" TEXT;
ALTER TABLE "factories"  ADD COLUMN IF NOT EXISTS "company_id" TEXT;
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "division_id" TEXT;

-- =============================================================
-- STEP 4: Drop old FK constraints (division_id / section_id used to point to departments)
-- =============================================================

ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_division_id_fkey";
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_section_id_fkey";

-- =============================================================
-- STEP 5: Populate employees.company_id
-- strategy: factory.company_id first, then department-tree fallback
-- =============================================================

-- 5a. Link factory to company via the departments COMPANY record (same code)
UPDATE "factories" f
SET "company_id" = c."id"
FROM "companies" c
WHERE c."code" = f."code"
  AND f."company_id" IS NULL;

-- 5b. Employee → company via factory
UPDATE "employees" e
SET "company_id" = f."company_id"
FROM "factories" f
WHERE e."factory_id" = f."id"
  AND f."company_id" IS NOT NULL
  AND e."company_id" IS NULL;

-- 5c. Fallback: employee → company via department hierarchy (CTE traverse upwards)
WITH RECURSIVE tree AS (
    SELECT d."id", d."parent_id", d."type"
    FROM "departments" d
    UNION ALL
    SELECT d."id", p."parent_id", p."type"
    FROM "departments" d
    JOIN tree p ON d."parent_id" = p."id"
)
UPDATE "employees" e
SET "company_id" = c."id"
FROM tree t
JOIN "companies" c ON c."id" = t."id"
WHERE t."id" = e."department_id"
  AND t."type" = 'COMPANY'
  AND e."company_id" IS NULL;

-- =============================================================
-- STEP 6: Populate departments.division_id
-- =============================================================

UPDATE "departments" d
SET "division_id" = parent."id"
FROM "departments" parent
WHERE d."parent_id" = parent."id"
  AND parent."type" = 'DIVISION'
  AND d."division_id" IS NULL;

-- =============================================================
-- STEP 7: Add FK constraints
-- =============================================================

ALTER TABLE "employees"
    ADD CONSTRAINT "employees_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "employees"
    ADD CONSTRAINT "employees_division_id_fkey"
    FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "employees"
    ADD CONSTRAINT "employees_section_id_fkey"
    FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "factories"
    ADD CONSTRAINT "factories_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "departments"
    ADD CONSTRAINT "departments_division_id_fkey"
    FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "divisions"
    ADD CONSTRAINT "divisions_factory_id_fkey"
    FOREIGN KEY ("factory_id") REFERENCES "factories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sections"
    ADD CONSTRAINT "sections_department_id_fkey"
    FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "companies"
    ADD CONSTRAINT "companies_deleted_by_id_fkey"
    FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "companies"
    ADD CONSTRAINT "companies_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "companies"
    ADD CONSTRAINT "companies_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "divisions"
    ADD CONSTRAINT "divisions_deleted_by_id_fkey"
    FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "divisions"
    ADD CONSTRAINT "divisions_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "divisions"
    ADD CONSTRAINT "divisions_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sections"
    ADD CONSTRAINT "sections_deleted_by_id_fkey"
    FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sections"
    ADD CONSTRAINT "sections_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sections"
    ADD CONSTRAINT "sections_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "employees_company_id_idx" ON "employees"("company_id");
