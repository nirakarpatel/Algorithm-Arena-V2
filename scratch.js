const mongoose = require('mongoose');
const { env } = require('./server/config/env');
const { getUserRank } = require('./server/utils/leaderboard');
const User = require('./server/src/features/users/User.model');

async function testRank() {
  try {
    await mongoose.connect(env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');
    
    const user = await User.findOne({ username: 'FOX_KN1GHT' }); // wait, username in screenshot is FOX_KN1GHT
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User found:', user._id, user.points);
    
    const rank = await getUserRank(user._id);
    console.log('Rank is:', rank);
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

testRank();
