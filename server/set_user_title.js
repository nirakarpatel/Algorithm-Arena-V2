const mongoose = require('mongoose');
require('dotenv').config();

const username = process.argv[2];
const title = process.argv[3];

if (!username || !title) {
  console.log("Usage: node set_user_title.js <username> <title>");
  console.log("Example: node set_user_title.js myusername Developer");
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./src/features/users/User.model');
  const result = await User.updateOne(
    { username },
    { $set: { customTitle: title === "null" || title === "none" ? "" : title } }
  );
  
  if (result.matchedCount === 0) {
    console.error(`User ${username} not found!`);
    process.exit(1);
  }
  
  console.log(`Successfully updated ${username}'s custom title to "${title}"!`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
