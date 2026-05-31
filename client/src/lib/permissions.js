const GLOBAL_OVERRIDE_ROLES = new Set(['admin', 'moderator']);
const CHIEF_ROLES = new Set(['clan-chief', 'admin']);

const getUserId = (user) => user?._id || user?.id || null;

const isGlobalOverride = (user) => GLOBAL_OVERRIDE_ROLES.has(user?.role);

const isChief = (user) => CHIEF_ROLES.has(user?.role) || Boolean(user?.isChief);

const getClanId = (clan) => clan?._id || clan?.id || clan?.clanId || null;

const isClanArchived = (clan) => clan?.status === 'archived';

const canAccessChiefPanel = (user) => isChief(user);

const canCreateClan = (user) => isGlobalOverride(user);

const canRestoreClan = (user) => user?.role === 'admin';

const canDeleteClan = (user, clan) => user?.role === 'admin' && isClanArchived(clan);

const canUpdateClan = (user, clan) => user?.role === 'admin' && !isClanArchived(clan);

const canManageClanGlobally = (user) => isGlobalOverride(user);

const canManageOwnClan = (user, clan) => {
  if (!user || !clan) return false;
  if (isGlobalOverride(user)) return true;
  if (user?.role !== 'clan-chief') return false;

  const clanId = getClanId(clan);
  return Boolean(clanId && (user?.clanId === clanId || user?.clan === clanId));
};

const canArchiveClan = (user, clan) => {
  if (!user || !clan || isClanArchived(clan)) return false;
  if (user?.role === 'admin') return true;
  return user?.role === 'clan-chief' && canManageOwnClan(user, clan);
};

const canManageClanNotice = (user, clan) => canManageOwnClan(user, clan) && !isClanArchived(clan);

const canManageClanMembers = (user, clan) => canManageOwnClan(user, clan) && !isClanArchived(clan);

const canApproveJoinRequests = (user, clan) => canManageOwnClan(user, clan) && !isClanArchived(clan);

const canRemoveClanMember = (user, clan, memberId) => {
  if (!canManageOwnClan(user, clan) || isClanArchived(clan)) return false;
  const chiefId = clan?.chief?._id || clan?.chief;
  return memberId !== chiefId;
};

const canIssueWarning = (user, targetUser, clan) => {
  if (!canManageOwnClan(user, clan) || isClanArchived(clan)) return false;
  const targetClanId = targetUser?.clan?._id || targetUser?.clan || null;
  return Boolean(targetClanId && targetClanId === getClanId(clan));
};

module.exports = {
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