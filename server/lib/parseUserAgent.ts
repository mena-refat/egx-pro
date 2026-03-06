// ua-parser-js is CJS; in ESM it may not have default export
import * as UAParserModule from 'ua-parser-js';
const UAParser = (UAParserModule as { default?: typeof UAParserModule }).default ?? UAParserModule;

export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export function parseUserAgent(userAgent: string | undefined): {
  deviceType: DeviceType;
  browser: string;
  os: string;
} {
  const ua = userAgent || '';
  const Parser = (UAParser as unknown) as new (ua: string) => { getResult: () => { device?: { type?: string }; browser?: { name?: string }; os?: { name?: string } } };
  const result = new Parser(ua).getResult();
  const device = result.device?.type?.toLowerCase();
  let deviceType: DeviceType = 'desktop';
  if (device === 'mobile' || device === 'wearable') deviceType = 'mobile';
  else if (device === 'tablet' || device === 'smarttv') deviceType = 'tablet';

  const browser = result.browser?.name || 'Unknown';
  const os = result.os?.name || 'Unknown';
  return { deviceType, browser, os };
}
