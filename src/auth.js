import { createRemoteJWKSet, jwtVerify } from 'jose'

const keys = new Map()

export async function adminIdentity(request, env) {
  const url = new URL(request.url)
  // Test-only auth: requires a deliberately configured token and the localhost hostname.
  // Production always requires signed Cloudflare Access JWT, never a shared browser API key.
  if (
    env.AUTH_MODE === 'local' &&
    ['localhost', '127.0.0.1'].includes(url.hostname)
  ) {
    const expected = env.LOCAL_ADMIN_TOKEN
    const supplied = request.headers
      .get('authorization')
      ?.replace(/^Bearer\s+/i, '')
    if (expected && expected.length >= 20 && supplied) {
      const digest = async (value) =>
        crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
      const [a, b] = await Promise.all([digest(expected), digest(supplied)])
      if (crypto.subtle.timingSafeEqual(a, b))
        return { email: 'local-developer', mode: 'local' }
    }
    return null
  }
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.ACCESS_ALLOWED_EMAIL)
    return null
  const token = request.headers.get('Cf-Access-Jwt-Assertion')
  if (!token) return null
  try {
    const issuer = env.ACCESS_TEAM_DOMAIN.replace(/\/$/, '')
    if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer))
      return null
    const certs = `${issuer}/cdn-cgi/access/certs`
    if (!keys.has(certs)) keys.set(certs, createRemoteJWKSet(new URL(certs)))
    return await verifyAccessToken(
      token,
      keys.get(certs),
      issuer,
      env.ACCESS_AUD,
      env.ACCESS_ALLOWED_EMAIL
    )
  } catch {
    return null
  }
}

export function allowedOrigin(request, env) {
  const origin = request.headers.get('origin')
  return (
    !origin ||
    origin === new URL(request.url).origin ||
    (env.AUTH_MODE === 'local' && origin === env.ALLOWED_DEV_ORIGIN)
  )
}

// Shared validation boundary, also tested with locally generated RSA keys.
export async function verifyAccessToken(token, key, issuer, audience, email) {
  const { payload } = await jwtVerify(token, key, {
    issuer,
    audience,
    algorithms: ['RS256'],
    requiredClaims: ['exp', 'iat', 'sub', 'email'],
  })
  if (
    typeof payload.email !== 'string' ||
    payload.email.toLowerCase() !== email.toLowerCase()
  )
    return null
  return { email: payload.email, mode: 'access' }
}
