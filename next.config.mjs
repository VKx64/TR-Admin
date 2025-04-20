/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dbfleet.07130116.xyz',
        port: '',
        pathname: '/api/files/**',
      },
    ],
  },
};

export default nextConfig;
