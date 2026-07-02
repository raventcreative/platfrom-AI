/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Puppeteer & Chromium adalah paket Node besar — jangan di-bundle Webpack,
  // biarkan di-require langsung dari node_modules saat route /api/pdf jalan.
  experimental: {
    serverComponentsExternalPackages: ['puppeteer', 'puppeteer-core'],
  },
};

export default nextConfig;
