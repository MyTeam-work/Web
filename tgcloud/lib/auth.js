import { EndpointError } from 'sdk';
import { getAdminId } from './settings.js';

// The platform has already verified initData, so ctx.initData.user can be trusted.
export function getUser(ctx) {
  const user = ctx && ctx.initData && ctx.initData.user;
  if (!user || !user.id) throw new EndpointError('Unauthorized', { code: 'UNAUTHORIZED' });
  return user;
}

export async function isAdminId(tgId) {
  return Number(tgId) === (await getAdminId());
}

// Never throws; used by getHome to decide whether to show the admin tab.
export async function isAdmin(ctx) {
  const user = ctx && ctx.initData && ctx.initData.user;
  return !!user && (await isAdminId(user.id));
}

// First line of every admin endpoint.
export async function requireAdmin(ctx) {
  const user = getUser(ctx);
  if (!(await isAdminId(user.id))) throw new EndpointError('Forbidden', { code: 'FORBIDDEN' });
  return user;
}
