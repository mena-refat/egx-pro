// ua-parser-js can export differently in ESM/CJS; parse safely and never throw
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export type DeviceType = 'desktop' | 'mobile' | 'tablet';

const FALLBACK = { deviceType: 'desktop' as DeviceType, browser: 'Unknown', os: 'Unknown' };

export function parseUserAgent(userAgent: string | undefined): {
  deviceType: DeviceType;
  browser: string;
  os: string;
} {
  const ua = userAgent || '';
  try {
    const mod = require('ua-parser-js') as { default?: unknown; UAParser?: unknown };
    const ParserCtor = mod?.default ?? mod?.UAParser ?? mod;
    if (typeof ParserCtor !== 'function') return FALLBACK;
    const instance = new (ParserCtor as new (ua: string) => {
      getResult: () => { device?: { type?: string }; browser?: { name?: string }; os?: { name?: string } };
    })(ua);
    const result = instance.getResult();
    const device = result.device?.type?.toLowerCase();
    let deviceType: DeviceType = 'desktop';
    if (device === 'mobile' || device === 'wearable') deviceType = 'mobile';
    else if (device === 'tablet' || device === 'smarttv') deviceType = 'tablet';
    return {
      deviceType,
      browser: result.browser?.name || 'Unknown',
      os: result.os?.name || 'Unknown',
    };
  } catch {
    return FALLBACK;
  }
}
