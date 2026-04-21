import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GigHub",
  description: "Escrow-backed freelance marketplace foundation"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

