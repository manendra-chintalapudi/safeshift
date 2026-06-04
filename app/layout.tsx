import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SafeShift - Parametric Insurance for Porter Delivery Partners",
  description: "Auto-pay when rain, AQI bans or cyclones stop your work. India's first parametric insurance for LCV delivery partners on Porter.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#F07820",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SafeShift" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="preload" as="image" href="/logo.png" />
        <link rel="preload" as="image" href="/hero-illustration.jpg" />
      </head>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
