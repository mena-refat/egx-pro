import { parseUserAgent } from './parseUserAgent.ts';
import { getGeoFromIp } from './geoFromIp.ts';

export type RefreshTokenCreateData = {
  token: string;
  userId: number;
  expiresAt: Date;
  deviceType: string;
  browser: string;
  os: string;
  ipAddress: string | null;
  city?: string;
  country?: string;
};

/**
 * Build payload for prisma.refreshToken.create. Uses ip and userAgent for device/geo.
 */
export async function buildRefreshTokenData(
  userId: number,
  refreshHash: string,
  expiresAt: Date,
  ip?: string | null,
  userAgent?: string | null
): Promise<RefreshTokenCreateData> {
  const device = parseUserAgent(userAgent ?? undefined);
  const geo = ip ? await getGeoFromIp(ip) : null;
  return {
    token: refreshHash,
    userId,
    expiresAt,
    deviceType: device.deviceType,
    browser: device.browser,
    os: device.os,
    ipAddress: ip ?? null,
    ...(geo && { city: geo.city, country: geo.country }),
  };
}
