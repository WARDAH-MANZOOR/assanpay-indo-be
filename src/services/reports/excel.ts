import path from "path";
import ExcelJS from "exceljs";
import prisma from "../../lib/prisma.js";
import { JsonObject } from "@prisma/client/runtime/library";
import { toZonedTime, format } from "date-fns-tz"; // For time zone conversion
import { parseISO } from "date-fns";
import CustomError from "../../utils/custom_error.js";

const TIMEZONE = "Asia/Karachi"; // Pakistan Time Zone

export const generateExcelReportService = async (params: any): Promise<string> => {
    console.time("Overall Execution Time");

    const startTime = Date.now(); // overall timer
    let customWhere = { date_time: {} };
    let disbursementDateWhere: any = {};
    const startDate = params?.start?.replace(" ", "+");
    const endDate = params?.end?.replace(" ", "+");

    if (startDate && endDate) {
        const todayStart = parseISO(startDate as string);
        const todayEnd = parseISO(endDate as string);

        customWhere["date_time"] = { gte: todayStart, lt: todayEnd };
        disbursementDateWhere = customWhere["date_time"];
    }

    console.log("Fetching merchants...");
     // ⏱️ Measure merchant fetch time
    console.time("Fetch Merchants");
    // Fetch all merchants (assuming merchants are not in huge volume)
    const merchants = await prisma.merchant.findMany({
        include: {
            commissions: {
                select: {
                    commissionMode: true,
                    commissionRate: true,
                    easypaisaRate: true,
                    commissionGST: true,
                    commissionWithHoldingTax: true,
                    disbursementRate: true,
                    disbursementGST: true,
                    disbursementWithHoldingTax: true
                }
            }
        }
    });
    console.timeEnd("Fetch Merchants");
    // Fetch paginated transactions
    const pageSize = 25000;
    // 
    // ⏱️ Count and paginate transactions
    console.time("Count & Paginate Transactions");
    const totalTransactionCount = await prisma.transaction.count();
    console.log("Total transactions in DB:", totalTransactionCount);

    const filteredTransactionCount = await prisma.transaction.count({
    where: { date_time: customWhere["date_time"], status: "completed" }
    });
    console.log("Filtered transactions count:", filteredTransactionCount);


    const totalPagesTransactions = Math.ceil(filteredTransactionCount / pageSize);
    console.timeEnd("Count & Paginate Transactions");
    
    const pagesTransactions = [...Array(totalPagesTransactions).keys()];

  
    
    
    // ⏱️ Fetch transactions in batches
    console.time("Fetch Transactions");
    const transactions: any[] = [];

    for (let i = 0; i < pagesTransactions.length; i += 9) {
        const batch = pagesTransactions.slice(i, i + 9).map((page, idx) => {
            console.log(`Fetching transaction page ${i + idx + 1}/${totalPagesTransactions}...`);
            return prisma.transaction.findMany({
                where: { date_time: customWhere["date_time"], status: "completed" },
                skip: page * pageSize,
                take: pageSize,
                select: {
                    merchant_id: true,
                    original_amount: true,
                    providerDetails: true,
                    date_time: true
                }
            });
        });

    const results = await Promise.allSettled(batch);
    results.forEach((result, idx) => {
        if (result.status === "fulfilled") {
            transactions.push(...result.value);
            console.log(`Fetched ${result.value.length} transactions on page ${i + idx}`);
        } else {
            console.error(`Error fetching transactions at page ${i + idx}:`, result.reason);
        }
    });
    }

    console.timeEnd("Fetch Transactions");

    // ⏱️ Count and paginate disbursements
    console.time("Count & Paginate Disbursements");
    // Fetch paginated disbursements
    const disbursementCount = await prisma.disbursement.count({
    where: { disbursementDate: disbursementDateWhere, status: "completed" }
    });
    const totalPagesDisbursements = Math.ceil(disbursementCount / pageSize);
    console.log(`Total disbursements: ${disbursementCount}, Pages: ${totalPagesDisbursements}`);
    
    const pagesDisbursements = [...Array(totalPagesDisbursements).keys()];
    console.timeEnd("Count & Paginate Disbursements");

    console.time("Fetch Disbursements");
    const disbursements: any[] = [];

    for (let i = 0; i < pagesDisbursements.length; i += 9) {
        const batch = pagesDisbursements.slice(i, i + 9).map((page, idx) => {
            console.log(`Fetching disbursement page ${i + idx + 1}/${totalPagesDisbursements}...`);
            return prisma.disbursement.findMany({
                where: { disbursementDate: disbursementDateWhere, status: "completed" },
                skip: page * pageSize,
                take: pageSize,
                select: {
                    merchant_id: true,
                    transactionAmount: true,
                    disbursementDate: true,
                    commission: true
                }
            });
        });

        const results = await Promise.allSettled(batch);
        results.forEach((result, idx) => {
            if (result.status === "fulfilled") {
                disbursements.push(...result.value);
                console.log(`Fetched ${result.value.length} disbursements on page ${i + idx}`);
            } else {
                console.error(`Error fetching disbursements at page ${i + idx}:`, result.reason);
            }
        });
    }
    console.timeEnd("Fetch Disbursements");

    
    // Group transactions and disbursements by merchant_id upfront
    const transactionsByMerchant = new Map();
    transactions.forEach(txn => {
        if (!transactionsByMerchant.has(txn.merchant_id)) {
            transactionsByMerchant.set(txn.merchant_id, []);
        }
        transactionsByMerchant.get(txn.merchant_id).push(txn);
    });

    const disbursementsByMerchant = new Map();
    disbursements.forEach(d => {
        if (!disbursementsByMerchant.has(d.merchant_id)) {
            disbursementsByMerchant.set(d.merchant_id, []);
        }
        disbursementsByMerchant.get(d.merchant_id).push(d);
    });

    // Collect all unique dates across all merchants
    const allDatesSet = new Set<string>();
    transactions.forEach((txn) => {
        const pktDate = format(toZonedTime(txn.date_time, TIMEZONE), "yyyy-MM-dd");
        allDatesSet.add(pktDate);
    });
    disbursements.forEach((d) => {
        const pktDate = format(toZonedTime(d.disbursementDate, TIMEZONE), "yyyy-MM-dd");
        allDatesSet.add(pktDate);
    });
    const allDates = Array.from(allDatesSet).sort(); // Sorted unique dates

    // Process merchant data asynchronously
    console.log("Processing merchant data...");
    // ⏱️ Process merchants
    console.time("Process Merchants");
    const merchantData = await Promise.all(
        merchants.map(async (merchant,index) => {
            console.log(`Processing merchant ${index + 1}/${merchants.length}: ${merchant.full_name}`);

            const merchantTransactions = transactionsByMerchant.get(merchant.merchant_id) || [];
            const merchantDisbursements = disbursementsByMerchant.get(merchant.merchant_id) || [];
            const firstCommission = merchant.commissions?.[0];
            const commissionMode = firstCommission?.commissionMode ?? "SINGLE"; // fallback to SINGLE
            const commissionRate = Number(firstCommission?.commissionRate ?? 0);
            const easypaisaRate = Number(firstCommission?.easypaisaRate ?? 0);
            const commissionGST = Number(firstCommission?.commissionGST ?? 0);
            const commissionWithHoldingTax = Number(firstCommission?.commissionWithHoldingTax ?? 0);

            
            const commissionBaseRate = Number(commissionRate ?? 0);
            const easypaisaBaseRate = Number(easypaisaRate ?? 0);
            const gst = Number(commissionGST ?? 0);
            const wht = Number(commissionWithHoldingTax ?? 0);
            
            const dailyData: Record<string, {
                Easypaisa: number;
                JazzCash: number;
                Disbursement: number;
                DisbursementCommission: number;
                EasypaisaCommission?: number;
                JazzCashCommission?: number;
            }> = {};
            
            merchantTransactions.forEach((txn: {
                date_time: string | number | Date;
                providerDetails: { name: string };
                original_amount: string | number | null;
            }) => {
                const pktDate = format(toZonedTime(txn.date_time, TIMEZONE), "yyyy-MM-dd");
            
                if (!dailyData[pktDate]) {
                    dailyData[pktDate] = {
                        Easypaisa: 0,
                        JazzCash: 0,
                        Disbursement: 0,
                        DisbursementCommission: 0,
                        EasypaisaCommission: 0,
                        JazzCashCommission: 0,
                    };
                }
            
                const providerName = txn.providerDetails?.name as string;
                const amount = Number(txn.original_amount ?? 0);
            
                if (providerName?.includes("Easypaisa")) {
                    dailyData[pktDate].Easypaisa += amount;
                    const rate = commissionMode === "SINGLE"
                        ? commissionBaseRate + gst + wht
                        : easypaisaBaseRate + gst + wht;
                    dailyData[pktDate].EasypaisaCommission! += amount * rate;
            
                } else if (providerName?.includes("JazzCash")) {
                    dailyData[pktDate].JazzCash += amount;
                    const rate = commissionBaseRate + gst + wht;
                    dailyData[pktDate].JazzCashCommission! += amount * rate;
                }
            });
            
            merchantDisbursements.forEach((d: {
                disbursementDate: string | number | Date;
                transactionAmount: string | number;
                commission: string | number;
            }) => {
                const pktDate = format(toZonedTime(d.disbursementDate, TIMEZONE), "yyyy-MM-dd");
            
                if (!dailyData[pktDate]) {
                    dailyData[pktDate] = {
                        Easypaisa: 0,
                        JazzCash: 0,
                        Disbursement: 0,
                        DisbursementCommission: 0,
                    };
                }
            
                dailyData[pktDate].Disbursement += Number(d.transactionAmount);
                dailyData[pktDate].DisbursementCommission += Number(d.commission);
            });
            
            const dailyCommissions = Object.fromEntries(
                Object.entries(dailyData).map(([date, d]) => [
                    date,
                    {
                        Easypaisa: d.EasypaisaCommission ?? 0,
                        JazzCash: d.JazzCashCommission ?? 0,
                        Disbursement: d.DisbursementCommission,
                    },
                ])
            );
            
          
            return {
                name: merchant.full_name,
                dailyData,
                dailyCommissions,
            };
        })
    );
    console.timeEnd("Process Merchants");
    // Generate Excel report
    console.log("Generating Excel Report...");
    console.timeEnd("Overall Execution Time");

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        filename: path.join(process.cwd(), "src/services/reports", `merchant_report.xlsx`)
    });
    const sheet = workbook.addWorksheet("Merchant Report");

    // Styles
    const headerStyle = {
        font: { bold: true, size: 12 },
        alignment: { horizontal: "center" as const },
        fill: { type: "pattern" as const, pattern: "solid" as ExcelJS.FillPatterns, fgColor: { argb: "DDEBF7" } },
    };
    const subHeaderStyle = {
        font: { bold: true },
        alignment: { horizontal: "left" as const },
        fill: { type: "pattern" as const, pattern: "solid" as ExcelJS.FillPatterns, fgColor: { argb: "BDD7EE" } },
    };
    const dataRowStyle = {
        fill: { type: "pattern" as const, pattern: "solid" as ExcelJS.FillPatterns, fgColor: { argb: "E2EFDA" } },
    };

    // Add headers
    const headerRow = sheet.getRow(1);
    headerRow.getCell(1).value = "Merchant Name";
    console.log(allDates)
    allDates.forEach((date, index) => {
        headerRow.getCell(index + 2).value = date;
    });
    headerRow.getCell(allDates.length + 2).value = ""; // Empty Column
    headerRow.getCell(allDates.length + 3).value = "Total"; // Total Column
    headerRow.eachCell((cell) => (cell.style = headerStyle));

    let rowIndex = 2;

    // Fill data for each merchant
    merchantData.forEach((merchant) => {
        const { name, dailyData, dailyCommissions } = merchant;

        // Merchant header
        const merchantHeaderRow = sheet.getRow(rowIndex);
        merchantHeaderRow.getCell(1).value = name;
        merchantHeaderRow.getCell(1).style = subHeaderStyle;
        rowIndex++;

        // Process PayIn Collection and Commission (Easypaisa + JazzCash)
        let totalPayInCollectionSum = 0;
        let totalPayInCommissionSum = 0;

        // Process PayIn Collection and Commission
        const payInCollectionRow = sheet.getRow(rowIndex);
        payInCollectionRow.getCell(1).value = `Total PayIn Collection`;
        let payInCollectionOverallTotal = 0;

        const payInCommissionRow = sheet.getRow(rowIndex + 1);
        payInCommissionRow.getCell(1).value = `Total PayIn Commission`;
        let payInCommissionOverallTotal = 0;
        allDates.forEach((date, index) => {
            const payInCollection =
                Math.abs((dailyData[date]?.Easypaisa || 0) + (dailyData[date]?.JazzCash || 0));
            const payInCommission =
                Math.abs(
                    (dailyCommissions[date]?.Easypaisa || 0) +
                        (dailyCommissions[date]?.JazzCash || 0)
                );

            payInCollectionRow.getCell(index + 2).value = payInCollection;
            payInCommissionRow.getCell(index + 2).value = payInCommission;

            totalPayInCollectionSum += payInCollection;
            totalPayInCommissionSum += payInCommission;
        });

        payInCollectionRow.getCell(allDates.length + 2).value = totalPayInCollectionSum;
        payInCommissionRow.getCell(allDates.length + 2).value = totalPayInCommissionSum;
        payInCollectionRow.getCell(allDates.length + 3).value = `Total`;
        payInCommissionRow.getCell(allDates.length + 3).value = `Total`;
        payInCollectionRow.eachCell((cell) => (cell.style = dataRowStyle));
        payInCommissionRow.eachCell((cell) => (cell.style = dataRowStyle));

        rowIndex += 2;
    });

    // Save the file
    const filePath = path.join(import.meta.dirname, "merchant_report.xlsx");
    await workbook.commit();
    console.log("Excel report generation completed and file saved.");
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`✅ generateExcelReportService completed in ${totalTime}s`);

    return filePath;
};

