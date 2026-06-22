import type { Metadata } from "next";
import { Baloo_2, Noto_Naskh_Arabic } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";

// Display / Latin / numbers — the chunky rounded "game" face.
const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

// Urdu body & labels — Naskh (legible at dense-UI sizes, unlike Nastaliq).
const notoNaskh = Noto_Naskh_Arabic({
  variable: "--font-urdu",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Hardware Shop CRM",
  description: "Hardware Shop CRM",
};

// Runs before paint: apply saved language + direction so there's no RTL flash.
const setLangScript = `(function(){try{var l=localStorage.getItem("lang");if(l==="ur"){document.documentElement.lang="ur";document.documentElement.dir="rtl";}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${baloo.variable} ${notoNaskh.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: setLangScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
