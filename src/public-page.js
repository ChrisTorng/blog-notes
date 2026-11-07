import { htmlEscape as esc, noteTitle, plainText, renderPublicMarkdown } from './markdown.js';
import { allTags } from './data.js';

export async function publicNotePage(request, note) {
  const site = 'ChrisTorng 學習天地';
  const origin = new URL(request.url).origin;
  const canonical = origin + '/notes/' + encodeURIComponent(note.slug) + '/';
  const title = noteTitle(note);
  const text = plainText(note.markdown).slice(0, 180);
  const date = (note.published_at || note.created_at).slice(0, 10);
  const names = new Map(allTags.map(tag=>[tag.id,tag.displayName]));
  const tags = note.tags.map(id=>'<a class="text-primary-500" href="/notes/?tag='+
    encodeURIComponent(id)+'">#'+esc(names.get(id)||id)+'</a>').join('');
  const markdown = renderPublicMarkdown(note.markdown,origin);
  const bookmarkLink = note.bookmark_id
    ? '<a class="text-primary-500 mt-3 inline-block text-sm" href="/bookmarks/view/?id=' +
      encodeURIComponent(note.bookmark_id)+'">參考書籤 ↗</a>' : '';
  const body = '<section class="w-full py-5 pb-12"><a class="text-primary-500 text-sm" href="/notes/">← 隨筆列表</a>'+
    '<article class="mt-4 border-b border-gray-300/40 py-4 dark:border-gray-700">'+
    '<time class="text-xs text-gray-500" datetime="'+esc(date)+'">'+esc(date)+'</time>'+
    '<h1 class="mt-2 text-xl leading-snug font-bold">'+esc(title)+'</h1>'+
    '<div class="mt-3 prose max-w-none text-sm dark:prose-invert">'+markdown+'</div>'+
    bookmarkLink+'<div class="mt-3 flex flex-wrap gap-2 text-sm">'+tags+'</div></article></section>';
  const jsonld = JSON.stringify({
    '@context':'https://schema.org','@type':'BlogPosting',
    headline:title,datePublished:note.published_at||note.created_at,
    dateModified:note.updated_at,author:{'@type':'Person',name:'ChrisTorng'},
    mainEntityOfPage:canonical,description:text
  }).replace(/</g,'\\u003c');
  const meta = '<meta name="description" content="' + esc(text) + '">' +
    '<meta name="robots" content="index,follow"><link rel="canonical" href="' + esc(canonical) + '">' +
    '<meta property="og:type" content="article"><meta property="og:title" content="' + esc(title) + '">' +
    '<meta property="og:url" content="' + esc(canonical) + '">' +
    '<meta property="og:description" content="' + esc(text) + '">' +
    '<link rel="alternate" type="application/rss+xml" title="所有隨筆 RSS | ' + site + '" href="/notes/feed.xml">'+
    '<script type="application/ld+json">'+jsonld+'</script>';
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
