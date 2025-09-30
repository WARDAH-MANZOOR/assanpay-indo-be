import { MerchantFinancialTerms, Prisma, PrismaClient, Transaction } from "@prisma/client";
import { Decimal, DefaultArgs, JsonObject } from "@prisma/client/runtime/library";
import { toZonedTime } from "date-fns-tz";
import prisma from "../lib/prisma.js";
import { text } from "express";

const task = async () => {
  console.log("Cron running");

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Fetch all pending scheduled tasks that are due
      const tasks = await fetchPendingScheduledTasks(tx);

      // 2. Group transactions by merchant_id
      const {
        transactionsByMerchant,
        transactionIdToTaskIdMap,
      } = groupTransactionsByMerchant(tasks);

      // 3. Fetch financial terms for all merchants involved
      const merchantFinancialTermsMap = await fetchMerchantFinancialTerms(
        tx,
        Array.from(transactionsByMerchant.keys())
      );

      // 4. Process settlements per merchant
      for (const [merchant_id, transactions] of transactionsByMerchant.entries()) {
        await processMerchantSettlement(
          tx,
          merchant_id,
          transactions,
          merchantFinancialTermsMap.get(merchant_id),
          transactionIdToTaskIdMap
        );
      }
    }, {
      timeout: 3600000,
      maxWait: 3600000
    });
  } catch (error) {
    console.error("Error during settlement process:", error);
    // Handle error appropriately, possibly re-throw or log
  }
};

// Function to fetch pending scheduled tasks that are due
// async function fetchPendingScheduledTasks(prisma: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) {
//   return await prisma.scheduledTask.findMany({
//     where: {
//       status: 'pending',
//       scheduledAt: {
//         lte: new Date(),
//       },
//     },
//     include: {
//       transaction: {
//         include: {
//           merchant: true,
//         },
//       },
//     },
//   });
// }

async function fetchPendingScheduledTasks(prisma: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) {
  try {
    const scheduledTasks = await prisma.scheduledTask.findMany({
      where: {
        // transaction: {
        //   merchant_id: 522,
        // },
        status: 'pending',
        scheduledAt: {
          lte: new Date(),
        },
      },
      include: {
        transaction: true, // Include transaction details if needed
      },
    });

    return scheduledTasks;
  } catch (error) {
    console.error("Error fetching scheduled tasks for merchant:", error);
    throw error;
  }
}

// Function to group transactions by merchant_id
function groupTransactionsByMerchant(tasks: any[]) {
  const transactionsByMerchant = new Map<number, Transaction[]>();
  const transactionIdToTaskIdMap = new Map<string, number>();

  for (const task of tasks) {
    const transaction = task.transaction;

    if (!transaction || transaction.original_amount === undefined) {
      continue; // Skip if transaction is invalid
    }

    // Map transaction IDs to task IDs
    transactionIdToTaskIdMap.set(transaction.transaction_id, task.id);

    const merchant_id = transaction.merchant_id;

    if (!transactionsByMerchant.has(merchant_id)) {
      transactionsByMerchant.set(merchant_id, []);
    }

    transactionsByMerchant.get(merchant_id)?.push(transaction);
  }

  return { transactionsByMerchant, transactionIdToTaskIdMap };
}

// Function to fetch merchant financial terms
async function fetchMerchantFinancialTerms(
  prisma: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  merchantIds: number[]
) {
  const merchantFinancialTermsList = await prisma.merchantFinancialTerms.findMany({
    where: {
      merchant_id: { in: merchantIds },
    },
  });

  // Map merchant IDs to their financial terms
  const merchantFinancialTermsMap = new Map<number, MerchantFinancialTerms>();

  for (const terms of merchantFinancialTermsList) {
    if (!merchantFinancialTermsMap.has(terms.merchant_id)) {
      merchantFinancialTermsMap.set(terms.merchant_id, terms);
    }
  }

  return merchantFinancialTermsMap;
}

