import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Optimize images through Next.js Image component
  images: {
    domains: ['picsum.photos'], // Add domains you want to load images from
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Enable SWC minification for faster builds
  swcMinify: true,

  // Configure environment variables
  env: {
    // Add your environment variables here
  },

  // Configure redirects if needed
  async redirects() {
    return [];
  },

  // Configure rewrites if needed
  async rewrites() {
    return [];
  },

  // Configure headers if needed
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },

  // Configure webpack if needed
  webpack: (config, {}) => {
    // Add custom webpack configurations here if needed
    return config;
  },

  // Enable experimental features if needed
  experimental: {
    // appDir: true, // Enable if using the new app directory
    // serverActions: true,
    // serverComponentsExternalPackages: [],
  },

  // Configure TypeScript compiler options
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },

  // Configure ESLint
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },

  // Configure output directory
  distDir: '.next',

  // Configure powered by header
  poweredByHeader: false,

  // Configure compression
  compress: true,

  // Configure base path if your app is not hosted at the root
  // basePath: '',

  // Configure asset prefix for CDN
  // assetPrefix: '',

  // Configure trailing slash behavior
  trailingSlash: false,

  // Configure page extensions
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
};

export default nextConfig;