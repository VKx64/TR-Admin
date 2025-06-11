/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zxky:8228',
        port: '',
        pathname: '/api/files/**',
      },
    ],
  },
};

export default nextConfig;
