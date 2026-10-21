import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { launchHero, launchMeta } from "@/lib/content/launch";
import { site } from "@/lib/site";

export const dynamic = "force-static";
export const alt = launchMeta.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Link preview for the private landing page (WhatsApp, email, social). */
export default async function OpenGraphImage() {
  const svg = (await readFile(join(process.cwd(), "public", "logo.svg"), "utf8")).replace(/#070707/gi, "#f3f0ea");
  const logo = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

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
          background: "radial-gradient(90% 120% at 100% 0%, rgba(237,148,59,0.30), #0b0c10 62%)",
          color: "#f3f0ea",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <img src={logo} alt="" width={203} height={56} />
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 999,
              border: "2px solid #ed943b",
              color: "#ed943b",
              fontSize: 24,
            }}
          >
            Free quote in 1 business day
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3, maxWidth: 980 }}>
            {launchHero.title}
          </div>
          <div style={{ fontSize: 30, color: "#a2a5ae", maxWidth: 900, lineHeight: 1.35 }}>
            Websites, web apps and mobile apps at a fixed price. Share your idea, get a free plan.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(243,240,234,0.24)",
            paddingTop: 24,
            fontSize: 22,
            color: "#a2a5ae",
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
