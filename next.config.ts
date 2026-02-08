import type { NextConfig } from "next";

// Relative paths from project root — avoid Windows absolute paths (Turbopack: "windows imports are not implemented yet")
const onnxAliases = {
  "onnxruntime-web": "node_modules/onnxruntime-web/dist/ort.min.mjs",
  "onnxruntime-web/webgpu": "node_modules/onnxruntime-web/dist/ort.webgpu.min.mjs",
};

const nextConfig: NextConfig = {
  // Turbopack (Next.js 16 default for dev/build)
  turbopack: {
    resolveAlias: onnxAliases,
  },
  // Webpack (used when running with --webpack)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = { ...config.resolve.alias, ...onnxAliases };
    }
    return config;
  },
};

export default nextConfig;
