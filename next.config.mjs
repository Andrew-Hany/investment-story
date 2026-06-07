/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/investment-story',
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
