require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Badge = require('./src/features/badges/Badge.model');
  await Badge.updateOne({ name: 'Flawless Execution' }, { $set: { icon: '🎯' } });
  
  // Let's also check if there are duplicate badges we should just delete
  // Wait, the badge map uses exact name:
  // 'Flawless': hasFlawless
  // So 'Flawless Execution' is never automatically unlocked anyway by the badge logic!
  // I will just delete 'Flawless Execution' entirely because the code doesn't support it!
  await Badge.deleteOne({ name: 'Flawless Execution' });
  console.log('Deleted duplicate badge: Flawless Execution');

  process.exit(0);
});
