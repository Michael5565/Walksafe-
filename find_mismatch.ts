import fs from "fs";

const content = fs.readFileSync("src/components/ManagerDashboard.tsx", "utf8");
const lines = content.split("\n");

// We want to count curly braces { } and parentheses ( ) line by line to see where the offset breaks.
let braceBalance = 0;
let parenBalance = 0;

console.log("Beginning line-by-line brace tracking from header down to main content...");

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  
  // Track comments to skip
  let inJSXComment = false;
  
  // Clean string literals to avoid counting braces inside strings
  let cleaned = line;
  cleaned = cleaned.replace(/"[^"]*"/g, '""');
  cleaned = cleaned.replace(/'[^']*'/g, "''");
  cleaned = cleaned.replace(/`[^`]*`/g, "``");
  
  for (let j = 0; j < cleaned.length; j++) {
    const char = cleaned[j];
    if (char === "{") {
      braceBalance++;
    } else if (char === "}") {
      braceBalance--;
      if (braceBalance < 0) {
        console.log(`[ALERT] Brace Balance went negative on Line ${lineNum}: char '}'. Balance: ${braceBalance}`);
      }
    } else if (char === "(") {
      parenBalance++;
    } else if (char === ")") {
      parenBalance--;
      if (parenBalance < 0) {
        console.log(`[ALERT] Parentheses Balance went negative on Line ${lineNum}: char ')'. Balance: ${parenBalance}`);
      }
    }
  }
}

console.log("Final balance counts for the entire file:");
console.log("Brace balance: ", braceBalance);
console.log("Paren balance: ", parenBalance);
