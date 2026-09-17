/** @type {import('next').NextConfig} */
const skipBuildChecks = process.env.NEXT_SKIP_BUILD_CHECKS === '1';

const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: skipBuildChecks,
  },
  typescript: {
    ignoreBuildErrors: skipBuildChecks,
  },
  experimental: skipBuildChecks ? { cpus: 1 } : undefined,
  images: {
    domains: ['mohallmitr.s3.ap-south-1.amazonaws.com'],
    unoptimized: true,
  },
};

module.exports = nextConfig;
