import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    template: "%s | AgroMarket",
    default: "AgroMarket - Nigeria's Agricultural Marketplace & Digital Platform",
  },
  description:
    "Connecting farmers, agribusinesses, consumers, logistics providers, and agricultural experts across Nigeria.",
  keywords: [
    "AgroMarket",
    "Agriculture Nigeria",
    "Farm Produce Marketplace",
    "Agribusiness Nigeria",
    "Direct From Farm",
  ],
  authors: [{ name: "AgroMarket Team" }],
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#15803d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="relative flex min-h-screen flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
