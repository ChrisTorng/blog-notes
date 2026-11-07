import { allTags } from './data.js';
import { htmlEscape as esc, noteTitle, renderPublicMarkdown } from './markdown.js';

const names = new Map(allTags.map(t=>[t.id,t.displayName]));

export const displayTag = id => names.get(id)||id;

// Canonical full-content HTML shared by the public note page and both RSS feeds.
export function noteArticleHtml(note,siteUrl) {
  const date=(note.published_at||note.created_at).slice(0,10);
  const tags=note.tags.map(id=>
    '<a class="text-primary-500" href="/notes/?tag='+encodeURIComponent(id)+'">#'+
      esc(displayTag(id))+'</a>').join('');
  const bookmark=note.bookmark_id
    ? '<a class="text-primary-500 mt-3 inline-block text-sm" href="/bookmarks/view/?id='+
      encodeURIComponent(note.bookmark_id)+'">參考書籤 ↗</a>' : '';
  const markdown=renderPublicMarkdown(note.markdown,siteUrl);
  return '<article class="border-b border-gray-300/40 py-4 dark:border-gray-700">'+
    '<time class="text-xs text-gray-500" datetime="'+esc(date)+'">'+esc(date)+'</time>'+
    '<h1 class="mt-2 text-xl leading-snug font-bold">'+esc(noteTitle(note))+'</h1>'+
    '<div class="mt-3 prose max-w-none text-sm dark:prose-invert">'+markdown+'</div>'+
    bookmark+'<div class="mt-3 flex flex-wrap gap-2 text-sm">'+tags+'</div></article>';
}
