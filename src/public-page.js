import { htmlEscape as esc, noteTitle, renderMarkdown } from './markdown.js';

export async function publicNotePage(request, note) {
  const site = 'ChrisTorng 學習天地';
  const origin = new URL(request.url).origin;
  const canonical = origin + '/notes/' + encodeURIComponent(note.slug) + '/';
  const title = noteTitle(note);
  const text = String(note.markdown || '').replace(/[#*~[\]()>]/g, '').slice(0, 180);
  const date = (note.published_at || note.created_at).slice(0, 10);
  const tags = note.tags.map(t => '<a class="text-primary-500" href="/notes/?tag=' + encodeURIComponent(t) + '">#' + esc(t) + '</a>').join('');
  // Relative links, if present, are resolved against the main website rather than the slug path.
  const markdown = renderMarkdown(note.markdown).replace(/\b(href|src)="([^"]+)"/g,(full, attr, value) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(value)) return full;
    try { return attr + '="' + esc(new URL(value.replaceAll('&amp;','&'), origin + '/').href) + '"'; }
    catch { return full; }
  });
  const bookmarkLink = note.bookmark_id
    ? '<p class="mt-5"><a class="text-primary-500" href="/bookmarks/view/?id=' +
      encodeURIComponent(note.bookmark_id) + '">參考書籤 ↗</a></p>' : '';
  const body = '<section class="py-8"><a class="text-primary-500" href="/notes/">← 隨筆列表</a>' +
    '<article class="mt-6"><time class="text-sm text-gray-500" datetime="' + esc(date) + '">' + esc(date) + '</time>' +
    '<h1 class="my-5 text-3xl font-bold">' + esc(title) + '</h1>' +
    '<div class="prose max-w-none dark:prose-invert">' + markdown + '</div>' +
    bookmarkLink + '<div class="mt-5 flex gap-3">' + tags + '</div></article></section>';
  const meta = '<meta name="description" content="' + esc(text) + '">' +
    '<meta name="robots" content="index,follow"><link rel="canonical" href="' + esc(canonical) + '">' +
    '<meta property="og:type" content="article"><meta property="og:title" content="' + esc(title) + '">' +
    '<meta property="og:url" content="' + esc(canonical) + '">' +
    '<meta property="og:description" content="' + esc(text) + '">' +
    '<link rel="alternate" type="application/rss+xml" title="所有隨筆 RSS | ' + site + '" href="/notes/feed.xml">';
  const template = await fetch(origin + '/notes-shell/',{headers:{'Accept':'text/html'}});
  if (!template.ok) return new Response('網站版型暫時無法取得',{status:503});
  let rewrite = new HTMLRewriter()
    .on('#notes-content',{element(el){el.setInnerContent(body,{html:true});}})
    .on('title',{element(el){el.setInnerContent(title + ' | ' + site);}})
    .on('head',{element(el){el.append(meta,{html:true});}});
  for (const selector of ['meta[name="description"]','meta[name="robots"]',
    'link[rel="canonical"]','meta[property^="og:"]']) {
    rewrite = rewrite.on(selector,{element(el){el.remove();}});
  }
  const headers = new Headers(template.headers);
  headers.set('Cache-Control','public, max-age=60');
  headers.delete('content-length');
  return rewrite.transform(new Response(template.body,{status:200,headers}));
}
