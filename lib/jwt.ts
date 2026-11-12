import jwt from "jsonwebtoken"

/**
 * Reads the signing secret from the environment.
 *
 * Resolved lazily so importing this module never fails at build time. There is
 * deliberately no fallback value: a hardcoded default would let anyone reading
 * this repository forge a valid session token for any user.
 */
function getSecret(): string {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. Session tokens cannot be signed or verified. " +
        "Generate one with `openssl rand -base64 32` and add it to .env.local."
    )
  }

  return secret
}

export function signToken(payload: object): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "7d" })
}

export function verifyToken(token: string): unknown {
  try {
    return jwt.verify(token, getSecret())
  } catch {
    // Expired, tampered with, or signed with a different secret.
    return null
  }
}
