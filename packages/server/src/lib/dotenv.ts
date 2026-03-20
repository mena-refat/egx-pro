/**
 * Load .env and .env.local before any other code runs.
 * Must be the first import in server.ts so process.env is set before services (e.g. TwelveData) are instantiated.
 * In the monorepo the .env files live at the workspace root (two levels above packages/server).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

// Resolve the monorepo root regardless of cwd (packages/server/src/lib → root = ../../../../)
const root = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..', '..');

config({ path: path.join(root, '.env'), quiet: true });
config({ path: path.join(root, '.env.local'), override: true, quiet: true });
