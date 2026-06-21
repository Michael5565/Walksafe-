import { jsPDF } from "jspdf";
import { Vehicle, Driver, WalkaroundCheck, Defect, Company } from "../types";

export function generateDVSA_PDF(
  check: WalkaroundCheck,
  vehicle: Vehicle,
  driver: Driver,
  company: Company,
  relatedDefects: Defect[],
  targetDoc?: jsPDF
) {
  // Graceful fallbacks to ensure file downloads do not crash even without database or with missing keys
  const safeVehicle = vehicle || {
    id: check?.vehicleId || "unknown-vehicle",
    registration: "NIL VEHICLE",
    make: "Generic Check-in",
    model: "Record",
    type: "lgv",
    motExpiry: "NOT DECLARED",
    taxExpiry: "NOT DECLARED"
  };

  const safeDriver = driver || {
    id: check?.driverId || "unknown-driver",
    fullName: "Walkaround Operator"
  };

  const safeCompany = company || {
    id: "unknown-company",
    name: "WalkSafe General Fleet",
    oLicence: "NOT AVAILABLE",
    plan: "starter",
    vehicleLimit: 9,
    createdAt: new Date().toISOString()
  };

  const safeCheck: WalkaroundCheck = check || {
    id: "offline-check-" + Date.now(),
    companyId: safeCompany.id,
    vehicleId: safeVehicle.id,
    driverId: safeDriver.id,
    startedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    durationSeconds: 0,
    result: "nil_defect",
    quickCheckAlert: false,
    checkDate: new Date().toISOString().split('T')[0],
    driverSignature: "",
    items: [],
    miscDamageNotes: "",
    miscDamagePhotoUrl: ""
  };

  const safeRelatedDefects = relatedDefects || [];
const templateName = safeCheck.templateName || undefined;

  // Create an A4 portrait PDF document
  const doc = targetDoc || new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });
  if (targetDoc && targetDoc.getNumberOfPages() > 0) {
    targetDoc.addPage();
  }

  const primaryColor = "#0D1F2D"; // Deep Blue
  const accentColor = "#F5A623";  // Safety Amber
  const passColor = "#22C55E";    // Green
  const failColor = "#EF4444";    // Red
  const grayColor = "#4A5568";    // Slate Gray

  let y = 15;

  // -- HEADER --
  doc.setFillColor(primaryColor);
  doc.rect(10, 10, 190, 12, "F");
  
  // Draw company logo if provided
  if (safeCompany.logoUrl) {
    try {
      // Small logo on the left side of the header
      doc.addImage(safeCompany.logoUrl, "JPEG", 12, 10.5, 14, 11);
    } catch (e1) {
      try {
        doc.addImage(safeCompany.logoUrl, "PNG", 12, 10.5, 14, 11);
      } catch (e2) {
        // Silently skip logo
      }
    }
  }
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor("#FFFFFF");
  doc.text("WALKSAFE - DAILY COMPLIANCE RECORD", safeCompany.logoUrl ? 28 : 14, 17.5);

  doc.setFontSize(8);
  doc.setTextColor("#F5A623");
  doc.text(templateName ? templateName.toUpperCase() : "DVSA ROADWORTHINESS COMPLIANT", 196, 17.5, { align: "right" });

  y = 28;

  const todayStr = new Date().toISOString().split('T')[0];
  const motExpired = safeVehicle.motExpiry && safeVehicle.motExpiry < todayStr;
  const taxExpired = safeVehicle.taxExpiry && safeVehicle.taxExpiry < todayStr;

  // -- METADATA BLOCKS --
  // Draw Vehicle block
  doc.setDrawColor("#0D1F2D");
  doc.setLineWidth(0.3);
  doc.rect(10, y, 92, 45);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(primaryColor);
  doc.text("VEHICLE DETAILS", 14, y + 5);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(grayColor);
  doc.text(`Registration Plate:`, 14, y + 12);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor("#000000");
  doc.text(`${safeVehicle.registration}`, 48, y + 12);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor);
  doc.text(`Make & Model:`, 14, y + 18);
  doc.setTextColor("#000000");
  doc.text(`${safeVehicle.make} ${safeVehicle.model}`, 48, y + 18);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor);
  doc.text(`Vehicle Type:`, 14, y + 24);
  doc.setTextColor("#000000");
  doc.text(`${(safeVehicle.type || "lgv").toUpperCase().replace("_", " + ")}`, 48, y + 24);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor);
  doc.text(`MOT Expiry:`, 14, y + 30);
  doc.setTextColor(motExpired ? "#EF4444" : "#000000");
  doc.text(motExpired ? `EXPIRED (${safeVehicle.motExpiry})` : `${safeVehicle.motExpiry}`, 48, y + 30);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor);
  doc.text(`Tax Status:`, 14, y + 36);
  doc.setTextColor(taxExpired ? "#EF4444" : "#000000");
  doc.text(taxExpired ? `EXPIRED (${safeVehicle.taxExpiry})` : `Valid (Expires ${safeVehicle.taxExpiry})`, 48, y + 36);

  // Draw Driver/Operator block
  doc.rect(108, y, 92, 45);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(primaryColor);
  doc.text("CHECK & OPERATOR DETAILS", 112, y + 5);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(grayColor);
  doc.text(`Operator Name:`, 112, y + 12);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor("#000000");
  doc.text(`${safeCompany.name}${safeCompany.isSoloOperator ? " (Solo)" : ""}`, 144, y + 12);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor);
  doc.text(`O-Licence Number:`, 112, y + 18);
  doc.setTextColor("#000000");
  doc.text(`${safeCompany.oLicence || "NOT PROVIDED"}`, 144, y + 18);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor);
  doc.text(safeCompany.isSoloOperator ? `Driver Name:` : `Nominated Driver:`, 112, y + 24);
  doc.setTextColor("#000000");
  doc.text(`${safeDriver.fullName}`, 144, y + 24);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor);
  doc.text(`Check Date:`, 112, y + 30);
  doc.setTextColor("#000000");
  doc.text(`${new Date(safeCheck.startedAt).toLocaleDateString("en-GB")}`, 144, y + 30);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor);
  doc.text(`Check Duration:`, 112, y + 36);
  doc.setTextColor("#000000");
  const min = Math.floor((safeCheck.durationSeconds || 0) / 60);
  const sec = (safeCheck.durationSeconds || 0) % 60;
  doc.text(`${min}m ${sec}s ${safeCheck.quickCheckAlert ? " (SPEED ALERT - CODE RED)" : ""}`, 144, y + 36);

  y += 50;

  // -- STATUS BANNER --
  const isPassed = safeCheck.result === "nil_defect";
  const statusBg = isPassed ? passColor : failColor;
  doc.setFillColor(statusBg);
  doc.rect(10, y, 190, 10, "F");
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor("#FFFFFF");
  const verdictText = isPassed 
    ? "PASSED - NIL DEFECTS DETECTED DURING WALKAROUND" 
    : "DEFECTS REPORTED - FAULTS SUSPENDING FULL FLEET READINESS";
  doc.text(verdictText, 14, y + 6.5);

  y += 15;

  // -- CHECKLIST RESULTS COMPILATION --
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(primaryColor);
  doc.text(templateName ? `DETAILED CHECKLIST RESULTS: ${templateName.toUpperCase()}` : "DETAILED CHECKLIST RESULTS (27 POINT AUDIT)", 10, y);
  
  y += 4;

  const results = safeCheck.items && safeCheck.items.length > 0 ? safeCheck.items : [];
  
  // Custom manual table generation to ensure 100% accurate styling control without outer autotable library dependency errors
  doc.setFontSize(8);
  doc.setTextColor(primaryColor);
  doc.setLineWidth(0.1);
  doc.setDrawColor("#CBD5E1");

  // Headers
  doc.setFillColor("#E2E8F0");
  doc.rect(10, y, 190, 7, "F");
  doc.setFont("Helvetica", "bold");
  doc.text("Item / Area Inspected", 14, y + 5);
  doc.text("Result", 98, y + 5, { align: "right" });
  doc.text("Item / Area Inspected", 110, y + 5);
  doc.text("Result", 196, y + 5, { align: "right" });

  let tempY = y + 7;
  doc.setFont("Helvetica", "normal");

  // Split results into two columns of 14 and 13 items
  const colSize = 14;
  for (let i = 0; i < colSize; i++) {
    const rIdx = i + colSize;

    // Zebra stripes backgrounds
    if (i % 2 === 0) {
      doc.setFillColor("#F8FAFC");
      if (results[i]) {
        doc.rect(10, tempY, 92, 5.5, "F");
      }
      if (results[rIdx]) {
        doc.rect(106, tempY, 94, 5.5, "F");
      }
    }

    // Left column item
    if (results[i]) {
      const item = results[i];
      doc.setTextColor(primaryColor);
      doc.setFont("Helvetica", "normal");
      const labelText = item.itemLabel.length > 38 ? item.itemLabel.slice(0, 35) + "..." : item.itemLabel;
      doc.text(`${item.sequenceOrder}. ${labelText}`, 12, tempY + 4);
      
      const passed = item.result === "pass";
      doc.setTextColor(passed ? passColor : failColor);
      doc.setFont("Helvetica", "bold");
      doc.text(passed ? "PASS" : "FAIL", 98, tempY + 4, { align: "right" });
    }

    // Right column item
    if (results[rIdx]) {
      const item = results[rIdx];
      doc.setTextColor(primaryColor);
      doc.setFont("Helvetica", "normal");
      const labelText = item.itemLabel.length > 38 ? item.itemLabel.slice(0, 35) + "..." : item.itemLabel;
      doc.text(`${item.sequenceOrder}. ${labelText}`, 108, tempY + 4);
      
      const passed = item.result === "pass";
      doc.setTextColor(passed ? passColor : failColor);
      doc.setFont("Helvetica", "bold");
      doc.text(passed ? "PASS" : "FAIL", 196, tempY + 4, { align: "right" });
    }

    doc.setDrawColor("#E2E8F0");
    doc.line(10, tempY + 5.5, 102, tempY + 5.5);
    doc.line(106, tempY + 5.5, 200, tempY + 5.5);
    tempY += 5.5;
  }

  y = tempY + 5;

  // -- DEFECT DETAIL BLOCK (if failed) --
  if (!isPassed && safeRelatedDefects.length > 0) {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(primaryColor);
    doc.text("DEFECTS LOGGED & REPAIR LOOP REPORT", 10, y);
    
    y += 4;

    safeRelatedDefects.forEach((def, index) => {
      const descLines = doc.splitTextToSize(`Description: ${def.description}`, 120);
      
      let repairLines: string[] = [];
      if (def.status === "closed") {
         repairLines = doc.splitTextToSize(`Notes: ${def.repairDescription || ""} | Parts: ${def.partsUsed || "None"}`, 120);
      }

      // Calculate heights
      const upperHeight = 28 + (descLines.length - 1) * 5; 
      const lowerHeight = def.status === "closed" ? 15 + repairLines.length * 5 : 20;
      const totalHeight = upperHeight + lowerHeight;

      // Add a page break if defect block exceeds page height
      if (y + totalHeight + 10 > 280) {
        doc.addPage();
        y = 15;
      }

      // Draw rectangular container
      doc.setDrawColor("#EF4444");
      doc.setLineWidth(0.4);
      doc.setFillColor("#FFF5F5");
      doc.rect(10, y, 190, totalHeight, "F");
      doc.rect(10, y, 190, totalHeight);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(failColor);
      const severityIcon = def.severity === "dangerous" ? "CRITICAL: DANGEROUS (VEHICLE GROUNDED)" : def.severity === "major" ? "URGENT: MAJOR DEFECT" : "ADVISORY: MINOR DEFECT";
      doc.text(`${severityIcon} - ${def.itemLabel}`, 14, y + 5);

      doc.setFont("Helvetica", "normal");
      doc.setTextColor("#000000");
      doc.text(descLines, 14, y + 11);
      
      const textEndY = y + 11 + (descLines.length - 1) * 5;
      doc.text(`Reported verbally to: ${def.reportedTo}`, 14, textEndY + 6);
      doc.text(`Logged timestamp: ${new Date(def.createdAt).toLocaleTimeString("en-GB")} UTC`, 14, textEndY + 12);


      // Embedded photo box state — LARGER for full readability
      doc.setDrawColor("#E2E8F0");
      doc.setFillColor("#E2E8F0");
      doc.rect(130, y + 4, 64, Math.max(35, upperHeight - 6), "F");
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(grayColor);
      if (def.photoUrl) {
        try {
          try { doc.addImage(def.photoUrl, "JPEG", 130, y + 4, 64, Math.max(35, upperHeight - 6)); } catch(je) { try { doc.addImage(def.photoUrl, 130, y + 4, 64, Math.max(35, upperHeight - 6)); } catch(pe) { doc.text("[Photo]", 130, y + 20); } }
        } catch (e) {
          try {
            doc.addImage(def.photoUrl, 130, y + 4, 64, Math.max(35, upperHeight - 6));
          } catch (e2) {
            doc.text("[PHOTO ATTACHED]", 145, y + 20);
          }
        }
      } else {
        doc.text("No photo", 148, y + 20);
      }

      // Repair information (Closed status)
      doc.line(10, y + upperHeight, 200, y + upperHeight);
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      if (def.status === "closed") {
        if (safeCompany.isSoloOperator) {
          doc.setTextColor(passColor);
          doc.text(`DEFECT SIGNED OFF BY OPERATOR (SOLO)`, 14, y + upperHeight + 5);
          doc.setFont("Helvetica", "normal");
          doc.setTextColor("#000000");
          doc.text(`Defect signed off by: ${def.engineerName} (Operator) | Date: ${new Date(def.repairCompletedAt!).toLocaleDateString("en-GB")}`, 14, y + upperHeight + 10);
          doc.text(repairLines, 14, y + upperHeight + 15);
        } else {
          doc.setTextColor(passColor);
          doc.text(`REPAIRED & SIGNED OFF BY CERTIFIED MECHANIC`, 14, y + upperHeight + 5);
          doc.setFont("Helvetica", "normal");
          doc.setTextColor("#000000");
          doc.text(`Mechanic: ${def.engineerName} | Date: ${new Date(def.repairCompletedAt!).toLocaleDateString("en-GB")}`, 14, y + upperHeight + 10);
          doc.text(repairLines, 14, y + upperHeight + 15);
        }

        if (def.engineerSignature) {
          try {
            doc.addImage(def.engineerSignature, "PNG", 150, y + upperHeight + 2, 40, 10);
          } catch(e){}
        }
      } else {
        doc.setTextColor("#F5A623");
        doc.text(`CURRENT STATUS: ACTIVE OUTSTANDING DEFECT ON SITE`, 14, y + upperHeight + 5);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(grayColor);
        doc.text(`Awaiting official engineer sign-off inside the manager portal.`, 14, y + upperHeight + 11);
      }

      y += totalHeight + 4;
    });
  } else {
    // Show pristine no-fault compliance box
    doc.setDrawColor(passColor);
    doc.setLineWidth(0.4);
    doc.setFillColor("#F0FDF4");
    doc.rect(10, y, 190, 20, "F");
    doc.rect(10, y, 190, 20);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(passColor);
    doc.text("ZERO OUTSTANDING COMPLIANCE FAULTS REGISTERED", 14, y + 7);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(grayColor);
    doc.setFontSize(9);
    doc.text("This vehicle has been certified as safe and fully roadworthy in accordance with the standard", 14, y + 12);
    doc.text(templateName ? "Vehicle has been certified as safe and roadworthy." : "Department for Transport/DVSA guide to maintaining roadworthiness legislation.", 14, y + 17);
    
    y += 26;
  }

  // -- CHECK ITEM PHOTOS (pass/fail photos for all checks) --
  // Debug: how many items have photoUrl?
  if ((check as any).items && typeof doc.getY === "function") {
    const itemsWithPhoto = (check as any).items.filter((i: any) => i.photoUrl).length;
    const totalItems = (check as any).items.length;
    console.log("[PDF] Items with photoUrl:", itemsWithPhoto, "of", totalItems);
    (check as any).items.forEach((it: any) => {
      if (it.photoUrl && it.photoUrl.length > 50) {
        const startY = doc.getY();
        if (startY > 250) { doc.addPage(); }
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor("#000000");
        doc.text(it.itemLabel, 10, startY + 5);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(6);
        const status = it.result === "fail" ? "FAIL" : "PASS";
        doc.text("Result: " + status, 10, startY + 10);
        // Use addImage without format param to let jsPDF auto-detect
        try {
          doc.addImage(it.photoUrl, 125, startY + 1, 60, 38);
        } catch(imgErr) {
          console.warn("[PDF] addImage failed for", it.itemLabel, imgErr);
          doc.text("[Photo error]", 125, startY + 20);
        }
        doc.setY(startY + 42);
      }
    });
  }

  // -- MISCELLANEOUS DAMAGE & FIELD NOTES SECTION --
  if (typeof doc.addImage === "function" && ((safeCheck.miscDamageNotes && safeCheck.miscDamageNotes.trim() !== "") || safeCheck.miscDamagePhotoUrl)) {
    if (y + 40 > 280) {
      doc.addPage();
      y = 15;
    }
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(primaryColor);
    doc.text("MISCELLANEOUS DRIVER FIELD NOTES & DAMAGE RECORD", 10, y);
    
    y += 4;
    
    const notesText = safeCheck.miscDamageNotes || "No cosmetic damage notes described.";
    const notesLines = doc.splitTextToSize(notesText, safeCheck.miscDamagePhotoUrl ? 115 : 175);
    const boxHeight = Math.max(25, notesLines.length * 4.5 + 10);
    
    doc.setDrawColor("#94A3B8");
    doc.setLineWidth(0.3);
    doc.setFillColor("#F8FAFC");
    doc.rect(10, y, 190, boxHeight, "F");
    doc.rect(10, y, 190, boxHeight);
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(grayColor);
    doc.text("Driver's Notes:", 14, y + 5);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor("#000000");
    doc.text(notesLines, 14, y + 10);
    
    if (safeCheck.miscDamagePhotoUrl) {
      try {
        doc.addImage(safeCheck.miscDamagePhotoUrl, "JPEG", 145, y + 3, 50, boxHeight - 6);
      } catch (err) {
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(grayColor);
        doc.text("[Damage Photo Evidence]", 148, y + 12);
      }
    }
    
    y += boxHeight + 8;
  }

  // --- SIGNATURES / DECLARATION ---
  if (y + 50 > 280) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(primaryColor);
  doc.text("DRIVER COMPLIANCE DECLARATION", 10, y);

  y += 4;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(grayColor);
  doc.text("I hereby certify that I have personally completed the daily walkaround safety check on this vehicle before driving.", 10, y);
  doc.text("I declare that all visual inspections on items 1 to 27 are accurately reflected in this record.", 10, y + 4.5);

  y += 8;

  // Add signature image placeholders
  doc.setDrawColor("#E2E8F0");
  doc.rect(10, y, 80, 22);
  doc.rect(118, y, 80, 22);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(primaryColor);
  if (safeCompany.isSoloOperator) {
    doc.text("Driver's Signature", 14, y + 5);
    doc.text("Operator Sign-off & Declaration (Solo)", 122, y + 5);
  } else {
    doc.text("Driver's Signature", 12, y + 5);
    doc.text("Fleet Manager Certification Sign-off", 120, y + 5);
  }

  if (safeCheck.driverSignature) {
    try {
      doc.addImage(safeCheck.driverSignature, "PNG", 20, y + 4, 60, 16);
      if (safeCompany.isSoloOperator) {
        doc.addImage(safeCheck.driverSignature, "PNG", 128, y + 4, 60, 16);
      }
    } catch(e) {
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(grayColor);
      doc.text("[Digitally Hand-signed]", 25, y + 13);
      if (safeCompany.isSoloOperator) {
        doc.text("[Digitally Hand-signed]", 135, y + 13);
      }
    }
  }

  if (!isPassed) {
    const isClosed = safeRelatedDefects.every(d => d.status === "closed");
    if (isClosed) {
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(passColor);
      doc.text("APPROVED & FIT TO ROLL", 140, y + 13);
    } else {
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(failColor);
      doc.text("UNAPPROVED - GROUNDED", 140, y + 13);
    }
  } else {
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(passColor);
    doc.text("NIL DEFECT AUTOMATIC APPROVAL", 124, y + 13);
  }

  y += 28;

  // -- SECURITY FOOTER --
  doc.setLineWidth(0.3);
  doc.setDrawColor("#0D1F2D");
  doc.line(10, y, 200, y);
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(primaryColor);
  doc.text(`Record Reference: WS-${safeCheck.id.toUpperCase()}`, 10, y + 4.5);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor);
  doc.text(`Generated At: ${new Date(safeCheck.createdAt).toLocaleDateString("en-GB")} ${new Date(safeCheck.createdAt).toLocaleTimeString("en-GB")} UTC | Stored on Secure Cloud Archive`, 10, y + 9);
  doc.text(templateName ? `This document is a certified compliance record generated through WalkSafe. Retain for 15 months minimum.` : `This document serves as legal proof of daily checks under standard DVSA regulations and must be retained for 15 months minimum.`, 10, y + 13.5);

  // Return the PDF document
  return doc;
}
