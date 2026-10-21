"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import Icon from "@/components/ui/Icon";
import { CurrencySwitch, useLaunch } from "@/components/launch/LaunchProvider";
import {
  PLAN_UNSURE,
  budgets,
  contactPrefs,
  features,
  formCopy as copy,
  plans,
  projectTypes,
  stages,
  timelines,
  type Option,
} from "@/lib/content/launch";
import { EMAIL_RE, PHONE_RE, formatPrice, saveLead, trackLaunch } from "@/lib/launch/lead";
import { LEAD_LIMITS } from "@/lib/firebase/schema";
import { site } from "@/lib/site";

type Values = {
  projectTypes: string[];
  stage: string;
  features: string[];
  timeline: string;
  budget: string;
  plan: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  contactPref: string;
  message: string;
};
type FieldName = keyof Values;
type TextField = "name" | "email" | "phone" | "company" | "message";
type Errors = Partial<Record<FieldName, string>>;
type Status = "idle" | "sending" | "sent" | "error";

const initialValues: Values = {
  projectTypes: [],
  stage: "",
  features: [],
  timeline: "",
  budget: "",
  plan: "",
  name: "",
  email: "",
  phone: "",
  company: "",
  contactPref: "whatsapp",
  message: "",
};

/** Fields checked before leaving each step (the contact step is checked on submit). */
const STEP_FIELDS: FieldName[][] = [
  ["projectTypes", "stage"],
  ["timeline", "budget"],
  ["name", "email", "phone", "company", "message"],
];

const STEP_TITLES = ["What do you want to build?", "Tell us about the scope", "Where should we send your plan?"];

/** Real people cannot finish three steps faster than this. */
const MIN_FILL_MS = 4000;

const ERROR_TEXT = "text-[#ff8a7a]";

const controlBase =
  "block h-12 w-full min-w-0 rounded-sharp border bg-surface-2 px-3.5 text-base text-fg [color-scheme:dark] placeholder:text-muted/80 transition-colors duration-200 focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60";
const controlBorder = "border-fg/35 hover:border-fg/60";
const controlBorderInvalid = "border-[#ff8a7a] hover:border-[#ff8a7a]";

const chipBase =
  "relative inline-flex min-h-[44px] cursor-pointer select-none items-center gap-2 rounded-full border px-4 py-2 text-[0.875rem] leading-snug transition-[color,background-color,border-color] duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent";
const chipOn = "border-accent bg-accent/[0.14] text-fg";
const chipOff = "border-line-strong text-muted hover:border-fg/60 hover:text-fg";

function labelsOf(ids: string[], options: Option[]): string {
  return options
    .filter((option) => ids.includes(option.id))
    .map((option) => option.label)
    .join(", ");
}

function labelOf(id: string, options: Option[]): string {
  return options.find((option) => option.id === id)?.label ?? "";
}

function validate(values: Values, fields: FieldName[], budgetOptions: string[]): Errors {
  const errors: Errors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();
  for (const field of fields) {
    if (field === "projectTypes" && values.projectTypes.length === 0) errors.projectTypes = "Choose at least one option.";
    if (field === "stage" && !values.stage) errors.stage = "Choose where you are today.";
    if (field === "timeline" && !values.timeline) errors.timeline = "Choose when you would like to launch.";
    if (field === "budget" && !budgetOptions.includes(values.budget)) {
      errors.budget = "Choose a budget range, or “Not sure yet”.";
    }
    if (field === "name") {
      if (!name) errors.name = "Please enter your name.";
      else if (name.length > LEAD_LIMITS.name) errors.name = `Keep your name under ${LEAD_LIMITS.name} characters.`;
    }
    if (field === "email" && (!email || email.length > LEAD_LIMITS.email || !EMAIL_RE.test(email))) {
      errors.email = email ? "Enter a valid email address, for example name@company.com." : "Please enter your email address.";
    }
    if (field === "phone") {
      const digits = phone.replace(/\D/g, "").length;
      if (!phone) errors.phone = "Please enter your phone or WhatsApp number.";
      else if (phone.length > LEAD_LIMITS.phone || !PHONE_RE.test(phone) || digits < 7) {
        errors.phone = "Enter a valid number, including the country code.";
      }
    }
    if (field === "company" && values.company.trim().length > LEAD_LIMITS.company) {
      errors.company = `Keep this under ${LEAD_LIMITS.company} characters.`;
    }
    if (field === "message" && values.message.trim().length > LEAD_LIMITS.message) {
      errors.message = `Keep this under ${LEAD_LIMITS.message.toLocaleString("en-GB")} characters.`;
    }
  }
  return errors;
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

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className={`mt-2 flex items-start gap-2 text-sm leading-relaxed ${ERROR_TEXT}`}>
      <AlertIcon />
      <span>{error}</span>
    </p>
  );
}

