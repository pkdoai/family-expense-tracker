import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Family Expense Tracker",
    short_name: "Expenses",
    description: "A private, on-device expense tracker for a fixed-length family budget program.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7f5",
    theme_color: "#146356",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
