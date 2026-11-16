import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@fontsource/unbounded/500.css";
import "@fontsource/unbounded/700.css";
import "@fontsource-variable/manrope";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Dovanų keitimasis", template: "%s · Dovanų keitimasis" },
  description: "Nemokamas slaptas dovanų keitimasis Kalėdoms, gimtadieniams ir kitoms progoms.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b1033" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lt">
      <body className="min-h-screen antialiased">
        <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
          <Link href="/" className="font-display text-base font-bold tracking-tight">
            <span className="aurora-text">Dovanų</span> keitimasis
          </Link>
          <Link href="/new" className="btn-secondary">
            Nauja proga
          </Link>
        </header>
        <main className="mx-auto max-w-3xl px-4 pb-16">{children}</main>
        <footer className="mx-auto flex max-w-3xl justify-center gap-6 px-4 pb-10 text-xs text-muted">
          <Link href="/privatumas" className="hover:text-ink">
            Privatumas
          </Link>
          <Link href="/recover" className="hover:text-ink">
            Pamiršau valdymo nuorodą
          </Link>
        </footer>
      </body>
    </html>
  );
}
