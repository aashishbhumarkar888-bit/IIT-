export function getServerSessionExpiry(token: string): number | null {
  const [encodedClaims, signature, extraPart] = token.split('.');
  if (
    !encodedClaims ||
    !signature ||
    extraPart !== undefined ||
    !/^[a-f0-9]{64}$/.test(signature)
  ) {
    return null;
  }

  try {
    const base64 = encodedClaims.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0)
    );
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (
      typeof claims !== 'object' ||
      claims === null ||
      !('expiresAt' in claims) ||
      typeof claims.expiresAt !== 'number' ||
      !Number.isSafeInteger(claims.expiresAt)
    ) {
      return null;
    }
    return claims.expiresAt;
  } catch {
    return null;
  }
}
