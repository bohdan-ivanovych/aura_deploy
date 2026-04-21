import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Country → native language map (most likely language for that country)
const COUNTRY_TO_LANG: Record<string, string> = {
  UA: 'uk', RU: 'ru', PL: 'pl', DE: 'de', FR: 'fr',
  ES: 'es', IT: 'it', PT: 'pt', BR: 'pt', TR: 'tr',
  JP: 'ja', CN: 'zh', TW: 'zh', KR: 'ko', IN: 'hi',
  SA: 'ar', AE: 'ar', EG: 'ar', MA: 'ar', IQ: 'ar',
  NL: 'nl', SE: 'sv', NO: 'no', DK: 'da', FI: 'fi',
  GR: 'el', CZ: 'cs', SK: 'sk', HU: 'hu', RO: 'ro',
  BG: 'bg', HR: 'hr', RS: 'sr', SI: 'sl', LT: 'lt',
  LV: 'lv', EE: 'et', BY: 'uk', MD: 'ro', GE: 'ka',
  AM: 'hy', AZ: 'az', KZ: 'kk', UZ: 'uz', ID: 'id',
  MY: 'ms', VN: 'vi', TH: 'th', PH: 'tl', MX: 'es',
  AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es',
  IL: 'he', IR: 'fa', PK: 'ur', BD: 'bn', LK: 'si',
  MM: 'my', KH: 'km', MN: 'mn', NP: 'ne',
  // English-speaking countries (will return 'en' effectively)
  US: 'en', GB: 'en', AU: 'en', CA: 'en', NZ: 'en',
  IE: 'en', ZA: 'en', NG: 'en', GH: 'en', KE: 'en',
};

export async function GET() {
  try {
    const hdrs = await headers();
    
    // Try Cloudflare country header first (fastest, no external call)
    const cfCountry = hdrs.get('cf-ipcountry');
    if (cfCountry && cfCountry !== 'XX' && COUNTRY_TO_LANG[cfCountry]) {
      return NextResponse.json({ country: cfCountry, language: COUNTRY_TO_LANG[cfCountry] });
    }

    // Try X-Forwarded-For header to get real IP
    const forwarded = hdrs.get('x-forwarded-for');
    const realIp = forwarded ? forwarded.split(',')[0].trim() : null;

    if (realIp && realIp !== '127.0.0.1' && !realIp.startsWith('::')) {
      // Use freeipapi.com — no key required, fast
      const res = await fetch(`https://freeipapi.com/api/json/${realIp}`, {
        signal: AbortSignal.timeout(1500),
        headers: { Accept: 'application/json' },
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const data = await res.json();
        const country = data.countryCode as string;
        const language = COUNTRY_TO_LANG[country] ?? null;
        return NextResponse.json({ country, language });
      }
    }

    return NextResponse.json({ country: null, language: null });
  } catch {
    return NextResponse.json({ country: null, language: null });
  }
}
