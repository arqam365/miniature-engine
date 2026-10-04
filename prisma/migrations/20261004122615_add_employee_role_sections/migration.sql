-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "roleId" TEXT;

-- CreateTable
CREATE TABLE "employee_sections" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_sections_employeeId_sectionId_key" ON "employee_sections"("employeeId", "sectionId");

-- CreateIndex
CREATE INDEX "employees_roleId_idx" ON "employees"("roleId");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_sections" ADD CONSTRAINT "employee_sections_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_sections" ADD CONSTRAINT "employee_sections_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
