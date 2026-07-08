import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hallenverwaltung St. Valentin",
  description: "Technisches Grundgerüst für die Hallenverwaltung St. Valentin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
