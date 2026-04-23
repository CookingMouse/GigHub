import { randomUUID } from "crypto";
import { access, mkdir, writeFile } from "fs/promises";
import path from "path";
import type {
  GenerateIncomeStatementInput,
  IncomeStatementRecord,
  IncomeSummaryRecord
} from "@gighub/shared";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/http-error";
import { getLocalStorageRoot } from "./file-storage-service";
import { selectedGLMProvider } from "./glm-provider";

const currency = "MYR";

const escapePdfText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const buildSimplePdf = (title: string, lines: Array<{ text: string; size?: number }>) => {
  const contentLines = [{ text: title, size: 18 }, ...lines].slice(0, 44);
  let y = 790;
  const textCommands = contentLines
    .map((line) => {
      const command = `BT /F1 ${line.size ?? 10} Tf 50 ${y} Td (${escapePdfText(line.text)}) Tj ET`;
      y -= line.size && line.size >= 16 ? 24 : 16;
      return command;
    })
    .join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(textCommands, "utf8")} >>\nstream\n${textCommands}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  ];

  let document = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(document, "utf8"));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(document, "utf8");
  document += `xref\n0 ${objects.length + 1}\n`;
  document += "0000000000 65535 f \n";

  offsets.slice(1).forEach((offset) => {
    document += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });

  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(document, "utf8");
};

const statementInclude = {
  lineItems: {
    orderBy: {
      releasedAt: "asc"
    }
  }
} as const;

type IncomeStatementWithItems = Awaited<ReturnType<typeof findStatementById>>;

const monthSpan = (start: Date, end: Date) => {
  const days = Math.max((end.getTime() - start.getTime()) / 86_400_000, 1);
  return Math.max(days / 30.44, 1);
};

const inferCategory = (title: string, description: string | null) => {
  const value = `${title} ${description ?? ""}`.toLowerCase();

  if (["design", "figma", "brand", "layout", "creative"].some((term) => value.includes(term))) {
    return "Design";
  }

  if (["copy", "writing", "article", "content", "translation"].some((term) => value.includes(term))) {
    return "Writing";
  }

  if (["code", "software", "api", "app", "development"].some((term) => value.includes(term))) {
    return "Development";
  }

  return "General";
};

const companyName = (job: {
  company: {
    name: string;
    companyProfile: {
      companyName: string;
    } | null;
  };
}) => job.company.companyProfile?.companyName ?? job.company.name;

const toStatementRecord = (statement: NonNullable<IncomeStatementWithItems>): IncomeStatementRecord => ({
  id: statement.id,
  freelancerId: statement.freelancerId,
  periodStart: statement.periodStart.toISOString(),
  periodEnd: statement.periodEnd.toISOString(),
  totalEarned: Number(statement.totalEarned),
  totalJobs: statement.totalJobs,
  totalMilestones: statement.totalMilestones,
  avgMonthlyIncome: Number(statement.avgMonthlyIncome),
  currency: statement.currency,
  generatedAt: statement.generatedAt.toISOString(),
  pdfStorageKey: statement.pdfStorageKey ?? null,
  verifyToken: statement.verifyToken,
  glmNarrative: statement.glmNarrative ?? null,
  status: statement.status,
  lineItems: statement.lineItems.map((lineItem) => ({
    id: lineItem.id,
    milestoneId: lineItem.milestoneId,
    jobTitle: lineItem.jobTitle,
    companyName: lineItem.companyName,
    amount: Number(lineItem.amount),
    releasedAt: lineItem.releasedAt.toISOString(),
    category: lineItem.category ?? null
  }))
});

async function findStatementById(statementId: string) {
  return prisma.incomeStatement.findUnique({
    where: {
      id: statementId
    },
    include: statementInclude
  });
}

const statementDate = (value: Date) => value.toISOString().slice(0, 10);

const formatAmount = (value: number) => `${currency} ${value.toFixed(2)}`;

