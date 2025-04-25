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
        url.pathname.startsWith('/favicon.ico') ||
        url.pathname.startsWith('/robots.txt') ||
        url.pathname.match(/\.[a-zA-Z0-9]+$/) // any file with an extension
      ) {
        return await getAssetFromKV(
          { request, waitUntil: ctx.waitUntil.bind(ctx) },
          options
        );
      }

      // Handle API routes by passing through to Next.js
      if (url.pathname.startsWith('/api/')) {
        return fetch(request);
      }

      // Fallback: serve index.html (for SPA routes)
      return await getAssetFromKV(
        {
          request: new Request(`${url.origin}/index.html`, request),
          waitUntil: ctx.waitUntil.bind(ctx),
        },
        options
      );
    } catch (e) {
      if (DEBUG) {
        return new Response(e.message || e.toString(), { status: 500 });
      }
      return new Response('Internal Error', { status: 500 });
    }
  },
};

export default worker;
