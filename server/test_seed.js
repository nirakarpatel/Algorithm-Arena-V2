const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const User = require('./models/User');
const { seedDatabase } = require('./seed');

async function test() {
  const mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGO_URI);
  
  await seedDatabase();
  
  const user = await User.findOne({ email: 'devmaster@iter.ac.in' }).select('+password');
  console.log('Seeded User:', user);
  
  if (user) {
    const isMatch = await user.matchPassword('admin123');
    console.log('Match admin123?', isMatch);
  }
  
  await mongoose.disconnect();
  await mongoServer.stop();
  process.exit(0);
}
test().catch(console.error);
