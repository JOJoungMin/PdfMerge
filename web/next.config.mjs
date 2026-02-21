/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },

  // /api/* 요청을 EC2 백엔드로 프록시 (Mixed Content 방지)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://3.34.97.68:3001/api/:path*',
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
