const GLOBAL_OVERRIDE_ROLES = new Set(['admin', 'moderator', 'superAdmin']);
const CHIEF_ROLES = new Set(['clan-chief', 'admin', 'superAdmin']);

const isGlobalOverride = (user) => GLOBAL_OVERRIDE_ROLES.has(user?.role);

const isChief = (user) => CHIEF_ROLES.has(user?.role) || Boolean(user?.isChief);

const toStr = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (v._id) return String(v._id);
  return String(v);
};

const getClanId = (clan) => toStr(clan);

const isClanArchived = (clan) => clan?.status === 'archived';

const canAccessChiefPanel = (user) => isChief(user);

const canCreateClan = (user) => isGlobalOverride(user);

const canRestoreClan = (user) => user?.role === 'admin' || user?.role === 'superAdmin';

const canDeleteClan = (user, clan) => (user?.role === 'admin' || user?.role === 'superAdmin') && isClanArchived(clan);

const canUpdateClan = (user, clan) => (user?.role === 'admin' || user?.role === 'superAdmin') && !isClanArchived(clan);

const canManageClanGlobally = (user) => isGlobalOverride(user);

const canManageOwnClan = (user, clan) => {
  if (!user || !clan) return false;
  if (isGlobalOverride(user)) return true;
  if (user?.role !== 'clan-chief') return false;

  const clanId = getClanId(clan);
  const userClanId = getClanId(user?.clan) || toStr(user?.clanId);
  return Boolean(clanId && userClanId === clanId);
};

const canArchiveClan = (user, clan) => {
  if (!user || !clan || isClanArchived(clan)) return false;
  if (user?.role === 'admin' || user?.role === 'superAdmin') return true;
  return user?.role === 'clan-chief' && canManageOwnClan(user, clan);
};

const canManageClanNotice = (user, clan) => canManageOwnClan(user, clan) && !isClanArchived(clan);

const canManageClanMembers = (user, clan) => canManageOwnClan(user, clan) && !isClanArchived(clan);

const canApproveJoinRequests = (user, clan) => canManageOwnClan(user, clan) && !isClanArchived(clan);

const canRemoveClanMember = (user, clan, memberId) => {
  if (!canManageOwnClan(user, clan) || isClanArchived(clan)) return false;
  const chiefId = toStr(clan?.chief?._id || clan?.chief);
  return toStr(memberId) !== chiefId;
};

const canIssueWarning = (user, targetUser, clan) => {
  if (!user || !targetUser || !clan) return false;

  // Don't allow warning yourself
  const targetId = toStr(targetUser._id || targetUser.id);
  const userId = toStr(user._id || user.id);
  if (targetId && userId && targetId === userId) return false;

  // Can't warn higher-privilege users
  if (isGlobalOverride(targetUser) && !isGlobalOverride(user)) return false;

  if (!canManageOwnClan(user, clan) || isClanArchived(clan)) return false;

  // The target is in this clan if their clan ID matches, OR they are in the members array
  const clanId = getClanId(clan);
  const targetClanId = getClanId(targetUser?.clan);
  if (targetClanId && targetClanId === clanId) return true;

  // Fallback: check if target is in clan.members (populated array)
  if (clan?.members && Array.isArray(clan.members)) {
    return clan.members.some(m => toStr(m?._id || m?.id || m) === targetId);
  }

  return true;
};

export {
  canAccessChiefPanel,
  canArchiveClan,
  canApproveJoinRequests,
  canCreateClan,
  canDeleteClan,
  canIssueWarning,
  canManageClanGlobally,
  canManageClanMembers,
  canManageClanNotice,
  canManageOwnClan,
  canRemoveClanMember,
  canRestoreClan,
  canUpdateClan,
  isClanArchived,
  isChief,
  isGlobalOverride,
};