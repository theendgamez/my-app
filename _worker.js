import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

const DEBUG = false;

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
            const publicRequest = new Request(url.origin + '/public' + url.pathname, request);
            return await getAssetFromKV(
              { request: publicRequest, waitUntil: ctx.waitUntil.bind(ctx) },
              options
            );
          }
          throw e;
        }
      }

      // Handle API routes by passing through to Next.js
      if (url.pathname.startsWith('/api/')) {
        return fetch(request);
      }

      // Fallback: serve Next.js SSR HTML for dynamic routes
      // Try .next/server/app{pathname}/index.html or .next/server/app{pathname}.html
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
        } catch (e) {
          // Try next path
        }
      }

      // If all else fails, return 404
      return new Response('Not Found', { status: 404 });
    } catch (e) {
      if (DEBUG) {
        return new Response(e.message || e.toString(), { status: 500 });
      }
      return new Response('Internal Error', { status: 500 });
    }
  },
};

export default worker;
