import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

const DEBUG = false;

// Inline Base64 favicon to serve as fallback if file not found
const FALLBACK_FAVICON = 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEhISDSEhITMnJyc0EhISDQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFBQUQHBwcMGRkZHukpKS7nFxccIVFRVBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEBAFHBwcVI2NjeH09PT///////7+/v/09PT/jo6O4hwcHFUQEBAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABYWFkCWlpbn//////Pz8//y8vL/9PT0/5aWlugWFhZBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAQBRwcHFSPj4/k/////8rKyv9ubm7/8/Pz/4+Pj+QcHBxVEBAQBQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABUVFUGXl5fp//////Ly8v/x8fH/9fX1/5eXl+kVFRVBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAQBRwcHFSPj4/k//////Ly8v/y8vL///////Dw8P+NjY3iHBwcVBAQEAUAAAAAAAAAAAAAAAAAAAAAAAAAABUVFUGXl5fp///////////+/v7////////////09PT/kZGR7hUVFUEAAAAAAAAAAAAAAAAAAAAAAAAAABAQEAUbGxtUjY2N4vT09P///////////////////////5KSkvc7OztSEBAQBQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVFRVBcHBwwZGRke6SkpL3Wlpadx0dHWQWFhZBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEhISDSEhITMfHx9SHBwcVQ8PDwsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAdHR0BFdXVwdPT08SWFhYRFNTU0RpaWkHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBQUEHTExMBVlZWUaenp7PlJSUxVZWVkMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ODgKVlZWSp6env+enp7/VlZWSjg4OAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABISEgCVlZWSp6env+enp7/VlZWSkhISAIAAAAAAAAAAAAAAAAAAAAA/n8AAPw/AAD4HwAA8A8AAPAPAADgBwAA4AcAAOAHAADgBwAA4AcAAPAPAAD4HwAA+B8AAPw/AAD+fwAA/v8AAA==';

const worker = {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      let options = {};

      if (DEBUG) {
        options.cacheControl = { bypassCache: true };
      }
      
      // Special handling for favicon.ico and robots.txt
      if (url.pathname === '/favicon.ico') {
        try {
          // Attempt to retrieve favicon from multiple possible locations
          const possiblePaths = [
            '/favicon.ico',                     // Root
            '/public/favicon.ico',              // Public dir
            '/.next/static/favicon.ico',        // Next.js static
            '/.next/server/public/favicon.ico'  // Another possible location
          ];
          
          for (const path of possiblePaths) {
            try {
              const faviconRequest = new Request(url.origin + path, request);
              return await getAssetFromKV(
                { request: faviconRequest, waitUntil: ctx.waitUntil.bind(ctx) },
                options
              );
            } catch {
              // Try next path
              continue;
            }
          }
          
          // If all attempts fail, return an inline favicon
          return new Response(
            Buffer.from(FALLBACK_FAVICON.split(',')[1], 'base64'),
            {
              headers: {
                'Content-Type': 'image/x-icon',
                'Cache-Control': 'public, max-age=86400'
              }
            }
          );
        } catch (err) {
          console.error('Favicon serving error:', err);
          // Return an empty favicon to prevent further requests
          return new Response('', {
            status: 204,
            headers: { 'Content-Type': 'image/x-icon' }
          });
        }
      }
      
      // Serve other static assets
      if (
        url.pathname.startsWith('/_next/') ||
        url.pathname.startsWith('/static/') ||
        url.pathname === '/robots.txt' ||
        url.pathname.match(/\.[a-zA-Z0-9]+$/) // any file with an extension
      ) {
        try {
          // Try to serve from the default bucket
          return await getAssetFromKV(
            { request, waitUntil: ctx.waitUntil.bind(ctx) },
            options
          );
        } catch (e) {
          // For robots.txt, return a simple default
          if (url.pathname === '/robots.txt') {
            return new Response('User-agent: *\nAllow: /', {
              headers: { 'Content-Type': 'text/plain' }
            });
          }
          throw e;
        }
      }

      // Handle API routes by passing through to Next.js
      if (url.pathname.startsWith('/api/')) {
        return fetch(request);
      }

      // Fallback: for all other paths, try to serve as regular page requests
      try {
        return await getAssetFromKV(
          { request, waitUntil: ctx.waitUntil.bind(ctx) },
          options
        );
      } catch {
        // If the page isn't found in KV, try to serve the index
        return await getAssetFromKV(
          {
            request: new Request(`${url.origin}/index.html`, request),
            waitUntil: ctx.waitUntil.bind(ctx),
          },
          options
        );
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
