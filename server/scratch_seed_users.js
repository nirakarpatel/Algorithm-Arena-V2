const mongoose = require('mongoose');
const { initializeDefaultUsers } = require('./initDb');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to DB');
  await initializeDefaultUsers();
  console.log('Finished initializeDefaultUsers');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
