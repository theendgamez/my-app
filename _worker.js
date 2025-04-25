import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

/**
 * The DEBUG flag will do two things:
 * 1. We will skip caching on the edge, which makes it easier to debug
 * 2. We will return more detailed error messages to the client
 */
const DEBUG = false;

/**
 * Handle all requests to your Cloudflare Workers application
 */
export default {
  async fetch(request, env, ctx) {
    try {
      // Get the URL from the request
      const url = new URL(request.url);
      let options = {};

      // If in DEBUG mode, add debugging options
      if (DEBUG) {
        options.cacheControl = {
          bypassCache: true,
        };
      }

      // Handle API routes by passing through to Next.js
      if (url.pathname.startsWith('/api/')) {
        return fetch(request);
      }

      // Use KV asset handler to serve static assets
      return await getAssetFromKV({
        request,
        waitUntil: ctx.waitUntil.bind(ctx),
      }, options);
    } catch (e) {
      // Return error responses
      if (DEBUG) {
        return new Response(e.message || e.toString(), {
          status: 500,
        });
      }
      return new Response('Internal Error', { status: 500 });
    }
  },
};
