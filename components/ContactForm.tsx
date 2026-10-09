"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import Icon from "@/components/ui/Icon";
import { budgets, services, site } from "@/lib/site";
import { contactFormCopy as copy } from "@/lib/content/contact";

type FieldName = "name" | "company" | "email" | "phone" | "service" | "budget" | "message";
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;
type Status = "idle" | "sending" | "sent" | "error" | "mailto";
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const fieldOrder: FieldName[] = ["name", "company", "email", "phone", "service", "budget", "message"];

const fieldLabels: Record<FieldName, string> = {
  name: "Name",
  company: "Company",
  email: "Email",
  phone: "Phone",
  service: "Service",
  budget: "Budget",
  message: "Message",
};

const initialValues: Values = {
  name: "",
  company: "",
  email: "",
  phone: "",
  service: "",
  budget: "",
  message: "",
};

const serviceOptions = [...services.map((s) => s.title), "Something else"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s().-]{6,}$/;

const controlBase =
  "block w-full min-w-0 rounded-sharp border bg-paper px-3.5 text-base text-ink transition-colors duration-200 focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60";
const controlBorder = "border-ink/50 hover:border-ink";
const controlBorderInvalid = "border-[#B42318] hover:border-[#B42318]";

function validate(values: Values): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "Please enter your name.";
  if (!values.email.trim()) {
    errors.email = "Please enter your email address.";
  } else if (!EMAIL_RE.test(values.email.trim())) {
    errors.email = "Enter a valid email address, for example name@company.com.";
  }
  if (values.phone.trim() && !PHONE_RE.test(values.phone.trim())) {
    errors.phone = "Enter a valid phone number, or leave this field empty.";
  }
  if (values.message.trim().length < 20) {
    errors.message = "Tell us a little more about the project — at least 20 characters.";
  }
  return errors;
}

function buildMailto(values: Values): string {
  const subject = encodeURIComponent(`Project enquiry from ${values.name.trim()}`);
  const body = fieldOrder
    .map((field) => `${fieldLabels[field]}: ${values[field].trim() || "not provided"}`)
    .map((line) => encodeURIComponent(line))
    .join("%0D%0A");
  return `mailto:${site.email}?subject=${subject}&body=${body}`;
}

function AlertIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      className="mt-[3px] shrink-0"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

type FieldShellProps = {
  name: FieldName;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
};

