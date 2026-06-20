import { jsPDF } from "jspdf";
import { Company } from "../types";

export interface InvoiceData {
  invoiceId: string;
  issueDate: string;
  amount: string;
  planName: string;
  paymentMethod: string;
  status: string;
}

export function generateInvoicePDF(company: Company, invoice: InvoiceData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  // Top header styling (Banner Slate)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 40, "F");

  // Draw company logo if provided
  if (company.logoUrl) {
    try {
      doc.addImage(company.logoUrl, "JPEG", 15, 6, 20, 16);
    } catch (e1) {
      try {
        doc.addImage(company.logoUrl, "PNG", 15, 6, 20, 16);
      } catch (e2) { }
    }
  }

  // Logo Brand text
  doc.setTextColor(255, 255, 255);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.text(company.logoUrl ? "" : "WALKSAFE", 15, 18);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(245, 158, 11); // Amber
  doc.text("FLEET COMPLIANCE SOFTWARE", 15, 23);

  // Invoice Title
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("MEMBERSHIP RECEIPT", 130, 18);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // light gray
  doc.text(`Invoice ID: ${invoice.invoiceId}`, 130, 24);
  doc.text(`Date Issued: ${invoice.issueDate}`, 130, 29);

  // Content body
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont("Helvetica", "bold");
  doc.text("BILLED TO:", 15, 55);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(company.name || "Valued Customer", 15, 62);
  doc.text(`O-Licence: ${company.oLicence || "NOT PROVIDED"}`, 15, 68);
  doc.text(`Email: ${company.email || "N/A"}`, 15, 74);

  doc.setFont("Helvetica", "bold");
  doc.text("FROM:", 120, 55);
  doc.setFont("Helvetica", "normal");
  doc.text("WalkSafe UK Ltd", 120, 62);
  doc.text("Fleet House, London EC1A", 120, 68);
  doc.text("billing@getwalksafe.co.uk", 120, 74);

  // Line item separator
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, 85, 195, 85);

  // Table header
  doc.setFillColor(248, 250, 252);
  doc.rect(15, 90, 180, 8, "F");
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("Description", 20, 95.5);
  doc.text("Period", 100, 95.5);
  doc.text("Amount", 170, 95.5);

  // Table row
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`WalkSafe Compliance Platform - ${invoice.planName}`, 20, 106);
  doc.text("Monthly Subscription", 100, 106);
  doc.text(invoice.amount, 170, 106);

  doc.line(15, 112, 195, 112);

  // Total summary
  doc.setFont("Helvetica", "bold");
  doc.text("Total Paid:", 125, 122);
  doc.text(invoice.amount, 170, 122);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Payment Card: ${invoice.paymentMethod}`, 125, 128);
  doc.text(`Transaction Status: ${invoice.status}`, 125, 134);

  // Footer Banner
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 150, 180, 25, "F");
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8.5);
  doc.setFont("Helvetica", "normal");
  doc.text("Thank you for choosing WalkSafe as your commercial vehicle partner.", 20, 157);
  doc.text("This receipt constitutes proof of payment and compliance record-retention.", 20, 162);
  doc.text("For any account inquiries, please contact our support desk (support@walksafe.co.uk).", 20, 167);

  return doc;
}