// // Function to process settlement for a single merchant
// async function processMerchantSettlement(
//   tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
//   merchant_id: number,
//   transactions: Transaction[],
//   merchantFinancialTerms: MerchantFinancialTerms | undefined,
//   transactionIdToTaskIdMap: Map<string, number>
// ) {
//   if (!merchantFinancialTerms) {
//     console.error(`No financial terms found for merchant ${merchant_id}`);
//     return; // Skip this merchant
//   }

//   // Aggregate data
//   const settlementData = calculateSettlementData(transactions, merchantFinancialTerms);

//   const today = new Date();

//   // Define the Pakistan timezone
//   const timeZone = 'Asia/Karachi';

//   // Convert the date to the Pakistan timezone
//   const zonedDate = toZonedTime(today, timeZone);
//   const settlementDate = new Date(zonedDate.getFullYear(), zonedDate.getMonth(), zonedDate.getDate());

//   // Upsert SettlementReport for the day
//   await tx.settlementReport.upsert({
//     where: {
//       merchant_id_settlementDate: {
//         merchant_id,
//         settlementDate,
//       },
//     },
//     create: {
//       merchant_id,
//       settlementDate,
//       transactionCount: settlementData.transactionCount,
//       transactionAmount: settlementData.transactionAmount,
//       commission: settlementData.totalCommission,
//       gst: settlementData.totalGST,
//       withholdingTax: settlementData.totalWithholdingTax,
//       merchantAmount: settlementData.merchantAmount,
//     },
//     update: {
//       transactionCount: { increment: settlementData.transactionCount },
//       transactionAmount: { increment: settlementData.transactionAmount },
//       commission: { increment: settlementData.totalCommission },
//       gst: { increment: settlementData.totalGST },
//       withholdingTax: { increment: settlementData.totalWithholdingTax },
//       merchantAmount: { increment: settlementData.merchantAmount },
//     },
//   });

//   // Update transactions and tasks
//   await updateTransactionsAndTasks(
//     tx,
//     transactions,
//     transactionIdToTaskIdMap
//   );
// }

// Function to process settlement for a single merchant
async function processMerchantSettlement(
  tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  merchant_id: number,
  transactions: Transaction[],
  merchantFinancialTerms: MerchantFinancialTerms | undefined,
  transactionIdToTaskIdMap: Map<string, number>
) {
  if (!merchantFinancialTerms) {
    console.error(`No financial terms found for merchant ${merchant_id}`);
    return; // Skip this merchant
  }

  // Define the Pakistan timezone
  const timeZone = 'Asia/Karachi';
  const today = new Date();
  const zonedDate = toZonedTime(today, timeZone);
  const settlementDate = new Date(zonedDate.getFullYear(), zonedDate.getMonth(), zonedDate.getDate());

  // Aggregate data
  const settlementData = calculateSettlementData(transactions, merchantFinancialTerms);

  // Upsert SettlementReport for the day
  await tx.settlementReport.upsert({
    where: {
      merchant_id_settlementDate: {
        merchant_id,
        settlementDate,
      },
    },
    create: {
      merchant_id,
      settlementDate,
      transactionCount: settlementData.transactionCount,
      transactionAmount: settlementData.transactionAmount,
      commission: settlementData.totalCommission,
      gst: settlementData.totalGST,
      withholdingTax: settlementData.totalWithholdingTax,
      merchantAmount: settlementData.merchantAmount,
    },
    update: {
      transactionCount: { increment: settlementData.transactionCount },
      transactionAmount: { increment: settlementData.transactionAmount },
      commission: { increment: settlementData.totalCommission },
      gst: { increment: settlementData.totalGST },
      withholdingTax: { increment: settlementData.totalWithholdingTax },
      merchantAmount: { increment: settlementData.merchantAmount },
    },
  });

  // Update transactions and tasks
  await updateTransactionsAndTasks(
    tx,
    transactions,
    transactionIdToTaskIdMap
  );
}

// // Function to calculate settlement data
// function calculateSettlementData(
//   transactions: Transaction[],
//   merchantFinancialTerms: MerchantFinancialTerms
// ) {
//   const transactionCount = transactions.length;
//   const transactionAmount = transactions.reduce(
//     (sum, t) => sum.plus(t.original_amount || new Prisma.Decimal(0)),
//     new Prisma.Decimal(0)
//   );

