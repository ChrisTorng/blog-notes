import { checkNoteInput } from './data.js';

// Validate the entire note before invoking the cross-service operation.
// A failed referenced-bookmark publication must block Notes publication,
// instead of creating a public Note whose embedded bookmark is still private.
export async function ensurePublishedBookmark(env, raw) {
  const input = checkNoteInput(raw);
  if (input.status !== 'published' || !input.bookmark_id) return;
  if (!env.BOOKMARK_EDITOR)
    throw new Error('引用書籤服務未設定，無法發佈隨筆');
  const result = await env.BOOKMARK_EDITOR.recommendForPublishedNote(input.bookmark_id);
  if (!result || result.status !== 4)
    throw new Error('引用書籤未成功推薦，隨筆未發佈');
}
