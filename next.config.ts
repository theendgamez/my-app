/**
 * @type {import('next').NextConfig}
 */
const nextConfig: import('next').NextConfig = {
  experimental: {
    serverActions: {},
  },
  serverExternalPackages: ['bcrypt'],
  images: {
    unoptimized: true,
    domains: ['localhost'],
  },
  
  // Use hybrid rendering approach
  output: 'standalone',
  
  // Properly configure the build directory
  distDir: 'build',
  
  // Configure page extensions
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Enable strict mode for better error detection
  reactStrictMode: true,
  
  // Add custom error handling
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}
 
module.exports = nextConfig