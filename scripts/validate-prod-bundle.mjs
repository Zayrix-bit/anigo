import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve(process.cwd(), "dist");
const assetDir = path.join(distDir, "assets");

if (!fs.existsSync(assetDir)) {
  console.error("[validate-prod-bundle] dist/assets not found. Run build first.");
  process.exit(1);
}

const blockedPatterns = [
  /localhost:5000/i,
  /localhost:5001/i,
  /localhost:3001/i,
  /\/api\/anikai\//i,
];

const allowedContextPatterns = [
  // Third-party internals may include a harmless fallback literal.
  /http:\/\/localhost/i,
];

const jsFiles = fs
  .readdirSync(assetDir)
  .filter((file) => file.endsWith(".js"))
  .map((file) => path.join(assetDir, file));

const violations = [];

for (const filePath of jsFiles) {
  const content = fs.readFileSync(filePath, "utf8");

  for (const pattern of blockedPatterns) {
    const match = content.match(pattern);
    if (match) {
      violations.push({ filePath, match: match[0] });
    }
  }

  // Optional signal-only check for generic localhost string.
  const generic = content.match(/localhost/gi);
  if (generic && generic.length > 0) {
    const hasOnlyAllowed = allowedContextPatterns.some((p) => p.test(content));
    if (!hasOnlyAllowed) {
      violations.push({ filePath, match: "localhost (generic)" });
    }
  }
}

if (violations.length > 0) {
  console.error("[validate-prod-bundle] Blocked patterns found in production bundle:");
  for (const v of violations) {
    console.error(`- ${v.filePath}: ${v.match}`);
  }
  process.exit(1);
}

console.log("[validate-prod-bundle] OK: no blocked localhost/API patterns found.");
