import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Song Wordle",
  description: "Errate den Song anhand kurzer Audio-Snippets!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0a0a0a]">{children}</body>
    </html>
  );
}
