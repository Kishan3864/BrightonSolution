import { site } from "@/lib/site";

export type LegalTerm = { term: string; detail: string };

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "terms"; items: LegalTerm[] };

export type LegalSection = {
  id: string;
  title: string;
  blocks: LegalBlock[];
};

export type LegalPoint = { title: string; text: string };

export type LegalDocument = {
  slug: "privacy" | "terms";
  title: string;
  description: string;
  lead: string;
  updated: string;
  updatedISO: string;
  summaryTitle: string;
  summaryNote: string;
  summary: LegalPoint[];
  sections: LegalSection[];
};

/* Inline links inside copy use a tiny [label](href) notation that LegalPage renders. */
const email = site.email;
const mail = `[${email}](mailto:${email})`;
export const legalHost = site.url.replace(/^https?:\/\//, "");
const siteLink = `[${legalHost}](/)`;

const p = (text: string): LegalBlock => ({ type: "p", text });
const list = (...items: string[]): LegalBlock => ({ type: "list", items });
const defs = (...items: LegalTerm[]): LegalBlock => ({ type: "terms", items });

export const lastUpdated = { label: "8 October 2026", iso: "2026-10-08" };

export const privacyPolicy: LegalDocument = {
  slug: "privacy",
  title: "Privacy Policy",
  description:
    "How BrightonSolution handles the information you share through brightonsolution.com: what we collect, why, how long we keep it and how to ask us to change or delete it.",
  lead:
    "What we collect when you use this website or contact us through it, why we collect it, and how to ask us to see, correct or delete it.",
  updated: lastUpdated.label,
  updatedISO: lastUpdated.iso,
  summaryTitle: "What this policy means in practice",
  summaryNote: "A plain-language summary for convenience. The full policy below is what applies.",
  summary: [
    {
      title: "We only hold what you send us",
      text: "The contact form and email are the only ways this website collects personal information. There is no account, no database and no tracking.",
    },
    {
      title: "No cookies, no analytics",
      text: "This is a static site. It sets no cookies and runs no analytics or advertising trackers. Our hosting provider may keep standard server logs.",
    },
    {
      title: "Never sold",
      text: "We share information only with the providers that host the site and our email, or when the law requires it.",
    },
    {
      title: "You stay in control",
      text: "Email us at any time to see, correct or delete what we hold about you.",
    },
  ],
  sections: [
    {
      id: "who-we-are",
      title: "Who we are",
      blocks: [
        p(
          `This website, ${siteLink}, is operated by ${site.name}, a software development and IT services company. We are responsible for the personal information collected through this site, which makes us the controller of that information where data-protection law uses the term.`,
        ),
        p(`If you have a question about this policy or about how we handle your information, email us at ${mail}.`),
      ],
    },
    {
      id: "what-this-policy-covers",
      title: "What this policy covers",
      blocks: [
        p(
          "This policy applies to this website only. It explains what information we collect when you visit the site or contact us through it, how we use that information and the choices you have.",
        ),
        p(
          "It does not cover the software we build or operate for clients. Each project has its own agreement that sets out how data is handled, and any product we deliver carries its own privacy terms where they are needed.",
        ),
      ],
    },
    {
      id: "information-you-give-us",
      title: "Information you give us",
      blocks: [
        p("The only personal information this site collects is what you choose to send us. That happens in two ways:"),
        list(
          "Through the contact form, which asks for your name, company, email address, phone number, the service you are interested in, an approximate budget and a message.",
          `By emailing us directly at ${email}, in which case we receive whatever you include in the email together with your email address.`,
        ),
        p("We use this information to:"),
        list(
          "Reply to your enquiry and answer your questions.",
          "Prepare an estimate or proposal if you ask for one, which may involve discussing your company, project and budget within our team.",
          "Keep a record of our correspondence so that we have the context if you come back to us later.",
        ),
        p(
          "We do not add you to a mailing list or send you marketing because you contacted us. If we follow up, it is about the enquiry you made.",
        ),
      ],
    },
    {
      id: "how-the-contact-form-is-sent",
      title: "How the contact form is sent",
      blocks: [
        p("Depending on how the form is configured, your message reaches us in one of two ways:"),
        list(
          "Through a form-delivery service. The form sends your details to a third-party service that forwards them to our inbox. That provider processes your details on our behalf and only for that purpose.",
          `Through your own email application. Where no delivery service is configured, pressing send opens a new message in your email client, addressed to ${email} and pre-filled with what you typed. Nothing leaves your device until you choose to send that email, and the message travels through your own email provider.`,
        ),
        p(
          "In both cases the form does not store your details on this website. There is no database behind this site, and we cannot see anything you type until the message arrives in our inbox.",
        ),
      ],
    },
    {
      id: "information-collected-automatically",
      title: "Information collected automatically",
      blocks: [
        p(
          "This is a static website: a set of files served by a hosting provider, with no server-side application of our own that records who visits.",
        ),
        p(
          "Like almost every website, the hosting provider that serves these files may keep standard server logs. Those logs typically include your IP address, browser type, the pages you requested and the time of each request. They are used for security, to detect abuse and to keep the service running, and they are retained according to the provider’s own policies.",
        ),
        p(
          "We do not run advertising trackers, and we do not currently use analytics cookies. The site itself sets no cookies. If that changes, we will update this page before the change takes effect.",
        ),
      ],
    },
    {
      id: "third-party-services",
      title: "Third-party services",
      blocks: [
        p("We keep the number of services involved in running this site small. The ones that may handle your information are:"),
        defs(
          {
            term: "Hosting",
            detail: "The provider that stores and serves the website’s files and that may keep the server logs described above.",
          },
          {
            term: "Email",
            detail: "The provider that hosts our mailbox, where every enquiry ultimately arrives and is stored.",
          },
          {
            term: "Form delivery",
            detail: "If the contact form is configured to use a delivery service, that service receives the form fields and forwards them to us.",
          },
        ),
        p(
          "The typeface used on this site is bundled with the site when it is built and served from the same place as the rest of its files. Your browser does not request fonts from a third-party font service when you visit.",
        ),
      ],
    },
    {
      id: "legal-bases",
      title: "Legal bases for using your information",
      blocks: [
        p("Where data-protection law such as the GDPR applies, we rely on the following grounds:"),
        defs(
          {
            term: "Steps before a contract",
            detail: "Handling your enquiry, answering your questions and preparing a proposal that you have asked for.",
          },
          {
            term: "Legitimate interest",
            detail:
              "Keeping a record of our correspondence, protecting the website from abuse and running our business in an orderly way, where that does not override your own rights and interests.",
          },
          {
            term: "Consent",
            detail:
              "Where you choose to send us information we have not asked for, such as extra details in your message. You can withdraw consent at any time by asking us to delete it.",
          },
          {
            term: "Legal obligation",
            detail: "Where we are required by law to keep or disclose information.",
          },
        ),
      ],
    },
    {
      id: "retention",
      title: "How long we keep information",
      blocks: [
        p(
          "We keep the information you send us for as long as we need it to deal with your enquiry and any work that follows from it. If a project goes ahead, correspondence is kept for the duration of the engagement and for a reasonable period afterwards so that we can answer questions about the work.",
        ),
        p(
          "If nothing comes of an enquiry, we delete or anonymise the correspondence once it is no longer needed. You can ask us to delete it sooner at any time.",
        ),
        p("Server logs kept by our hosting provider are retained according to that provider’s schedule, which we do not control."),
      ],
    },
    {
      id: "sharing",
      title: "Sharing",
      blocks: [
        p("We never sell personal information, and we do not share it with anyone for their own marketing."),
        p("We share it only:"),
        list(
          "With the service providers named above, to the extent needed for them to host the site, deliver the form and run our email. They act on our instructions and may not use your information for anything else.",
          "When we are required to by law, a court order or a public authority with the right to ask.",
        ),
      ],
    },
    {
      id: "international-transfers",
      title: "International transfers",
      blocks: [
        p(
          "We work with clients worldwide, and the providers that host this website and our email may store data in countries other than yours. That means your information may be processed outside the country you live in.",
        ),
        p(
          "Where a transfer is subject to data-protection law, we rely on the safeguards that law provides, such as an adequacy decision or the standard contractual clauses our providers have put in place. Email us if you would like to know more about where your information is held.",
        ),
      ],
    },
    {
      id: "your-rights",
      title: "Your rights",
      blocks: [
        p("Depending on where you live, you may have the right to:"),
        list(
          "Ask for a copy of the personal information we hold about you.",
          "Have inaccurate information corrected.",
          "Have your information deleted.",
          "Object to, or ask us to restrict, how we use it.",
          "Receive the information you gave us in a portable format.",
          "Complain to the data-protection authority in your country.",
        ),
        p(
          `To exercise any of these rights, email ${mail}. We may need to confirm your identity before acting on a request, and we will reply within the time the applicable law allows.`,
        ),
      ],
    },
    {
      id: "security",
      title: "Security",
      blocks: [
        p(
          "We take reasonable technical and organisational measures to protect the information we hold, including serving the site over HTTPS, limiting access to our mailbox and hosting accounts to the people who need it, and keeping information only for as long as we need it.",
        ),
        p(
          `No method of transmission or storage is completely secure, so we cannot guarantee absolute security. If you believe your information has been compromised, tell us at ${mail} so that we can look into it.`,
        ),
      ],
    },
    {
      id: "children",
      title: "Children",
      blocks: [
        p(
          "This website is not directed at children under 16, and we do not knowingly collect personal information from them. If you believe a child has sent us information through this site, email us and we will delete it.",
        ),
      ],
    },
    {
      id: "links-to-other-sites",
      title: "Links to other sites",
      blocks: [
        p(
          "This site may link to websites we do not run. Those sites have their own privacy practices, and this policy does not apply to them. Check their policies before giving them any information.",
        ),
      ],
    },
    {
      id: "changes-to-this-policy",
      title: "Changes to this policy",
      blocks: [
        p(
          "We may update this policy as the site or the law changes. The date at the top of this page shows when it was last revised. If we make a change that materially affects how we use your information, we will say so clearly on this page.",
        ),
      ],
    },
    {
      id: "contact",
      title: "Contact",
      blocks: [p(`Questions, requests or concerns about this policy can be sent to ${mail}.`)],
    },
  ],
};

export const termsOfService: LegalDocument = {
  slug: "terms",
  title: "Terms of Service",
  description:
    "The terms that apply when you browse brightonsolution.com or send BrightonSolution an enquiry through it: use of the site, intellectual property, disclaimers and liability.",
  lead:
    "The terms that apply when you browse this website or send us an enquiry through it. Any project we carry out is governed by its own written agreement.",
  updated: lastUpdated.label,
  updatedISO: lastUpdated.iso,
  summaryTitle: "What these terms mean in practice",
  summaryNote: "A plain-language summary for convenience. The full terms below are what apply.",
  summary: [
    {
      title: "Information, not an offer",
      text: "This website describes what we do and how we work. Nothing on it is a quote, a contract or professional advice for your situation.",
    },
    {
      title: "Projects have their own agreement",
      text: "Sending an enquiry does not create a contract. Any work we do for you is governed by a separate signed agreement or accepted proposal.",
    },
    {
      title: "Use the site fairly",
      text: "Browse it and use the contact form as intended. Do not scrape, probe, attack or interfere with it.",
    },
    {
      title: "The content is ours",
      text: "The text, logo, design and code belong to BrightonSolution or its licensors. Ask before reusing any of it.",
    },
  ],
  sections: [
    {
      id: "agreement-to-these-terms",
      title: "Agreement to these terms",
      blocks: [
        p(
          `These terms govern your use of ${siteLink}, the website of ${site.name}. By visiting the site, reading it or sending us a message through it, you agree to them. If you do not agree, please do not use the site.`,
        ),
        p(
          "They apply to the website only. Any project we carry out for you is governed by a separate written agreement, which takes precedence over these terms for that work.",
        ),
      ],
    },
    {
      id: "who-we-are",
      title: "Who we are",
      blocks: [
        p(
          `${site.name} is a software development and IT services company that designs, builds and maintains software for startups, small businesses and enterprises worldwide. You can reach us at ${mail}.`,
        ),
      ],
    },
    {
      id: "use-of-the-website",
      title: "Use of the website",
      blocks: [
        p(
          "You may browse the site and use its contact form for their intended purposes: learning about what we do and getting in touch about a project. In doing so, you agree not to:",
        ),
        list(
          "Use the site for anything unlawful or in a way that breaches these terms.",
          "Scrape, crawl or copy the site other than as an ordinary search engine or browser would.",
          "Attempt to probe, attack or gain unauthorised access to the site, the hosting it runs on or any related system.",
          "Interfere with the site’s operation, for example by sending excessive requests or by submitting the contact form automatically or with misleading content.",
          "Send us content through the form that is abusive, unlawful or that you do not have the right to share.",
        ),
        p("We may block access to the site from any source that we reasonably believe is breaking these rules."),
      ],
    },
    {
      id: "content-and-intellectual-property",
      title: "Content and intellectual property",
      blocks: [
        p(
          `Everything on this site, including the text, the ${site.name} name and logo, the design, the illustrations and the code, is owned by ${site.name} or its licensors and is protected by copyright and trademark law.`,
        ),
        p(
          `You may view the site and print or save pages for your own reference. You may not copy, republish, redistribute or create derivative works from any part of it, or use our name or logo, without our written permission. To ask for permission, email ${mail}.`,
        ),
        p(
          "Names of third-party technologies and products mentioned on this site belong to their respective owners. We refer to them only to describe the tools we work with.",
        ),
      ],
    },
    {
      id: "information-only",
      title: "Information only, not advice",
      blocks: [
        p(
          "The content of this site is general information about our services and how we work. It is not professional, legal, financial or technical advice for your particular situation, and it is not an offer that can be accepted to form a contract.",
        ),
        p(
          "Descriptions of services, processes, technologies and engagement models are indicative. The scope, price, timeline and terms of any project are set out in a separate written proposal or agreement, and only that document is binding.",
        ),
        p("We try to keep the site accurate and current, but we do not promise that everything on it is complete or free from error."),
      ],
    },
    {
      id: "enquiries-and-proposals",
      title: "Enquiries and proposals",
      blocks: [
        p(
          "Sending us a message through the contact form or by email is an enquiry, not an order. It does not create a contract between us, oblige us to take on your project or oblige you to proceed.",
        ),
        p(
          "If we think we can help, we will reply with questions, a suggested approach or a proposal. An engagement begins only when both parties sign a written agreement, or when you accept a written proposal that states it forms the agreement between us.",
        ),
        p("How we handle the information you send us is described in our [Privacy Policy](/privacy)."),
      ],
    },
    {
      id: "third-party-links",
      title: "Third-party links",
      blocks: [
        p(
          "The site may contain links to websites, tools or services run by others. We include them for convenience and reference only. We do not control those sites, we do not endorse them, and we are not responsible for their content, availability or terms. Use them at your own discretion.",
        ),
      ],
    },
    {
      id: "disclaimer-of-warranties",
      title: "Disclaimer of warranties",
      blocks: [
        p(
          "The site is provided “as is” and “as available”. To the fullest extent permitted by law, we make no warranties or representations of any kind about it, express or implied, including that it will be uninterrupted, error-free, secure or free of viruses or other harmful components, or that its content is accurate or suitable for any purpose.",
        ),
        p("Nothing in these terms excludes or limits any warranty that cannot lawfully be excluded."),
      ],
    },
    {
      id: "limitation-of-liability",
      title: "Limitation of liability",
      blocks: [
        p(
          `To the extent permitted by law, ${site.name} will not be liable for any loss or damage arising from your use of, or inability to use, this website or anything on it. That includes indirect, incidental or consequential loss, lost profits, lost data and loss of business, however it arises.`,
        ),
        p(
          "This limitation applies to the website only. Liability in relation to project work is dealt with in the agreement that covers that work. Nothing in these terms excludes or limits liability that cannot be excluded by law, such as liability for death or personal injury caused by negligence, or for fraud.",
        ),
      ],
    },
    {
      id: "indemnity",
      title: "Indemnity",
      blocks: [
        p(
          `If your breach of these terms, your misuse of the site or any content you submit through it leads to a claim against ${site.name}, you agree to compensate us for the reasonable costs, losses and expenses that result, including reasonable legal fees. This does not apply to the extent the claim was caused by our own fault.`,
        ),
      ],
    },
    {
      id: "privacy",
      title: "Privacy",
      blocks: [
        p(
          "Our [Privacy Policy](/privacy) explains what information we collect through this site, why, and how you can ask us to correct or delete it. It forms part of these terms.",
        ),
      ],
    },
    {
      id: "changes",
      title: "Changes to the site and these terms",
      blocks: [
        p(
          "We may change, suspend or remove any part of the site at any time without notice. We may also update these terms. The date at the top of this page shows when they were last revised, and the version published here is the one that applies. If you continue to use the site after a change, you accept the revised terms.",
        ),
      ],
    },
    {
      id: "severability",
      title: "Severability",
      blocks: [
        p(
          "If any part of these terms is found to be invalid or unenforceable, that part will be applied to the maximum extent permitted and the remaining terms will continue in full force.",
        ),
      ],
    },
    {
      id: "governing-law",
      title: "Governing law",
      blocks: [
        p(
          `These website terms are governed by the laws applicable where ${site.name} is established, and any dispute about them will be dealt with by the courts of that place, unless the law where you live gives you the right to bring a claim elsewhere.`,
        ),
        p(
          "The agreement for any project we carry out states the law that governs that project and how disputes about it are resolved. Where that agreement and these terms differ, the agreement applies to the project.",
        ),
      ],
    },
    {
      id: "contact",
      title: "Contact",
      blocks: [p(`Questions about these terms can be sent to ${mail}.`)],
    },
  ],
};

export const legalDocuments: LegalDocument[] = [privacyPolicy, termsOfService];
