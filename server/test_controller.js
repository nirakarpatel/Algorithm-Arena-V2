const mongoose = require('mongoose');
require('dotenv').config({ path: 'server/.env' });
const { getLeaderboard } = require('./server/src/features/submissions/submission.controller');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const req = { query: { window: 'all', page: 1, limit: 20 } };
  const res = {
    status: (code) => res,
    json: (data) => {
      console.log('Response:', JSON.stringify(data, null, 2));
      process.exit(0);
    }
  };
  const next = (err) => {
    console.error('Next err:', err);
    process.exit(1);
  };
  
  await getLeaderboard(req, res, next);
});
