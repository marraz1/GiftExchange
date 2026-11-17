import { createHmac, timingSafeEqual } from "node:crypto";
import { tokenSecret } from "./env";

/**
 * Links are `<uuid>.<signature>`; the signature is an HMAC of the id, so a
 * link can be regenerated at any time (copy / resend) without storing it, and
 * deleting the row revokes it.
 */
export type TokenKind = "admin" | "participant";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sign(kind: TokenKind, id: string): string {
  return createHmac("sha256", tokenSecret())
    .update(`${kind}:${id.toLowerCase()}`)
    .digest("base64url")
    .slice(0, 32);
}

export function makeToken(kind: TokenKind, id: string): string {
  return `${id}.${sign(kind, id)}`;
}

/** Returns the id if the token is valid, otherwise null. */
export function verifyToken(kind: TokenKind, token: string | undefined | null): string | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!UUID_RE.test(id)) return null;
  const expected = Buffer.from(sign(kind, id));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return id;
}
