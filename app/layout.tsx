import type React from "react"
import type { Metadata, Viewport } from "next"
import { Vazirmatn } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-vazirmatn",
  preload: true,
})

export const metadata: Metadata = {
  title: "کاغذ آنلاین - پلتفرم حرفه‌ای نوشتن و اشتراک‌گذاری اسناد",
  description:
    "پلتفرم آنلاین برای نوشتن، ویرایش و اشتراک‌گذاری اسناد با پشتیبانی کامل از زبان فارسی و امکانات پیشرفته همکاری. میلیون‌ها نویسنده از سراسر جهان به ما اعتماد کرده‌اند.",
  keywords: [
    "نوشتن آنلاین",
    "اشتراک‌گذاری اسناد",
    "ویرایشگر متن",
    "همکاری آنلاین",
    "فارسی",
    "کاغذ آنلاین",
    "online writing",
    "document sharing",
    "persian editor",
    "collaboration platform",
    "text editor",
    "document management",
  ].join(", "),
  authors: [{ name: "کاغذ آنلاین", url: "https://kaghazonline.com" }],
  creator: "کاغذ آنلاین",
  publisher: "کاغذ آنلاین",
  robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "https://kaghazonline.com",
    siteName: "کاغذ آنلاین",
    title: "کاغذ آنلاین - پلتفرم حرفه‌ای نوشتن و اشتراک‌گذاری اسناد",
    description: "پلتفرم آنلاین برای نوشتن، ویرایش و اشتراک‌گذاری اسناد با پشتیبانی کامل از زبان فارسی",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "کاغذ آنلاین - پلتفرم نوشتن حرفه‌ای",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "کاغذ آنلاین - پلتفرم حرفه‌ای نوشتن",
    description: "پلتفرم آنلاین برای نوشتن، ویرایش و اشتراک‌گذاری اسناد",
    images: ["/og-image.png"],
    creator: "@kaghazonline",
  },
  alternates: {
    canonical: "https://kaghazonline.com",
    languages: {
      "fa-IR": "https://kaghazonline.com",
      "en-US": "https://kaghazonline.com/en",
    },
  },
  // Search console verification tokens come from the environment so that real
  // tokens are never committed. Each one is omitted when unset.
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.YANDEX_SITE_VERIFICATION
      ? { yandex: process.env.YANDEX_SITE_VERIFICATION }
      : {}),
  },
  category: "productivity",
  classification: "Business",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://kaghazonline.com"),
  generator: "Next.js",
  applicationName: "کاغذ آنلاین",
  appleWebApp: {
    capable: true,
    title: "کاغذ آنلاین",
    statusBarStyle: "default",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#001D51" }],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#001D51",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="کاغذ آنلاین" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#001D51" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      </head>
      <body className={`${vazirmatn.className} antialiased bg-white text-gray-900 overflow-x-hidden`} suppressHydrationWarning={true}>
        <div id="root" className="min-h-screen">
          {children}
        </div>
        <div id="modal-root" />
        <div id="tooltip-root" />
        <div id="toast-root" />
        <Toaster />
      </body>
    </html>
  )
}
