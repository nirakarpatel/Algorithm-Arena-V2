const mongoose = require('mongoose');
const User = require('./src/features/users/User.model');
require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error('Error: Please provide an email address.');
  console.error('Usage: node makeAdmin.js student@example.com');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    const user = await User.findOneAndUpdate(
      { email: targetEmail.toLowerCase().trim() },
      { role: 'admin' },
      { returnDocument: 'after' }
    );

    if (user) {
      console.log(`Success: ${user.username} is now an admin.`);
    } else {
      console.log(`No user found with email: ${targetEmail}`);
    }

    await mongoose.disconnect();
  })
  .catch((err) => {
    console.error('Failed to update admin user:', err.message);
    process.exit(1);
  });
