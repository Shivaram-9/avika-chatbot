import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avika - AI Emotional Support Companion",
  description: "An emotionally intelligent chatbot that responds with empathy and calm guidance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-white antialiased">{children}</body>
    </html>
  );
}

