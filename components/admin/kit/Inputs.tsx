"use client";

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import AdminIcon from "./AdminIcon";
import { cx } from "./cx";

/**
 * Form controls: SearchField (with clear button), Select (native, styled), Field (label + hint +
 * error wrapper that hands an id to its control), TextInput and TextArea (with character counter).
 * Inputs are 16px on every touch screen (phones, tablets, landscape phones) so iOS does not zoom on
 * focus; only a mouse/trackpad (pointer: fine) gets the denser 14px from 640px.
 */

const inputBase =
  "block w-full min-w-0 rounded-sharp border border-line-strong bg-canvas/70 px-3 text-fg [color-scheme:dark] placeholder:text-muted transition-colors hover:border-fg/40 focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent/60 disabled:opacity-50";

export const inputClass = `${inputBase} text-[1rem] sm:pointer-fine:text-[0.875rem]`;

export function SearchField({
  value,
  onChange,
  placeholder = "Search…",
  label = "Search",
  className,
  autoFocus,
  onKeyDown,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Accessible label (visually hidden). */
  label?: string;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: InputHTMLAttributes<HTMLInputElement>["onKeyDown"];
  id?: string;
}) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className={cx("relative min-w-0", className)}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <AdminIcon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        id={inputId}
        type="search"
        value={value}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={cx(inputClass, "min-h-10 pl-9 pr-10 pointer-coarse:min-h-11 [&::-webkit-search-cancel-button]:hidden")}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-[0.5rem] text-muted hover:bg-fg/[0.06] hover:text-fg focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
        >
          <AdminIcon name="close" size={16} />
        </button>
      ) : null}
    </div>
  );
}

export type SelectOption<V extends string> = { value: V; label: string };

export function Select<V extends string>({
  value,
  onChange,
  options,
  label,
  hideLabel = true,
  className,
  size = "md",
  id,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "size"> & {
  value: V;
  onChange: (value: V) => void;
  options: readonly SelectOption<V>[];
  label: string;
  /** Keep the label for screen readers only (default). */
  hideLabel?: boolean;
  size?: "sm" | "md";
}) {
  const auto = useId();
  const selectId = id ?? auto;
  return (
    <div className={cx("min-w-0", className)}>
      <label htmlFor={selectId} className={hideLabel ? "sr-only" : "mb-1.5 block text-[0.8125rem] font-medium text-muted"}>
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={(event) => onChange(event.target.value as V)}
          className={cx(
            size === "sm" ? `${inputBase} text-[1rem] pointer-fine:text-[0.8125rem]` : inputClass,
            "appearance-none pr-9",
            size === "sm" ? "min-h-8 pointer-coarse:min-h-11" : "min-h-10 pointer-coarse:min-h-11",
          )}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-surface text-fg">
              {option.label}
            </option>
          ))}
        </select>
        <AdminIcon name="chevronDown" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}

/** Label + control + hint/error. `children` receives the id and describedby to put on the control. */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cx("min-w-0", className)}>
      <label htmlFor={id} className="mb-1.5 block text-[0.8125rem] font-medium text-fg">
        {label}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.75rem] leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[0.75rem] text-[#ff8a7a]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, ...props }, ref) {
  return <input ref={ref} className={cx(inputClass, "min-h-10 pointer-coarse:min-h-11", className)} {...props} />;
});

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    /** Show "used / max" under the box when maxLength is set. */
    showCount?: boolean;
  }
>(function TextArea({ className, showCount = false, maxLength, value, ...props }, ref) {
  const used = typeof value === "string" ? value.length : 0;
  return (
    <div className="min-w-0">
      <textarea
        ref={ref}
        maxLength={maxLength}
        value={value}
        className={cx(inputClass, "min-h-28 resize-y py-2.5 leading-relaxed", className)}
        {...props}
      />
      {showCount && maxLength ? (
        <p className="mt-1 text-right font-mono text-[0.6875rem] tabular-nums text-muted" aria-hidden="true">
          {used.toLocaleString()} / {maxLength.toLocaleString()}
        </p>
      ) : null}
    </div>
  );
});
