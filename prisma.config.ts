import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';

config({ path: path.join(process.cwd(), '.env'), quiet: true });
config({ path: path.join(process.cwd(), '.env.local'), override: true, quiet: true });

export default defineConfig({
  earlyAccess: true,
  schema: path.join('packages', 'server', 'prisma', 'schema.prisma'),
});
