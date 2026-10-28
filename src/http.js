// Bound reads while streaming so limits apply before allocating the whole body.
export async function readLimitedText(message, limit) {
  if (!message.body) return ''
  const reader = message.body.getReader(),
    decoder = new TextDecoder()
  let length = 0,
    text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > limit) {
        await reader.cancel()
        throw new Error('請求內容過大')
      }
      text += decoder.decode(value, { stream: true })
    }
    return text + decoder.decode()
  } finally {
    reader.releaseLock()
  }
}
