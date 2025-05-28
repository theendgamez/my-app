import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Experimental optimizeCss is removed or not present, which is correct.
  // If there was an experimental block, it would look like:
  // experimental: {
  //   // optimizeCss: true, // This line would be removed or set to false
  // },
};

export default nextConfig;