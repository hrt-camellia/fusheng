import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "浮生｜AI心灵导航",
    short_name: "浮生",
    description: "AI命理、情绪陪伴与水晶手串DIY",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF9FF",
    theme_color: "#9B8AFB",
    icons: [],
  };
}
