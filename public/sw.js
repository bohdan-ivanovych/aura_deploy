if(!self.define){let e,s={};const a=(a,c)=>(a=new URL(a+".js",c).href,s[a]||new Promise(s=>{if("document"in self){const e=document.createElement("script");e.src=a,e.onload=s,document.head.appendChild(e)}else e=a,importScripts(a),s()}).then(()=>{let e=s[a];if(!e)throw new Error(`Module ${a} didn’t register its module`);return e}));self.define=(c,n)=>{const t=e||("document"in self?document.currentScript.src:"")||location.href;if(s[t])return;let i={};const r=e=>a(e,t),f={module:{uri:t},exports:i,require:r};s[t]=Promise.all(c.map(e=>f[e]||r(e))).then(e=>(n(...e),i))}}define(["./workbox-f1770938"],function(e){"use strict";importScripts(),self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"/_next/static/chunks/1966.1560d0f43ac9a41a.js",revision:"1560d0f43ac9a41a"},{url:"/_next/static/chunks/3899.cf10152d8085e352.js",revision:"cf10152d8085e352"},{url:"/_next/static/chunks/4899-6326be4212212dea.js",revision:"6326be4212212dea"},{url:"/_next/static/chunks/4bd1b696-bf5e0dbacfa5baef.js",revision:"bf5e0dbacfa5baef"},{url:"/_next/static/chunks/51749ec1.8e95d511c6526307.js",revision:"8e95d511c6526307"},{url:"/_next/static/chunks/6796.fada690f04a866c4.js",revision:"fada690f04a866c4"},{url:"/_next/static/chunks/7156-95a6181bfca29586.js",revision:"95a6181bfca29586"},{url:"/_next/static/chunks/7168-e18c1b458cb3f6d0.js",revision:"e18c1b458cb3f6d0"},{url:"/_next/static/chunks/7631-c5cfd277b592cab7.js",revision:"c5cfd277b592cab7"},{url:"/_next/static/chunks/8409-baa9df2477416543.js",revision:"baa9df2477416543"},{url:"/_next/static/chunks/8928-3455cd6d61faf5d1.js",revision:"3455cd6d61faf5d1"},{url:"/_next/static/chunks/9184-7fd04670fc634cbf.js",revision:"7fd04670fc634cbf"},{url:"/_next/static/chunks/9984-fb9dba8c335dba70.js",revision:"fb9dba8c335dba70"},{url:"/_next/static/chunks/aaea2bcf-6ef6136cdc77c985.js",revision:"6ef6136cdc77c985"},{url:"/_next/static/chunks/app/_global-error/page-fbc72ce7289dcffc.js",revision:"fbc72ce7289dcffc"},{url:"/_next/static/chunks/app/_not-found/page-4c741bdbb409bc1c.js",revision:"4c741bdbb409bc1c"},{url:"/_next/static/chunks/app/chat/page-4729baa3cf24bf1b.js",revision:"4729baa3cf24bf1b"},{url:"/_next/static/chunks/app/flashcards/page-21b64d956cff3575.js",revision:"21b64d956cff3575"},{url:"/_next/static/chunks/app/flashcards/practice/page-412c051731846e11.js",revision:"412c051731846e11"},{url:"/_next/static/chunks/app/layout-d4091070eddea244.js",revision:"d4091070eddea244"},{url:"/_next/static/chunks/app/page-6e043a83debcfa15.js",revision:"6e043a83debcfa15"},{url:"/_next/static/chunks/app/room/%5Bid%5D/page-ae5946f8728a1387.js",revision:"ae5946f8728a1387"},{url:"/_next/static/chunks/app/settings/page-c8bf1d8e6bafb7b4.js",revision:"c8bf1d8e6bafb7b4"},{url:"/_next/static/chunks/app/skill-tree/page-f0b9a89763d57e22.js",revision:"f0b9a89763d57e22"},{url:"/_next/static/chunks/b536a0f1.dd9d67838e38166c.js",revision:"dd9d67838e38166c"},{url:"/_next/static/chunks/bd904a5c.1d3a04ad6f02a255.js",revision:"1d3a04ad6f02a255"},{url:"/_next/static/chunks/framework-a7f7b4d2dfa5296c.js",revision:"a7f7b4d2dfa5296c"},{url:"/_next/static/chunks/main-64560ca7ec571857.js",revision:"64560ca7ec571857"},{url:"/_next/static/chunks/main-app-56ad96b60fa09b32.js",revision:"56ad96b60fa09b32"},{url:"/_next/static/chunks/next/dist/client/components/builtin/app-error-fbc72ce7289dcffc.js",revision:"fbc72ce7289dcffc"},{url:"/_next/static/chunks/next/dist/client/components/builtin/forbidden-fbc72ce7289dcffc.js",revision:"fbc72ce7289dcffc"},{url:"/_next/static/chunks/next/dist/client/components/builtin/global-error-a361cac7f134605e.js",revision:"a361cac7f134605e"},{url:"/_next/static/chunks/next/dist/client/components/builtin/not-found-fbc72ce7289dcffc.js",revision:"fbc72ce7289dcffc"},{url:"/_next/static/chunks/next/dist/client/components/builtin/unauthorized-fbc72ce7289dcffc.js",revision:"fbc72ce7289dcffc"},{url:"/_next/static/chunks/polyfills-42372ed130431b0a.js",revision:"846118c33b2c0e922d7b3a7676f81f6f"},{url:"/_next/static/chunks/webpack-20552ea2bd6ad2bb.js",revision:"20552ea2bd6ad2bb"},{url:"/_next/static/css/e836e00f1af4ec3e.css",revision:"e836e00f1af4ec3e"},{url:"/_next/static/media/1d4eaed977255102-s.woff2",revision:"b2ac789bfd3a250ecb1f0d1bc8002cb6"},{url:"/_next/static/media/f3f7e95f2dbc4fe4-s.p.woff2",revision:"26b4b6557e9db18aab82adad3e2df080"},{url:"/_next/static/stmZNIV8KxAUqsk9l8iuS/_buildManifest.js",revision:"f8639e899e0aa0642035286f8bdbf732"},{url:"/_next/static/stmZNIV8KxAUqsk9l8iuS/_ssgManifest.js",revision:"b6652df95db52feb4daf4eca35380933"},{url:"/file.svg",revision:"d09f95206c3fa0bb9bd9fefabfd0ea71"},{url:"/globe.svg",revision:"2aaafa6a49b6563925fe440891e32717"},{url:"/manifest.json",revision:"ee8a51aaeda35b0c8c5af4d7085fa56f"},{url:"/next.svg",revision:"8e061864f388b47f33a1c3780831193e"},{url:"/vercel.svg",revision:"c0af2f507b369b085b35ef4bbe3bcf1e"},{url:"/window.svg",revision:"a2760511c65806022ad20adf74370ff3"}],{ignoreURLParametersMatching:[/^utm_/,/^fbclid$/]}),e.cleanupOutdatedCaches(),e.registerRoute("/",new e.NetworkFirst({cacheName:"start-url",plugins:[{cacheWillUpdate:async({response:e})=>e&&"opaqueredirect"===e.type?new Response(e.body,{status:200,statusText:"OK",headers:e.headers}):e}]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,new e.CacheFirst({cacheName:"google-fonts-webfonts",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:31536e3})]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,new e.StaleWhileRevalidate({cacheName:"google-fonts-stylesheets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800})]}),"GET"),e.registerRoute(/\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,new e.StaleWhileRevalidate({cacheName:"static-font-assets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800})]}),"GET"),e.registerRoute(/\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,new e.StaleWhileRevalidate({cacheName:"static-image-assets",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:2592e3})]}),"GET"),e.registerRoute(/\/_next\/static.+\.js$/i,new e.CacheFirst({cacheName:"next-static-js-assets",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\/_next\/image\?url=.+$/i,new e.StaleWhileRevalidate({cacheName:"next-image",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:mp3|wav|ogg)$/i,new e.CacheFirst({cacheName:"static-audio-assets",plugins:[new e.RangeRequestsPlugin,new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:mp4|webm)$/i,new e.CacheFirst({cacheName:"static-video-assets",plugins:[new e.RangeRequestsPlugin,new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:js)$/i,new e.StaleWhileRevalidate({cacheName:"static-js-assets",plugins:[new e.ExpirationPlugin({maxEntries:48,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:css|less)$/i,new e.StaleWhileRevalidate({cacheName:"static-style-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\/_next\/data\/.+\/.+\.json$/i,new e.StaleWhileRevalidate({cacheName:"next-data",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:json|xml|csv)$/i,new e.NetworkFirst({cacheName:"static-data-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(({sameOrigin:e,url:{pathname:s}})=>!(!e||s.startsWith("/api/auth/callback")||!s.startsWith("/api/")),new e.NetworkFirst({cacheName:"apis",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:16,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(({request:e,url:{pathname:s},sameOrigin:a})=>"1"===e.headers.get("RSC")&&"1"===e.headers.get("Next-Router-Prefetch")&&a&&!s.startsWith("/api/"),new e.NetworkFirst({cacheName:"pages-rsc-prefetch",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(({request:e,url:{pathname:s},sameOrigin:a})=>"1"===e.headers.get("RSC")&&a&&!s.startsWith("/api/"),new e.NetworkFirst({cacheName:"pages-rsc",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(({url:{pathname:e},sameOrigin:s})=>s&&!e.startsWith("/api/"),new e.NetworkFirst({cacheName:"pages",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(({sameOrigin:e})=>!e,new e.NetworkFirst({cacheName:"cross-origin",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:3600})]}),"GET"),self.__WB_DISABLE_DEV_LOGS=!0});


/**
 * ── Aura Custom Service Worker Logic ──────────────────────────────────
 * 
 * ARCHITECTURE: Workbox (above) handles precaching of build-time assets.
 * The custom handlers below cover app-specific caching strategies:
 * 
 * | Resource Type     | Strategy              | WHY                                       |
 * |-------------------|-----------------------|-------------------------------------------|
 * | TTS Audio         | Cache-First           | Audio is immutable, expensive to re-fetch  |
 * | Stats/SkillTree   | Stale-While-Revalidate| Show cached data instantly, refresh in bg  |
 * | API (other)       | Network-First         | Fresh data is critical for chat/actions    |
 * | Navigation        | Network-First         | Always show latest page, fallback offline  |
 * | Static assets     | (handled by Workbox)  | Precached + CacheFirst via Workbox above   |
 * 
 * Cache size limits prevent unbounded storage growth on user devices.
 */

const CACHE_VERSION = 'v3';
const STATIC_CACHE  = `aura-static-${CACHE_VERSION}`;
const API_CACHE     = `aura-api-${CACHE_VERSION}`;
const TTS_CACHE     = `aura-tts-${CACHE_VERSION}`;
const CONTENT_CACHE = `aura-content-${CACHE_VERSION}`;

/* Critical first-screen resources to pre-cache at install */
const CRITICAL_PRECACHE = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/aura-192.png',
  '/icons/aura-512.png',
];

/* Max entries per cache — prevents unbounded storage growth */
const CACHE_LIMITS = {
  static: 128,
  api: 32,
  tts: 64,
  content: 48,
};

/**
 * Enforce cache size limit by evicting oldest entries.
 * WHY: Without limits, caches grow indefinitely on user devices,
 * eventually consuming significant storage (especially TTS audio).
 */
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await Promise.all(
      keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key))
    );
  }
}

/* ── Install: Pre-cache critical first-screen assets ──────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(CRITICAL_PRECACHE))
  );
  self.skipWaiting();
});

/* ── Activate: Clean up old cache versions ────────────────────────── */
/* WHY: When CACHE_VERSION bumps, old caches are stale and waste space.
   We keep only current-version caches + Workbox caches (prefixed). */
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, API_CACHE, TTS_CACHE, CONTENT_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !currentCaches.includes(k) && !k.startsWith('workbox-') && !k.startsWith('next-'))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: Route-based caching strategies ────────────────────────── */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  /* Skip non-GET requests (POST/PUT/DELETE should always go to network) */
  if (event.request.method !== 'GET') return;

  /* ── TTS Audio: Cache-First ────────────────────────────────────── */
  /* WHY: TTS audio is deterministic (same text → same audio).
     Hitting cache avoids expensive Azure API calls and latency. */
  if (url.pathname.startsWith('/api/tts')) {
    event.respondWith(
      caches.open(TTS_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request.clone());
          if (response.ok) {
            cache.put(event.request, response.clone());
            trimCache(TTS_CACHE, CACHE_LIMITS.tts);
          }
          return response;
        } catch {
          return new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  /* ── Stats & Skill Tree: Stale-While-Revalidate ────────────────── */
  /* WHY: Users see their stats INSTANTLY from cache (no loading spinner),
     while fresh data is fetched in the background. Best of both worlds. */
  if (url.pathname.startsWith('/api/user/stats') || url.pathname.startsWith('/api/skill-tree')) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        const networkFetch = fetch(event.request.clone()).then((response) => {
          if (response.ok) {
            cache.put(event.request, response.clone());
            trimCache(API_CACHE, CACHE_LIMITS.api);
          }
          return response;
        }).catch(() => cached || new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }));
        return cached || networkFetch;
      })
    );
    return;
  }

  /* ── Other API routes: Network-First with timeout ──────────────── */
  /* WHY: Chat, flashcards, friends data must be fresh.
     10s timeout prevents hanging on flaky connections. */
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          const response = await fetch(event.request.clone(), { signal: controller.signal });
          clearTimeout(timeoutId);
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch {
          const cached = await cache.match(event.request);
          return cached || new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })
    );
    return;
  }

  /* ── Navigation: Network-First + offline fallback ──────────────── */
  /* WHY: Pages should always show the latest server-rendered version.
     If offline, show the cached offline page instead of browser error. */
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/offline.html').then((r) => r || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'aura-sync-xp') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SYNC_COMPLETE' }));
      })
    );
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Aura', {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { url: data.url || '/' },
        vibrate: [100, 50, 100],
      })
    );
  } catch (e) {
    console.error('[SW] Push parse error', e);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
