import type { ElementType, ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
};

export default function Container({ children, className = "", as: Tag = "div" }: ContainerProps) {
  return (
    <Tag className={`mx-auto w-full max-w-[1320px] px-[clamp(1rem,0.5rem+2.5vw,3rem)] ${className}`.trim()}>
      {children}
    </Tag>
  );
}
