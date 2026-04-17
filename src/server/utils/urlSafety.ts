import axios from 'axios';
import { lookup as dnsLookup } from 'dns/promises';

export class UnsafeUrlError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const MAX_REDIRECTS = 5;

const PRIVATE_HOST_PATTERNS = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
];

export function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase();

  if (
    host === 'localhost'
    || host === '0.0.0.0'
    || host === '::1'
    || host.endsWith('.local')
    || host.endsWith('.internal')
  ) {
    return true;
  }

  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
    return true;
  }

  const match172 = host.match(/^172\.(\d+)\./);
  if (match172) {
    const second = Number(match172[1]);
    if (second >= 16 && second <= 31) {
      return true;
    }
  }

  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) {
    return true;
  }

  return false;
}

export function assertSafePublicUrl(url: string | URL): URL {
  const parsed = url instanceof URL ? url : new URL(url);

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new UnsafeUrlError(400, 'Kun http og https er tilladt');
  }

  if (isPrivateHostname(parsed.hostname)) {
    throw new UnsafeUrlError(400, 'Private eller lokale adresser er ikke tilladt');
  }

  return parsed;
}

export async function fetchWithSafeRedirects(url: string) {
  let currentUrl = assertSafePublicUrl(url);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    try {
      // Resolve hostname to IPs and reject private/loopback ranges to prevent SSRF via public-looking hostnames
      const resolved = await dnsLookup(currentUrl.hostname, { all: true }).catch(() => [] as { address: string }[]);
      for (const { address } of resolved) {
        if (isPrivateHostname(address)) {
          throw new UnsafeUrlError(400, 'Private eller lokale adresser er ikke tilladt');
        }
      }

      const response = await axios.get<string>(currentUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'da-DK,da;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        maxRedirects: 0,
        responseType: 'text',
        timeout: 10000,
        validateStatus: (status) => status >= 200 && status < 400,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.location;
        if (!location) {
          throw new UnsafeUrlError(502, 'Kilden sendte en ugyldig viderestilling');
        }

        if (redirectCount === MAX_REDIRECTS) {
          throw new UnsafeUrlError(502, 'Kilden viderestillede for mange gange');
        }

        currentUrl = assertSafePublicUrl(new URL(location, currentUrl));
        continue;
      }

      return { response, finalUrl: currentUrl };
    } catch (error: any) {
      if (error instanceof UnsafeUrlError) {
        throw error;
      }

      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        throw new UnsafeUrlError(504, 'Kilden brugte for lang tid på at svare');
      }

      if (axios.isAxiosError(error) && (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' || error.code === 'ECONNREFUSED')) {
        throw new UnsafeUrlError(502, 'Kunne ikke oprette forbindelse til kilden');
      }

      if (axios.isAxiosError(error) && error.response?.status && error.response.status >= 400) {
        throw new UnsafeUrlError(502, 'Kilden kunne ikke bruges som opskrift');
      }

      throw new UnsafeUrlError(502, 'Kilden kunne ikke bruges som opskrift');
    }
  }

  throw new UnsafeUrlError(502, 'Kilden viderestillede for mange gange');
}
