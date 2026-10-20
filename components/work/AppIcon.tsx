import { APP_ICON_SIZE, type AndroidApp } from "@/lib/work";

type AppIconProps = {
  app: AndroidApp;
  size: number;
  className?: string;
};

/** Play Store icon, decorative (the app name is always given beside it or as
    the link's accessible name). A 12px-radius tile, like every small tile on
    the site; a hairline keeps dark icons from dissolving into the canvas. */
export default function AppIcon({ app, size, className = "" }: AppIconProps) {
  return (
    <img
      src={app.icon}
      alt=""
      width={APP_ICON_SIZE}
      height={APP_ICON_SIZE}
      loading="lazy"
      decoding="async"
      style={{ width: size, height: size }}
      className={`block shrink-0 rounded-sharp border border-line bg-surface-2 object-cover ${className}`.trim()}
    />
  );
}
