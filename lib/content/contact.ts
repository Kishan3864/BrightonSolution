export type NextStep = { number: string; text: string };

export const contactHero = {
  eyebrow: "Contact",
  title: "Tell us about your project",
  lead: "A few lines about what you want to build, when you need it and what already exists are enough to start. We reply by email with questions or a proposed next step.",
};

export const emailNote =
  "For new projects, existing systems that need attention and general questions.";

export const nextSteps: NextStep[] = [
  { number: "01", text: "We read your brief and reply by email." },
  { number: "02", text: "A short call to clarify scope, timeline and budget." },
  { number: "03", text: "A written proposal with scope, team and pricing." },
];

export const workingTogether = {
  eyebrow: "Working together",
  text: "We work with clients worldwide and collaborate remotely by default. Calls are scheduled around your time zone, decisions are written down and progress is visible on a shared board, so the work keeps moving even when our working hours do not overlap with yours.",
};

export const contactFormCopy = {
  heading: "Send a brief",
  requiredNote: "Fields marked * are required.",
  groupDetails: "Your details",
  groupProject: "Your project",
  messageHint:
    "What you want to build, who it is for, a rough timeline and anything that already exists.",
  submit: "Send message",
  sending: "Sending…",
  successTitle: "Thanks — your message is on its way.",
  successText: "We’ll reply by email.",
  errorText: "Something went wrong and your message was not sent. Please email us directly instead:",
  mailtoText: "Your email app should open with the details filled in. If it doesn’t, email",
  privacyPrefix: "By sending this form you agree to our",
  privacyLink: "Privacy Policy",
};
