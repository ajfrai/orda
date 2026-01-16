import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orda - Shared Menu Ordering",
  description: "Paste a restaurant menu PDF, get a shareable cart where friends can collaboratively build an order with automatic cost splitting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