const buildStatementPdfLines = (
  statementId: string,
  verifyToken: string,
  freelancerName: string,
  freelancerEmail: string,
  periodStart: Date,
  periodEnd: Date,
  totalEarned: number,
  totalJobs: number,
  totalMilestones: number,
  avgMonthlyIncome: number,
  narrative: string,
  lineItems: IncomeStatementRecord["lineItems"]
) => [
  { text: "Formal Income Statement", size: 14 },
  { text: "GigHub Freelancer Earnings Verification" },
  { text: "" },
  { text: `Statement ID: ${statementId}` },
  { text: `Generated on: ${statementDate(new Date())}` },
  { text: `Freelancer: ${freelancerName}` },
  { text: `Email: ${freelancerEmail}` },
  { text: `Covered period: ${statementDate(periodStart)} to ${statementDate(periodEnd)}` },
  { text: "" },
  { text: `Total earned: ${formatAmount(totalEarned)}`, size: 12 },
  { text: `Total jobs completed in period: ${totalJobs}` },
  { text: `Total released milestones: ${totalMilestones}` },
  { text: `Average monthly income: ${formatAmount(avgMonthlyIncome)}` },
  { text: "" },
  { text: "Income narrative" },
  { text: narrative },
  { text: "" },
  { text: "Released line items" },
  ...lineItems.map((lineItem) => ({
    text: `${statementDate(new Date(lineItem.releasedAt))} | ${lineItem.jobTitle} | ${
      lineItem.companyName
    } | ${formatAmount(lineItem.amount)}`
  })),
  { text: "" },
  { text: `Verification token: ${verifyToken}` },
  { text: "This statement reflects released escrow milestones recorded on GigHub." }
];

const writeStatementPdf = async (statementId: string, lines: Array<{ text: string; size?: number }>) => {
  const generatedAt = new Date();
  const storageKey = path
    .join(
      "income-statements",
      `${generatedAt.getUTCFullYear()}`,
      String(generatedAt.getUTCMonth() + 1).padStart(2, "0"),
      `${statementId}.pdf`
    )
    .replace(/\\/g, "/");
  const destination = path.join(getLocalStorageRoot(), storageKey);

  await mkdir(path.dirname(destination), {
    recursive: true
  });
  await writeFile(destination, buildSimplePdf("GigHub Formal Income Statement", lines));

  return storageKey;
};

export const getFreelancerIncomeSummary = async (
  freelancerId: string
): Promise<IncomeSummaryRecord> => {
  const releasedMilestones = await prisma.milestone.findMany({
    where: {
      status: "RELEASED",
      releasedAt: {
        not: null
      },
      job: {
        freelancerId
      }
    },
    include: {
      job: true
    }
  });
  const latestStatement = await prisma.incomeStatement.findFirst({
    where: {
      freelancerId
    },
    include: statementInclude,
    orderBy: {
      generatedAt: "desc"
    }
  });
  const totalEarned = releasedMilestones.reduce(
    (sum, milestone) => sum + Number(milestone.amount),
    0
  );
  const completedJobs = new Set(releasedMilestones.map((milestone) => milestone.jobId)).size;

  return {
    totalEarned,
    releasedMilestones: releasedMilestones.length,
    completedJobs,
    avgMilestoneValue:
      releasedMilestones.length > 0 ? totalEarned / releasedMilestones.length : 0,
    latestStatement: latestStatement ? toStatementRecord(latestStatement) : null
  };
};

export const listFreelancerIncomeStatements = async (freelancerId: string) => {
  const statements = await prisma.incomeStatement.findMany({
    where: {
      freelancerId
    },
    include: statementInclude,
    orderBy: {
      generatedAt: "desc"
    }
  });

  return statements.map(toStatementRecord);
};

