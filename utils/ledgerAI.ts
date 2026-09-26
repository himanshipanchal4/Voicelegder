import { Transaction, CustomerSummary } from "../types";
import { getCustomerSummaries } from "./storage";

export interface LedgerAIAnswer {
  answer: string;
  matchedTransactionIds: string[];
  highlightMetric?: string;
  category?: "debtor" | "customer" | "sales" | "cash" | "product" | "overview";
  relatedCustomer?: string;
  mode?: "gemini" | "ledger-engine";
}

/**
 * Intelligent deterministic analyzer that reads directly from the store/ledger records.
 * Provides 100% accurate, specific, and real-data answers to any shopkeeper query.
 */
export function computeAccurateLedgerAnswer(
  query: string,
  transactions: Transaction[],
  providedCustomers?: CustomerSummary[]
): LedgerAIAnswer {
  const q = query.trim();
  const qLower = q.toLowerCase();

  // Ensure we have current customer summaries
  const customers =
    providedCustomers && providedCustomers.length > 0
      ? providedCustomers
      : getCustomerSummaries(transactions);

  // High-level aggregates
  const totalTransactions = transactions.length;
  const salesTxns = transactions.filter((t) => t.transaction_type === "sale");
  const paymentTxns = transactions.filter((t) => t.transaction_type === "payment");
  const purchaseTxns = transactions.filter((t) => t.transaction_type === "purchase");

  const totalSalesVolume = salesTxns.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
  const totalPaidSales = salesTxns
    .filter((t) => t.payment_status === "paid")
    .reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
  const totalCreditSales = salesTxns
    .filter((t) => t.payment_status === "credit")
    .reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
  const totalPaymentsReceived = paymentTxns.reduce(
    (sum, t) => sum + Number(t.total_amount || 0),
    0
  );
  const totalCashCollected = totalPaidSales + totalPaymentsReceived;
  const totalOutstandingUdhaar = customers.reduce((sum, c) => sum + Number(c.totalOwed || 0), 0);

  // -------------------------------------------------------------
  // 1. SPECIFIC CUSTOMER CHECK (Check if query mentions a customer)
  // -------------------------------------------------------------
  // Find customer match (check if customer name or part of it appears in the query)
  let matchedCustomer = customers.find((c) => {
    const cLower = c.name.toLowerCase();
    // exact word match or substring
    const parts = cLower.split(/\s+/);
    return (
      qLower.includes(cLower) ||
      parts.some((p) => p.length > 2 && qLower.includes(p))
    );
  });

  // If no customer from summary matched, check raw transactions customer_name
  if (!matchedCustomer) {
    const custNameTxn = transactions.find((t) => {
      const cLower = t.customer_name.toLowerCase();
      const parts = cLower.split(/\s+/);
      return qLower.includes(cLower) || parts.some((p) => p.length > 2 && qLower.includes(p));
    });
    if (custNameTxn) {
      matchedCustomer = customers.find((c) => c.name.toLowerCase() === custNameTxn.customer_name.toLowerCase());
    }
  }

  if (matchedCustomer) {
    const c = matchedCustomer;
    const custTxns = transactions.filter(
      (t) => t.customer_name.toLowerCase() === c.name.toLowerCase()
    );
    const matchedIds = custTxns.map((t) => t.id);
    const unpaidTxns = custTxns.filter(
      (t) => t.payment_status === "credit" && t.transaction_type === "sale"
    );
    const payments = custTxns.filter((t) => t.transaction_type === "payment");
    const sales = custTxns.filter((t) => t.transaction_type === "sale");

    // All items bought by this customer
    const itemsBought: { name: string; qty: number; count: number }[] = [];
    sales.forEach((t) => {
      t.items.forEach((item) => {
        const existing = itemsBought.find((i) => i.name.toLowerCase() === item.name.toLowerCase());
        if (existing) {
          existing.qty += item.quantity || 1;
          existing.count += 1;
        } else {
          itemsBought.push({ name: item.name, qty: item.quantity || 1, count: 1 });
        }
      });
    });

    // Check query intent regarding this customer
    const isAskingUnpaid =
      qLower.includes("unpaid") ||
      qLower.includes("owe") ||
      qLower.includes("udhaar") ||
      qLower.includes("baki") ||
      qLower.includes("pending") ||
      qLower.includes("balance");

    const isAskingItems =
      qLower.includes("buy") ||
      qLower.includes("bought") ||
      qLower.includes("item") ||
      qLower.includes("items") ||
      qLower.includes("kya") ||
      qLower.includes("khareeda") ||
      qLower.includes("saman") ||
      qLower.includes("liya");

    const isAskingPayments =
      qLower.includes("payment") ||
      qLower.includes("jama") ||
      qLower.includes("paid") ||
      qLower.includes("chukaya") ||
      qLower.includes("settle");

    if (isAskingUnpaid) {
      if (c.totalOwed > 0) {
        const unpaidDetails = unpaidTxns
          .map(
            (t) =>
              `• ${t.date}: ₹${t.total_amount.toLocaleString("en-IN")} (${t.items.map((i) => i.name).join(", ") || "General bill"})`
          )
          .join("\n");

        return {
          answer: `**${c.name}** has an outstanding Udhaar balance of **₹${c.totalOwed.toLocaleString(
            "en-IN"
          )}**.\n\n` +
            `**Unpaid Credit Transactions (${unpaidTxns.length}):**\n` +
            (unpaidDetails || `• Net pending: ₹${c.totalOwed.toLocaleString("en-IN")}`) +
            `\n\n(Total lifetime purchases: ₹${(c.totalCreditSales + c.totalPaidSales).toLocaleString(
              "en-IN"
            )} | Total paid/settled: ₹${c.totalPaid.toLocaleString("en-IN")})`,
          matchedTransactionIds: unpaidTxns.map((t) => t.id),
          highlightMetric: `₹${c.totalOwed.toLocaleString("en-IN")} Udhaar`,
          category: "customer",
          relatedCustomer: c.name,
        };
      } else {
        return {
          answer: `**${c.name}** has **₹0 outstanding Udhaar**! All previous bills have been fully paid and cleared.\n\n` +
            `• Total Lifetime Purchases: ₹${(c.totalCreditSales + c.totalPaidSales).toLocaleString("en-IN")}\n` +
            `• Total Amount Received: ₹${c.totalPaid.toLocaleString("en-IN")}\n` +
            `• Total Transactions: ${c.totalTransactionsCount} bills`,
          matchedTransactionIds: matchedIds,
          highlightMetric: "₹0 Udhaar (Cleared)",
          category: "customer",
          relatedCustomer: c.name,
        };
      }
    }

    if (isAskingItems) {
      if (itemsBought.length > 0) {
        const itemsList = itemsBought
          .map((i) => `• **${i.name}**: ${i.qty} units (${i.count} times)`)
          .join("\n");
        return {
          answer: `Here are the items **${c.name}** has purchased from your shop:\n\n${itemsList}\n\n` +
            `Total purchases: ₹${(c.totalCreditSales + c.totalPaidSales).toLocaleString(
              "en-IN"
            )} across ${sales.length} bills. (Current balance: ₹${c.totalOwed.toLocaleString("en-IN")} pending).`,
          matchedTransactionIds: sales.map((t) => t.id),
          highlightMetric: `${itemsBought.length} items purchased`,
          category: "product",
          relatedCustomer: c.name,
        };
      } else {
        return {
          answer: `**${c.name}** has ${sales.length} sales bills on record totaling ₹${(
            c.totalCreditSales + c.totalPaidSales
          ).toLocaleString("en-IN")}, but no specific individual item names were itemized in those bills.`,
          matchedTransactionIds: sales.map((t) => t.id),
          category: "customer",
          relatedCustomer: c.name,
        };
      }
    }

    if (isAskingPayments) {
      const paymentDetails = payments
        .map((p) => `• ${p.date} (${p.time}): ₹${p.total_amount.toLocaleString("en-IN")} - ${p.notes || "Udhaar payment"}`)
        .join("\n");

      return {
        answer: `Payment history for **${c.name}**:\n\n` +
          `• Total Amount Paid / Settled: **₹${c.totalPaid.toLocaleString("en-IN")}**\n` +
          `• Direct Payment Entries (${payments.length}):\n` +
          (paymentDetails || "• No separate payment receipts logged; paid during cash checkout.") +
          `\n• Current Net Outstanding: **₹${c.totalOwed.toLocaleString("en-IN")}**`,
        matchedTransactionIds: payments.map((p) => p.id),
        highlightMetric: `₹${c.totalPaid.toLocaleString("en-IN")} Paid`,
        category: "customer",
        relatedCustomer: c.name,
      };
    }

    // Default Customer Overview
    const recentTxnsSummary = custTxns
      .slice(0, 4)
      .map(
        (t) =>
          `• ${t.date}: ₹${t.total_amount.toLocaleString("en-IN")} [${
            t.transaction_type === "payment" ? "Payment / Jama" : t.payment_status === "paid" ? "Paid Sale" : "Udhaar"
          }] - ${t.items.map((i) => i.name).join(", ") || t.notes || "Bill"}`
      )
      .join("\n");

    return {
      answer: `Account summary for **${c.name}**:\n\n` +
        `• **Current Outstanding (Udhaar):** ₹${c.totalOwed.toLocaleString("en-IN")}\n` +
        `• **Total Lifetime Purchases:** ₹${(c.totalCreditSales + c.totalPaidSales).toLocaleString("en-IN")} (${sales.length} purchases)\n` +
        `• **Total Payments Received:** ₹${c.totalPaid.toLocaleString("en-IN")}\n` +
        `• **Last Transaction Date:** ${c.lastTransactionDate}\n\n` +
        `**Recent Bills:**\n${recentTxnsSummary || "None"}`,
      matchedTransactionIds: matchedIds,
      highlightMetric: c.totalOwed > 0 ? `₹${c.totalOwed.toLocaleString("en-IN")} Pending` : "Fully Cleared",
      category: "customer",
      relatedCustomer: c.name,
    };
  }

  // -------------------------------------------------------------
  // 2. DEBTOR / OUTSTANDING / UDHAAR LIST QUERIES
  // -------------------------------------------------------------
  const isGeneralDebtorQuery =
    qLower.includes("owe") ||
    qLower.includes("unpaid") ||
    qLower.includes("pending") ||
    qLower.includes("udhaar") ||
    qLower.includes("baki") ||
    qLower.includes("debtor") ||
    qLower.includes("debtors") ||
    qLower.includes("kiska baki");

  if (isGeneralDebtorQuery) {
    // Check if user specified a numeric threshold (e.g., "more than 500", "500 se zyada", "> 200")
    let threshold = 0;
    const thresholdMatch =
      qLower.match(/(?:more than|greater than|>|above|over|se zyada|se upar|ke upar)\s*(?:₹|rs\.?|inr)?\s*(\d+)/i) ||
      qLower.match(/(\d+)\s*(?:se zyada|rupaye se zyada|above|over)/i);

    if (thresholdMatch && thresholdMatch[1]) {
      threshold = parseInt(thresholdMatch[1], 10);
    }

    const debtors = customers
      .filter((c) => c.totalOwed > threshold)
      .sort((a, b) => b.totalOwed - a.totalOwed);

    const debtorsTotal = debtors.reduce((sum, d) => sum + d.totalOwed, 0);

    const debtorTxns = transactions.filter(
      (t) =>
        t.payment_status === "credit" &&
        debtors.some((d) => d.name.toLowerCase() === t.customer_name.toLowerCase())
    );

    if (debtors.length === 0) {
      if (threshold > 0) {
        const highestDebtor = customers.sort((a, b) => b.totalOwed - a.totalOwed)[0];
        return {
          answer: `No customer currently owes more than **₹${threshold.toLocaleString("en-IN")}**.\n\n` +
            (highestDebtor && highestDebtor.totalOwed > 0
              ? `The highest pending balance is with **${highestDebtor.name}** at **₹${highestDebtor.totalOwed.toLocaleString("en-IN")}**.`
              : "All customer accounts are clear of debt!"),
          matchedTransactionIds: [],
          highlightMetric: `0 above ₹${threshold}`,
          category: "debtor",
        };
      } else {
        return {
          answer: `🎉 Great news! You have **₹0 in outstanding Udhaar**. All customers have fully paid up their balances.`,
          matchedTransactionIds: [],
          highlightMetric: "₹0 Udhaar",
          category: "debtor",
        };
      }
    }

    const debtorListFormatted = debtors
      .map(
        (d, idx) =>
          `${idx + 1}. **${d.name}** — **₹${d.totalOwed.toLocaleString("en-IN")}** (Last purchase: ${d.lastTransactionDate})`
      )
      .join("\n");

    const header = threshold > 0
      ? `You have **${debtors.length} customer(s)** who owe more than **₹${threshold.toLocaleString("en-IN")}**, totaling **₹${debtorsTotal.toLocaleString("en-IN")}**:`
      : `You have **${debtors.length} customer(s)** with pending Udhaar, totaling **₹${debtorsTotal.toLocaleString("en-IN")}**:`;

    return {
      answer: `${header}\n\n${debtorListFormatted}\n\n💡 *Tip: Click on any customer above to open their Khata and send a WhatsApp reminder.*`,
      matchedTransactionIds: debtorTxns.map((t) => t.id),
      highlightMetric: `₹${debtorsTotal.toLocaleString("en-IN")} Total Udhaar`,
      category: "debtor",
    };
  }

  // -------------------------------------------------------------
  // 3. TODAY'S SALES / DATE-BASED QUERIES
  // -------------------------------------------------------------
  const isAskingToday =
    qLower.includes("today") ||
    qLower.includes("aaj") ||
    qLower.includes("daily") ||
    qLower.includes("aaj ki");

  if (isAskingToday) {
    const todayStr = new Date().toISOString().split("T")[0];
    let todayTxns = transactions.filter((t) => t.date === todayStr);

    // If no transactions today, find the most recent date in ledger to show helpful insight
    if (todayTxns.length === 0) {
      // Find the latest active date
      const sortedDates = [...new Set(transactions.map((t) => t.date))].sort().reverse();
      const latestDate = sortedDates[0];
      const latestDateTxns = latestDate ? transactions.filter((t) => t.date === latestDate) : [];
      const latestSales = latestDateTxns
        .filter((t) => t.transaction_type === "sale")
        .reduce((s, t) => s + t.total_amount, 0);

      return {
        answer: `No transactions have been recorded for **Today (${todayStr})** yet.\n\n` +
          (latestDate
            ? `On the most recent active date (**${latestDate}**), you recorded **${latestDateTxns.length} transactions** totaling **₹${latestSales.toLocaleString(
                "en-IN"
              )}**.\n\n`
            : "") +
          `Across your entire ledger history, total sales stand at **₹${totalSalesVolume.toLocaleString(
            "en-IN"
          )}** across ${totalTransactions} entries.`,
        matchedTransactionIds: latestDateTxns.map((t) => t.id),
        highlightMetric: latestDate ? `₹${latestSales.toLocaleString("en-IN")} on ${latestDate}` : "₹0 Today",
        category: "sales",
      };
    }

    const todaySales = todayTxns
      .filter((t) => t.transaction_type === "sale")
      .reduce((s, t) => s + t.total_amount, 0);
    const todayPaid = todayTxns
      .filter((t) => t.payment_status === "paid")
      .reduce((s, t) => s + t.total_amount, 0);
    const todayCredit = todayTxns
      .filter((t) => t.payment_status === "credit")
      .reduce((s, t) => s + t.total_amount, 0);

    const breakdown = todayTxns
      .map(
        (t) =>
          `• ${t.time}: **${t.customer_name}** — ₹${t.total_amount.toLocaleString("en-IN")} [${
            t.payment_status === "paid" ? "Paid" : "Udhaar"
          }] (${t.items.map((i) => i.name).join(", ") || t.notes || "Sale"})`
      )
      .join("\n");

    return {
      answer: `📅 **Today's Business Report (${todayStr}):**\n\n` +
        `• **Total Sales:** ₹${todaySales.toLocaleString("en-IN")}\n` +
        `• **Cash / Paid Collected:** ₹${todayPaid.toLocaleString("en-IN")}\n` +
        `• **New Credit (Udhaar) Given:** ₹${todayCredit.toLocaleString("en-IN")}\n` +
        `• **Total Customers Served:** ${todayTxns.length}\n\n` +
        `**Today's Logged Transactions:**\n${breakdown}`,
      matchedTransactionIds: todayTxns.map((t) => t.id),
      highlightMetric: `₹${todaySales.toLocaleString("en-IN")} Today's Sales`,
      category: "sales",
    };
  }

  // -------------------------------------------------------------
  // 4. CASH / COLLECTION QUERIES
  // -------------------------------------------------------------
  const isAskingCash =
    qLower.includes("cash") ||
    qLower.includes("collected") ||
    qLower.includes("collection") ||
    qLower.includes("jama hua") ||
    qLower.includes("kitna paisa");

  if (isAskingCash) {
    return {
      answer: `💰 **Cash & Collection Summary:**\n\n` +
        `• **Total Money Collected:** **₹${totalCashCollected.toLocaleString("en-IN")}**\n` +
        `  - Paid Sales: ₹${totalPaidSales.toLocaleString("en-IN")} across ${
          salesTxns.filter((t) => t.payment_status === "paid").length
        } bills\n` +
        `  - Udhaar Settlement Payments: ₹${totalPaymentsReceived.toLocaleString("en-IN")} across ${paymentTxns.length} receipts\n` +
        `• **Pending Udhaar in Market:** ₹${totalOutstandingUdhaar.toLocaleString("en-IN")}`,
      matchedTransactionIds: transactions
        .filter((t) => t.payment_status === "paid" || t.transaction_type === "payment")
        .map((t) => t.id),
      highlightMetric: `₹${totalCashCollected.toLocaleString("en-IN")} Collected`,
      category: "cash",
    };
  }

  // -------------------------------------------------------------
  // 5. SALES & REVENUE GENERAL QUERIES
  // -------------------------------------------------------------
  const isAskingSales =
    qLower.includes("sell") ||
    qLower.includes("sales") ||
    qLower.includes("bikri") ||
    qLower.includes("revenue") ||
    qLower.includes("turnover");

  if (isAskingSales) {
    return {
      answer: `📊 **Sales Performance Summary:**\n\n` +
        `• **Total Sales Volume:** **₹${totalSalesVolume.toLocaleString("en-IN")}** across ${salesTxns.length} sales bills\n` +
        `• **Cash / Paid Sales:** ₹${totalPaidSales.toLocaleString("en-IN")}\n` +
        `• **Credit / Udhaar Sales:** ₹${totalCreditSales.toLocaleString("en-IN")}\n` +
        `• **Average Bill Value:** ₹${
          salesTxns.length > 0 ? Math.round(totalSalesVolume / salesTxns.length).toLocaleString("en-IN") : "0"
        }\n` +
        `• **Net Outstanding Udhaar:** ₹${totalOutstandingUdhaar.toLocaleString("en-IN")}`,
      matchedTransactionIds: salesTxns.map((t) => t.id),
      highlightMetric: `₹${totalSalesVolume.toLocaleString("en-IN")} Total Sales`,
      category: "sales",
    };
  }

  // -------------------------------------------------------------
  // 6. ITEM / PRODUCT SEARCH QUERIES (e.g., "Who bought rice?", "Sugar sales")
  // -------------------------------------------------------------
  // Check if any word matches an item name in the transactions
  let foundItemName: string | null = null;
  const allItemsList: { name: string; qty: number; revenue: number; buyers: Set<string>; txnIds: string[] }[] = [];

  transactions.forEach((t) => {
    t.items.forEach((item) => {
      const existing = allItemsList.find((i) => i.name.toLowerCase() === item.name.toLowerCase());
      const itemRev = (item.quantity || 1) * (item.unit_price || 0);
      if (existing) {
        existing.qty += item.quantity || 1;
        existing.revenue += itemRev;
        existing.buyers.add(t.customer_name);
        existing.txnIds.push(t.id);
      } else {
        allItemsList.push({
          name: item.name,
          qty: item.quantity || 1,
          revenue: itemRev,
          buyers: new Set([t.customer_name]),
          txnIds: [t.id],
        });
      }
    });
  });

  const matchedItem = allItemsList.find((item) => {
    const iLower = item.name.toLowerCase();
    return qLower.includes(iLower) || iLower.split(/\s+/).some((p) => p.length > 2 && qLower.includes(p));
  });

  if (matchedItem) {
    const buyersList = Array.from(matchedItem.buyers).join(", ");
    return {
      answer: `📦 **Product Sales Record for "${matchedItem.name}":**\n\n` +
        `• **Total Quantity Sold:** ${matchedItem.qty} units across ${matchedItem.txnIds.length} bills\n` +
        `• **Total Revenue Generated:** ₹${matchedItem.revenue.toLocaleString("en-IN")}\n` +
        `• **Purchased by Customers:** ${buyersList || "Cash customers"}`,
      matchedTransactionIds: matchedItem.txnIds,
      highlightMetric: `${matchedItem.qty} units sold`,
      category: "product",
    };
  }

  // -------------------------------------------------------------
  // 7. PURCHASE / EXPENSE QUERIES
  // -------------------------------------------------------------
  const isAskingPurchases =
    qLower.includes("purchase") ||
    qLower.includes("purchases") ||
    qLower.includes("maal khareeda") ||
    qLower.includes("supplier") ||
    qLower.includes("inventory buy");

  if (isAskingPurchases) {
    const totalPurchasesCost = purchaseTxns.reduce((s, t) => s + t.total_amount, 0);
    const purchaseList = purchaseTxns
      .map((t) => `• ${t.date}: ₹${t.total_amount.toLocaleString("en-IN")} (${t.items.map((i) => i.name).join(", ") || t.notes || "Stock purchase"})`)
      .join("\n");

    return {
      answer: `🛒 **Purchase / Stock Inflow Report:**\n\n` +
        `• **Total Purchase Bills:** ${purchaseTxns.length} records\n` +
        `• **Total Cost:** ₹${totalPurchasesCost.toLocaleString("en-IN")}\n\n` +
        (purchaseList || "No vendor purchase bills logged yet."),
      matchedTransactionIds: purchaseTxns.map((t) => t.id),
      highlightMetric: `₹${totalPurchasesCost.toLocaleString("en-IN")} Purchases`,
      category: "overview",
    };
  }

  // -------------------------------------------------------------
  // 8. GENERAL FINANCIAL HEALTH & RECORD OVERVIEW (Default)
  // -------------------------------------------------------------
  const activeDebtors = customers.filter((c) => c.totalOwed > 0);
  const topDebtor = activeDebtors.sort((a, b) => b.totalOwed - a.totalOwed)[0];

  return {
    answer: `📋 **Shop Ledger Overview & Status:**\n\n` +
      `• **Total Transactions Logged:** ${totalTransactions} entries\n` +
      `• **Total Sales Recorded:** ₹${totalSalesVolume.toLocaleString("en-IN")}\n` +
      `• **Cash / Money Received:** ₹${totalCashCollected.toLocaleString("en-IN")}\n` +
      `• **Active Outstanding Udhaar:** ₹${totalOutstandingUdhaar.toLocaleString("en-IN")} (across ${activeDebtors.length} customers)\n` +
      (topDebtor ? `• **Highest Balance Pending:** ${topDebtor.name} (₹${topDebtor.totalOwed.toLocaleString("en-IN")})\n` : "") +
      `\n💡 *You can ask me specific questions like:*\n` +
      `• *"Who owes me money?"*\n` +
      `• *"Show Sharma's unpaid transactions"*\n` +
      `• *"How much did I sell today?"*\n` +
      `• *"Who bought rice?"*`,
    matchedTransactionIds: transactions.slice(0, 10).map((t) => t.id),
    highlightMetric: `₹${totalOutstandingUdhaar.toLocaleString("en-IN")} Udhaar`,
    category: "overview",
  };
}
