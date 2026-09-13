import fs from 'fs';

const en = fs.readFileSync('apps/desktop/src/i18n/en.ts', 'utf8');
const tr = fs.readFileSync('apps/desktop/src/i18n/tr.ts', 'utf8');

const enLines = en.split('\n');
const trLines = tr.split('\n');

let same = 0;
let sameLines = [];
for (let i = 0; i < Math.min(enLines.length, trLines.length); i++) {
    const enTrim = enLines[i].trim();
    const trTrim = trLines[i].trim();
    // Check if the line has a string value (contains quotes) and is identical
    if (enTrim === trTrim && (enTrim.includes("'") || enTrim.includes('"')) && !enTrim.startsWith('//') && !enTrim.startsWith('import') && enTrim.length > 10) {
        same++;
        if (same <= 50) sameLines.push(`L${i+1}: ${enTrim.substring(0, 100)}`);
    }
}
console.log(`Untranslated lines (identical to English): ${same}`);
console.log(`\nFirst 50 examples:`);
sameLines.forEach(l => console.log(l));
