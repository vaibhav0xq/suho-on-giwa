import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Suho",
  description: "Protected settlement and trust checks on GIWA Sepolia.",
  applicationName: "Suho",
  icons: {
    icon: "/icon.svg"
  }
};

const themeScript = `
try {
  var storedTheme = window.localStorage.getItem("suho-theme");
  document.documentElement.dataset.theme = storedTheme === "light" ? "light" : "dark";
} catch (_) {
  document.documentElement.dataset.theme = "dark";
}
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}