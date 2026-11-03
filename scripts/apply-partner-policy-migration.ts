import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/config/prisma.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const sqlPath = path.resolve(__dirname, "../prisma/migrations/20261103120000_partner_commission_policy/migration.sql");
  console.log("Reading migration SQL from:", sqlPath);
  const sql = fs.readFileSync(sqlPath, "utf-8");

  console.log("Applying migration SQL directly...");
  await prisma.$executeRawUnsafe(sql);

  console.log("Migration applied successfully!");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

