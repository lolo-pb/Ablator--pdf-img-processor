import "./globals.css";
import type { Metadata } from "next";
import { SessionBatchProvider } from "./components/session-batch";

export const metadata: Metadata = {
  title: "Bank Reconciliation Platform",
  description: "Review and export bank reconciliation data extracted from PDFs and images.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><SessionBatchProvider>{children}</SessionBatchProvider></body>
    </html>
  );
}
