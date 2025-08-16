/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['pdfjs-dist'],
  webpack: (config) => {   // ← 여기 webpack으로 수정
    config.module.rules.push({
      test: /pdf\.worker\.mjs$/,
      type: 'asset/resource',
    });
    return config;
  },
};

export default nextConfig;
