import type { NextConfig } from "next";

const cabecalhosDeSeguranca = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // O PDF do certificado é gerado no servidor com esta biblioteca.
  serverExternalPackages: ["@react-pdf/renderer"],
  // Envio de imagens (logo, capa, assinatura) pelas ações do servidor.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Só desenvolvimento: repassa o Supabase local pelo próprio site quando o
  // navegador não alcança 127.0.0.1 (NEXT_PUBLIC_SUPABASE_VIA_SITE=1).
  async rewrites() {
    if (process.env.NEXT_PUBLIC_SUPABASE_VIA_SITE !== "1" || !process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
    return [{ source: "/supabase-local/:caminho*", destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/:caminho*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: cabecalhosDeSeguranca }];
  },
};

export default nextConfig;
