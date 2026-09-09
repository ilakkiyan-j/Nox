/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nox/database"],
  images: {
    domains: ["images.unsplash.com"],
  },
};

module.exports = nextConfig;
