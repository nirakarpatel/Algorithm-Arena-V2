const mongoose = require('mongoose');

async function wipeDatabase() {
  try {
    const uri = "mongodb+srv://algoarenagdg_db_user:gdg@gdgxarena.qcz1sf6.mongodb.net/?appName=GDGXARENA";
    await mongoose.connect(uri);
    console.log("Connected to database:", mongoose.connection.name);

    // Drop database
    console.log("Dropping entire database...");
    await mongoose.connection.db.dropDatabase();
    console.log("Database dropped successfully.");

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

wipeDatabase();
