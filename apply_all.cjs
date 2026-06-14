const fs = require("fs");
// argv[2] is the target file, not argv[1]
const targetFile = process.argv[2];
let content = fs.readFileSync(targetFile, "utf8");
const n = "\r\n";
let changed = false;

// Fleet Integrity -> analytics
const fiOld = '                <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">' + n + '                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-4">FLEET INTEGRITY</p>';
const fiNew = '                <div className="bg-surface-card border border-border-subtle p-card-padding cursor-pointer hover:border-primary transition-all" onClick={() => setActiveTab("analytics")}>' + n + '                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-4">FLEET INTEGRITY</p>';
if (content.includes(fiOld)) {
  content = content.split(fiOld).join(fiNew);
  console.log("✓ Fleet Integrity");
  changed = true;
} else console.log("✗ Fleet Integrity not found");

// Reports Logged
const rlOld = '                <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">' + n + '                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-4">REPORTS LOGGED</p>' + n + '                  <div className="space-y-1">';
const rlNew = '                <div className="bg-surface-card border border-border-subtle p-card-padding cursor-pointer hover:border-primary transition-all" onClick={() => setActiveTab("records")}>' + n + '                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-4">REPORTS LOGGED</p>' + n + '                  <div className="space-y-1">';
if (content.includes(rlOld)) {
  content = content.split(rlOld).join(rlNew);
  console.log("✓ Reports Logged");
  changed = true;
} else console.log("✗ Reports Logged not found");

// Open Defects
const odOld = '                <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">' + n + '                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-4">OPEN DEFECTS</p>' + n + '                  <div className="flex items-center gap-3">';
const odNew = '                <div className="bg-surface-card border border-border-subtle p-card-padding cursor-pointer hover:border-primary transition-all" onClick={() => setActiveTab("defects")}>' + n + '                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-4">OPEN DEFECTS</p>' + n + '                  <div className="flex items-center gap-3">';
if (content.includes(odOld)) {
  content = content.split(odOld).join(odNew);
  console.log("✓ Open Defects");
  changed = true;
} else console.log("✗ Open Defects not found");

if (changed) {
  fs.writeFileSync(targetFile, content, "utf8");
  console.log("Saved");
} else {
  console.log("No changes needed");
}
