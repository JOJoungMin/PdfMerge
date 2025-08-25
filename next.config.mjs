/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['pdfjs-dist'],
  webpack: (config) => {   // ← 여기 webpack으로 수정
    config.module.rules.push({
      test: /pdf\.worker\.mjs$/,
      type: 'asset/resource',
    });
    return config;
  },
  images: {
    domains: ['lh3.googleusercontent.com'],
  }
};

export default nextConfig;
