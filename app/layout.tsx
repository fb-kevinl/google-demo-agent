import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@fastbreak-amateur/fb-toolkit/styles/entry.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fastbreak AI Demo",
  description: "Watch a live Fastbreak AI demo. An AI agent searches Google while you watch.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#fafafa] text-foreground">{children}</body>
    </html>
  );
}
