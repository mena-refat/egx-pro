/**
 * Load .env and .env.local before any other code runs.
 * Must be the first import in server.ts so process.env is set before services (e.g. TwelveData) are instantiated.
 */
import { config } from 'dotenv';

config();
config({ path: '.env.local', override: true });
