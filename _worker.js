import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

const DEBUG = true;

const worker = {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      let options = {};

      if (DEBUG) {
        options.cacheControl = { bypassCache: true };
      }

      // Serve static assets (including favicon.ico, robots.txt, etc.)
      if (
        url.pathname.startsWith('/_next/') ||
        url.pathname.startsWith('/static/') ||
        url.pathname === '/favicon.ico' ||
        url.pathname === '/robots.txt' ||
        url.pathname.match(/\.[a-zA-Z0-9]+$/)
      ) {
        try {
          return await getAssetFromKV(
            { request, waitUntil: ctx.waitUntil.bind(ctx) },
            options
          );
        } catch (e) {
          if (url.pathname === '/favicon.ico' || url.pathname === '/robots.txt') {
            try {
              const publicRequest = new Request(url.origin + '/public' + url.pathname, request);
              return await getAssetFromKV(
                { request: publicRequest, waitUntil: ctx.waitUntil.bind(ctx) },
                options
              );
            } catch {
              // Final fallback for favicon.ico: return a valid empty icon
              if (url.pathname === '/favicon.ico') {
                return new Response(
                  Uint8Array.from([
                    0x00,0x00,0x01,0x00,0x01,0x00,0x10,0x10,0x00,0x00,0x01,0x00,0x04,0x00,0x28,0x01,
                    0x00,0x00,0x16,0x00,0x00,0x00,0x28,0x00,0x00,0x00,0x10,0x00,0x00,0x00,0x20,0x00,
                    0x00,0x00,0x01,0x00,0x04,0x00,0x00,0x00,0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x00,
                    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
                    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
                    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
                    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
                    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
                  ]),
                  {
                    headers: {
                      'Content-Type': 'image/x-icon',
                      'Cache-Control': 'public, max-age=86400'
                    }
                  }
                );
              }
              // robots.txt fallback
              if (url.pathname === '/robots.txt') {
                return new Response('User-agent: *\nAllow: /', {
                  headers: { 'Content-Type': 'text/plain' }
                });
              }
            }
          }
          throw e;
        }
      }

      // Handle API routes by passing through to Next.js
      if (url.pathname.startsWith('/api/')) {
        return fetch(request);
      }

      // Fallback: serve Next.js SSR HTML for dynamic routes
      let pagePath = url.pathname.endsWith('/')
        ? `/index.html`
        : `.html`;

      let tryPaths = [
        `/.next/server/app${url.pathname}${pagePath}`,
        `/.next/server/app${url.pathname}.html`,
        `/.next/server/pages${url.pathname}${pagePath}`,
        `/.next/server/pages${url.pathname}.html`
      ];

      for (const path of tryPaths) {
        try {
          const pageRequest = new Request(url.origin + path, request);
          return await getAssetFromKV(
            { request: pageRequest, waitUntil: ctx.waitUntil.bind(ctx) },
            options
          );
        } catch {
          // Try next path
        }
      }

      // As a last resort, try serving /index.html from the static bucket
      try {
        const indexRequest = new Request(url.origin + '/index.html', request);
        return await getAssetFromKV(
          { request: indexRequest, waitUntil: ctx.waitUntil.bind(ctx) },
          options
        );
      } catch {
        // If not found, return 404
        return new Response('Not Found', { status: 404 });
      }
    } catch (e) {
      if (DEBUG) {
        return new Response(e.message || e.toString(), { status: 500 });
      }
      return new Response('Internal Error', { status: 500 });
    }
  },
};

export default worker;
