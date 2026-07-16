import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // El límite por defecto es 1 MB; las fotos de personaje y activos
    // suben como multipart/form-data y lo superan fácilmente.
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
