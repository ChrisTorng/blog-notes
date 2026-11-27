import { htmlEscape as esc, noteTitle, notePath, plainText } from './markdown.js';
import { noteArticleHtml } from './public-content.js';

function adjacentNavigation({prev,next}={}) {
  if (!prev && !next) return '';
  const link=(item,direction)=>item ? '<a href="'+esc(notePath(item))+'" rel="'+direction+'" aria-label="'+(direction==='prev'?'上一篇：':'下一篇：')+esc(noteTitle(item))+'" class="min-w-0 break-words '+(direction==='next'?'text-right ':'')+'text-primary-500 hover:text-primary-600">'+(direction==='prev'?'← '+esc(noteTitle(item)):esc(noteTitle(item))+' →')+'</a>' : '<span class="hidden sm:block"></span>';
  return '<nav aria-label="上下一篇" class="my-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2 sm:gap-3">'+link(prev,'prev')+link(next,'next')+'</nav>';
}

export async function publicNotePage(request, note, bookmarkHtml = '', adjacent={}) {
  const site = 'ChrisTorng 學習天地';
  const origin = new URL(request.url).origin;
  const canonical = origin + '/notes/' + encodeURIComponent(note.slug) + '/';
  const title = noteTitle(note);
  const text = plainText(note.markdown).slice(0, 180);
  const body = '<section class="w-full py-5 pb-12"><a class="text-primary-500 text-sm" href="/notes/"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" class="inline-block align-text-bottom"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg> 隨筆列表</a>'+
    adjacentNavigation(adjacent)+'<div class="mt-4">'+noteArticleHtml(note,origin,bookmarkHtml)+'</div>'+adjacentNavigation(adjacent)+'</section>';
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
  headers.set('Cache-Control',note.bookmark_id ? 'no-store' : 'public, max-age=60');
  headers.delete('content-length');
  return rewrite.transform(new Response(template.body,{status:200,headers}));
}
