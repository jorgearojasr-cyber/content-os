import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Vercel Blob (put() simple, sin subida por partes) rechaza archivos de
    // más de 4.5 MB — este límite solo necesita cubrir eso más el overhead
    // de multipart/form-data.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
