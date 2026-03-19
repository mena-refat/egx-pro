/**
 * Resolve city and country from IP using ip-api.com (free, 45 req/min).
 * Returns null for localhost/private IPs or on error.
 */
export async function getGeoFromIp(ip: string | undefined): Promise<{ city: string; country: string } | null> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return null;
  }
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,country`,
      { signal: AbortSignal.timeout(2000) }
    );
    const data = (await res.json()) as { status?: string; city?: string; country?: string };
    if (data?.status === 'success' && data.city != null && data.country != null) {
      return { city: data.city, country: data.country };
    }
  } catch {
    // ignore
  }
  return null;
}
