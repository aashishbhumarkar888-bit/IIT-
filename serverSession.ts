import crypto from 'crypto';

export const SESSION_TTL_MS = 15 * 60 * 1000;

export interface SignedSessionClaims {
  tokenId: string;
  email: string;
  issuedAt: number;
  expiresAt: number;
}

function isSignedSessionClaims(value: unknown): value is SignedSessionClaims {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('tokenId' in value) ||
    !('email' in value) ||
    !('issuedAt' in value) ||
    !('expiresAt' in value)
  ) {
    return false;
  }

  return (
    typeof value.tokenId === 'string' &&
    /^[a-f0-9]{48}$/.test(value.tokenId) &&
    typeof value.email === 'string' &&
    value.email.length > 0 &&
    typeof value.issuedAt === 'number' &&
    Number.isSafeInteger(value.issuedAt) &&
    typeof value.expiresAt === 'number' &&
    Number.isSafeInteger(value.expiresAt)
  );
}

export function createSignedToken(
  email: string,
  secret: string,
  now: number = Date.now()
): string {
  const claims: SignedSessionClaims = {
    tokenId: crypto.randomBytes(24).toString('hex'),
    email,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  const encodedClaims = Buffer.from(JSON.stringify(claims)).toString(
    'base64url'
  );
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedClaims)
    .digest('hex');

  return `${encodedClaims}.${signature}`;
}

export function verifySignedToken(
  rawToken: string | undefined,
  secret: string,
  now: number = Date.now()
): SignedSessionClaims | null {
  if (!rawToken) return null;
  const parts = rawToken.split('.');
  if (
    parts.length !== 2 ||
    !/^[A-Za-z0-9_-]+$/.test(parts[0]) ||
    !/^[a-f0-9]{64}$/.test(parts[1])
  ) {
    return null;
  }

  const [encodedClaims, providedSignature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(encodedClaims)
    .digest();
  const receivedSignature = Buffer.from(providedSignature, 'hex');
  if (
    receivedSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(receivedSignature, expectedSignature)
  ) {
    return null;
  }

  let claims: unknown;
  try {
    const decoded = Buffer.from(encodedClaims, 'base64url');
    if (decoded.toString('base64url') !== encodedClaims) return null;
    claims = JSON.parse(decoded.toString('utf8'));
  } catch {
    return null;
  }

  if (!isSignedSessionClaims(claims)) return null;
  const sessionClaims = claims;
  if (
    sessionClaims.expiresAt - sessionClaims.issuedAt !== SESSION_TTL_MS ||
    sessionClaims.issuedAt > now ||
    now >= sessionClaims.expiresAt
  ) {
    return null;
  }

  return sessionClaims;
}
