import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migrationFilePath = path.join(
  __dirname,
  "../prisma/migrations/20261103110000_enquiry_auto_increment_ids/migration.sql",
);

async function main() {
  const sql = fs.readFileSync(migrationFilePath, "utf-8");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  console.log("Connected to PostgreSQL database.");

  try {
    await client.query("BEGIN");
    console.log("Applying enquiry auto increment migration...");
    await client.query(sql);

    // Also record in _prisma_migrations if table exists
    const tableCheck = await client.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = '_prisma_migrations';
    `);

    if (tableCheck.rowCount && tableCheck.rowCount > 0) {
      await client.query(`
        INSERT INTO "_prisma_migrations" (
          "id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count"
        ) VALUES (
          gen_random_uuid()::text,
          'manual_applied',
          NOW(),
          '20261103110000_enquiry_auto_increment_ids',
          NULL,
          NULL,
          NOW(),
          1
        ) ON CONFLICT DO NOTHING;
      `);
      console.log("Recorded migration in _prisma_migrations.");
    }

    await client.query("COMMIT");
    console.log("Enquiry auto increment migration successfully applied!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed, transaction rolled back:", err);
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
