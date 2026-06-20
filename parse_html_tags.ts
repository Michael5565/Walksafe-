import fs from "fs";

const content = fs.readFileSync("src/components/ManagerDashboard.tsx", "utf8");

// Parse tags cleanly by matching standard JSX tags and ignoring standard self-closing or string literal matches
const tagRegex = /<(\/?[a-zA-Z0-9_\-]+)([^>]*?)>/g;
const stack: { line: number; name: string }[] = [];
const lines = content.split("\n");

console.log("Analyzing JSX tag structure line-by-line using high-precision parser...");

lines.forEach((lineText, index) => {
  const lineNum = index + 1;
  let match;
  
  // Clean string literals to prevent tag symbols inside strings
  let cleaned = lineText.replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
  
  // Extract tag name and self-closed flag
  const tagFindRegex = /<(\/?[a-zA-Z0-9_\-]+)([^>]*?)>/g;
  while ((match = tagFindRegex.exec(cleaned)) !== null) {
    const rawTag = match[1];
    const attrs = match[2] || "";
    
    const isSelfClosing = attrs.trim().endsWith("/") || ["circle", "img", "input", "br", "hr"].includes(rawTag);
    const isClosing = rawTag.startsWith("/");
    const tagName = isClosing ? rawTag.substring(1) : rawTag;
    
    // Ignore uppercase custom tags that are likely self closing unless we are sure, and ignore standard non-tags
    if (attrs.includes("=>") || tagName.match(/^[0-9]+$/)) {
      continue; // Skip lambda or non-tags
    }
    
    if (isSelfClosing) {
      continue;
    }
    
    if (isClosing) {
      if (stack.length === 0) {
        console.log(`LINE ${lineNum}: Clashing closed tag </${tagName}> but stack is empty!`);
      } else {
        const top = stack.pop();
        if (top?.name !== tagName) {
          console.log(`LINE ${lineNum}: Opened <${top?.name}> (Line ${top?.line}) closed with wrong tag </${tagName}>!`);
          if (top) stack.push(top); // push back to maintain stack structure
        }
      }
    } else {
      stack.push({ line: lineNum, name: tagName });
    }
  }
});

console.log("\nScan complete. Stack height left:", stack.length);
if (stack.length > 0) {
  console.log("Unclosed tags remaining from stack root:");
  stack.slice(-20).forEach(t => console.log(` - <${t.name}> opened on Line ${t.line}`));
}
