import fs from "fs";

const content = fs.readFileSync("src/components/ManagerDashboard.tsx", "utf8");
const lines = content.split("\n");

// Get overview block lines
const block = lines.slice(1101, 1322).join("\n");

console.log("Analyzing braces and tags inside Overview section (lines 1102 to 1322)...");

// Let's count standard {} braces
let braceCount = 0;
let parenCount = 0;

for (let i = 0; i < block.length; i++) {
  const char = block[i];
  if (char === "{") braceCount++;
  if (char === "}") braceCount--;
  if (char === "(") parenCount++;
  if (char === ")") parenCount--;
}

console.log("Section counts:");
console.log("Open minus close braces: ", braceCount);
console.log("Open minus close parentheses: ", parenCount);

// Let's count open vs close HTML tags inside Overview
const tagRegex = /<([a-zA-Z0-9_\-]+)|<\/([a-zA-Z0-9_\-]+)>/g;
let match;
const openedTags: string[] = [];

// Simplify HTML match
const sample = lines.slice(1101, 1322);
sample.forEach((lineText, index) => {
  const actualLineNum = 1102 + index;
  // Ignore comments
  if (lineText.trim().startsWith("{/*") || lineText.trim().startsWith("//") || lineText.trim().startsWith("/*")) return;
  
  // Custom simple tag matcher
  let line = lineText;
  let tagMatch;
  const lineTagRegex = /<(\/?[a-zA-Z0-9]+)/g;
  while ((tagMatch = lineTagRegex.exec(line)) !== null) {
    const tagName = tagMatch[1];
    if (tagName.startsWith("/")) {
      const closed = tagName.substring(1);
      const last = openedTags.pop();
      if (last !== closed) {
        console.log(`LINE ${actualLineNum}: trying to close '${closed}' but last opened was '${last}'. Line content: ${lineText.trim()}`);
        if (last) openedTags.push(last); // restore
      }
    } else {
      // Check if self-closing
      const rest = line.substring(tagMatch.index);
      const isSelfClosing = /\/>/.test(rest.split(">")[0] || "");
      if (!isSelfClosing) {
        // Exclude standard words like inside a text (e.g. "Manage defects ->")
        // but wait, standard elements like <div, <span, <h3, <h4, <label, <input, <svg, <circle, <button, <ArrowRight, <Calendar, <CheckCircle, <ShieldCheck
        if (["div", "span", "h3", "h4", "label", "input", "svg", "circle", "button", "ArrowRight", "Calendar", "CheckCircle", "ShieldCheck", "p", "a"].includes(tagName)) {
          openedTags.push(tagName);
        }
      }
    }
  }
});

console.log("Unclosed tags remaining:", openedTags);
