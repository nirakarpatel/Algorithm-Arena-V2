const { MongoClient } = require('mongodb');

async function migrate() {
  const sourceUri = "mongodb+srv://admin:AlgorithArena3281@cluster0.mdgjeuk.mongodb.net/test?appName=Cluster0";
  const destUri = "mongodb+srv://algoarenagdg_db_user:gdg@gdgxarena.qcz1sf6.mongodb.net/test?appName=GDGXARENA";

  console.log("Connecting to source DB...");
  const sourceClient = new MongoClient(sourceUri);
  await sourceClient.connect();
  const sourceDb = sourceClient.db();

  console.log("Connecting to destination DB...");
  const destClient = new MongoClient(destUri);
  await destClient.connect();
  const destDb = destClient.db();

  console.log("Getting collections from source...");
  const collections = await sourceDb.listCollections().toArray();

  for (let colInfo of collections) {
    if (colInfo.name === 'system.profile' || colInfo.name === 'system.indexes') continue;
    
    console.log(`\nMigrating collection: ${colInfo.name}`);
    const sourceCol = sourceDb.collection(colInfo.name);
    const destCol = destDb.collection(colInfo.name);

    // Drop the collection in destination to ensure clean slate
    try {
      await destCol.drop();
      console.log(`  Dropped existing collection ${colInfo.name} in destination.`);
    } catch (e) {
      if (e.codeName !== 'NamespaceNotFound') {
        console.log(`  Note: Collection ${colInfo.name} does not exist in destination yet.`);
      }
    }

    const docs = await sourceCol.find({}).toArray();
    if (docs.length > 0) {
      console.log(`  Found ${docs.length} documents. Inserting...`);
      // Insert in chunks of 1000
      for (let i = 0; i < docs.length; i += 1000) {
        const chunk = docs.slice(i, i + 1000);
        await destCol.insertMany(chunk);
      }
      console.log(`  Successfully inserted ${docs.length} documents.`);
    } else {
      console.log(`  No documents found in ${colInfo.name}.`);
    }
  }

  console.log("\nMigration completed successfully.");
  await sourceClient.close();
  await destClient.close();
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
