import fs from 'node:fs';
import path from 'node:path';
import { upsertYouTubeApiKeys } from '@youpd/supabase/repositories/youtubeApiKeys';

type EnvMap = Record<string, string>;

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnvFile(filePath: string): EnvMap {
  if (!fs.existsSync(filePath)) return {};
  const env: EnvMap = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = stripQuotes(trimmed.slice(eq + 1));
    if (key.length > 0) env[key] = value;
  }
  return env;
}

function loadProcessEnv(filePath: string): void {
  const env = parseEnvFile(filePath);
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

function isNamedYouTubeApiKey(name: string): boolean {
  return /^YOUTUBE_API_KEY(?:_[A-Z0-9]+)*$/.test(name);
}

function isEnvYoutubeEntry(name: string): boolean {
  // apps/web/.env.youtube is dedicated to YouTube API keys in this repo. Accept
  // project-specific labels like MEDAI_YOUTUBE_1 while still ignoring invalid
  // shell variable names.
  return /^[A-Z][A-Z0-9_]*$/.test(name);
}

function isUsableValue(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  const lower = trimmed.toLowerCase();
  return (
    !trimmed.startsWith('<') &&
    !lower.includes('replace') &&
    !lower.includes('your-') &&
    !trimmed.includes('여기에')
  );
}

function keysFromEnv(env: EnvMap): { name: string; keyValue: string }[] {
  const keys: { name: string; keyValue: string }[] = [];
  const seenValues = new Set<string>();

  for (const [name, value] of Object.entries(env)) {
    if (name === 'YOUTUBE_API_KEYS') {
      value
        .split(',')
        .map((part) => part.trim())
        .filter(isUsableValue)
        .forEach((keyValue, index) => {
          if (seenValues.has(keyValue)) return;
          seenValues.add(keyValue);
          keys.push({ name: `YOUTUBE_API_KEYS_${index + 1}`, keyValue });
        });
      continue;
    }

    if (
      !isUsableValue(value) ||
      (!isNamedYouTubeApiKey(name) && !isEnvYoutubeEntry(name))
    ) {
      continue;
    }
    if (seenValues.has(value)) continue;
    seenValues.add(value);
    keys.push({ name, keyValue: value });
  }

  return keys;
}

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main(): Promise<void> {
  const repoRoot = path.resolve(import.meta.dirname, '../../..');
  const webEnvLocal = path.join(repoRoot, 'apps/web/.env.local');
  const defaultYoutubeEnv = path.join(repoRoot, 'apps/web/.env.youtube');
  const youtubeEnvPath = path.resolve(
    argValue('--env-file') ?? defaultYoutubeEnv,
  );

  loadProcessEnv(webEnvLocal);
  const youtubeEnv = parseEnvFile(youtubeEnvPath);
  const keys = keysFromEnv(youtubeEnv);

  if (!process.env.DATABASE_URL) {
    throw new Error(
      `DATABASE_URL is not set. Add it to ${webEnvLocal} or export it before running this command.`,
    );
  }
  if (keys.length === 0) {
    throw new Error(`No YOUTUBE_API_KEY* entries found in ${youtubeEnvPath}`);
  }

  const rows = await upsertYouTubeApiKeys(keys);
  console.log(
    `Synced ${rows.length} YouTube API key(s) into Supabase from ${path.relative(
      repoRoot,
      youtubeEnvPath,
    )}.`,
  );
}

main()
  .then(() => {
    // The shared postgres client intentionally keeps a pool open for servers;
    // this one-shot sync command should exit once writes are complete.
    process.exit(0);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
