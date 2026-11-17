export function appUrl(): string {
  const fromEnv = process.env.APP_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function tokenSecret(): string {
  const s = process.env.TOKEN_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production" && process.env.VERCEL)
    throw new Error("TOKEN_SECRET must be set (at least 16 characters)");
  return "dev-only-insecure-token-secret";
}
