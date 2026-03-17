import type { Metadata } from "next";
import "./index.css";

export const metadata: Metadata = {
  title: "EV Charging Logbook",
  description: "Track and visualize your EV charging sessions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
