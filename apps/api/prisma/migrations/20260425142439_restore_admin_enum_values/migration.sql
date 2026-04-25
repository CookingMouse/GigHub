/*
  Warnings:

  - You are about to drop the column `adminNote` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";

-- AlterTable
ALTER TABLE "Dispute" DROP COLUMN "adminNote";

-- AlterTable
ALTER TABLE "IncomeStatement" ALTER COLUMN "platformServiceFee" DROP DEFAULT,
ALTER COLUMN "estimatedOperatingExpenses" DROP DEFAULT,
ALTER COLUMN "netIncome" DROP DEFAULT,
ALTER COLUMN "socsoProvisioning" DROP DEFAULT,
ALTER COLUMN "epfProvisioning" DROP DEFAULT,
ALTER COLUMN "amountAfterStatutory" DROP DEFAULT;

-- DropTable
DROP TABLE "AuditLog";
