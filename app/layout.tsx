import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orden - Shared Menu Ordering",
  description: "Paste a restaurant menu PDF, get a shareable order where friends can collaboratively build an order with automatic cost splitting.",
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
