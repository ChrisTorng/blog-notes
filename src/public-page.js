import { htmlEscape as esc, noteTitle, plainText } from './markdown.js';
import { noteArticleHtml } from './public-content.js';

export async function publicNotePage(request, note) {
  const site = 'ChrisTorng 學習天地';
  const origin = new URL(request.url).origin;
  const canonical = origin + '/notes/' + encodeURIComponent(note.slug) + '/';
  const title = noteTitle(note);
  const text = plainText(note.markdown).slice(0, 180);
  const body = '<section class="w-full py-5 pb-12"><a class="text-primary-500 text-sm" href="/notes/">← 隨筆列表</a>'+
    '<div class="mt-4">'+noteArticleHtml(note,origin)+'</div></section>';
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
