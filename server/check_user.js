const mongoose = require('mongoose');
const User = require('./models/User');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/algorithm_arena');
  const user = await User.findOne({ email: 'devmaster@iter.ac.in' }).select('+password');
  console.log('User password:', user ? user.password : 'Not found');
  if (user) {
    const isMatch = await user.matchPassword('admin123');
    console.log('Match admin123?', isMatch);
  }
  process.exit(0);
}
check();
