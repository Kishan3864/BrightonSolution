import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const dynamic = "force-static";
export const alt = "BrightonSolution — Software Development & IT Services";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const svg = await readFile(join(process.cwd(), "public", "logo.svg"));
  const logo = `data:image/svg+xml;base64,${svg.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#FAFAF7",
          color: "#0A1220",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex" }}>
          <img src={logo} alt="" width={203} height={56} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: -3,
              maxWidth: 1000,
            }}
          >
            Software development &amp; IT services.
          </div>
          <div style={{ width: 120, height: 2, background: "#2447F9", display: "flex" }} />
          <div style={{ fontSize: 28, color: "#5B6170", maxWidth: 900, lineHeight: 1.35 }}>
            Custom software, web and mobile apps, cloud &amp; DevOps, AI integration, UI/UX design and
            maintenance for startups, small businesses and enterprises worldwide.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid #E3E3DD",
            paddingTop: 24,
            fontSize: 22,
            color: "#5B6170",
          }}
        >
          <span>{site.url.replace(/^https?:\/\//, "")}</span>
          <span>{site.email}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
