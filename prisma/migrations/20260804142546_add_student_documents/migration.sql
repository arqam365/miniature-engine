-- AlterTable
ALTER TABLE "org_settings" ALTER COLUMN "timezone" SET DEFAULT 'Asia/Kolkata',
ALTER COLUMN "currency" SET DEFAULT 'INR';

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "aadhaarBack" TEXT,
ADD COLUMN     "aadhaarFront" TEXT;
