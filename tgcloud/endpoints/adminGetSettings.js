import { requireAdmin } from '../lib/auth.js';
import { getSettings, EDITABLE_KEYS } from '../lib/settings.js';

// Returns every setting the admin may edit (snake_case keys, same as the settings table).
export default async function (input, ctx) {
  await requireAdmin(ctx);
  const all = await getSettings();
  const out = {};
  for (const key of EDITABLE_KEYS) out[key] = all[key] === undefined ? null : all[key];
  return out;
}
