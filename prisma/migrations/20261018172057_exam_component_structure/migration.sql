-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('WRITTEN', 'ORAL', 'PRACTICAL', 'PROJECT', 'ASSIGNMENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ComponentCategory" AS ENUM ('INTERNAL', 'EXTERNAL');

-- DropForeignKey
ALTER TABLE "exams" DROP CONSTRAINT "exams_examTypeId_fkey";

-- AlterTable
ALTER TABLE "exams" ALTER COLUMN "examTypeId" DROP NOT NULL,
ALTER COLUMN "totalMarks" DROP NOT NULL,
ALTER COLUMN "passingMarks" DROP NOT NULL;

-- CreateTable
CREATE TABLE "exam_classes" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "exam_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_subjects" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "examClassId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "exam_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_components" (
    "id" TEXT NOT NULL,
    "examSubjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ComponentType" NOT NULL DEFAULT 'WRITTEN',
    "category" "ComponentCategory" NOT NULL DEFAULT 'EXTERNAL',
    "maxMarks" DECIMAL(6,2) NOT NULL,
    "passingMarks" DECIMAL(6,2),
    "weightPercent" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_classes_examId_classId_key" ON "exam_classes"("examId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_subjects_examClassId_subjectId_key" ON "exam_subjects"("examClassId", "subjectId");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_examTypeId_fkey" FOREIGN KEY ("examTypeId") REFERENCES "exam_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_classes" ADD CONSTRAINT "exam_classes_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_classes" ADD CONSTRAINT "exam_classes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subjects" ADD CONSTRAINT "exam_subjects_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subjects" ADD CONSTRAINT "exam_subjects_examClassId_fkey" FOREIGN KEY ("examClassId") REFERENCES "exam_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subjects" ADD CONSTRAINT "exam_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_components" ADD CONSTRAINT "exam_components_examSubjectId_fkey" FOREIGN KEY ("examSubjectId") REFERENCES "exam_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
