// Run: bun scripts/validate-moves.ts  — exits 1 on any error (pending items are reported, not fatal).
import { MOVES, validateCatalog } from "../src/content/moves/catalog";

const issues = validateCatalog();
const errors = issues.filter((i) => i.level === "error");
const pending = issues.filter((i) => i.level === "pending");
console.log(`Moves parsed: ${MOVES.length}`);
console.log(`Errors: ${errors.length}`);
errors.forEach((e) => console.log(`  ERROR ${e.id}: ${e.message}`));
console.log(`Pending: ${pending.length}`);
pending.forEach((e) => console.log(`  PENDING ${e.id}: ${e.message}`));
process.exit(errors.length ? 1 : 0);
