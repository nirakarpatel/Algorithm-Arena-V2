const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/test_aggregation');
  
  const schema = new mongoose.Schema({
    userId: mongoose.Types.ObjectId,
    challengeId: mongoose.Types.ObjectId,
    status: String,
  });
  const Submission = mongoose.model('Submission', schema);

  const challengeSchema = new mongoose.Schema({
    difficulty: String,
  });
  const Challenge = mongoose.model('Challenge', challengeSchema);

  try {
    const s1 = await Submission.create({ userId: new mongoose.Types.ObjectId(), challengeId: new mongoose.Types.ObjectId(), status: 'Accepted' });
    const c1 = await Challenge.create({ _id: s1.challengeId, difficulty: 'Easy' });

    const result = await Submission.aggregate([
      {
        $group: {
          _id: '$challengeId',
          statuses: { $push: '$status' },
        }
      },
      {
        $lookup: {
          from: 'challenges',
          localField: '_id',
          foreignField: '_id',
          as: 'challenge',
        },
      },
      { $unwind: '$challenge' },
      {
        $project: {
          difficulty: '$challenge.difficulty',
          isAccepted: { $in: ['Accepted', '$statuses'] },
          isPending: { $in: ['Pending', '$statuses'] },
        }
      },
      {
        $group: {
          _id: null,
          acceptedCount: {
            $sum: { $cond: ['$isAccepted', 1, 0] },
          },
          pendingCount: {
            $sum: { $cond: ['$isPending', 1, 0] },
          },
          easySolved: {
            $sum: { $cond: [{ $and: ['$isAccepted', { $eq: ['$difficulty', 'Easy'] }] }, 1, 0] },
          },
        }
      }
    ]);
    console.log("Aggregation Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Aggregation error:", err);
  }
  
  await mongoose.disconnect();
}

test();
