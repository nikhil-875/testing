// services/invoiceService.ts

import { memoryManager } from '../routes/memoryManager';
import { COMMON_KEYS, SESSION_KEYS } from '../constants/memoryKeys';
import { sendInteractiveMessage, sendTextMessages } from '../util/apiHandler';
import { InvoiceDetails } from '../util/db/dbHandler';
import { executeFlow } from '../util/flowHandler';

export async function handleInvoicesListReply(phone_no: string, selectedId: string) {
  const invoices = (await memoryManager.get(phone_no, COMMON_KEYS.INVOICES)) as InvoiceDetails[] | undefined;
  if (!invoices || !Array.isArray(invoices)) {
    await sendTextMessages(phone_no, "No invoices found. Please refresh your invoice list and try again.");
    return;
  }

  // Filter the selected invoice(s)
  const selectedInvoices = invoices.filter((inv) => inv.id.toString() === selectedId);

  if (selectedInvoices.length > 0) {
    const totalAmount = selectedInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const descriptions = selectedInvoices
      .map((inv) => `🔹 ${inv.description} - R${inv.amount}`)
      .join("\n");

    const invoiceMessage = `*Invoice Details*\n\n*Invoice ID:* ${selectedId}\n*Total Amount:* R${totalAmount}\n\n${descriptions}\n\nPaid invoice. You can view payment details, download receipts, or update payment status.`;
    const buttons = [
      { type: "reply", reply: { id: "update_payment_status", title: "Update Status" } },
    ];

    await sendInteractiveMessage(phone_no, invoiceMessage, buttons);
  } else {
    await sendTextMessages(phone_no, "Couldn't locate that invoice. Please try again.");
  }
}


export function runPaymentStatusFlow(body_param: any, phone_no: string, userId: string): void {
  // Implementation for running payment status flow goes here.
  const flowDefinitions = [
    { key: "update_payment_status", message: "Please update your payment status." }
  ];

  const screenID = "PAYMENT_STATUS";
  const flowID = "1894538851370969"; // Update this with the actual Payment Status flow ID if needed
  const flowCTA = "Continue";
  let PAYMENT_FORM_DATA: { paymentStatus?: string } = {};

    PAYMENT_FORM_DATA = {
      paymentStatus: PAYMENT_FORM_DATA?.paymentStatus || 'Pending'

  }
  
  executeFlow(
    body_param,
    phone_no,
    "Please update your payment status.",
    "update_payment_status",
    flowDefinitions,
    PAYMENT_FORM_DATA,
    screenID,
    flowID,
    flowCTA
  );
}