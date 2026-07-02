const Clan = require('./Clan.model');
const User = require('../users/User.model');
const { isGlobalOverrideRole } = require('../auth/authorization.policy');

const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return value._id.toString();
  if (typeof value.toString === 'function') return value.toString();
  return null;
};

const withSession = (query, session) => {
  if (!session) return query;
  return query.session(session);
};

const chiefClanCache = new Map(); // userId -> { clan, expiresAt }
const CACHE_TTL = 60 * 1000; // 1 minute

const clearChiefClanCache = (userId) => {
  if (userId) {
    chiefClanCache.delete(userId);
  } else {
    chiefClanCache.clear();
  }
};

const findChiefClan = async (userId, session = null) => {
  if (!userId) return null;

  if (!session) {
    const cached = chiefClanCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.clan;
    }
  }

  const query = Clan.findOne({ chief: userId }).select('_id chief members');
  const clan = await withSession(query, session).lean();

  if (!session) {
    chiefClanCache.set(userId, {
      clan,
      expiresAt: Date.now() + CACHE_TTL,
    });
  }

  return clan || null;
};

const resolveActorScope = async (actor, { session = null } = {}) => {
  if (!actor) {
    return { kind: 'none', reason: 'Missing actor context' };
  }

  if (isGlobalOverrideRole(actor)) {
    return { kind: 'global' };
  }

  if (actor.role !== 'clan-chief') {
    return { kind: 'none', reason: 'Only clan chiefs, moderators, or admins can perform this action' };
  }

  const actorId = toIdString(actor._id || actor.id);
  const chiefClan = await findChiefClan(actorId, session);
  if (!chiefClan) {
    return { kind: 'none', reason: 'Chief role is not mapped to any clan' };
  }

  return {
    kind: 'clan',
    clanId: chiefClan._id.toString(),
    clan: chiefClan,
  };
};

const canActorManageClan = async (actor, clanOrId, { session = null } = {}) => {
  const scope = await resolveActorScope(actor, { session });
  if (scope.kind === 'global') {
    return { allowed: true, scope };
  }
  if (scope.kind !== 'clan') {
    return { allowed: false, reason: scope.reason, scope };
  }

  const targetClanId = toIdString(clanOrId && (clanOrId._id || clanOrId));
  if (!targetClanId || targetClanId !== scope.clanId) {
    return { allowed: false, reason: 'Clan chiefs can only act within their own clan', scope };
  }

  return { allowed: true, scope };
};

const canActorManageUser = async (actor, targetUser, { session = null } = {}) => {
  const scope = await resolveActorScope(actor, { session });
  if (scope.kind === 'global') {
    return { allowed: true, scope };
  }
  if (scope.kind !== 'clan') {
    return { allowed: false, reason: scope.reason, scope };
  }

  const targetClanId = toIdString(targetUser?.clan);
  if (!targetClanId || targetClanId !== scope.clanId) {
    return { allowed: false, reason: 'Clan chiefs can only act on members of their own clan', scope };
  }

  return { allowed: true, scope };
};

const getActorMemberIdsInScope = async (actor, { session = null } = {}) => {
  const scope = await resolveActorScope(actor, { session });
  if (scope.kind === 'global') {
    return { allowed: true, scope, memberIds: null };
  }
  if (scope.kind !== 'clan') {
    return { allowed: false, reason: scope.reason, scope, memberIds: [] };
  }

  let clan = scope.clan;
  if (!clan) {
    const query = Clan.findById(scope.clanId).select('_id members');
    clan = await withSession(query, session).lean();
  }
  const memberIds = (clan?.members || []).map((memberId) => memberId.toString());
  return { allowed: true, scope, memberIds };
};

const reconcileChiefRoleForUser = async (userId, { session = null } = {}) => {
  const normalizedId = toIdString(userId);
  if (!normalizedId) return false;

  const userQuery = User.findById(normalizedId).select('role');
  const user = await withSession(userQuery, session);
  if (!user) return false;

  const chiefClanCountQuery = Clan.countDocuments({ chief: normalizedId });
  const chiefClanCount = await withSession(chiefClanCountQuery, session);

  if (chiefClanCount === 0 && user.role === 'clan-chief') {
    user.role = 'user';
    await user.save({ session });
    return true;
  }

  if (chiefClanCount > 0 && user.role === 'user') {
    user.role = 'clan-chief';
    await user.save({ session });
    return true;
  }

  return false;
};

module.exports = {
  toIdString,
  isGlobalOverrideRole,
  resolveActorScope,
  canActorManageClan,
  canActorManageUser,
  getActorMemberIdsInScope,
  reconcileChiefRoleForUser,
  clearChiefClanCache,
};
