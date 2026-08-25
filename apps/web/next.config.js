/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['mohallmitr.s3.ap-south-1.amazonaws.com'],
    unoptimized: true,
  },
};

module.exports = nextConfig;
