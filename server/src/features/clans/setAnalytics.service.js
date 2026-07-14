/**
 * Pure per-question-set completion math for the clan chief analytics view.
 * Kept free of DB/request concerns so it can be unit-tested directly.
 *
 * @param {Object}   input
 * @param {string[]} input.memberIds        Non-chief member id strings.
 * @param {Array}    input.sets             Set docs (need `_id`).
 * @param {Object}   input.setTotals        setId(string) -> challenge count.
 * @param {Object}   input.challengesBySet  setId(string) -> [{ _id, title }] (render order).
 * @param {Array}    input.statusPairs      [{ userId, challengeId, setId, status }] where
 *                                          status ∈ 'accepted' | 'pending' | 'rejected'.
 *                                          Only challenges the member submitted appear.
 * @returns {Object} perSet keyed by setId -> {
 *   clanCompletionPct,
 *   challenges: [{ _id, title }],
 *   members: { [userId]: { solved, total, statuses: { [challengeId]: status } } }
 * }
 */
const computeSetAnalytics = ({ memberIds, sets, setTotals, challengesBySet, statusPairs }) => {
  const perSet = {};

  for (const set of sets) {
    const setId = set._id.toString();
    const total = setTotals[setId] || 0;
    const members = {};
    for (const uid of memberIds) members[uid] = { solved: 0, total, statuses: {} };
    perSet[setId] = { clanCompletionPct: 0, challenges: challengesBySet[setId] || [], members };
  }

  // Apply each member's derived per-challenge status; count accepted as solved.
  for (const { userId, challengeId, setId, status } of statusPairs) {
    const bucket = perSet[setId];
    if (!bucket) continue;
    const member = bucket.members[userId];
    if (!member) continue; // chief or non-member — excluded
    member.statuses[challengeId] = status;
    if (status === 'accepted') member.solved += 1;
  }

  // Clan completion % per set = total solved / (members * challenges), chief excluded.
  const memberCount = memberIds.length;
  for (const set of sets) {
    const setId = set._id.toString();
    const total = setTotals[setId] || 0;
    if (total === 0 || memberCount === 0) continue;
    let totalSolved = 0;
    for (const uid of memberIds) totalSolved += perSet[setId].members[uid].solved;
    perSet[setId].clanCompletionPct = Math.round((totalSolved / (memberCount * total)) * 100);
  }

  return perSet;
};

/**
 * Collapse a member's submission statuses for one challenge into a single display
 * status. Precedence: Accepted > Pending > Rejected (a newer pending resubmission
 * outranks an older rejection; only-rejected shows as failed).
 * @param {string[]} statuses raw Submission.status values for one (member, challenge)
 * @returns {'accepted'|'pending'|'rejected'|null}
 */
const deriveDisplayStatus = (statuses) => {
  if (statuses.includes('Accepted')) return 'accepted';
  if (statuses.includes('Pending')) return 'pending';
  if (statuses.includes('Rejected')) return 'rejected';
  return null;
};

module.exports = { computeSetAnalytics, deriveDisplayStatus };