//   // Extract financial terms
//   const {
//     commissionRate,
//     commissionWithHoldingTax,
//     commissionGST,
//   } = merchantFinancialTerms;

//   // Calculate commission and taxes
//   const totalCommission = transactionAmount.mul(commissionRate);
//   const totalGST = transactionAmount.mul(commissionGST);
//   const totalWithholdingTax = transactionAmount.mul(commissionWithHoldingTax);

//   // Calculate merchant amount
//   const merchantAmount = transactionAmount
//     .minus(totalCommission)
//     .minus(totalGST)
//     .minus(totalWithholdingTax);

//   return {
//     transactionCount,
//     transactionAmount,
//     totalCommission,
//     totalGST,
//     totalWithholdingTax,
//     merchantAmount,
//   };
// }

// Modified settlement data calculation
function calculateSettlementData(
  transactions: Transaction[],
  merchantFinancialTerms: MerchantFinancialTerms
) {
  const transactionCount = transactions.length;
  const transactionAmount = transactions.reduce(
    (sum, t) => sum.plus(t.original_amount || new Prisma.Decimal(0)),
    new Prisma.Decimal(0)
  );

  let totalCommission = new Prisma.Decimal(0);
  let totalGST = new Prisma.Decimal(0);
  let totalWithholdingTax = new Prisma.Decimal(0);

  transactions.forEach((transaction) => {
    const providerName = (transaction.providerDetails as JsonObject)?.name;
    let commissionRate = merchantFinancialTerms.commissionRate;

    // Determine commission rate based on provider and commission mode
    if (merchantFinancialTerms.commissionMode == "DOUBLE") {
      if (providerName === "JazzCash") {
        commissionRate = merchantFinancialTerms.commissionRate;
      } else if (providerName === "Easypaisa") {
        commissionRate = merchantFinancialTerms.easypaisaRate || new Decimal(0);
      }
    }

    const transactionCommission = (transaction.original_amount || new Prisma.Decimal(0)).mul(commissionRate);
    totalCommission = totalCommission.plus(transactionCommission);

    // Calculate GST and Withholding Tax
    totalGST = totalGST.plus((transaction.original_amount || new Prisma.Decimal(0)).mul(merchantFinancialTerms.commissionGST));
    totalWithholdingTax = totalWithholdingTax.plus((transaction.original_amount || new Prisma.Decimal(0)).mul(merchantFinancialTerms.commissionWithHoldingTax));
  });

  const merchantAmount = transactionAmount.minus(totalCommission).minus(totalGST).minus(totalWithholdingTax);

  return {
    transactionCount,
    transactionAmount,
    totalCommission,
    totalGST,
    totalWithholdingTax,
    merchantAmount,
  };
}

// Function to update transactions and scheduled tasks
async function updateTransactionsAndTasks(
  prisma: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  transactions: Transaction[],
  transactionIdToTaskIdMap: Map<string, number>
) {
  // Update transactions as settled
  const transactionIds = transactions.map((t) => t.transaction_id);
  const CHUNK_SIZE = 5000;
  for (let i = 0; i < transactionIds.length; i += CHUNK_SIZE) {
    await prisma.transaction.updateMany({
      where: { transaction_id: { in: transactionIds.slice(i, i + CHUNK_SIZE) } },
      data: { settlement: true },
    });
  }

  // Update scheduled tasks as completed
  const taskIds = transactionIds
    .map((tid) => transactionIdToTaskIdMap.get(tid))
    .filter((id): id is number => id !== undefined);

  const today = new Date();

  // Define the Pakistan timezone
  const timeZone = 'Asia/Karachi';

  // Convert the date to the Pakistan timezone
  const zonedDate = toZonedTime(today, timeZone);
  for (let i = 0; i < transactionIds.length; i += CHUNK_SIZE) {
    await prisma.scheduledTask.updateMany({
      where: { id: { in: taskIds.slice(i, i + CHUNK_SIZE) }, status: 'pending' },
      data: { status: 'completed', executedAt: zonedDate },
    });
  }
}

export default task;