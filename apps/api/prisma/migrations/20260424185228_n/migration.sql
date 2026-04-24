-- AlterTable
ALTER TABLE "IncomeStatement" ALTER COLUMN "platformServiceFee" DROP DEFAULT,
ALTER COLUMN "estimatedOperatingExpenses" DROP DEFAULT,
ALTER COLUMN "netIncome" DROP DEFAULT,
ALTER COLUMN "socsoProvisioning" DROP DEFAULT,
ALTER COLUMN "epfProvisioning" DROP DEFAULT,
ALTER COLUMN "amountAfterStatutory" DROP DEFAULT;
