const mongoose = require('mongoose');

async function run() {
  const uri = "mongodb+srv://algoarenagdg_db_user:gdg@gdgxarena.qcz1sf6.mongodb.net/?appName=GDGXARENA";
  const conn = await mongoose.connect(uri);
  console.log("Connected to database:", conn.connection.name);
  const collections = await conn.connection.db.listCollections().toArray();
  console.log("Collections:", collections.map(c => c.name));
  
  const User = conn.model('User', new mongoose.Schema({}));
  console.log("User count:", await conn.connection.db.collection('users').countDocuments());
  
  process.exit(0);
}

run().catch(console.error);
