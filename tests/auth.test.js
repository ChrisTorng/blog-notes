import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPair, SignJWT, createLocalJWKSet, exportJWK } from 'jose'
import { adminIdentity, verifyAccessToken } from '../src/auth.js'
const issuer = 'https://test.cloudflareaccess.com',
  aud = 'notes-test',
  email = 'owner@example.org'
test('Access validates signature, issuer, audience, expiry and exact allowed email', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256')
  const jwk = await exportJWK(publicKey)
  jwk.kid = 'test'
  jwk.alg = 'RS256'
  const key = createLocalJWKSet({ keys: [jwk] })
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setIssuer(issuer)
    .setAudience(aud)
    .setSubject('owner')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey)
  assert.equal(
    (await verifyAccessToken(token, key, issuer, aud, email)).mode,
    'access'
  )
  assert.equal(
    await verifyAccessToken(token, key, issuer, aud, 'other@example.org'),
    null
  )
  await assert.rejects(() =>
    verifyAccessToken(token, key, issuer, 'wrong', email)
  )
  await assert.rejects(() =>
    verifyAccessToken(
      token,
      key,
      'https://wrong.cloudflareaccess.com',
      aud,
      email
    )
  )
  const expired = await new SignJWT({ email })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setIssuer(issuer)
    .setAudience(aud)
    .setSubject('owner')
    .setIssuedAt(1)
    .setExpirationTime(2)
    .sign(privateKey)
  await assert.rejects(() =>
    verifyAccessToken(expired, key, issuer, aud, email)
  )
  const other = await generateKeyPair('RS256')
  const forged = await new SignJWT({ email })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setIssuer(issuer)
    .setAudience(aud)
    .setSubject('owner')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(other.privateKey)
  await assert.rejects(() => verifyAccessToken(forged, key, issuer, aud, email))
  assert.equal(
    await adminIdentity(
      new Request('https://notes.example/notes/api/admin/', {
        headers: { Authorization: 'Bearer long-enough-local-token' },
      }),
      { AUTH_MODE: 'local', LOCAL_ADMIN_TOKEN: 'long-enough-local-token' }
    ),
    null
  )
})
