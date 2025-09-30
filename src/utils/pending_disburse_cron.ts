// import { Prisma } from "@prisma/client";
// import { Request, Response } from "express";
// import prisma from "prisma/client.js";
// import { easyPaisaService } from "services/index.js";
// import CustomError from "./custom_error.js";

// const fetchPendingRecords = async (size: number) => {
//   console.log("Disbursement Cron running");

//   try {
//     return await prisma.$transaction(async (tx) => {
//       const transactions = await tx.disbursement.findMany({
//         where: {
//           status: 'pending', // Filter for pending transactions
//           // merchant_id: 5,
//           // to_provider: to_provider
//         },
//         orderBy: [{
//           disbursementDate: 'asc'
//         }],
//         // select: {
//         //     system_order_id: true,
//         //     merchant_id: true,
//         // },
//         take: size
//       });

//       // await tx.disbursement.deleteMany({
//       //     where: {
//       //         status: 'pending',
//       //     }
//       // })

//       const merchantTransactions = transactions.reduce((acc: { [key: number]: any[] }, txn) => {
//         if (!acc[txn.merchant_id]) {
//           acc[txn.merchant_id] = [];
//         }
//         acc[txn.merchant_id].push(txn);
//         return acc;
//       }, {});

//       // Sort each merchant's transactions by merchantAmount (smallest to largest)
//       Object.keys(merchantTransactions).forEach(key => {
//         merchantTransactions[Number(key)].sort((a, b) => a.merchantAmount - b.merchantAmount);
//       });
//       return merchantTransactions
//     }, {
//       isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
//       timeout: 3600000,
//       maxWait: 3600000
//     });
//   } catch (error) {
//     console.error("Error during settlement process:", error);
//     // Handle error appropriately, possibly re-throw or log
//   }
// };

// async function processPendingRecordsCron() {
//   const batchSize = 10; // Number of records to process per cron job
//   const records: { [key: string]: any[] } = await fetchPendingRecords(batchSize) as { [key: string]: any[] };
//   console.log(records);
//   if (!records || Object.keys(records).length === 0) {
//     console.log("No pending records found.");
//     throw new CustomError("No pending records found.", 400);
//   }
//   const doneTransactions = [];
//   const failedTransactions = [];
//   try {
//     // Process transactions merchant by merchant
//     for (const merchantId of Object.keys(records)) {
//       const txns = records[merchantId];

//       // Look up the merchant details from the database
//       const merchant = await prisma.merchant.findFirst({
//         where: {
//           merchant_id: +merchantId,
//         },
//       });

//       // Flag to determine if we should skip the rest of this merchant's transactions
//       let skipMerchant = false;

//       // Process each transaction individually
//       for (const txn of txns) {
//         try {
//           console.log(`Processing transaction: ${txn.system_order_id}`);
//           if (txn.provider?.toUpperCase() === "EASYPAISA") {
//             if (txn.to_provider?.toUpperCase() === "EASYPAISA") {
//               console.log(`${txn.provider} -> ${txn.to_provider}`);
//               await easyPaisaService.updateDisbursement(
//                 txn,
//                 merchant?.uid as string
//               );
//             } else {
//               console.log(`${txn.provider} -> ${txn.to_provider}`);
//               await easyPaisaService.updateDisburseThroughBank(
//                 txn,
//                 merchant?.uid as string
//               );
//             }
//             // continue;
//           } else {
//             if (txn.to_provider.toUpperCase() === "JAZZCASH") {
//               console.log(`${txn.provider} -> ${txn.to_provider}`);
//               const token = await getToken(merchant?.uid as string);
//               await updateMwTransaction(token?.access_token, txn, merchant?.uid as string);
//             } else {
//               console.log(`${txn.provider} -> ${txn.to_provider}`);
//               const token = await getToken(merchant?.uid as string);
//               // await updateTransaction(token?.access_token, txn, merchant?.uid as string);
//               await updateTransactionClone (token?.access_token, txn, merchant?.uid as string)
//             }
//           }
//           console.log(`Transaction ${txn.system_order_id} processed successfully`);
//           doneTransactions.push(txn.merchant_custom_order_id);
//         } catch (error: any) {
//           failedTransactions.push(txn.merchant_custom_order_id)
//           // If error message indicates "Not Enough Balance", skip the rest of this merchant's transactions.
//           if (error?.message && error.message.includes("Not Enough Balance")) {
//             console.log(
//               `Error processing transaction ${txn.system_order_id}: ${error.message}. Skipping all transactions for merchant ${merchantId}.`
//             );
//             skipMerchant = true;
//             break; // break out of the transactions loop for this merchant
//           } else {
//             // For other errors, log and continue with the next transaction.
//             console.log(
//               `Error processing transaction ${txn.system_order_id}: ${error.message}. Continuing with next transaction.`
//             );
//           }
//         }
//       }

//       // If we encountered a "Not Enough Balance" error, we skip the rest of this merchant.
//       if (skipMerchant) {
//         console.log(`Skipping merchant ${merchantId} due to "Not Enough Balance" error.`);
//         continue; // Move to the next merchant
//       }
//     }

//   } catch (err) {
//     console.log("Unexpected error: ", err);
//   }



// }

// export default processPendingRecordsCron