function FieldShell({ name, required = false, hint, error, className = "", children }: FieldShellProps) {
  const id = `cf-${name}`;
  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">
        {fieldLabels[name]}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-accent">
            *
          </span>
        ) : null}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="mb-2 max-w-[48ch] text-sm leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-[#B42318]">
          <AlertIcon />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export default function ContactForm() {
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [summary, setSummary] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const controls = useRef<Partial<Record<FieldName, Control | null>>>({});
  const successHeading = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (status === "sent") successHeading.current?.focus();
  }, [status]);

  const handleChange = (event: ChangeEvent<Control>) => {
    const field = event.target.name as FieldName;
    const value = event.target.value;
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      const next = { ...errors };
      delete next[field];
      setErrors(next);
      if (Object.keys(next).length === 0) setSummary(null);
    }
  };

  const control = (field: FieldName, options: { hint?: boolean; className?: string } = {}) => {
    const id = `cf-${field}`;
    const invalid = Boolean(errors[field]);
    const describedBy = [options.hint ? `${id}-hint` : null, invalid ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ");
    return {
      id,
      name: field,
      value: values[field],
      onChange: handleChange,
      disabled: status === "sending",
      className: `${controlBase} ${invalid ? controlBorderInvalid : controlBorder} ${options.className ?? ""}`.trim(),
      "aria-invalid": invalid ? true : undefined,
      "aria-describedby": describedBy || undefined,
      ref: (el: Control | null) => {
        controls.current[field] = el;
      },
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") return;
    if (honeypot.trim()) return;

    const nextErrors = validate(values);
    const invalid = fieldOrder.filter((field) => nextErrors[field]);
    if (invalid.length > 0) {
      setErrors(nextErrors);
      setSummary(
        invalid.length === 1
          ? "Please check the field marked below."
          : `Please check the ${invalid.length} fields marked below.`,
      );
      window.requestAnimationFrame(() => controls.current[invalid[0]]?.focus());
      return;
    }

    setErrors({});
    setSummary(null);

    const endpoint = process.env.NEXT_PUBLIC_FORM_ENDPOINT;
    if (!endpoint) {
      window.location.href = buildMailto(values);
      setStatus("mailto");
      return;
    }

    setStatus("sending");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setSummary(null);
    setHoneypot("");
    setStatus("idle");
  };

  if (status === "sent") {
    return (
      <div role="status" aria-live="polite" className="border-t border-line pt-6">
        <p className="eyebrow text-accent">Message sent</p>
        <h2
          ref={successHeading}
          tabIndex={-1}
          className="text-h3 mt-4 max-w-[24ch] text-balance tracking-tight outline-offset-4"
        >
          {copy.successTitle}
        </h2>
        <p className="mt-3 max-w-[48ch] text-[1.0625rem] leading-relaxed text-muted">{copy.successText}</p>
        <div className="mt-8 border-t border-line pt-5">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[44px] items-center text-[0.9375rem] font-semibold tracking-tight text-ink decoration-1 underline-offset-8 transition-colors hover:text-accent hover:underline"
          >
            Send another message
          </button>
        </div>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <form onSubmit={handleSubmit} noValidate className="relative min-w-0" aria-describedby="cf-required-note">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <h2 className="eyebrow text-accent">{copy.heading}</h2>
        <p id="cf-required-note" className="text-sm text-muted">
          {copy.requiredNote}
        </p>
      </div>

      {/* Honeypot: hidden from people, filled only by bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
        <label htmlFor="cf-website">Website</label>
        <input
          id="cf-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <fieldset className="m-0 mt-8 min-w-0 border-t border-line p-0">
        <legend className="eyebrow float-left w-full pt-6 text-muted">{copy.groupDetails}</legend>
        <div className="clear-both grid gap-x-6 gap-y-6 pt-6 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
          <FieldShell name="name" required error={errors.name}>
            <input {...control("name", { className: "h-12" })} type="text" autoComplete="name" aria-required="true" />
          </FieldShell>
          <FieldShell name="company" error={errors.company}>
            <input {...control("company", { className: "h-12" })} type="text" autoComplete="organization" />
          </FieldShell>
          <FieldShell name="email" required error={errors.email}>
            <input
              {...control("email", { className: "h-12" })}
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-required="true"
            />
          </FieldShell>
          <FieldShell name="phone" error={errors.phone}>
            <input {...control("phone", { className: "h-12" })} type="tel" inputMode="tel" autoComplete="tel" />
          </FieldShell>
        </div>
      </fieldset>

      <fieldset className="m-0 mt-10 min-w-0 border-t border-line p-0">
        <legend className="eyebrow float-left w-full pt-6 text-muted">{copy.groupProject}</legend>
        <div className="clear-both grid gap-x-6 gap-y-6 pt-6 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
          <FieldShell name="service" error={errors.service}>
            <div className="relative">
              <select
                {...control("service", {
                  className: `h-12 appearance-none pr-10 ${values.service ? "text-ink" : "text-muted"}`,
                })}
              >
                <option value="">Select a service</option>
                {serviceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronIcon />
            </div>
          </FieldShell>
          <FieldShell name="budget" error={errors.budget}>
            <div className="relative">
              <select
                {...control("budget", {
                  className: `h-12 appearance-none pr-10 ${values.budget ? "text-ink" : "text-muted"}`,
                })}
              >
                <option value="">Select a range</option>
                {budgets.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronIcon />
            </div>
          </FieldShell>
          <FieldShell name="message" required hint={copy.messageHint} error={errors.message} className="sm:col-span-2 md:col-span-1 lg:col-span-2">
            <textarea
              {...control("message", { hint: true, className: "min-h-40 resize-y py-3" })}
              rows={6}
              aria-required="true"
            />
          </FieldShell>
        </div>
      </fieldset>

      <div className="mt-10 border-t border-line pt-6">
        <button
          type="submit"
          disabled={sending}
          className="group inline-flex min-h-[48px] w-full items-center justify-center gap-3 rounded-sharp bg-accent px-6 py-2.5 text-[0.9375rem] font-semibold tracking-tight text-paper transition-colors duration-200 hover:bg-ink disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-accent sm:w-auto sm:min-w-[14rem]"
        >
          <span>{sending ? copy.sending : copy.submit}</span>
          <Icon name="arrow" size={18} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
        <p className="mt-4 max-w-[48ch] text-sm leading-relaxed text-muted">
          {copy.privacyPrefix}{" "}
          <Link href="/privacy" className="text-ink underline decoration-1 underline-offset-4 transition-colors hover:text-accent">
            {copy.privacyLink}
          </Link>
          .
        </p>

        <div role="status" aria-live="polite" aria-atomic="true" className="mt-2">
          {summary ? (
            <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-[#B42318]">
              <AlertIcon />
              <span>{summary}</span>
            </p>
          ) : null}
          {status === "error" ? (
            <div className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-[#B42318]">
              <AlertIcon />
              <p>
                {copy.errorText}{" "}
                <a
                  href={buildMailto(values)}
                  className="break-all font-semibold text-ink underline decoration-1 underline-offset-4 transition-colors hover:text-accent"
                >
                  {site.email}
                </a>
              </p>
            </div>
          ) : null}
          {status === "mailto" ? (
            <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-ink">
              {copy.mailtoText}{" "}
              <a
                href={`mailto:${site.email}`}
                className="break-all font-semibold underline decoration-1 underline-offset-4 transition-colors hover:text-accent"
              >
                {site.email}
              </a>
              .
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
