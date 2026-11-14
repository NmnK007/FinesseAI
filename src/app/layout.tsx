import { LanguageProvider } from '@/components/finance/Language';
import type { Metadata, Viewport } from "next";
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#CCFF5E",
};

export const metadata: Metadata = {
  title: "UdyamAI — MSME Financial Health, in real time.",
  description:
    "Authorized financial evidence and clearly labelled synthetic demonstrations. Informative prototype; no live lender offers.",
  metadataBase: new URL("https://udyam.credit"),
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/udyamai.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
  openGraph: {
    title: "UdyamAI — MSME Financial Health, in real time.",
    description:
      "Authorized financial evidence and clearly labelled synthetic demonstrations. Informative prototype; no live lender offers.",
    type: "website",
    images: ["/udyamai.svg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" >
      <body className="min-h-screen bg-black font-sans text-base-50 antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
