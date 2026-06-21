const GLOBAL_OVERRIDE_ROLES = new Set(['admin', 'moderator', 'superAdmin']);
const CHIEF_ROLES = new Set(['clan-chief', 'admin', 'superAdmin']);

const isGlobalOverride = (user) => GLOBAL_OVERRIDE_ROLES.has(user?.role);

const isChief = (user) => CHIEF_ROLES.has(user?.role) || Boolean(user?.isChief);

const getClanId = (clan) => {
  if (!clan) return null;
  if (typeof clan === 'string') return clan;
  return clan._id || clan.id || clan.clanId || null;
};

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
  const userClanId = getClanId(user?.clan) || getClanId(user?.clanId) || null;
  return Boolean(clanId && userClanId && clanId.toString() === userClanId.toString());
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
  const chiefId = clan?.chief?._id || clan?.chief;
  return memberId !== chiefId;
};

const canIssueWarning = (user, targetUser, clan) => {
  if (!canManageOwnClan(user, clan) || isClanArchived(clan)) return false;
  const targetClanId = targetUser?.clan?._id || targetUser?.clan || null;
  return Boolean(targetClanId && targetClanId === getClanId(clan));
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