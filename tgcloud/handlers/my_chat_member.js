import { setUserBlocked } from '../lib/db.js';

// payload is a ChatMemberUpdated object. Only private chats matter here:
// 'kicked' means the user blocked the bot, 'member' means they unblocked it.
export default async function (update) {
  const chat = update && update.chat;
  const status = update && update.new_chat_member && update.new_chat_member.status;
  if (!chat || chat.type !== 'private' || !status) return;
  if (status === 'kicked') await setUserBlocked(chat.id, true);
  else if (status === 'member') await setUserBlocked(chat.id, false);
}
