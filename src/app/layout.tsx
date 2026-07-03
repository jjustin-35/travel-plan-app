import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/ui/QueryProvider";
import { ServiceWorkerRegistrar } from "@/components/ui/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "旅路 — AI 行程規劃",
  description: "以 AI 為核心的旅遊行程規劃 App，輸入旅遊資訊，自動產生專屬行程。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "旅路",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#E97451",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="h-full">
      <body className="min-h-full bg-cream text-charcoal antialiased">
        <QueryProvider>
          <ServiceWorkerRegistrar />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
