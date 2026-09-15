import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const base = new URL(protocol + "://" + host);
  return {
    metadataBase: base,
    title: "Rencontre — Votre carnet de prospects IA",
    description:
      "Capturez vos rencontres sur salon, qualifiez les besoins en IA et préparez vos prochaines actions.",
    openGraph: {
      title: "Vos rencontres, bien en tête.",
      description:
        "Votre carnet de prospects IA. Un nom, un besoin, quelques notes.",
      type: "website",
      locale: "fr_FR",
      images: [
        {
          url: new URL("/og.png", base).href,
          width: 1536,
          height: 1024,
          alt: "Rencontre — Vos rencontres, bien en tête.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Vos rencontres, bien en tête.",
      description: "Votre carnet de prospects IA.",
      images: [new URL("/og.png", base).href],
    },
  };
}
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
