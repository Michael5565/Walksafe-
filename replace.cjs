const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const selfFetchPattern = /await fetch\(url/g;
code = code.replace(selfFetchPattern, 'xxxREVERTxxx');

code = code.replace(/await fetch\(/g, 'await fetchWithTimeout(');
code = code.replace('xxxREVERTxxx', 'await fetch(url');

fs.writeFileSync('src/App.tsx', code);
