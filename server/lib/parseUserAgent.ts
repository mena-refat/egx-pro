import UAParser from 'ua-parser-js';

export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export function parseUserAgent(userAgent: string | undefined): {
  deviceType: DeviceType;
  browser: string;
  os: string;
} {
  const ua = userAgent || '';
  const result = new UAParser(ua).getResult();
  const device = result.device?.type?.toLowerCase();
  let deviceType: DeviceType = 'desktop';
  if (device === 'mobile' || device === 'wearable') deviceType = 'mobile';
  else if (device === 'tablet' || device === 'smarttv') deviceType = 'tablet';

  const browser = result.browser?.name || 'Unknown';
  const os = result.os?.name || 'Unknown';
  return { deviceType, browser, os };
}
