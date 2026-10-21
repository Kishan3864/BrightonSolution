"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Icon from "@/components/ui/Icon";
import { CurrencySwitch, useLaunch } from "@/components/launch/LaunchProvider";
import { planDialogCopy as dialogCopy, plans, plansSection, type Plan } from "@/lib/content/launch";
import { EMAIL_RE, PHONE_RE, formatPrice, saveLead, trackLaunch } from "@/lib/launch/lead";
import { LEAD_LIMITS } from "@/lib/firebase/schema";

/**
 * The three fixed-price plans. Each plan's button opens a short request dialog (name, email,
 * phone) that saves a `plan` lead at once, so the team hears about the interest even if the
 * visitor never fills in the full brief.
 */
export default function Plans() {
  const { currency } = useLaunch();
  const [active, setActive] = useState<Plan | null>(null);

  return (
    <>
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 id="plans-title" className="text-h1 max-w-[16ch] text-balance">
            {plansSection.title}
          </h2>
          <p className="text-lead mt-5 max-w-[52ch] text-muted">{plansSection.lead}</p>
        </div>
        <CurrencySwitch className="shrink-0" />
      </div>

      {/* Phones: one column, Growth first. From lg: three columns with Growth raised in the middle. */}
      <ul role="list" className="mt-[clamp(2.5rem,1.5rem+3vw,4rem)] grid gap-4 lg:grid-cols-3 lg:items-stretch lg:gap-5">
        {plans.map((plan) => {
          const featured = plan.recommended === true;
          return (
            <li
              key={plan.id}
              className={`relative flex min-w-0 flex-col rounded-[var(--radius-card)] border p-6 sm:p-7 ${
                featured
                  ? "order-first border-accent bg-[linear-gradient(180deg,rgba(237,148,59,0.16),rgba(237,148,59,0.04)_42%,var(--color-surface)_100%)] shadow-[0_24px_80px_-32px_rgba(237,148,59,0.45)] lg:order-none lg:-my-4 lg:py-11"
                  : "border-line bg-surface"
              }`}
            >
              {featured ? (
                <span className="absolute -top-3.5 left-6 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-mono text-[0.6875rem] font-semibold tracking-[0.08em] text-canvas uppercase sm:left-7">
                  Recommended
                </span>
              ) : null}

              <h3 className="font-display text-[1.625rem] font-medium leading-none tracking-[-0.03em]">{plan.name}</h3>
              <p className="mt-3 min-h-[3em] text-[0.9375rem] leading-snug text-muted">{plan.summary}</p>

              <p className="mt-6">
                <span className="block font-display text-[clamp(2.375rem,2rem+1.4vw,3rem)] font-medium leading-none tracking-[-0.04em] tabular-nums">
                  {formatPrice(plan.price[currency], currency)}
                </span>
                <span className="mt-2 block text-sm text-muted">{plansSection.priceNote}</span>
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm text-fg">
                <Icon name="clock" size={16} className="text-accent" />
                {plan.delivery}
              </p>

              <button
                type="button"
                onClick={() => {
                  trackLaunch({ type: "cta_click", label: `launch_plan_${plan.id}` });
                  setActive(plan);
                }}
                className={`group mt-7 inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-sharp px-5 text-[0.9375rem] font-semibold tracking-tight transition-[background-color,border-color,color,transform] duration-200 active:translate-y-px ${
                  featured
                    ? "bg-accent text-canvas hover:bg-accent-2"
                    : "border border-line-strong text-fg hover:border-fg hover:bg-fg/5"
                }`}
              >
                Choose {plan.name}
                <Icon name="arrow" size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>

              <div className="mt-7 border-t border-line pt-6">
                {plan.includesPrevious ? (
                  <p className="mb-3 text-[0.8125rem] font-medium text-fg">{plan.includesPrevious}</p>
                ) : null}
                <ul role="list" className="grid gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-[0.9375rem] leading-snug">
                      <Icon name="check" size={18} className="mt-px text-accent" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-[0.8125rem] text-muted">Best for: {plan.bestFor}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-[clamp(2.5rem,1.5rem+3vw,4rem)] rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6">
        <p className="text-sm font-medium text-fg">Every plan includes</p>
        <ul role="list" className="mt-4 flex flex-wrap gap-x-7 gap-y-3">
          {plansSection.included.map((item) => (
            <li key={item} className="flex items-center gap-2 text-[0.9375rem] text-muted">
              <Icon name="shield" size={18} className="text-accent" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <PlanDialog plan={active} onClose={() => setActive(null)} />
    </>
  );
}

type DialogValues = { name: string; email: string; phone: string; message: string };
type DialogErrors = Partial<Record<keyof DialogValues, string>>;

const emptyValues: DialogValues = { name: "", email: "", phone: "", message: "" };

const inputClass =
  "block h-12 w-full min-w-0 rounded-sharp border border-fg/35 bg-surface-2 px-3.5 text-base text-fg [color-scheme:dark] placeholder:text-muted/80 transition-colors duration-200 hover:border-fg/60 focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[invalid=true]:border-[#ff8a7a]";

function PlanDialog({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const { currency, openBrief } = useLaunch();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [values, setValues] = useState<DialogValues>(emptyValues);
  const [errors, setErrors] = useState<DialogErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [honeypot, setHoneypot] = useState("");
  const openedAt = useRef(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (plan && !dialog.open) {
      setStatus("idle");
      setErrors({});
      openedAt.current = Date.now();
      dialog.showModal();
    } else if (!plan && dialog.open) {
      dialog.close();
    }
  }, [plan]);

  if (!plan) {
    return <dialog ref={dialogRef} aria-label="Plan request" className="hidden" onClose={onClose} />;
  }

  const price = formatPrice(plan.price[currency], currency);

  const update = (field: keyof DialogValues, value: string) => {
    const max = field === "message" ? 500 : LEAD_LIMITS[field];
    setValues((current) => ({ ...current, [field]: value.slice(0, max) }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending" || honeypot.trim()) return;
    const name = values.name.trim();
    const email = values.email.trim();
    const phone = values.phone.trim();
    const found: DialogErrors = {};
    if (!name) found.name = "Please enter your name.";
    if (!EMAIL_RE.test(email)) found.email = email ? "Enter a valid email address." : "Please enter your email address.";
    if (!PHONE_RE.test(phone) || phone.replace(/\D/g, "").length < 7) {
      found.phone = phone ? "Enter a valid number, including the country code." : "Please enter your phone or WhatsApp number.";
    }
    if (Object.keys(found).length) {
      setErrors(found);
      const first = (["name", "email", "phone"] as const).find((field) => found[field]);
      if (first) document.getElementById(`pd-${first}`)?.focus();
      trackLaunch({ type: "form_error", label: `plan:${Object.keys(found).join(",")}` });
      return;
    }
    if (Date.now() - openedAt.current < 1500) return;
    setStatus("sending");
    const ok = await saveLead({
      kind: "plan",
      name,
      email,
      phone,
      plan: plan.name,
      currency,
      price: plan.price[currency],
      message: values.message.trim(),
    });
    trackLaunch({ type: "form_submit", label: `plan:${plan.id}`, ok });
    setStatus(ok ? "sent" : "error");
  };

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="plan-dialog-title"
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop (the dialog element itself, outside the panel) closes it.
        if (event.target === dialogRef.current) close();
      }}
      className="m-auto w-[min(100%-2rem,32rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[var(--radius-card)] border border-line-strong bg-surface p-0 text-fg shadow-[0_40px_120px_-20px_rgba(0,0,0,0.7)] backdrop:bg-canvas/80 backdrop:backdrop-blur-sm"
    >
      <div className="relative p-6 sm:p-8">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-sharp text-muted transition-colors hover:text-fg"
        >
          <Icon name="close" size={20} />
        </button>

        {status === "sent" ? (
          <div role="status" aria-live="polite">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-accent text-canvas">
              <Icon name="check" size={24} />
            </span>
            <h2 id="plan-dialog-title" className="mt-5 font-display text-[1.75rem] font-medium leading-[1.1] tracking-[-0.03em]">
              {dialogCopy.successTitle}
            </h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{dialogCopy.successText}</p>
            <div className="mt-7 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  openBrief({ plan: plan.name, name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim() });
                  close();
                }}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-sharp bg-accent px-5 text-[0.9375rem] font-semibold text-canvas transition-colors hover:bg-accent-2"
              >
                {dialogCopy.addDetails}
                <Icon name="arrow" size={16} />
              </button>
              <button
                type="button"
                onClick={close}
                className="inline-flex min-h-[44px] items-center justify-center text-[0.9375rem] font-medium text-muted transition-colors hover:text-fg"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form noValidate onSubmit={submit} aria-busy={status === "sending" || undefined}>
            <p className="font-mono text-[0.75rem] tracking-[0.08em] text-accent uppercase">
              {plan.name} plan · {price}
            </p>
            <h2 id="plan-dialog-title" className="mt-3 pr-10 font-display text-[1.75rem] font-medium leading-[1.1] tracking-[-0.03em]">
              {dialogCopy.title(plan.name)}
            </h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{dialogCopy.lead}</p>

            <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
              <label htmlFor="pd-website">Website</label>
              <input
                id="pd-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
              />
            </div>

            <div className="mt-6 grid gap-4">
              {(
                [
                  { field: "name", label: "Your name", type: "text", autoComplete: "name", inputMode: undefined },
                  { field: "email", label: "Email", type: "email", autoComplete: "email", inputMode: "email" },
                  { field: "phone", label: "Phone or WhatsApp (with country code)", type: "tel", autoComplete: "tel", inputMode: "tel" },
                ] as const
              ).map((item) => (
                <div key={item.field}>
                  <label htmlFor={`pd-${item.field}`} className="mb-2 block text-sm font-medium">
                    {item.label}
                    <span aria-hidden="true" className="ml-1 text-accent">
                      *
                    </span>
                  </label>
                  <input
                    id={`pd-${item.field}`}
                    name={item.field}
                    type={item.type}
                    inputMode={item.inputMode}
                    autoComplete={item.autoComplete}
                    spellCheck={item.field === "email" ? false : undefined}
                    aria-required="true"
                    aria-invalid={errors[item.field] ? true : undefined}
                    aria-describedby={errors[item.field] ? `pd-${item.field}-error` : undefined}
                    value={values[item.field]}
                    onChange={(event) => update(item.field, event.target.value)}
                    disabled={status === "sending"}
                    placeholder={item.field === "phone" ? (currency === "INR" ? "+91" : "+") : undefined}
                    className={inputClass}
                  />
                  {errors[item.field] ? (
                    <p id={`pd-${item.field}-error`} className="mt-2 text-sm text-[#ff8a7a]">
                      {errors[item.field]}
                    </p>
                  ) : null}
                </div>
              ))}
              <div>
                <label htmlFor="pd-message" className="mb-2 block text-sm font-medium">
                  Your project in one line <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id="pd-message"
                  name="message"
                  type="text"
                  value={values.message}
                  onChange={(event) => update("message", event.target.value)}
                  disabled={status === "sending"}
                  placeholder="For example: a booking app for my salon"
                  className={inputClass}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={status === "sending"}
              className="group mt-7 inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-sharp bg-accent px-5 text-[0.9375rem] font-semibold text-canvas transition-[background-color,transform] duration-200 hover:bg-accent-2 active:translate-y-px disabled:opacity-70"
            >
              {status === "sending" ? "Sending…" : dialogCopy.submit(plan.name)}
              <Icon name="arrow" size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
            <p className="mt-3 flex items-center justify-center gap-2 text-[0.8125rem] text-muted">
              <Icon name="shield" size={14} />
              Nothing to pay now. No obligation.
            </p>
            <div role="alert">
              {status === "error" ? (
                <p className="mt-4 text-sm text-[#ff8a7a]">Your request could not be sent. Please try again in a moment.</p>
              ) : null}
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
