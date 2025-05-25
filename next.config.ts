/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  /* config options here */
   assetPrefix: process.env.NODE_ENV === 'production' ? 'https://your-cdn-domain.com' : undefined,
}
 
module.exports = nextConfig