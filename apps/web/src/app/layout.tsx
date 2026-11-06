import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap-grid.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "AddisGo | Bus travel, made simple",
  description:
    "Plan city and long-distance bus journeys across Addis Ababa and Ethiopia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
