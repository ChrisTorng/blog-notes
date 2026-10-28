import { readLimitedText } from './http.js'

// The blog owns the entire shell and stylesheet. Only the content slot is filled here.
export async function withSiteTheme(response, env) {
  const page = await response.text()
  const main = page.match(/<main>([\s\S]*?)<\/main>/)?.[1]
  const metadata = page.match(/<head>([\s\S]*?)<\/head>/)?.[1]
  if (main === undefined || metadata === undefined)
    throw new Error('Invalid Notes page')
  const pageData = JSON.stringify({ head: metadata }).replaceAll(
    '<',
    String.fromCharCode(92) + 'u003c'
  )
  const shellUrl =
    env.BLOG_SHELL_URL || new URL('/notes-shell/', env.SITE_URL).href
  try {
    const upstream = await fetch(shellUrl, {
      signal: AbortSignal.timeout(20000),
    })
    if (!upstream.ok) throw new Error('Site shell unavailable')
    const shell = await readLimitedText(upstream, 3_000_000)
    if (!shell.includes('id="notes-content"'))
      throw new Error('Missing Notes slot')
    let rewriter = new HTMLRewriter().on('#notes-content', {
      element(el) {
        el.setInnerContent(
          '<section class="notes-public">' +
            main +
            '</section><script type="application/json" id="notes-page-meta">' +
            pageData +
            '</script>',
          { html: true }
        )
      },
    })
    for (const selector of [
      'title',
      'meta[name="description"]',
      'meta[name="robots"]',
      'meta[property^="og:"]',
      'meta[name^="twitter:"]',
      'link[rel="canonical"]',
    ])
      rewriter = rewriter.on(selector, {
        element(el) {
          el.remove()
        },
      })
    rewriter = rewriter.on('head', {
      element(el) {
        el.append(metadata, { html: true })
      },
    })
    const headers = new Headers(response.headers)
    headers.set('X-Notes-Theme', 'main-site')
    return rewriter.transform(
      new Response(shell, { status: response.status, headers })
    )
  } catch {
    return new Response('主站版型暫時無法取得，請稍後再試。', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'Retry-After': '30',
      },
    })
  }
}
