import type { Metadata, Viewport } from "next";
import { Noto_Sans, Roboto } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  subsets: ["latin", "devanagari"],
  weight: ["400", "600", "700"],
  variable: "--font-noto-sans",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Fertigation Guard",
  description: "Smart pH-EC Monitoring & Autonomous Flush PWA",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1455D9",
};

import Providers from "@/components/Providers";
import Navigation from "@/components/Navigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${notoSans.variable} ${roboto.variable} font-body antialiased bg-base text-ink pb-20`}
      >
        <Providers>
          {children}
          <Navigation />
        </Providers>
      </body>
    </html>
  );
}
