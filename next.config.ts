import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config: { resolve: { fallback: { fs: boolean; path: boolean; }; }; }) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
};
export default nextConfig;

