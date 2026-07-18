/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure rewrites to handle development API redirection to Express backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
