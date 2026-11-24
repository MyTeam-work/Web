# tgcloud SDK — cheat sheet

Condensed from https://core.telegram.org/bots/serverless (checked 8 Nov 2026). Read this instead of scanning the project.

## Layout

- Deployed code lives only in `tgcloud/`: `schema.js`, `lib/**` (subfolders allowed), `handlers/*.js` (flat), `endpoints/*.js` (flat). A `.js` file anywhere else in `tgcloud/` is NOT deployed.
- One handler per Telegram update type (`handlers/message.js`, `callback_query.js`, `my_chat_member.js`, ...). No file or an empty file = that update type is ignored.
- The Mini App front-end is in `src/` (Vite). `tgcloud.jsonc` points `static.source` to `dist`. It is served at `https://app<app_id>.tgcloud.ai/` and calls endpoints under `/api/`. Do not put your own files under `/api/`.

## Module rules (runtime)

- Imports: relative path ending in `.js` (`'../schema.js'`) or `'sdk'`, `'sdk/db'`, `'sdk/api'`, `'sdk/fetch'`. No npm packages, no `require`, no filesystem, no Node `Buffer` (use `Uint8Array`).
- Every `db` call is async: always `await`.
- No foreign keys: `.references()` and `foreignKey()` throw. Use plain integer columns and keep integrity in code (insert parents first, delete children first).
- No environment variables. Keep constants in `settings` table or in code (never secrets in the repo).

## Handler and endpoint shapes

```js
// handlers/message.js  (payload = Message; ctx.update = raw Update)
import { api, db } from 'sdk';
export default async function (message, ctx) { /* ... */ }

// endpoints/getProfile.js  (input = JSON object; ctx.initData is verified by the platform)
import { db, EndpointError } from 'sdk';
export default async function (input, ctx) {
  const user = ctx.initData.user;
  if (!user) throw new EndpointError('Forbidden', { code: 'FORBIDDEN' });
  return { id: user.id };
}
```

The Mini App calls: `Telegram.WebApp.Serverless.call('getProfile', { lang: 'fa' }, (err, res) => {})`. `err.type` is `ENDPOINT_ERROR` (your `EndpointError`; `err.message`, `err.parameters`) or `UNAUTHORIZED` etc. Any other thrown error becomes a generic internal error (details only in logs).

## Database (`sdk/db`, Drizzle-like, SQLite)

```js
import { table, integer, text, boolean, json, real, index, uniqueIndex, sql } from 'sdk/db';
export const users = table('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tgId: integer('tg_id').notNull().unique(),
  isBlocked: boolean('is_blocked').default(false),
  prefs: json('prefs'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({ idx: index('idx_users_created').on(t.createdAt) }));

import { db } from 'sdk';
import { eq, and, or, desc, asc, like, inArray, count, sql } from 'sdk/db';
await db.select().from(users).where(eq(users.tgId, 1)).get();            // row or null
await db.select().from(users).orderBy(desc(users.id)).limit(20).offset(0).all();
await db.insert(users).values({ tgId: 1 }).onConflictDoUpdate({ target: users.tgId, set: { isBlocked: false } }).returning().run();
await db.update(users).set({ isBlocked: true }).where(eq(users.tgId, 1)).run();
await db.delete(users).where(eq(users.id, 1)).run();
await db.$count(users, eq(users.isBlocked, false));
await db.run('UPDATE users SET x = :x', { ':x': 1 });   // raw SQL: db.run / db.all / db.get / db.values
```

- Raw SQL results are NOT converted (booleans are 0/1, json is a string, timestamps are numbers).
- Removing a table/column: mark `.deprecated('reason')`; deleting it from the file does nothing.
- Batch inserts are limited by SQLite's variable limit (rows x columns): chunk them.
- Deploy (`push`) never touches the database. Schema changes are applied with `migrate` only (Atlas, with admin approval).

## Bot API and files

```js
import { api, InputFile, BotApiError } from 'sdk';
await api.sendMessage({ chat_id, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: 'OK', callback_data: 'x:1' }]] } });
await api.answerCallbackQuery({ callback_query_id });
await api.sendPhoto({ chat_id, photo: new InputFile(bytes, 'r.jpg', { type: 'image/jpeg' }) });  // upload
const bytes = await api.getFileContent(file_id);          // Uint8Array, max 20 MB
try { await api.deleteMessage({ chat_id, message_id }); }
catch (e) { if (!(e instanceof BotApiError)) throw e; /* e.code, e.description, e.parameters.retry_after */ }
```

- `api.<method>` returns the unwrapped `result`; failures throw `BotApiError`.
- Upload limits: 50 MB per file, 10 MB per photo.
- `fetch` from `sdk` is fetch-like; the whole response is capped at 30 MB.
- `console.log/info/warn/error` are captured (shown by `tgcloud run`).

## CLI flow

```
npx tgcloud run handlers/message '{ chat: { id: 1 }, text: "hi" }'            # test local code, no deploy
npx tgcloud run endpoints/getHome '{}' --ctx '{ initData: { user: { id: 1 } } }'
npx tgcloud push        # deploy modules + dist/ (build first: npm run build)
npx tgcloud migrate     # apply schema changes (Atlas only)
npx tgcloud pull        # sync local files with the cloud (after PANEL: edits)
```

A push is rejected when the cloud revision moved on (someone deployed): `pull` first. Never use `push --force`.
