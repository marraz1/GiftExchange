import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Dovanų keitimasis", template: "%s · Dovanų keitimasis" },
  description: "Nemokamas slaptas dovanų keitimasis Kalėdoms, gimtadieniams ir kitoms progoms.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lt">
      <body className="min-h-screen antialiased">
        <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            🎁 Dovanų keitimasis
          </Link>
          <Link href="/new" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            + Nauja proga
          </Link>
        </header>
        <main className="mx-auto max-w-3xl px-4 pb-16">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 pb-8 text-center text-xs text-gray-500">
          <Link href="/privatumas" className="hover:underline">
            Privatumas
          </Link>{" "}
          ·{" "}
          <Link href="/recover" className="hover:underline">
            Pamiršau valdymo nuorodą
          </Link>
        </footer>
      </body>
    </html>
  );
}
