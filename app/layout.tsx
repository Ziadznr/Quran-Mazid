import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quran Mazid Reader Clone",
  description: "A dark Quran reader inspired by QuranMazid with search, audio, and font settings.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
