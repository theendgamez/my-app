export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Serve static assets directly
    if (url.pathname.startsWith('/static/') || 
        url.pathname.startsWith('/_next/') ||
        url.pathname.includes('.')) {
      return env.ASSETS.fetch(request);
    }
    
    // Otherwise, serve the app
    return env.ASSETS.fetch(`${url.origin}/_next/server/pages${url.pathname}${url.pathname.endsWith('/') ? 'index' : ''}.html`);
  }
};
