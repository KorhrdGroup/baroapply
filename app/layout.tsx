import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../styles/base.css";
import "../styles/layout.css";
import "../styles/components.css";
import Footer from "./components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "한평생그룹 실습섭외신청",
  description: "한평생그룹 실습섭외신청",
  openGraph: {
    title: "한평생그룹 실습섭외신청",
    description: "한평생그룹 실습섭외신청",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "한평생그룹 실습섭외신청",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "한평생그룹 실습섭외신청",
    description: "한평생그룹 실습섭외신청",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Footer />
      </body>
    </html>
  );
}
