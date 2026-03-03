import { connect } from "vectordb";

async function checkContent() {
  const db = await connect("./data/lancedb");
  const table = await db.openTable("construction_docs");
  
  // Get text from pages with unknown schedules
  const pages = [1, 2, 3, 4];
  
  for (const page of pages) {
    const results = await table.search([0.1])
      .filter(`pageNumber = ${page}`)
      .limit(1)
      .execute();
    
    if (results.length > 0) {
      console.log(`\n=== PAGE ${page} ===`);
      console.log(results[0].text.substring(0, 300));
    }
  }
}

checkContent().catch(console.error);
