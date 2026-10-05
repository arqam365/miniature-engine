-- AlterTable
ALTER TABLE "org_settings" ADD COLUMN     "whatsappApiKey" TEXT,
ADD COLUMN     "whatsappApiUrl" TEXT,
ADD COLUMN     "whatsappMessageTemplate" TEXT,
ADD COLUMN     "whatsappProvider" TEXT,
ADD COLUMN     "whatsappTemplateId" TEXT;
