import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/pokedex",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
