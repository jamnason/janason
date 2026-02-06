import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TranslationProvider } from "@/context/TranslationContext";
import { MonitorProvider } from "@/context/MonitorContext";
import AccessGuard from "@/components/AccessGuard";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "GitHub AI Plugin Hub",
    template: "%s | GitHub AI Plugin Hub"
  },
  description: "Discover, explore and translate the best AI plugins and tools on GitHub. A curated directory of artificial intelligence repositories.",
  keywords: ["AI plugins", "GitHub", "AI tools", "LLM", "DeepSeek", "Machine Learning", "Open Source"],
  authors: [{ name: "AI Hub Team" }],
  creator: "AI Hub Team",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://github-ai-hub.vercel.app",
    title: "GitHub AI Plugin Hub",
    description: "Discover the best AI plugins and tools on GitHub",
    siteName: "GitHub AI Plugin Hub",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitHub AI Plugin Hub",
    description: "Discover the best AI plugins and tools on GitHub",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MonitorProvider>
          <TranslationProvider>
            <AccessGuard>
              {children}
            </AccessGuard>
          </TranslationProvider>
        </MonitorProvider>
      </body>
    </html>
  );
}
