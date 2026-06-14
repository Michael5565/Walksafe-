const fs = require("fs");
let content = fs.readFileSync(process.argv[1], "utf8");
let changes = 0;

// 1. Sidebar color: #1a1a1e -> #0f172a
if (content.includes("bg-[#1a1a1e]")) {
  content = content.replace(/bg-\[#1a1a1e\]/g, "bg-[#0f172a]");
  console.log("✓ Sidebar color changed");
  changes++;
}

// 2. Make Fleet Integrity card -> analytics
const fiPattern = 'className="bg-surface-card border border-border-subtle p-card-padding">\n                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-4">FLEET INTEGRITY</p>';
const fiNew = 'className="bg-surface-card border border-border-subtle p-card-padding cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab(\'analytics\')}>\n                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-4">FLEET INTEGRITY</p>';
if (content.includes(fiPattern)) {
  content = content.replace(fiPattern, fiNew);
  console.log("✓ Fleet Integrity card clickable");
  changes++;
}

// 3. Make Reports Logged card -> records
const rlPattern = 'className="bg-surface-card border border-border-subtle p-card-padding">\n                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-4">REPORTS LOGGED</p>\n                  <div className="space-y-1">';
const rlNew = 'className="bg-surface-card border border-border-subtle p-card-padding cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab(\'records\')}>\n                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-4">REPORTS LOGGED</p>\n                  <div className="space-y-1">';
if (content.includes(rlPattern)) {
  content = content.replace(rlPattern, rlNew);
  console.log("✓ Reports Logged card clickable");
  changes++;
}

// 4. Make Open Defects card -> defects
const odPattern = 'className="bg-surface-card border border-border-subtle p-card-padding">\n                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-4">OPEN DEFECTS</p>\n                  <div className="flex items-center gap-3">';
const odNew = 'className="bg-surface-card border border-border-subtle p-card-padding cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab(\'defects\')}>\n                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-4">OPEN DEFECTS</p>\n                  <div className="flex items-center gap-3">';
if (content.includes(odPattern)) {
  content = content.replace(odPattern, odNew);
  console.log("✓ Open Defects card clickable");
  changes++;
}

// 5. Fix the Fleet Suspension card
// Find the unique pattern for suspension
const suspPattern = "FLEET SUSPENSION";
const suspIdx = content.indexOf(suspPattern);
if (suspIdx >= 0) {
  // Look backwards for the parent div opening
  const searchFrom = Math.max(0, suspIdx - 300);
  const before = content.substring(searchFrom, suspIdx);
  const divStart = before.lastIndexOf("<div");
  const originalDiv = before.substring(divStart);
  
  if (!originalDiv.includes("cursor-pointer")) {
    // Replace the matching opening div
    const fullMatch = content.substring(searchFrom + divStart, suspIdx);
    const newMatch = fullMatch.replace(
      '`p-card-padding border ${groundedCount > 0',
      '`p-card-padding border ${groundedCount > 0} cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab(\'vehicles\')}\n                  {/* @ts-ignore */}\n                  <div className={`p-card-padding border ${groundedCount > 0'
    );
    // This is getting complex. Let me just do a simpler replacement.
    content = content.replace(
      "FLEET SUSPENSION</p>\n                  <span className={`font-headline-md text-headline-md font-data-mono ${groundedCount > 0 ? 'text-danger-red' : ''}`}>{groundedCount}</span>\n                </div>",
      "FLEET SUSPENSION</p>\n                  <span className={`font-headline-md text-headline-md font-data-mono ${groundedCount > 0 ? 'text-danger-red' : ''}`}>{groundedCount}</span>\n                </div>"
    );
    console.log("Fleet Suspension - trying alternate approach");
  }
}

fs.writeFileSync(process.argv[1], content, "utf8");
console.log(`\n${changes} changes applied`);
