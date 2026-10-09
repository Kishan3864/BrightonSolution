"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { analyticsAllowed } from "@/lib/analytics/env";
import { createDocument } from "@/lib/firebase/firestore";
import {
  CONTACT_LIMITS,
  COLLECTIONS,
  ID_PATTERN,
  clip,
  cleanUrl,
  type ContactRecord,
  type TrackDetail,
} from "@/lib/firebase/schema";

type FieldName = "name" | "company" | "email" | "phone" | "service" | "budget" | "message";
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;
type Status = "idle" | "sending" | "sent" | "error";
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

/** Length caps — mirrored in firestore.rules (contacts) via lib/firebase/schema.ts. */
const maxLengths: Record<FieldName, number> = {
  name: CONTACT_LIMITS.name,
  company: CONTACT_LIMITS.company,
  email: CONTACT_LIMITS.email,
  phone: CONTACT_LIMITS.phone,
  service: CONTACT_LIMITS.service,
  budget: CONTACT_LIMITS.budget,
  message: CONTACT_LIMITS.message,
};

const serviceOptions = [...services.map((s) => s.title), "Something else"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s().-]{6,}$/;
/** Real people cannot fill in a 20-character brief faster than this. */
const MIN_FILL_MS = 3000;
/** Keep mailto links short enough for every mail client. */
const MAILTO_MESSAGE_MAX = 1500;

const controlBase =
  "block w-full min-w-0 rounded-sharp border bg-paper px-3.5 text-base text-ink transition-colors duration-200 focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60";
const controlBorder = "border-ink/50 hover:border-ink";
const controlBorderInvalid = "border-[#B42318] hover:border-[#B42318]";

function charCount(value: string): number {
  return Array.from(value).length;
}

function trimValues(values: Values): Values {
  return fieldOrder.reduce((acc, field) => {
    acc[field] = values[field].trim();
    return acc;
  }, { ...initialValues });
}

function validate(raw: Values): Errors {
  const values = trimValues(raw);
  const errors: Errors = {};
  if (!values.name) errors.name = "Please enter your name.";
  else if (values.name.length > CONTACT_LIMITS.name) errors.name = `Keep your name under ${CONTACT_LIMITS.name} characters.`;

  if (values.company.length > CONTACT_LIMITS.company) {
    errors.company = `Keep the company name under ${CONTACT_LIMITS.company} characters.`;
  }

  if (!values.email) {
    errors.email = "Please enter your email address.";
  } else if (values.email.length > CONTACT_LIMITS.email || !EMAIL_RE.test(values.email)) {
    errors.email = "Enter a valid email address, for example name@company.com.";
  }

  if (values.phone && (values.phone.length > CONTACT_LIMITS.phone || !PHONE_RE.test(values.phone))) {
    errors.phone = "Enter a valid phone number, or leave this field empty.";
  }

  if (values.service && !serviceOptions.includes(values.service)) errors.service = "Choose a service from the list.";
  if (values.budget && !budgets.includes(values.budget)) errors.budget = "Choose a range from the list.";

  if (charCount(values.message) < CONTACT_LIMITS.messageMin) {
    errors.message = "Tell us a little more about the project — at least 20 characters.";
  } else if (values.message.length > CONTACT_LIMITS.message) {
    errors.message = `Keep the message under ${CONTACT_LIMITS.message.toLocaleString("en-GB")} characters.`;
  }
  return errors;
}

function buildMailto(raw: Values): string {
  const values = trimValues(raw);
  const message =
    values.message.length > MAILTO_MESSAGE_MAX ? `${values.message.slice(0, MAILTO_MESSAGE_MAX)}…` : values.message;
  const subject = encodeURIComponent(`Project enquiry from ${values.name || "the website"}`);
  const body = fieldOrder
    .map((field) => `${fieldLabels[field]}: ${(field === "message" ? message : values[field]) || "not provided"}`)
    .map((line) => encodeURIComponent(line))
    .join("%0D%0A");
  return `mailto:${site.email}?subject=${subject}&body=${body}`;
}

function readVisitorId(): string {
  try {
    const id = window.localStorage.getItem("bs_vid") ?? "";
    return ID_PATTERN.test(id) ? id : "";
  } catch {
    return "";
  }
}

function readTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return "";
  }
}

function track(detail: TrackDetail) {
  try {
    window.dispatchEvent(new CustomEvent<TrackDetail>("bs:track", { detail }));
  } catch {
    /* analytics must never affect the form */
  }
}

