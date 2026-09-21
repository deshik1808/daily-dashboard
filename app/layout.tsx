import type { Metadata, Viewport } from "next";
import { Courier_Prime } from "next/font/google";
import "./globals.css";

const courierPrime = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-courier-prime",
});

export const metadata: Metadata = {
  title: "Project Status Dashboard",
  description: "Daily progress tracker for Bio-Mining and MRF projects, Tirupati",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Project Status",
  },
};

export const viewport: Viewport = {
  themeColor: "#2d3936",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={courierPrime.variable}>
      <body className="antialiased">
        <div className="fixed inset-0 flex flex-col bg-bezel bg-bezel-grade p-[env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)] sm:p-[max(16px,env(safe-area-inset-top))_max(16px,env(safe-area-inset-right))_max(16px,env(safe-area-inset-bottom))_max(16px,env(safe-area-inset-left))]">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:rounded-window sm:border border-ink bg-paper shadow-none sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_18px_40px_-14px_rgba(0,0,0,0.6)]">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
