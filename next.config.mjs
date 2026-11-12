/** @type {import('next').NextConfig} */

// The Supabase project hostname is derived from the configured project URL
// rather than hardcoded, so that this repository does not embed a specific
// project reference. Set NEXT_PUBLIC_SUPABASE_URL in .env.local.
const supabaseHostname = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!url) {
    return null
  }

  try {
    return new URL(url).hostname
  } catch {
    console.warn(
      "NEXT_PUBLIC_SUPABASE_URL is set but is not a valid URL, so Supabase images will not be optimised."
    )
    return null
  }
})()

const nextConfig = {
  // Bundling these with webpack breaks them, so they are required natively at
  // runtime instead:
  //  - jsonwebtoken resolves its signing dependencies at runtime and fails at
  //    import time with "Class extends value undefined".
  //  - @supabase/auth-helpers-* have a circular initialisation between
  //    CookieAuthStorageAdapter and its base class that only breaks once
  //    webpack rewrites the module graph. Both packages load correctly under
  //    plain Node, which is what this option restores.
  serverExternalPackages: [
    "@supabase/supabase-js",
    "@supabase/auth-helpers-nextjs",
    "@supabase/auth-helpers-shared",
    "jsonwebtoken",
  ],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      // Added only when a Supabase project is configured.
      ...(supabaseHostname
        ? [
            {
              protocol: "https",
              hostname: supabaseHostname,
            },
          ]
        : []),
    ],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ]
  },

  async redirects() {
    return [
      {
        source: "/login",
        destination: "/",
        permanent: true,
      },
      {
        source: "/signup",
        destination: "/",
        permanent: true,
      },
      {
        source: "/auth",
        destination: "/",
        permanent: false,
      },
    ]
  },

  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  trailingSlash: false,
  generateEtags: true,

  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
          },
        },
      }
    }

    return config
  },
}

export default nextConfig