export const payoutPerWalletService = async (params: any) => {
    try {
        const { startDate, endDate } = params;
        let start_date, end_date;

        if (startDate && endDate) {
            start_date = new Date(format(toZonedTime(startDate, "Asia/Karachi"), 'yyyy-MM-dd HH:mm:ss', { timeZone: "Asia/Karachi" }));
            end_date = new Date(format(toZonedTime(endDate, "Asia/Karachi"), 'yyyy-MM-dd HH:mm:ss', { timeZone: "Asia/Karachi" }));
        }

        // 🧠 Let DB do the aggregation
        const [jazzCashAgg] = await Promise.all([
            prisma.disbursement.findMany({
                where: {
                    status: 'completed',
                    disbursementDate: {
                        gte: start_date,
                        lt: end_date,
                    },
                },
                select: {
                    providerDetails: true,
                    merchantAmount: true,
                },
            })
        ]);

        const jazzCashAggregation = jazzCashAgg.reduce((acc, t) => {
            const merchantId = Number((t.providerDetails as JsonObject)?.id);
            if (Number.isNaN(merchantId)) return acc;

            acc[merchantId] = acc[merchantId] || { total_amount: 0, provider_name: 'JazzCash' };
            acc[merchantId].total_amount += Number(t.merchantAmount);
            return acc;
        }, {} as Record<number, { total_amount: number; provider_name: string }>);

        // 🧾 Prepare merchant ID arrays
        const jazzCashIds = Object.keys(jazzCashAggregation).map(Number);

        // 🧵 Fetch all merchants in parallel
        const [jazzCashMerchants] = await Promise.all([
            prisma.payinxMerchant.findMany({ where: { id: { in: jazzCashIds } }, select: { id: true, merchant_of: true } }),
        ]);

        // 🧱 Format results
        const jazzCashResult = jazzCashMerchants.map((m) => ({
            returnUrl: m.merchant_of,
            total_amount: jazzCashAggregation[m.id]?.total_amount || 0,
            provider_name: 'JazzCash',
        }));

        return {
            jazzCashTransactions: jazzCashResult,
        };
    } catch (error) {
        console.error(error);
        throw new CustomError("Internal Server Error", 400);
    }
};

