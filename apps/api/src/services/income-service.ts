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

const buildSimplePdf = (title: string, lines: Array<{ text: string; size?: number; bold?: boolean }>) => {
  const contentLines = lines.slice(0, 50);
  let y = 800;
  const margin = 50;
  
  const textCommands = contentLines
    .map((line) => {
      const fontSize = line.size ?? 10;
      const font = line.bold ? "/F2" : "/F1";
      
      // Use "Fill then Stroke" (2 Tr) for bold text to make it appear thicker
      // and set a small line width (0.3) for the stroke.
      const renderMode = line.bold ? "2 Tr 0.3 w" : "0 Tr";
      
      const command = `BT ${renderMode} ${font} ${fontSize} Tf ${margin} ${y} Td (${escapePdfText(line.text)}) Tj ET`;
      
      y -= (fontSize >= 14 ? fontSize * 1.6 : 16);
      return command;
    })
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(textCommands, "utf8")} >>\nstream\n${textCommands}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
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
  platformServiceFee: Number(statement.platformServiceFee),
  estimatedOperatingExpenses: Number(statement.estimatedOperatingExpenses),
  netIncome: Number(statement.netIncome),
  socsoProvisioning: Number(statement.socsoProvisioning),
  epfProvisioning: Number(statement.epfProvisioning),
  amountAfterStatutory: Number(statement.amountAfterStatutory),
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
  platformServiceFee: number,
  estimatedOperatingExpenses: number,
  netIncome: number,
  socsoProvisioning: number,
  epfProvisioning: number,
  amountAfterStatutory: number,
  narrative: string,
  lineItems: IncomeStatementRecord["lineItems"]
) => [
  { text: "FORMAL INCOME STATEMENT", size: 22, bold: true },
  { text: "GIGHUB EARNINGS VERIFICATION", size: 10, bold: true },
  { text: `Document Generated: ${statementDate(new Date())}`, size: 8 },
  { text: "------------------------------------------------------------------------------------------------------------------------", size: 8 },
  { text: "" },
  
  { text: "SECTION I: FREELANCER PROFILE", size: 13, bold: true },
  { text: `Name: ${freelancerName}`, bold: true },
  { text: `Email: ${freelancerEmail}` },
  { text: `Coverage Period: ${statementDate(periodStart)} to ${statementDate(periodEnd)}` },
  { text: "" },

  { text: "SECTION II: FINANCIAL PERFORMANCE (MYR)", size: 13, bold: true },
  { text: `Gross Escrow Revenue: ${formatAmount(totalEarned)}`, bold: true },
  { text: `  - Platform Service Fee (5%): -${formatAmount(platformServiceFee)}` },
  { text: `  - Estimated Operating Expenses (3%): -${formatAmount(estimatedOperatingExpenses)}` },
  { text: `Net Freelancer Income: ${formatAmount(netIncome)}`, size: 11, bold: true },
  { text: "" },
  
  { text: "SECTION III: STATUTORY PROVISIONS", size: 13, bold: true },
  { text: `  - SOCSO Provisioning (~0.8%): -${formatAmount(socsoProvisioning)}` },
  { text: `  - EPF Provisioning (~8.0%): -${formatAmount(epfProvisioning)}` },
  { text: `ESTIMATED TAKE-HOME PAY: ${formatAmount(amountAfterStatutory)}`, size: 12, bold: true },
  { text: "" },

  { text: "SECTION IV: ACTIVITY SUMMARY", size: 13, bold: true },
  { text: `Jobs Completed: ${totalJobs} | Milestones Released: ${totalMilestones}` },
  { text: `Avg. Monthly Revenue: ${formatAmount(avgMonthlyIncome)}`, bold: true },
  { text: "" },

  { text: "SECTION V: AI INSIGHTS & NARRATIVE", size: 13, bold: true },
  { text: narrative.length > 250 ? narrative.slice(0, 247) + "..." : narrative },
  { text: "" },

  { text: "SECTION VI: TRANSACTION LOG (LATEST 15)", size: 13, bold: true },
  ...lineItems.slice(0, 15).map((lineItem) => ({
    text: `${statementDate(new Date(lineItem.releasedAt))} | ${formatAmount(lineItem.amount)} | ${lineItem.jobTitle.slice(0, 25)}... | ${lineItem.companyName.slice(0, 20)}`
  })),
  { text: "" },

  { text: "SECTION VII: AUTHENTICITY", size: 13, bold: true },
  { text: `Verification Token: ${verifyToken}`, size: 10, bold: true },
  { text: "Verify this document online at: https://gighub.my/verify", size: 9 },
  { text: "" },
  { text: "------------------------------------------------------------------------------------------------------------------------", size: 8 },
  { text: "GigHub Computer-Generated Income Statement - No Signature Required", size: 8, bold: true }
];

const writeStatementPdf = async (statementId: string, lines: Array<{ text: string; size?: number; bold?: boolean }>) => {
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
  await writeFile(destination, buildSimplePdf("", lines));

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
  
  // Calculate financial breakdown
  const platformServiceFee = totalEarned * 0.05;
  const estimatedOperatingExpenses = (totalEarned - platformServiceFee) * 0.03;
  const netIncome = totalEarned - platformServiceFee - estimatedOperatingExpenses;
  const socsoProvisioning = netIncome * 0.008;
  const epfProvisioning = netIncome * 0.08;
  const amountAfterStatutory = netIncome - socsoProvisioning - epfProvisioning;
  
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
      platformServiceFee,
      estimatedOperatingExpenses,
      netIncome,
      socsoProvisioning,
      epfProvisioning,
      amountAfterStatutory,
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
      platformServiceFee,
      estimatedOperatingExpenses,
      netIncome,
      socsoProvisioning,
      epfProvisioning,
      amountAfterStatutory,
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
