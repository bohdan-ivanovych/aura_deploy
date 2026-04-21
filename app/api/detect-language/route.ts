import { NextRequest, NextResponse } from 'next/server';

const LANG_TAG_TO_CODE: Record<string, string> = {
  uk: 'uk', ru: 'ru', es: 'es', fr: 'fr', de: 'de',
  pt: 'pt', it: 'it', pl: 'pl', tr: 'tr', ar: 'ar',
  zh: 'zh', ja: 'ja', ko: 'ko', hi: 'hi', nl: 'nl',
};

export async function GET(req: NextRequest) {
  const acceptLang = req.headers.get('accept-language') ?? '';

  const langs = acceptLang
    .split(',')
    .map(part => {
      const [rawTag, rawQ] = part.trim().split(';q=');
      const tag = (rawTag ?? '').trim().toLowerCase().split('-')[0];
      const q = parseFloat(rawQ ?? '1');
      return { tag, q: isNaN(q) ? 1 : q };
    })
    .sort((a, b) => b.q - a.q);

  let detected: string | null = null;
  for (const { tag } of langs) {
    if (tag !== 'en' && LANG_TAG_TO_CODE[tag]) {
      detected = LANG_TAG_TO_CODE[tag];
      break;
    }
  }

  return NextResponse.json({ detected }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