async function saveToFirestore(values: Values): Promise<boolean> {
  const record: ContactRecord = {
    name: clip(values.name, CONTACT_LIMITS.name),
    company: clip(values.company, CONTACT_LIMITS.company),
    email: clip(values.email, CONTACT_LIMITS.email),
    phone: clip(values.phone, CONTACT_LIMITS.phone),
    service: clip(values.service, CONTACT_LIMITS.service),
    budget: clip(values.budget, CONTACT_LIMITS.budget),
    message: clip(values.message, CONTACT_LIMITS.message),
    page: clip(window.location.pathname, CONTACT_LIMITS.page),
    referrer: cleanUrl(document.referrer, CONTACT_LIMITS.referrer),
    userAgent: clip(navigator.userAgent, CONTACT_LIMITS.userAgent),
    language: clip(navigator.language, CONTACT_LIMITS.language),
    timeZone: clip(readTimeZone(), CONTACT_LIMITS.timeZone),
    // No visitor id once tracking is off (GPC, build switch, bots): an id stored
    // before GPC was turned on must not link the enquiry to past visits.
    visitorId: analyticsAllowed() ? readVisitorId() : "",
    status: "new",
  };
  const result = await createDocument(COLLECTIONS.contacts, record);
  return result.ok;
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
        <p id={`${id}-error`} className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-[#B42318]">
          <AlertIcon />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export default function ContactForm() {
  const router = useRouter();
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [summary, setSummary] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const controls = useRef<Partial<Record<FieldName, Control | null>>>({});
  const successHeading = useRef<HTMLHeadingElement | null>(null);
  const errorPanel = useRef<HTMLDivElement | null>(null);
  const renderedAt = useRef<number>(0);
  const inFlight = useRef(false);

  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (status === "sent") successHeading.current?.focus();
    if (status === "error") errorPanel.current?.focus();
  }, [status]);

  const handleChange = (event: ChangeEvent<Control>) => {
    const field = event.target.name as FieldName;
    const value = event.target.value.slice(0, maxLengths[field]);
    setValues((prev) => ({ ...prev, [field]: value }));
    if (status === "error") setStatus("idle");
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
    if (inFlight.current || status === "sending") return;
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

    if (!renderedAt.current || Date.now() - renderedAt.current < MIN_FILL_MS) {
      setSummary("Please take a moment to check your details, then send again.");
      return;
    }

    setErrors({});
    setSummary(null);
    setStatus("sending");
    inFlight.current = true;

    const clean = trimValues(values);
    // Firestore is the only destination; on failure the error panel offers the mailto fallback.
    const ok = await saveToFirestore(clean);

    track({ type: "form_submit", label: "contact", ok });

    if (ok) {
      setStatus("sent");
      router.push("/thank-you");
      return;
    }

    inFlight.current = false;
    setStatus("error");
  };

  const reset = () => {
    inFlight.current = false;
    renderedAt.current = Date.now();
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
        <p className="mt-3 max-w-[48ch] text-base leading-relaxed text-muted">{copy.successText}</p>
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
    <form
      // No-JS / pre-hydration fallback: hand the brief to the visitor's mail client instead of a native
      // GET that would put personal data in the URL. With JS, handleSubmit prevents this and saves to Firestore.
      method="post"
      action={`mailto:${site.email}?subject=${encodeURIComponent("Project enquiry")}`}
      encType="text/plain"
      onSubmit={handleSubmit}
      noValidate
      className="relative min-w-0"
      aria-describedby="cf-required-note"
      aria-busy={sending || undefined}
    >
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
          maxLength={200}
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <fieldset className="m-0 mt-8 min-w-0 border-t border-line p-0">
        <legend className="eyebrow float-left w-full pt-6 text-muted">{copy.groupDetails}</legend>
        <div className="clear-both grid gap-x-6 gap-y-6 pt-6 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
          <FieldShell name="name" required error={errors.name}>
            <input
              {...control("name", { className: "h-12" })}
              type="text"
              autoComplete="name"
              maxLength={maxLengths.name}
              aria-required="true"
            />
          </FieldShell>
          <FieldShell name="company" error={errors.company}>
            <input
              {...control("company", { className: "h-12" })}
              type="text"
              autoComplete="organization"
              maxLength={maxLengths.company}
            />
          </FieldShell>
          <FieldShell name="email" required error={errors.email}>
            <input
              {...control("email", { className: "h-12" })}
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              maxLength={maxLengths.email}
              aria-required="true"
            />
          </FieldShell>
          <FieldShell name="phone" error={errors.phone}>
            <input
              {...control("phone", { className: "h-12" })}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={maxLengths.phone}
            />
          </FieldShell>
        </div>
      </fieldset>

      <fieldset className="m-0 mt-10 min-w-0 border-t border-line p-0">
        <legend className="eyebrow float-left w-full pt-6 text-muted">{copy.groupProject}</legend>
        {/* Always one column: two-up selects are too narrow for the longer service names once one is chosen. */}
        <div className="clear-both grid gap-y-6 pt-6">
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
          <FieldShell name="message" required hint={copy.messageHint} error={errors.message}>
            <textarea
              {...control("message", { hint: true, className: "min-h-40 resize-y py-3" })}
              rows={6}
              minLength={CONTACT_LIMITS.messageMin}
              maxLength={maxLengths.message}
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
        </div>

        {status === "error" ? (
          <div
            ref={errorPanel}
            tabIndex={-1}
            role="alert"
            className="mt-6 border-l-2 border-[#B42318] pl-4 outline-offset-4"
          >
            <p className="flex items-start gap-2 text-sm font-medium leading-relaxed text-[#B42318]">
              <AlertIcon />
              <span>Your message could not be sent right now.</span>
            </p>
            <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-ink">
              Your details are still in the form — try again in a moment, or send the same brief by email to{" "}
              <span className="break-all font-medium">{site.email}</span>.
            </p>
            <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
              <a
                href={buildMailto(values)}
                className="inline-flex min-h-[44px] items-center gap-2 text-[0.9375rem] font-semibold tracking-tight text-ink decoration-1 underline-offset-8 transition-colors hover:text-accent hover:underline"
              >
                Email the brief instead
                <Icon name="arrow" size={16} />
              </a>
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center text-[0.9375rem] font-medium tracking-tight text-muted decoration-1 underline-offset-8 transition-colors hover:text-ink hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </form>
  );
}
