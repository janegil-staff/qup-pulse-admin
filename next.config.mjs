// localpulse-admin/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxy /api/* to the deployed API. The browser only ever talks to this
  // Next server (same origin), so there's no CORS preflight — Next forwards
  // the request server-side. Point the client at NEXT_PUBLIC_API_URL=/api.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://lionfish-app-ed6lo.ondigitalocean.app/api/:path*',
      },
    ];
  },
};

export default nextConfig;
