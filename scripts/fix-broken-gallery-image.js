import pg from "pg";

const client = new pg.Client({
  connectionString: "postgresql://postgres:postgres@localhost:5432/postgres?schema=public",
});

async function run() {
  await client.connect();
  const res = await client.query(
    `SELECT id, slug, sections FROM "pages" WHERE sections::text LIKE '%1518005080953-a82329394586%'`
  );
  console.log(`Found ${res.rows.length} pages with broken image`);
  for (const row of res.rows) {
    const updated = JSON.stringify(row.sections)
      .replaceAll("1518005080953-a82329394586", "1487958449943-2429e8be8625")
      .replaceAll("Timber Pavilion Scale Model Installation", "Geometric Pavilion Facade and Structural Mass");
    await client.query(`UPDATE "pages" SET sections = $1::json WHERE id = $2`, [updated, row.id]);
    console.log(`✅ Updated page ${row.slug} (${row.id})`);
  }
}

run().catch(console.error).finally(() => client.end());
