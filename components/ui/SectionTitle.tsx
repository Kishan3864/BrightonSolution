import type { ElementType, ReactNode } from "react";

type SectionTitleProps = {
  children: ReactNode;
  number?: string;
  /** section: the name of a section. page: the label above a page h1. sub: a block inside a section. */
  variant?: "section" | "page" | "sub";
  as?: ElementType;
  id?: string;
  className?: string;
};

/** Title band: optional number, the name, and a rule to the container edge. */
export default function SectionTitle({
  children,
  number,
  variant = "section",
  as: Tag = "p",
  id,
  className = "",
}: SectionTitleProps) {
  const size = variant === "section" ? "" : `section-title--${variant}`;

  return (
    <Tag id={id} className={`section-title ${size} ${className}`.replace(/\s+/g, " ").trim()}>
      <span className="section-title-text">
        {number ? (
          <>
            <span className="section-title-num" aria-hidden="true">
              {number}
            </span>{" "}
          </>
        ) : null}
        {children}
      </span>
    </Tag>
  );
}
