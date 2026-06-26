/**
 * utils/env.ts
 *
 * Validates that all required EXPO_PUBLIC_* environment variables are present.
 * Call validateEnv() once during app startup (app/_layout.tsx).
 *
 * In development: throws an error with a clear message so misconfigured
 * environments are caught immediately.
 * In production builds: logs a warning (variables are baked in at build time).
 */

const REQUIRED_ENV_VARS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
] as const;

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

/**
 * Reads a typed env var. Returns undefined if not set.
 */
export function getEnv(key: RequiredEnvVar): string | undefined {
  return process.env[key];
}

/**
 * Validates that all required environment variables are present.
 * Should be called once at app startup.
 */
export function validateEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      missing.push(key);
    }
  }

  if (missing.length === 0) return;

  const message =
    `[AdventurerApp] Missing required environment variables:\n` +
    missing.map((k) => `  • ${k}`).join('\n') +
    `\n\nCopy .env.example to .env and fill in the values.`;

  if (__DEV__) {
    throw new Error(message);
  } else {
    console.warn(message);
  }
}
