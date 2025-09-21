/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  webpack: (config, { dev }) => {
    // 개발 모드에서만 폴링 활성화
    if (dev) {
      config.watchOptions = {
        poll: 1000, // 1초마다 파일 변경 확인
        aggregateTimeout: 300, // 다시 빌드하기 전 딜레이
      };
    }
    return config;
  },
};

export default nextConfig;

