import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { themeBootstrap } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BudgetWise — personal budget tracking",
  description:
    "Track monthly income and expenses by category, see where the money goes, and get an AI financial health check on your actual numbers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
