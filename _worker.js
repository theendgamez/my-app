import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

const DEBUG = false; // Set to false for production

const worker = {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      let options = {};

      if (DEBUG) {
        options.cacheControl = { bypassCache: true };
      } else {
        // Use caching in production
        options.cacheControl = {
          browserTTL: 60 * 60 * 24, // 1 day
          edgeTTL: 60 * 60 * 24 * 7, // 7 days
          bypassCache: false
        };
      }

      // Handle API routes specially
      if (url.pathname.startsWith('/api/')) {
        return fetch(request);
      }

      // Serve static assets (including favicon.ico, robots.txt, etc.)
      const assetPathRegex = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|webm|mp4|woff|woff2|ttf|otf|txt)$/;
      if (
        url.pathname.startsWith('/_next/') ||
        url.pathname.startsWith('/static/') ||
        url.pathname === '/favicon.ico' ||
        url.pathname === '/robots.txt' ||
        url.pathname.match(assetPathRegex)
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
                  new Uint8Array([0, 0, 1, 0, 1, 0, 16, 16, 0, 0, 1, 0, 4, 0, 40, 1, 0, 0, 22, 0, 0, 0]),
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
        }
      }

      // Try to serve the HTML page from KV
      try {
        // First try an exact match
        return await getAssetFromKV(
          { request, waitUntil: ctx.waitUntil.bind(ctx) },
          options
        );
      } catch (e) {
        // Then try the path + "/index.html"
        try {
          const url = new URL(request.url);
          if (!url.pathname.endsWith('/')) {
            url.pathname += '/';
          }
          url.pathname += 'index.html';
          const indexRequest = new Request(url.toString(), request);
          return await getAssetFromKV(
            { request: indexRequest, waitUntil: ctx.waitUntil.bind(ctx) },
            options
          );
        } catch {
          // Finally, try serving /index.html as a fallback for SPA routing
          try {
            const indexRequest = new Request(new URL('/index.html', request.url).toString(), request);
            const response = await getAssetFromKV(
              { request: indexRequest, waitUntil: ctx.waitUntil.bind(ctx) },
              options
            );
            return new Response(response.body, {
              ...response,
              status: 200,
              headers: {
                ...response.headers,
                'Content-Type': 'text/html; charset=UTF-8',
              }
            });
          } catch (e) {
            return new Response('Not Found', { status: 404 });
          }
        }
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
