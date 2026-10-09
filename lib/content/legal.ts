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

export const lastUpdated = { label: "9 October 2026", iso: "2026-10-09" };

export const privacyPolicy: LegalDocument = {
  slug: "privacy",
  title: "Privacy Policy",
  description:
    "How BrightonSolution handles information on brightonsolution.com: contact enquiries stored in Google Firebase, cookieless first-party analytics, optional Google Analytics, retention and how to opt out.",
  lead:
    "What we collect when you use this website or contact us through it, where it is stored, how long we keep it, and how to opt out or ask us to delete it.",
  updated: lastUpdated.label,
  updatedISO: lastUpdated.iso,
  summaryTitle: "What this policy means in practice",
  summaryNote: "A plain-language summary for convenience. The full policy below is what applies.",
  summary: [
    {
      title: "Enquiries are stored securely",
      text: "What you send through the contact form is saved in Google Cloud Firestore, where only our team can read it.",
    },
    {
      title: "Cookieless analytics with a random ID",
      text: "We count page views and time on page with a random ID kept in your browser, not with cookies. We store no IP addresses and use no advertising trackers.",
    },
    {
      title: "Google Analytics only with consent",
      text: "If we use Google Analytics, it loads only after you accept it in the banner. Global Privacy Control switches our own analytics off.",
    },
    {
      title: "Never sold, yours to delete",
      text: "We never sell information. Email us at any time to see, correct or delete what we hold about you.",
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
          "This policy applies to this website only. It explains what information we collect when you visit the site or contact us through it, where that information is stored, how we use it and the choices you have.",
        ),
        p(
          "It does not cover the software we build or operate for clients, or the apps and websites shown on our Work page. Each of those has its own terms, and any product we deliver carries its own privacy policy where one is needed.",
        ),
      ],
    },
    {
      id: "information-you-give-us",
      title: "Information you give us",
      blocks: [
        p("You can send us information in two ways:"),
        list(
          "Through the contact form, which asks for your name, company, email address, phone number, the service you are interested in, an approximate budget and a message. Only your name, email address and message are required.",
          `By emailing us directly at ${email}, in which case we receive whatever you include in the email together with your email address.`,
        ),
        p(
          "When you send the form, we also record a few technical details with your message so that we have context for it: the page you sent it from, the page that referred you to the site, your browser’s user-agent string, your browser language and time zone and, if your browser has one, the random visitor ID described under Website analytics. That ID links your enquiry to the page views and clicks recorded from the same browser.",
        ),
        p("We use this information to:"),
        list(
          "Reply to your enquiry and answer your questions.",
          "Prepare an estimate or proposal if you ask for one, which may involve discussing your company, project and budget within our team.",
          "Keep a record of our correspondence so that we have the context if you come back to us later.",
          "Recognise and discard automated or abusive submissions.",
        ),
        p(
          "We do not add you to a mailing list or send you marketing because you contacted us. If we follow up, it is about the enquiry you made.",
        ),
      ],
    },
    {
      id: "how-the-contact-form-is-stored",
      title: "How the contact form is stored",
      blocks: [
        p(
          "When you press send, the form sends your message over an encrypted connection to Cloud Firestore, a database service that Google operates for us as part of Firebase. The submission is stored there until we delete it.",
        ),
        p(
          "The database is configured so that visitors can add a new enquiry but cannot read, change or delete any. Only members of our team, signed in with a verified company account, can read submissions.",
        ),
        p(
          `If the form cannot reach the database, it may offer to open your own email application instead, addressed to ${email} and pre-filled with what you typed. In that case nothing leaves your device until you choose to send that email, and the message travels through your own email provider.`,
        ),
      ],
    },
    {
      id: "website-analytics",
      title: "Website analytics",
      blocks: [
        p(
          "To understand which pages are useful and how people find the site, we run our own first-party analytics. It uses no cookies and is not shared with advertisers. Each record is stored in Cloud Firestore and contains:",
        ),
        list(
          "A random visitor ID, created in your browser and kept in its local storage, so that repeat visits can be counted. On its own it does not identify you, but it is also stored with any contact-form enquiry you send from that browser.",
          "A session ID kept in your browser’s session storage, which changes after 30 minutes of inactivity or when you close the tab.",
          "The pages you view and their titles, the order in which you view them, how long you stay on each page and how far you scroll, and whether this is your first visit.",
          "The referring page and any campaign tags in the link you followed (UTM parameters).",
          "Your screen and browser-window size, device type (desktop, tablet or phone), browser and operating-system family, language and time zone.",
          "Clicks on key links, such as contact buttons, email links, project links and Google Play links, and whether a contact-form submission succeeded (never its contents).",
        ),
        p(
          "We do not record your name, email address or what you type into the form as part of analytics, and we do not store IP addresses. Google’s infrastructure necessarily processes your IP address in order to deliver your requests to this site and to the database, as any web server does.",
        ),
        p(
          "Analytics is switched off entirely when your browser sends a Global Privacy Control signal. In that case no visitor ID is created and no page views or clicks are recorded.",
        ),
      ],
    },
    {
      id: "cookies-and-browser-storage",
      title: "Cookies and browser storage",
      blocks: [
        p(
          "The site itself sets no cookies unless you accept Google Analytics. It does use storage built into your browser, which stays on your device:",
        ),
        defs(
          {
            term: "Local storage",
            detail:
              "The random visitor ID used for analytics and, where a consent banner is shown, your choice about Google Analytics so that we do not ask again on every page.",
          },
          {
            term: "Session storage",
            detail: "The session ID used to group the pages you view in one visit. Your browser removes it when the tab is closed.",
          },
          {
            term: "Service worker",
            detail:
              "A small script that keeps copies of pages and files in your browser’s cache, so the site opens quickly and still works if your connection or our hosting has a problem. It does not send anything to us.",
          },
        ),
        p(
          "If we enable Google Analytics, a banner asks for your permission first. Only if you accept does Google Analytics (Firebase Analytics) load. It then sets Google Analytics cookies, such as _ga, to measure visits, and Google processes that data under its own terms and privacy policy. If you decline, or ignore the banner, Google Analytics never loads. When Google Analytics is not in use, no banner is shown.",
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
            term: "Firebase Hosting",
            detail:
              "Google’s hosting service, which stores and serves the website’s files and keeps standard request logs for security and reliability.",
          },
          {
            term: "Cloud Firestore",
            detail: "Google’s database service, which stores contact-form submissions and the analytics records described above on our behalf.",
          },
          {
            term: "Google Analytics",
            detail: "Optional. Used only if it is enabled and you accept it in the consent banner.",
          },
          {
            term: "Email",
            detail: "The provider that hosts our mailbox, where email enquiries and our replies are stored.",
          },
        ),
        p(
          "The typefaces used on this site are bundled with the site when it is built and served from the same place as the rest of its files. Your browser does not request fonts from a third-party font service when you visit.",
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
              "Keeping a record of our correspondence, measuring how the site is used through cookieless first-party analytics, protecting the site from abuse and running our business in an orderly way, where that does not override your own rights and interests.",
          },
          {
            term: "Consent",
            detail:
              "Google Analytics, which runs only after you accept it, and any information you choose to send us that we have not asked for. You can withdraw consent at any time.",
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
        defs(
          {
            term: "Contact enquiries",
            detail:
              "As long as we need them to deal with your enquiry and any work that follows from it. If a project goes ahead, correspondence is kept for the engagement and a reasonable period afterwards. If nothing comes of an enquiry, we delete it once it is no longer needed.",
          },
          {
            term: "Analytics records",
            detail: "Page views and click records are deleted once they are 26 months old.",
          },
          {
            term: "Google Analytics",
            detail: "Kept according to the data-retention setting of our Google Analytics property, if it is in use.",
          },
          {
            term: "Hosting logs",
            detail: "Kept according to Google’s own schedule for Firebase Hosting, which we do not control.",
          },
        ),
        p("You can ask us to delete your enquiry sooner at any time."),
      ],
    },
    {
      id: "your-choices",
      title: "How to opt out",
      blocks: [
        list(
          "Turn on Global Privacy Control in your browser or a privacy extension. Our analytics will then record nothing about your visits.",
          "Decline Google Analytics in the consent banner, or change your choice later with Analytics settings at the foot of every page.",
          "Clear this site’s data in your browser settings. That removes the visitor ID, your consent choice and the cached pages; a new random ID is created on your next visit unless analytics is switched off.",
          `Email ${mail} to ask us to delete an enquiry or anything else we hold about you.`,
        ),
        p(
          "Analytics records do not contain your name or email address, so unless you have sent the contact form we cannot tell which of them relate to you. If you have, your enquiry is stored with the same visitor ID, which links it to the page views and clicks recorded from that browser, and we include those records when you ask for a copy of your data or for its deletion. Clearing site data or using Global Privacy Control is the most reliable way to stop analytics.",
        ),
      ],
    },
    {
      id: "sharing",
      title: "Sharing",
      blocks: [
        p("We never sell personal information, and we do not share it with anyone for their own marketing."),
        p("We share it only:"),
        list(
          "With the service providers named above, to the extent needed for them to host the site, store enquiries and analytics, and run our email. They act on our instructions and may not use your information for anything else, except Google Analytics, which Google also processes under its own terms when you accept it.",
          "When we are required to by law, a court order or a public authority with the right to ask.",
        ),
      ],
    },
    {
      id: "international-transfers",
      title: "International transfers",
      blocks: [
        p(
          "We work with clients worldwide, and Google and our email provider may store and process data in countries other than yours. That means your information may be processed outside the country you live in.",
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
          "Withdraw consent you have given, such as for Google Analytics.",
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
          "We take reasonable technical and organisational measures to protect the information we hold. The site is served only over HTTPS with strict security headers, database rules allow visitors to add records but not to read them, and access to enquiries and analytics is limited to our team through a verified company account.",
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
          "This site links to other websites and to Google Play listings, including client websites and our own products and apps. Each has its own privacy practices, and this policy does not apply to them. Check their privacy policies before giving them any information.",
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
    "The terms that apply when you browse brightonsolution.com or send BrightonSolution an enquiry through it: use of the site, our work, intellectual property, disclaimers and liability.",
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
      text: "The text, logo, design and code belong to BrightonSolution or its licensors. Third-party names and marks belong to their owners.",
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
          "Attempt to probe, attack or gain unauthorised access to the site, the hosting and database it runs on or any related system.",
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
      id: "our-work",
      title: "Projects shown on our Work page",
      blocks: [
        p(
          "Our [Work](/work) page shows websites, software and Android apps that we have designed and built. The project names, descriptions, screenshots and app icons shown there represent our work and are included to illustrate it.",
        ),
        p(
          "Names, logos and trademarks of clients and other third parties that appear in that work belong to their respective owners. Showing them does not mean that those owners endorse this website or these terms.",
        ),
        p(
          "Project links open the live websites and Google Play listings. Client websites are run by their owners and Google Play by Google, so we do not control their availability, content or terms. Our own products and apps are separate services, and these website terms do not apply to them. Any of these sites and listings may have changed since the screenshots and icons shown here were captured.",
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
          "The site contains links to websites, apps and services run by others. We include them for convenience and reference only. We do not control those sites, we do not endorse them, and we are not responsible for their content, availability or terms. Use them at your own discretion.",
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
          "Our [Privacy Policy](/privacy) explains what information we collect through this site, including contact enquiries and cookieless analytics, why, and how you can opt out or ask us to correct or delete it. It forms part of these terms.",
        ),
      ],
    },
    {
      id: "changes",
      title: "Changes to the site and these terms",
      blocks: [
        p(
          "We may change, suspend or remove any part of the site at any time without notice, including for maintenance. We may also update these terms. The date at the top of this page shows when they were last revised, and the version published here is the one that applies. If you continue to use the site after a change, you accept the revised terms.",
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
