import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Chakra_Petch } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LUNARMATCH 2.0 // Deep-Space Telemetry & Multi-Modal Registration",
  description:
    "ISRO/NASA Deep Space Network mission console — Chandrayaan-2 TMC-2 ⇄ OHRC multi-modal registration, photometric correction, 3D DEM synthesis and elevation profiling of the lunar south pole.",
  keywords: ["lunar", "chandrayaan-2", "registration", "photogrammetry", "ISRO", "deep space network", "Shackleton crater"],
  openGraph: {
    title: "LUNARMATCH 2.0 — Deep Space Mission Console",
    description: "Deep-space telemetry & multi-modal registration over the lunar south pole.",
    type: "website",
  },
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#04060a"/><circle cx="16" cy="16" r="8" fill="none" stroke="#2dd9ec" stroke-width="2"/><ellipse cx="16" cy="16" rx="13" ry="4.5" fill="none" stroke="#46e08f" stroke-width="1.4" transform="rotate(-24 16 16)"/><circle cx="27" cy="10.5" r="1.8" fill="#46e08f"/></svg>`
          ),
        type: "image/svg+xml",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#04060a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${jetbrains.variable} ${chakra.variable} font-mono antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
