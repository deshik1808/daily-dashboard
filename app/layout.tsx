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
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Project Status",
  },
};

export const viewport: Viewport = {
  themeColor: "#282725",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={courierPrime.variable}>
      <body className="antialiased">
        <div
          className="fixed inset-0 flex flex-col bg-bezel"
          style={{
            padding:
              "max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))",
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-window border border-ink bg-paper">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
