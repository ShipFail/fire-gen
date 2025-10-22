export function getRequiredEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export function ensureTrailingSlash(gsPrefix: string): string {
  return gsPrefix.endsWith("/") ? gsPrefix : `${gsPrefix}/`;
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