export const generateFreelancerIncomeStatement = async (
  freelancerId: string,
  input: GenerateIncomeStatementInput
) => {
  const periodStart = new Date(input.periodStart);
  const periodEnd = new Date(input.periodEnd);

  if (periodEnd <= periodStart) {
    throw new HttpError(
      400,
      "INCOME_PERIOD_INVALID",
      "The income statement period end must be after the period start."
    );
  }

  const milestones = await prisma.milestone.findMany({
    where: {
      status: "RELEASED",
      releasedAt: {
        gte: periodStart,
        lte: periodEnd
      },
      job: {
        freelancerId
      }
    },
    include: {
      job: {
        include: {
          company: {
            include: {
              companyProfile: true
            }
          }
        }
      }
    },
    orderBy: {
      releasedAt: "asc"
    }
  });

  if (milestones.length === 0) {
    throw new HttpError(
      400,
      "INCOME_STATEMENT_EMPTY",
      "No released milestones were found inside that income statement period."
    );
  }

  const totalEarned = milestones.reduce((sum, milestone) => sum + Number(milestone.amount), 0);
  const totalJobs = new Set(milestones.map((milestone) => milestone.jobId)).size;
  const avgMonthlyIncome = totalEarned / monthSpan(periodStart, periodEnd);
  const categories = Array.from(
    new Set(milestones.map((milestone) => inferCategory(milestone.title, milestone.description)))
  );
  const narrative = (await selectedGLMProvider.generateIncomeNarrative({
    totalEarned,
    totalJobs,
    totalMilestones: milestones.length,
    avgMonthlyIncome,
    currency,
    periodStart,
    periodEnd,
    topCategories: categories.slice(0, 3)
  })).narrative;
  const freelancer = await prisma.user.findUnique({
    where: {
      id: freelancerId
    }
  });

  if (!freelancer) {
    throw new HttpError(404, "FREELANCER_NOT_FOUND", "The freelancer account could not be found.");
  }

  const statement = await prisma.incomeStatement.create({
    data: {
      freelancerId,
      periodStart,
      periodEnd,
      totalEarned,
      totalJobs,
      totalMilestones: milestones.length,
      avgMonthlyIncome,
      currency,
      verifyToken: randomUUID(),
      glmNarrative: narrative,
      lineItems: {
        create: milestones.map((milestone) => ({
          milestoneId: milestone.id,
          jobTitle: milestone.job.title,
          companyName: companyName(milestone.job),
          amount: milestone.amount,
          releasedAt: milestone.releasedAt!,
          category: inferCategory(milestone.title, milestone.description)
        }))
      }
    },
    include: statementInclude
  });

  const pdfStorageKey = await writeStatementPdf(
    statement.id,
    buildStatementPdfLines(
      statement.id,
      statement.verifyToken,
      freelancer.name,
      freelancer.email,
      periodStart,
      periodEnd,
      totalEarned,
      totalJobs,
      milestones.length,
      avgMonthlyIncome,
      narrative,
      statement.lineItems.map((lineItem) => ({
        id: lineItem.id,
        milestoneId: lineItem.milestoneId,
        jobTitle: lineItem.jobTitle,
        companyName: lineItem.companyName,
        amount: Number(lineItem.amount),
        releasedAt: lineItem.releasedAt.toISOString(),
        category: lineItem.category ?? null
      }))
    )
  );

  const updatedStatement = await prisma.incomeStatement.update({
    where: {
      id: statement.id
    },
    data: {
      pdfStorageKey
    },
    include: statementInclude
  });

  return toStatementRecord(updatedStatement);
};

export const verifyIncomeStatement = async (verifyToken: string) => {
  const statement = await prisma.incomeStatement.findUnique({
    where: {
      verifyToken
    },
    include: statementInclude
  });

  if (!statement || statement.status === "REVOKED") {
    throw new HttpError(
      404,
      "INCOME_STATEMENT_NOT_FOUND",
      "That income statement could not be verified."
    );
  }

  if (statement.status === "GENERATED") {
    const verifiedStatement = await prisma.incomeStatement.update({
      where: {
        id: statement.id
      },
      data: {
        status: "VERIFIED"
      },
      include: statementInclude
    });

    return toStatementRecord(verifiedStatement);
  }

  return toStatementRecord(statement);
};

export const getFreelancerIncomeStatementPdf = async (freelancerId: string, statementId: string) => {
  const statement = await prisma.incomeStatement.findFirst({
    where: {
      id: statementId,
      freelancerId
    }
  });

  if (!statement || !statement.pdfStorageKey) {
    throw new HttpError(
      404,
      "INCOME_STATEMENT_NOT_FOUND",
      "That income statement PDF could not be found."
    );
  }

  const filePath = path.join(getLocalStorageRoot(), statement.pdfStorageKey);

  try {
    await access(filePath);
  } catch {
    throw new HttpError(
      404,
      "INCOME_STATEMENT_PDF_NOT_FOUND",
      "That income statement PDF is not available."
    );
  }

  return {
    filePath,
    fileName: `gighub-income-statement-${statementDate(statement.periodStart)}-${statementDate(
      statement.periodEnd
    )}.pdf`
  };
};