/** A group of choices (checkboxes or radios) with a visible legend and its own error. */
function ChoiceGroup({
  id,
  legend,
  hint,
  error,
  aside,
  children,
}: {
  id: string;
  legend: string;
  hint?: string;
  error?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return (
    <fieldset id={id} className="m-0 min-w-0 border-0 p-0" aria-describedby={describedBy || undefined} tabIndex={-1}>
      <legend className="float-left mr-3 flex min-h-9 items-center p-0 text-[0.9375rem] font-medium text-fg">{legend}</legend>
      {aside ? <div className="float-right">{aside}</div> : null}
      {hint ? (
        <p id={`${id}-hint`} className="clear-both mt-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <div className="clear-both mt-3">{children}</div>
      <FieldError id={`${id}-error`} error={error} />
    </fieldset>
  );
}

export default function LeadForm() {
  const { currency, prefill } = useLaunch();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [honeypot, setHoneypot] = useState("");
  const renderedAt = useRef(0);
  const inFlight = useRef(false);
  const started = useRef(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const successRef = useRef<HTMLHeadingElement | null>(null);
  const movedRef = useRef(false);

  const budgetOptions = budgets[currency];

  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  // A plan request can hand over the plan and contact details it already has.
  useEffect(() => {
    if (!prefill) return;
    setValues((current) => ({
      ...current,
      plan: prefill.plan ?? current.plan,
      name: current.name || prefill.name || "",
      email: current.email || prefill.email || "",
      phone: current.phone || prefill.phone || "",
    }));
  }, [prefill]);

  // Budget ranges are written in the selected currency; a switch clears a range that no longer exists.
  useEffect(() => {
    setValues((current) => (current.budget && !budgets[currency].includes(current.budget) ? { ...current, budget: "" } : current));
  }, [currency]);

  // Move focus to the new step's heading (not on first render) and keep the top of the form in view.
  useEffect(() => {
    if (!movedRef.current) return;
    headingRef.current?.focus({ preventScroll: true });
    const top = rootRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  useEffect(() => {
    if (status === "sent") successRef.current?.focus();
  }, [status]);

  const markStarted = () => {
    if (started.current) return;
    started.current = true;
    trackLaunch({ type: "form_start", label: "launch" });
  };

  const handleEngage = (event: SyntheticEvent<HTMLFormElement>) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.getAttribute("name") && target.getAttribute("name") !== "website") {
      markStarted();
    }
  };

  const clearError = (field: FieldName) => {
    if (status === "error") setStatus("idle");
    if (!errors[field]) return;
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const setField = <K extends FieldName>(field: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    clearError(field);
  };

  const toggle = (field: "projectTypes" | "features", id: string) => {
    setValues((current) => {
      const list = current[field];
      let next = list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
      // "Not sure yet" and concrete project types exclude each other.
      if (field === "projectTypes") {
        if (id === "unsure" && next.includes("unsure")) next = ["unsure"];
        else if (id !== "unsure") next = next.filter((item) => item !== "unsure");
      }
      return { ...current, [field]: next };
    });
    clearError(field);
  };

  const handleText = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const field = event.target.name as TextField;
    const max = LEAD_LIMITS[field];
    setField(field, event.target.value.slice(0, max));
  };

  const focusFirstError = (found: Errors, fields: FieldName[]) => {
    const first = fields.find((field) => found[field]);
    if (!first) return;
    window.requestAnimationFrame(() => {
      const el =
        document.getElementById(`lf-${first}`) ??
        document.querySelector<HTMLElement>(`#lf-group-${first} input`) ??
        document.getElementById(`lf-group-${first}`);
      el?.focus();
    });
  };

  const goNext = () => {
    const fields = STEP_FIELDS[step];
    const found = validate(values, fields, budgetOptions);
    const invalid = fields.filter((field) => found[field]);
    if (invalid.length) {
      markStarted();
      trackLaunch({ type: "form_error", label: `launch:${invalid.join(",")}` });
      setErrors(found);
      focusFirstError(found, fields);
      return;
    }
    setErrors({});
    movedRef.current = true;
    setStep((current) => Math.min(current + 1, STEP_FIELDS.length - 1));
  };

  const goBack = () => {
    setErrors({});
    movedRef.current = true;
    setStep((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step < STEP_FIELDS.length - 1) {
      goNext();
      return;
    }
    if (inFlight.current || status === "sending") return;
    if (honeypot.trim()) return;

    const fields = STEP_FIELDS.flat();
    const found = validate(values, fields, budgetOptions);
    const invalid = fields.filter((field) => found[field]);
    if (invalid.length) {
      trackLaunch({ type: "form_error", label: `launch:${invalid.join(",")}` });
      setErrors(found);
      const firstStep = STEP_FIELDS.findIndex((group) => group.some((field) => found[field]));
      if (firstStep !== step) {
        movedRef.current = true;
        setStep(firstStep);
      }
      focusFirstError(found, STEP_FIELDS[firstStep]);
      return;
    }
    if (!renderedAt.current || Date.now() - renderedAt.current < MIN_FILL_MS) return;

    setStatus("sending");
    inFlight.current = true;
    const plan = plans.find((item) => item.name === values.plan);
    const ok = await saveLead({
      kind: "brief",
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      company: values.company.trim(),
      projectTypes: labelsOf(values.projectTypes, projectTypes),
      features: labelsOf(values.features, features),
      stage: labelOf(values.stage, stages),
      timeline: labelOf(values.timeline, timelines),
      budget: values.budget,
      plan: values.plan || PLAN_UNSURE,
      currency,
      price: plan ? plan.price[currency] : undefined,
      contactPref: labelOf(values.contactPref, contactPrefs),
      message: values.message.trim(),
    });
    trackLaunch({ type: "form_submit", label: "launch", ok });
    inFlight.current = false;
    setStatus(ok ? "sent" : "error");
  };

  const sending = status === "sending";

  if (status === "sent") {
    const firstName = values.name.trim().split(/\s+/)[0] ?? "";
    return (
      <div ref={rootRef} role="status" aria-live="polite" className="py-2">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-accent text-canvas">
          <Icon name="check" size={28} />
        </span>
        <h3
          ref={successRef}
          tabIndex={-1}
          className="mt-6 max-w-[22ch] font-display text-[clamp(1.625rem,1.2rem+1.4vw,2.25rem)] font-medium leading-[1.1] tracking-[-0.03em] outline-offset-4"
        >
          {copy.successTitle(firstName)}
        </h3>
        <p className="mt-4 max-w-[50ch] text-base leading-relaxed text-muted">
          {copy.successText(labelOf(values.contactPref, contactPrefs))}
        </p>
        <ol className="mt-8 grid gap-4 border-t border-line pt-6">
          {[
            "We study your answers and note any questions.",
            "You get a written plan: scope, fixed price and timeline.",
            "If it fits, we start with design. If not, you owe nothing.",
          ].map((line, index) => (
            <li key={line} className="flex items-start gap-4 text-[0.9375rem] leading-relaxed">
              <span className="font-mono text-sm tabular-nums text-accent">0{index + 1}</span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm text-muted">
          Something to add? Email{" "}
          <a href={`mailto:${site.email}`} className="text-fg underline decoration-1 underline-offset-4 hover:text-accent">
            {site.email}
          </a>
          .
        </p>
      </div>
    );
  }

  const textControl = (field: TextField, extra = "") => {
    const invalid = Boolean(errors[field]);
    return {
      id: `lf-${field}`,
      name: field,
      value: values[field],
      onChange: handleText,
      disabled: sending,
      "aria-invalid": invalid ? true : undefined,
      "aria-describedby": [invalid ? `lf-${field}-error` : null, field === "phone" ? "lf-phone-hint" : null]
        .filter(Boolean)
        .join(" ") || undefined,
      className: `${controlBase} ${invalid ? controlBorderInvalid : controlBorder} ${extra}`.trim(),
    };
  };

  return (
    <div ref={rootRef} className="scroll-mt-24">
      {/* Progress: three named steps. */}
      <ol className="grid grid-cols-3 gap-2" aria-label="Form progress">
        {copy.steps.map((label, index) => {
          const state = index < step ? "done" : index === step ? "current" : "todo";
          return (
            <li key={label} aria-current={state === "current" ? "step" : undefined} className="min-w-0">
              <span
                aria-hidden="true"
                className={`block h-1 rounded-full transition-colors duration-300 ${
                  state === "todo" ? "bg-line-strong" : "bg-accent"
                }`}
              />
              <span
                className={`mt-2.5 flex items-center gap-1.5 font-mono text-[0.75rem] tracking-[0.06em] uppercase ${
                  state === "todo" ? "text-muted" : "text-fg"
                }`}
              >
                {state === "done" ? <Icon name="check" size={14} className="text-accent" /> : null}
                <span className="truncate">{label}</span>
                <span className="sr-only">
                  {state === "done" ? " (completed)" : state === "current" ? " (current step)" : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <form
        noValidate
        onSubmit={handleSubmit}
        onFocus={handleEngage}
        onInput={handleEngage}
        className="relative mt-8 min-w-0"
        aria-busy={sending || undefined}
      >
        {/* Honeypot: hidden from people, filled only by bots. */}
        <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
          <label htmlFor="lf-website">Website</label>
          <input
            id="lf-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </div>

        <p className="sr-only" aria-live="polite">
          Step {step + 1} of {STEP_FIELDS.length}: {STEP_TITLES[step]}
        </p>
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-[clamp(1.375rem,1.1rem+0.9vw,1.75rem)] font-medium leading-[1.15] tracking-[-0.025em] outline-offset-4"
        >
          {STEP_TITLES[step]}
        </h3>

        {step === 0 ? (
          <div className="mt-6 grid gap-8">
            <ChoiceGroup id="lf-group-projectTypes" legend="Choose everything that applies" error={errors.projectTypes}>
              <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
                {projectTypes.map((option) => {
                  const on = values.projectTypes.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className={`group relative flex min-h-[72px] cursor-pointer items-start gap-3 rounded-sharp border p-3.5 transition-[color,background-color,border-color] duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                        on ? "border-accent bg-accent/[0.1]" : "border-line-strong bg-surface-2/60 hover:border-fg/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="projectTypes"
                        value={option.id}
                        checked={on}
                        onChange={() => toggle("projectTypes", option.id)}
                        className="sr-only"
                      />
                      <span
                        className={`inline-flex size-10 shrink-0 items-center justify-center rounded-sharp transition-colors duration-200 ${
                          on ? "bg-accent text-canvas" : "bg-canvas text-accent"
                        }`}
                      >
                        {option.icon ? <Icon name={option.icon} size={20} /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[0.9375rem] font-medium leading-snug text-fg">{option.label}</span>
                        {option.hint ? (
                          <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">{option.hint}</span>
                        ) : null}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`absolute right-3 top-3 inline-flex size-5 items-center justify-center rounded-full border transition-colors duration-200 ${
                          on ? "border-accent bg-accent text-canvas" : "border-line-strong text-transparent"
                        }`}
                      >
                        <Icon name="check" size={12} />
                      </span>
                    </label>
                  );
                })}
              </div>
            </ChoiceGroup>

            <ChoiceGroup id="lf-group-stage" legend="Where are you today?" error={errors.stage}>
              <div className="flex flex-wrap gap-2">
                {stages.map((option) => (
                  <label key={option.id} className={`${chipBase} ${values.stage === option.id ? chipOn : chipOff}`}>
                    <input
                      type="radio"
                      name="stage"
                      value={option.id}
                      checked={values.stage === option.id}
                      onChange={() => setField("stage", option.id)}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </ChoiceGroup>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-6 grid gap-8">
            <ChoiceGroup id="lf-group-features" legend="Features you need" hint="Optional. Pick any that sound right.">
              <div className="flex flex-wrap gap-2">
                {features.map((option) => {
                  const on = values.features.includes(option.id);
                  return (
                    <label key={option.id} className={`${chipBase} ${on ? chipOn : chipOff}`}>
                      <input
                        type="checkbox"
                        name="features"
                        value={option.id}
                        checked={on}
                        onChange={() => toggle("features", option.id)}
                        className="sr-only"
                      />
                      {on ? <Icon name="check" size={14} className="text-accent" /> : null}
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </ChoiceGroup>

            <ChoiceGroup id="lf-group-timeline" legend="When would you like to launch?" error={errors.timeline}>
              <div className="flex flex-wrap gap-2">
                {timelines.map((option) => (
                  <label key={option.id} className={`${chipBase} ${values.timeline === option.id ? chipOn : chipOff}`}>
                    <input
                      type="radio"
                      name="timeline"
                      value={option.id}
                      checked={values.timeline === option.id}
                      onChange={() => setField("timeline", option.id)}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </ChoiceGroup>

            <ChoiceGroup
              id="lf-group-budget"
              legend="Your budget"
              error={errors.budget}
              aside={<CurrencySwitch />}
            >
              <div className="flex flex-wrap gap-2">
                {budgetOptions.map((option) => (
                  <label key={option} className={`${chipBase} ${values.budget === option ? chipOn : chipOff}`}>
                    <input
                      type="radio"
                      name="budget"
                      value={option}
                      checked={values.budget === option}
                      onChange={() => setField("budget", option)}
                      className="sr-only"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </ChoiceGroup>

            <ChoiceGroup id="lf-group-plan" legend="Which plan sounds closest?" hint="Optional. You can change your mind later.">
              <div className="flex flex-wrap gap-2">
                {[...plans.map((plan) => ({ value: plan.name, price: formatPrice(plan.price[currency], currency) })), { value: PLAN_UNSURE, price: "" }].map(
                  (option) => (
                    <label key={option.value} className={`${chipBase} ${values.plan === option.value ? chipOn : chipOff}`}>
                      <input
                        type="radio"
                        name="plan"
                        value={option.value}
                        checked={values.plan === option.value}
                        onChange={() => setField("plan", option.value)}
                        className="sr-only"
                      />
                      <span className="text-fg">{option.value}</span>
                      {option.price ? <span className="font-mono text-[0.75rem] text-muted">{option.price}</span> : null}
                    </label>
                  ),
                )}
              </div>
            </ChoiceGroup>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="lf-name" className="mb-2 block text-sm font-medium text-fg">
                Your name<span aria-hidden="true" className="ml-1 text-accent">*</span>
              </label>
              <input {...textControl("name")} type="text" autoComplete="name" aria-required="true" maxLength={LEAD_LIMITS.name} />
              <FieldError id="lf-name-error" error={errors.name} />
            </div>
            <div className="min-w-0">
              <label htmlFor="lf-company" className="mb-2 block text-sm font-medium text-fg">
                Business name <span className="font-normal text-muted">(optional)</span>
              </label>
              <input {...textControl("company")} type="text" autoComplete="organization" maxLength={LEAD_LIMITS.company} />
              <FieldError id="lf-company-error" error={errors.company} />
            </div>
            <div className="min-w-0">
              <label htmlFor="lf-email" className="mb-2 block text-sm font-medium text-fg">
                Email<span aria-hidden="true" className="ml-1 text-accent">*</span>
              </label>
              <input
                {...textControl("email")}
                type="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                aria-required="true"
                maxLength={LEAD_LIMITS.email}
              />
              <FieldError id="lf-email-error" error={errors.email} />
            </div>
            <div className="min-w-0">
              <label htmlFor="lf-phone" className="mb-2 block text-sm font-medium text-fg">
                Phone or WhatsApp<span aria-hidden="true" className="ml-1 text-accent">*</span>
              </label>
              <input
                {...textControl("phone")}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                aria-required="true"
                maxLength={LEAD_LIMITS.phone}
                placeholder={currency === "INR" ? "+91" : "+"}
              />
              <p id="lf-phone-hint" className="mt-2 text-[0.8125rem] text-muted">
                With country code, for example +91 or +1.
              </p>
              <FieldError id="lf-phone-error" error={errors.phone} />
            </div>

            <div className="sm:col-span-2">
              <ChoiceGroup id="lf-group-contactPref" legend="Best way to reach you">
                <div className="flex flex-wrap gap-2">
                  {contactPrefs.map((option) => (
                    <label
                      key={option.id}
                      className={`${chipBase} ${values.contactPref === option.id ? chipOn : chipOff}`}
                    >
                      <input
                        type="radio"
                        name="contactPref"
                        value={option.id}
                        checked={values.contactPref === option.id}
                        onChange={() => setField("contactPref", option.id)}
                        className="sr-only"
                      />
                      {option.icon ? <Icon name={option.icon} size={16} /> : null}
                      {option.label}
                    </label>
                  ))}
                </div>
              </ChoiceGroup>
            </div>

            <div className="min-w-0 sm:col-span-2">
              <label htmlFor="lf-message" className="mb-2 block text-sm font-medium text-fg">
                Anything else we should know? <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                {...textControl("message", "h-auto min-h-28 resize-y py-3")}
                rows={4}
                maxLength={LEAD_LIMITS.message}
                placeholder="A website you like, a deadline, the problem you want to solve…"
              />
              <FieldError id="lf-message-error" error={errors.message} />
            </div>
          </div>
        ) : null}

        <div className="mt-9 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={sending}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-sharp px-4 text-[0.9375rem] font-medium text-muted transition-colors hover:text-fg disabled:opacity-60"
            >
              <Icon name="arrow" size={16} className="rotate-180" />
              {copy.back}
            </button>
          ) : (
            <p className="text-sm text-muted">
              <span className="font-mono tabular-nums text-fg">3</span> short steps. About 2 minutes.
            </p>
          )}
          <button
            type="submit"
            disabled={sending}
            className="group inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-sharp bg-accent px-7 text-[1rem] font-semibold tracking-tight text-canvas transition-[background-color,transform] duration-200 hover:bg-accent-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:min-w-[13rem]"
          >
            <span>{step < STEP_FIELDS.length - 1 ? copy.next : sending ? copy.sending : copy.submit}</span>
            <Icon name="arrow" size={18} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>

        {step === STEP_FIELDS.length - 1 ? (
          <p className="mt-4 text-[0.8125rem] leading-relaxed text-muted">
            By sending this form you agree to our{" "}
            <Link href="/privacy" target="_blank" className="text-fg underline decoration-1 underline-offset-4 hover:text-accent">
              Privacy Policy
            </Link>
            .
          </p>
        ) : null}

        <div role="alert" aria-live="assertive">
          {status === "error" ? (
            <div className="mt-6 rounded-sharp border border-[#ff8a7a]/45 bg-[#ff8a7a]/[0.06] p-4">
              <p className={`flex items-start gap-2 text-sm font-medium leading-relaxed ${ERROR_TEXT}`}>
                <AlertIcon />
                <span>{copy.errorText}</span>
              </p>
              <p className="mt-2 text-sm text-fg">
                Or email us at{" "}
                <a href={`mailto:${site.email}`} className="break-all font-medium underline underline-offset-4 hover:text-accent">
                  {site.email}
                </a>
                .
              </p>
            </div>
          ) : null}
        </div>
      </form>
    </div>
  );
}