export const payinPerWalletService = async (params: any) => {
    try {
        const { startDate, endDate } = params;
        let start_date, end_date;

        if (startDate && endDate) {
            start_date = new Date(format(toZonedTime(startDate, "Asia/Karachi"), 'yyyy-MM-dd HH:mm:ss', { timeZone: "Asia/Karachi" }));
            end_date = new Date(format(toZonedTime(endDate, "Asia/Karachi"), 'yyyy-MM-dd HH:mm:ss', { timeZone: "Asia/Karachi" }));
        }

        // 🧠 Let DB do the aggregation
        const [jazzCashAgg, easypaisaAgg] = await Promise.all([
            prisma.transaction.findMany({
                where: {
                    status: 'completed',
                    date_time: {
                        gte: start_date,
                        lt: end_date,
                    },
                    providerDetails: {
                        path: ['name'],
                        equals: 'JazzCash',
                    },
                },
                select: {
                    providerDetails: true,
                    original_amount: true,
                },
            }),
            prisma.transaction.findMany({
                where: {
                    status: 'completed',
                    date_time: { gte: start_date, lt: end_date },
                    providerDetails: { path: ['name'], equals: 'Easypaisa' },
                },
                select: {
                    providerDetails: true,
                    original_amount: true,
                    merchant_id: true,
                },
            }),
        ]);

        const jazzCashAggregation = jazzCashAgg.reduce((acc, t) => {
            const merchantId = Number((t.providerDetails as JsonObject)?.id);
            if (Number.isNaN(merchantId)) return acc;

            acc[merchantId] = acc[merchantId] || { total_amount: 0, provider_name: 'JazzCash' };
            acc[merchantId].total_amount += Number(t.original_amount);
            return acc;
        }, {} as Record<number, { total_amount: number; provider_name: string }>);

        // 🎯 Aggregate Easypaisa + Swich + PayFast
        const easypaisaAggMap: Record<number, { total_amount: number; provider_name: string }> = {};
        const swichAggMap: Record<number, { total_amount: number; provider_name: string }> = {};
        const payfastAggMap: Record<number, { total_amount: number; provider_name: string }> = {};

        for (const t of easypaisaAgg) {
            const provider = t.providerDetails as JsonObject;
            const providerId = Number(provider?.id);
            const subName = String(provider?.sub_name || '').toLowerCase();

            if (Number.isNaN(providerId)) continue;

            if ([2, 3].includes(providerId) || subName.includes("swich")) {
                swichAggMap[providerId] = swichAggMap[providerId] || { total_amount: 0, provider_name: 'Swich' };
                swichAggMap[providerId].total_amount += Number(t.original_amount);
            } else if (providerId === 5 || subName.includes("payfast")) {
                payfastAggMap[providerId] = payfastAggMap[providerId] || { total_amount: 0, provider_name: 'PayFast' };
                payfastAggMap[providerId].total_amount += Number(t.original_amount);
            } else {
                easypaisaAggMap[providerId] = easypaisaAggMap[providerId] || { total_amount: 0, provider_name: 'Easypaisa' };
                easypaisaAggMap[providerId].total_amount += Number(t.original_amount);
            }
        }

        // 🧾 Prepare merchant ID arrays
        const jazzCashIds = Object.keys(jazzCashAggregation).map(Number);
        const easypaisaIds = Object.keys(easypaisaAggMap).map(Number);
        const swichIds = Object.keys(swichAggMap).map(Number);
        const payfastIds = Object.keys(payfastAggMap).map(Number);
        console.log(swichAggMap)

        // 🧵 Fetch all merchants in parallel
        const [jazzCashMerchants] = await Promise.all([
            prisma.payinxMerchant.findMany({ where: { id: { in: jazzCashIds } }, select: { id: true, merchant_of: true } }),
        ]);

        // 🧱 Format results
        const jazzCashResult = jazzCashMerchants.map((m) => ({
            returnUrl: m.merchant_of,
            total_amount: jazzCashAggregation[m.id]?.total_amount || 0,
            provider_name: 'JazzCash',
        }));

        return {
            payinxTransactions: jazzCashResult,
        };
    } catch (error) {
        console.error(error);
        throw new CustomError("Internal Server Error", 400);
    }
};



export default {
    generateExcelReportService,
    payinPerWalletService,
    payoutPerWalletService
}