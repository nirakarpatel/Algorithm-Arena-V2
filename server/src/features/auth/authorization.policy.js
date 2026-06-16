const GLOBAL_OVERRIDE_ROLES = new Set(['admin', 'moderator', 'superAdmin']);
const CHIEF_ROLES = new Set(['clan-chief', 'admin', 'superAdmin']);

const isGlobalOverrideRole = (actor) => GLOBAL_OVERRIDE_ROLES.has(actor?.role);

const canAccessChiefScopedAction = (actor) => {
  if (!actor) return false;
  return CHIEF_ROLES.has(actor.role) || Boolean(actor.isChief) || actor.role === 'superAdmin';
};

const canAccessAdminOnlyAction = (actor) => actor?.role === 'admin' || actor?.role === 'superAdmin';

module.exports = {
  GLOBAL_OVERRIDE_ROLES,
  CHIEF_ROLES,
  canAccessAdminOnlyAction,
  canAccessChiefScopedAction,
  isGlobalOverrideRole,
};