import { APP_ICON_SIZE, type AndroidApp } from "@/lib/work";

type AppIconProps = {
  app: AndroidApp;
  size: number;
  className?: string;
};

/** Play Store icon, decorative (the app name is always rendered beside it).
    Rounded the way Google Play presents icons; a hairline keeps light icons
    from dissolving into the page. */
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
      className={`block shrink-0 rounded-[22%] border border-line object-cover [.section-dark_&]:border-line-dark ${className}`.trim()}
    />
  );
}
