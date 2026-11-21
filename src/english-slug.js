import { slugifyEnglish } from './slug.js'

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

// Generate once at first publication, not on each request or later edit.
// Never fall back to pinyin: an unavailable translation should not permanently
// commit an accidental URL. A draft can still be saved without inference.
export async function translatedNoteSlug(env, title) {
  const source = String(title || '').trim()
  if (!source) throw new Error('無法從空白標題產生英文網址')
  if (!/[^\x00-\x7f]/.test(source)) return slugifyEnglish(source)

  if (!env.AI?.run) throw new Error('英文網址翻譯服務暫時無法使用，請稍後重新發布')
  let response
  try {
    response = await env.AI.run(MODEL, {
      messages: [
        {
          role: 'system',
          content: 'Translate the Traditional Chinese technology blog title into an idiomatic, concise English URL slug. Return ONLY 3 to 12 lowercase ASCII words separated by hyphens. Preserve product, company and technical terms. No pinyin, no punctuation, no explanation.',
        },
        { role: 'user', content: source.slice(0, 160) },
      ],
      temperature: 0,
      max_tokens: 96,
    })
  } catch {
    throw new Error('英文網址翻譯服務暫時無法使用，請稍後重新發布')
  }
  const result = String(response?.response || response?.choices?.[0]?.message?.content || '').trim()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(result) || !/[a-z]{2}/i.test(result))
    throw new Error('英文網址翻譯結果不符合格式，請稍後重新發布')
  return slugifyEnglish(result)
}
