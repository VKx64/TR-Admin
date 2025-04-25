/** @type {import('next').NextConfig} */
const nextConfig = {
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
