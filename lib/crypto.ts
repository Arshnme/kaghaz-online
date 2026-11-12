import crypto from "crypto"

const ALGORITHM = "aes-256-cbc"

/**
 * Reads the encryption key from the environment.
 *
 * Resolved lazily rather than at module load so that importing this module
 * never fails during a build. A missing key is always an error: falling back to
 * a hardcoded default would encrypt real user documents with a key that is
 * published in this repository, which is equivalent to storing them in plain
 * text. See .env.example for the value this expects.
 */
function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY

  if (!secret) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Document contents cannot be encrypted or decrypted. " +
        "Generate one with `openssl rand -base64 32` and add it to .env.local."
    )
  }

  // Hash to a fixed 32 bytes so any key length is accepted for AES-256.
  return crypto.createHash("sha256").update(secret).digest()
}

export function encrypt(text: string): string {
  if (!text || typeof text !== "string") {
    return text
  }

  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)

  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")

  // Store the IV alongside the ciphertext, separated by a colon.
  return `${iv.toString("hex")}:${encrypted}`
}

/**
 * Decrypts a value produced by encrypt().
 *
 * Values that are not in `iv:ciphertext` form are returned unchanged. The
 * application has rows in the database that predate encryption and stored
 * values that were encrypted under an older key, so being lenient here keeps
 * those documents readable instead of throwing for the whole page.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText || typeof encryptedText !== "string" || !encryptedText.includes(":")) {
    return encryptedText
  }

  const [ivHex, encrypted] = encryptedText.split(":")
  if (!ivHex || !encrypted) {
    return encryptedText
  }

  // A 16-byte IV is 32 hex characters.
  if (ivHex.length !== 32 || !/^[0-9a-fA-F]{32}$/.test(ivHex)) {
    return encryptedText
  }

  if (!/^[0-9a-fA-F]+$/.test(encrypted)) {
    return encryptedText
  }

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"))

    let decrypted = decipher.update(encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")

    return decrypted
  } catch (error) {
    // Wrong key or tampered ciphertext. Surfacing the original value keeps the
    // rest of the document usable; the operator sees this in the logs.
    console.error("Decryption failed, returning the stored value as-is:", error)
    return encryptedText
  }
}
