import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ScanText,
  Sparkles,
  ShieldCheck,
  FileText,
  Layers,
  LockKeyhole,
  CircleCheck,
  MoveUpRight,
  Fingerprint,
  BookOpen,
  GraduationCap,
  Feather,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Button,
  Card,
  Badge,
  ErrorBox,
  PageHeader,
  Loading,
} from "./components";
import { api } from "./api";
import { useAuth, useConfig, useToast } from "./state";

export const features = [
  {
    icon: ScanText,
    name: "Plagiarism checker",
    text: "See where your writing overlaps. Review matching sources and put every citation in context.",
    path: "/plagiarism-checker",
    color: "indigo",
  },
  {
    icon: Fingerprint,
    name: "AI content detector",
    text: "Get an additional perspective on your text, with transparent provider information and limitations.",
    path: "/ai-detector",
    color: "teal",
  },
  {
    icon: Sparkles,
    name: "Thoughtful rewriting",
    text: "Find a more natural voice. Refine clarity and tone while keeping your ideas at the center.",
    path: "/humanizer",
    color: "purple",
  },
];
export function Home() {
  const { data: config } = useConfig();
  return (
    <>
      <section className="hero">
        <div className="hero-grid container">
          <div className="hero-copy">
            <span className="hero-pill">
              <span /> A clearer view of your writing <ArrowUpRight size={13} />
            </span>
            <h1>
              Your ideas.
              <br />
              Your voice.
              <br />
              <span>More confidence.</span>
            </h1>
            <p>
              From the first draft to the final submission, get the clarity you
              need. Check originality, explore AI insights, and refine your
              writing in one workspace.
            </p>
            <div className="button-row">
              <Button to="/register">
                Check your writing <ArrowRight size={18} />
              </Button>
              <Button secondary to="/how-it-works">
                See how it works <ArrowUpRight size={17} />
              </Button>
            </div>
            <div className="hero-assurances">
              <span>
                <CircleCheck size={15} /> No subscription required
              </span>
              <span>
                <LockKeyhole size={15} /> Private documents
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="orbit one" />
            <div className="orbit two" />
            <div className="report-illustration">
              <div className="illustration-top">
                <span className="mini-logo">
                  <ShieldCheck size={17} /> CheckWise workspace
                </span>
                <span className="window-dots">•••</span>
              </div>
              <div className="illustration-content">
                <div className="report-title-row">
                  <span className="document-icon">
                    <FileText />
                  </span>
                  <div>
                    <small>YOUR NEXT GREAT DRAFT</small>
                    <h3>A fresh perspective</h3>
                  </div>
                  <Badge>Document review</Badge>
                </div>
                <div className="document-lines">
                  <span />
                  <span />
                  <span className="highlight-line" />
                  <span />
                  <span className="short" />
                </div>
                <div className="review-grid">
                  <div>
                    <span className="review-icon indigo">
                      <ScanText size={20} />
                    </span>
                    <h4>Originality</h4>
                    <p>Understand your sources</p>
                  </div>
                  <div>
                    <span className="review-icon teal">
                      <Fingerprint size={20} />
                    </span>
                    <h4>AI insights</h4>
                    <p>Explore another perspective</p>
                  </div>
                </div>
                <div className="report-note">
                  <ShieldCheck size={18} />
                  <span>
                    Your work stays yours.
                    <small>Private uploads. Clear, contextual reports.</small>
                  </span>
                  <Check size={17} />
                </div>
              </div>
              <div className="illustration-bottom">
                <span>PDF · DOCX · TXT</span>
                <span>
                  One connected workspace <MoveUpRight size={13} />
                </span>
              </div>
            </div>
            <div className="floating-note">
              <span>
                <Sparkles size={20} />
              </span>
              <div>
                A little polish. A lot of you.
                <small>Keep your meaning. Find your flow.</small>
              </div>
            </div>
            <p className="illustration-caption">
              Workspace illustration · no detection results shown
            </p>
          </div>
        </div>
        <div className="container hero-audience">
          <span>MADE FOR THE WAY YOU WRITE</span>
          <div>
            <span>
              <GraduationCap /> Students
            </span>
            <span>
              <BookOpen /> Researchers
            </span>
            <span>
              <Feather /> Writers
            </span>
            <span>
              <Layers /> Educators
            </span>
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR WRITING TOOLKIT</span>
            <h2>
              One workspace.
              <br />A more considered draft.
            </h2>
          </div>
          <p>
            Purposeful tools for people who care about what they put into the
            world.
          </p>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, ...f }) => (
            <Link className="card feature-card" to={f.path} key={f.path}>
              <span className={"feature-icon " + f.color}>
                <Icon size={25} />
              </span>
              <h3>{f.name}</h3>
              <p>{f.text}</p>
              <span className="text-link">
                Explore tool <ArrowUpRight size={17} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="steps-section">
        <div className="container">
          <span className="eyebrow">LESS FRICTION. MORE FOCUS.</span>
          <h2>From upload to understanding.</h2>
          <div className="steps-grid">
            {[
              [
                "01",
                "Bring your words",
                "Upload a PDF, DOCX, or TXT file. Or simply paste your text.",
              ],
              [
                "02",
                "Choose your perspective",
                "Check originality, explore AI insights, or refine your writing.",
              ],
              [
                "03",
                "Make your next move",
                "Review your results in context and download a private PDF report.",
              ],
            ].map(([n, t, d]) => (
              <div className="step" key={n}>
                <span>{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
          <Button to="/register">
            Start with your first document <ArrowRight size={17} />
          </Button>
        </div>
      </section>
      <section className="section container trust-section">
        <div className="trust-art">
          <LockKeyhole size={54} />
          <span className="trust-ring" />
        </div>
        <div>
          <span className="eyebrow">TRUST IS PART OF THE PRODUCT</span>
          <h2>
            Your writing deserves
            <br />a private workspace.
          </h2>
          <p>
            Owner-only documents. Transparent providers. Clear limitations. We
            believe useful tools should help you make informed decisions.
          </p>
          <ul className="check-list">
            <li>
              <Check /> Authorized downloads and private storage
            </li>
            <li>
              <Check /> Credits reserved up front and released on failed checks
            </li>
            <li>
              <Check /> Configurable document retention and deletion
            </li>
          </ul>
          <Link to="/privacy" className="text-link">
            Read our privacy policy <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
      <section className="container cta-panel">
        <div>
          <span className="eyebrow">LET YOUR IDEAS COME THROUGH</span>
          <h2>Your next draft starts here.</h2>
          <p>Simple credits. Useful context. A clearer way forward.</p>
        </div>
        <Button to="/register">
          Create your account <ArrowRight size={18} />
        </Button>
      </section>
      {config?.detection_mock && (
        <div className="container public-development">
          This environment uses development detection fixtures. Real analysis
          requires a licensed provider. AI detection is never proof of
          authorship.
        </div>
      )}
    </>
  );
}
export function Pricing() {
  const { data, isPending, error } = useConfig();
  return (
    <div className="container public-page">
      <PageHeader
        eyebrow="SIMPLE, TRANSPARENT PRICING"
        title="Room for your next idea."
        text="Choose the credits you need. No hidden renewals. Prices are in Kenyan shillings."
      />
      <ErrorBox error={error} />
      {isPending ? (
        <Loading />
      ) : (
        <>
          <div className="pricing-grid">
            {data?.packages.map((p, i) => (
              <Card
                key={p.id}
                className={"pricing-card " + (i === 1 ? "featured" : "")}
              >
                <Badge>
                  {p.subscription_days
                    ? "Prepaid monthly plan"
                    : i === 1
                      ? "A little more room"
                      : "Pay as you go"}
                </Badge>
                <h3>{p.name}</h3>
                <div className="price">KSh {p.price_kes.toLocaleString()}</div>
                <p>
                  {p.credits} credits{" "}
                  {p.subscription_days
                    ? `· ${p.subscription_days}-day term`
                    : "· no automatic renewal"}
                </p>
                <ul className="check-list">
                  <li>
                    <Check /> All content review tools
                  </li>
                  <li>
                    <Check /> Private PDF reports
                  </li>
                  <li>
                    <Check /> M-Pesa checkout
                  </li>
                </ul>
                <Button to="/app/credits" secondary={i !== 1}>
                  Choose package <ArrowRight size={16} />
                </Button>
              </Card>
            ))}
          </div>
          <Card>
            <h2>Know your cost before you check</h2>
            <div className="cost-grid">
              {data?.prices.map((p) => (
                <div key={p.kind}>
                  <strong>{p.credits} credits</strong>
                  <span>
                    {p.kind === "humanize" ? "Rewriting" : p.kind} /{" "}
                    {p.word_allowance.toLocaleString()} words
                  </span>
                </div>
              ))}
            </div>
            <p>
              Each started word allowance is billed as a unit. Your exact cost
              is shown before submission. Failed checks release reserved
              credits.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
const articles: Record<
  string,
  {
    eyebrow: string;
    title: string;
    intro: string;
    sections: [string, string][];
  }
> = {
  about: {
    eyebrow: "OUR PURPOSE",
    title: "Good writing starts with understanding.",
    intro:
      "CheckWise AI brings content review and thoughtful revision into a private, approachable workspace.",
    sections: [
      [
        "Built around the writer",
        "We help students, researchers, educators and professionals examine their work, understand sources and refine their own voice.",
      ],
      [
        "Context over certainty",
        "Similarity can include legitimate quotations. AI detection has false positives. We show provider details and limitations so that you can make a considered judgment.",
      ],
      [
        "An original product",
        "CheckWise AI is independently built. No Turnitin affiliation, corpus access, or licensed integration is claimed.",
      ],
    ],
  },
  "how-it-works": {
    eyebrow: "A SIMPLE WORKFLOW",
    title: "Bring a draft. Leave with clarity.",
    intro:
      "From your first upload to a report you can review, everything stays in one workspace.",
    sections: [
      [
        "1. Create and verify your account",
        "Register with your email, follow the verification link, and sign in.",
      ],
      [
        "2. Add credits",
        "Choose a package and pay through M-Pesa when enabled. In development, simulations are explicitly labeled and do not move money.",
      ],
      [
        "3. Upload and choose a check",
        "Paste text or upload PDF, DOCX or TXT. Review the word count and exact credit quote before confirming.",
      ],
      [
        "4. Review in context",
        "Track processing, explore source matches and provider-reported insights, then download your private PDF. Failed checks release your reserved credits.",
      ],
    ],
  },
  privacy: {
    eyebrow: "PRIVACY POLICY",
    title: "Your work stays yours.",
    intro:
      "This policy describes the application’s data handling. The deploying operator must supply its legal identity, contact address and applicable jurisdiction before commercial launch.",
    sections: [
      [
        "What we store",
        "Account details, private documents and extracted text, check results, credit movements, support messages and payment metadata are stored to provide the service. M-Pesa credentials and passwords are not exposed to the browser. Passwords are hashed.",
      ],
      [
        "Processing providers",
        "When a real provider is configured, document content is sent to that licensed provider for the selected service. Provider terms and retention must be reviewed before sensitive content is submitted. Development fixtures do not analyze content externally.",
      ],
      [
        "Access and retention",
        "Documents and reports require owner authentication. The default retention period is 90 days; the operator can configure this. You may delete documents after processing ends. Financial ledger records are retained for accounting and audit obligations. Backups may retain deleted data until rotation.",
      ],
      [
        "Your choices",
        "Use account settings to update your name and support to request account deletion or a data export. Do not upload sensitive personal information without an appropriate lawful basis. No document training permission is granted by this policy.",
      ],
      [
        "Essential storage",
        "The application uses an HttpOnly refresh cookie and a CSRF cookie for authentication. Theme preference is stored locally. No advertising trackers are included.",
      ],
    ],
  },
  terms: {
    eyebrow: "TERMS OF SERVICE",
    title: "Tools for responsible writing.",
    intro:
      "These are baseline service terms. Operator identity, legal jurisdiction, taxes and consumer disclosures require legal review before commercial use.",
    sections: [
      [
        "Appropriate use",
        "Submit only content you are authorized to process. Do not use the service to violate academic rules, impersonate others, infringe rights or misrepresent authorship.",
      ],
      [
        "Limitations",
        "AI likelihood is not proof of authorship. Similarity is not a finding of misconduct. Rewriting cannot guarantee any detector score or acceptance by an institution. Independently review every result.",
      ],
      [
        "Credits and service delivery",
        "The quoted credit cost is reserved at submission and consumed upon successful processing. Failed jobs release reservations. Prepaid subscription packages grant one allowance and do not automatically renew or debit a payment method.",
      ],
      [
        "Accounts and access",
        "Keep your account secure. Administrators may suspend misuse. Development mocks are for testing and must not be sold as real analysis.",
      ],
      [
        "Support",
        "Use the contact form or authenticated support tickets for service issues, data requests or disputes.",
      ],
    ],
  },
  "refund-policy": {
    eyebrow: "REFUND POLICY",
    title: "A fair approach to failed checks.",
    intro:
      "Credit accounting is designed to keep unsuccessful processing from consuming your balance.",
    sections: [
      [
        "Failed processing",
        "If a check fails or the processing window expires, its reserved credits are automatically released. Review the credit ledger to confirm the movement.",
      ],
      [
        "Duplicate payments or missing credits",
        "Open a support ticket with your payment identifier. Administrators can reconcile provider status. Frontend messages and unverified callbacks cannot grant credits.",
      ],
      [
        "Cash refunds",
        "Cash refund requests require operator review and verification of the original payment. No automated M-Pesa cash reversal is implemented. Applicable consumer law takes precedence.",
      ],
      [
        "Development payments",
        "Simulated payments do not move money and cannot be redeemed for a cash refund.",
      ],
    ],
  },
};
export function Article({ slug: given }: { slug?: string }) {
  const params = useParams();
  const slug = given || params.slug || "about";
  const a = articles[slug];
  if (!a) return <NotFound />;
  return (
    <article className="container public-page prose">
      <PageHeader eyebrow={a.eyebrow} title={a.title} text={a.intro} />
      {a.sections.map(([t, b]) => (
        <section key={t}>
          <h2>{t}</h2>
          <p>{b}</p>
        </section>
      ))}
      <Button to="/contact" secondary>
        Talk to us <ArrowUpRight size={16} />
      </Button>
    </article>
  );
}
export function Features({ kind }: { kind?: string }) {
  const selected = kind
    ? features.filter((f) => f.path === "/" + kind)
    : features;
  return (
    <div className="container public-page">
      <PageHeader
        eyebrow="A MORE THOUGHTFUL TOOLKIT"
        title={
          selected.length === 1
            ? selected[0].name
            : "Clarity, from every angle."
        }
        text="Review your writing with tools that make their capabilities and limitations clear."
      />
      <div className="feature-grid">
        {selected.map(({ icon: Icon, ...f }) => (
          <Card key={f.path} className="feature-card">
            <span className={"feature-icon " + f.color}>
              <Icon />
            </span>
            <h2>{f.name}</h2>
            <p>{f.text}</p>
            <Button
              to={
                "/app/check/" +
                (f.path === "/humanizer"
                  ? "humanize"
                  : f.path === "/ai-detector"
                    ? "ai"
                    : "plagiarism")
              }
            >
              Open workspace <ArrowRight size={16} />
            </Button>
          </Card>
        ))}
      </div>
      <div className="notice">
        Licensed provider credentials are required for real analysis.
        Development mock results are explicitly labeled. Rewriting is a revision
        aid and does not guarantee detector outcomes.
      </div>
      <Button secondary to="/pricing">
        Explore pricing <ChevronRight size={16} />
      </Button>
    </div>
  );
}
export function FAQ() {
  return (
    <div className="container public-page prose">
      <PageHeader
        eyebrow="GOOD QUESTIONS"
        title="A little more clarity."
        text="Here’s what to know before your first check."
      />
      {[
        [
          "Is AI detection definitive?",
          "No. Results are probabilistic and may misclassify human or AI text. Use them as one input to a broader review.",
        ],
        [
          "Does CheckWise use Turnitin?",
          "No Turnitin integration or affiliation is claimed. Only configured, licensed providers process real checks.",
        ],
        [
          "What happens when a check fails?",
          "Reserved credits are released automatically. Your ledger records both the reservation and its release.",
        ],
        [
          "Which files are supported?",
          "PDF, DOCX and UTF-8 TXT up to 20 MB. Scanned documents require OCR; encrypted or unreadable documents are rejected.",
        ],
        [
          "Does rewriting bypass detectors?",
          "No guarantee is made. Rewriting helps with clarity and tone; users must review meaning, sources and institutional rules.",
        ],
        [
          "How do monthly plans work?",
          "They are prepaid terms with a one-time credit grant. There is no automatic recurring billing.",
        ],
        [
          "What does development mode mean?",
          "Detection fixtures do not compute real scores. Mock rewriting returns the original text. Simulated payments do not charge money.",
        ],
      ].map(([q, a]) => (
        <details key={q}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}
export function Contact() {
  const [sent, setSent] = useState(false);
  const toast = useToast();
  const { user } = useAuth();
  const mutation = useMutation({
    mutationFn: async (form: FormData) =>
      api.post("contact/", Object.fromEntries(form)),
    onSuccess: () => {
      setSent(true);
      toast("Your message has been received.");
    },
  });
  return (
    <div className="container public-page narrow">
      <PageHeader
        eyebrow="WE’RE HERE TO HELP"
        title="Let’s talk."
        text="Questions about your account, a report, or a payment? Send us a message."
      />
      {sent ? (
        <Card>
          <CircleCheck />
          <h2>Message received.</h2>
          <p>We’ll respond using the email address you provided.</p>
          <Button secondary onClick={() => setSent(false)}>
            Send another message
          </Button>
        </Card>
      ) : (
        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(new FormData(e.currentTarget));
            }}
          >
            <label>
              Email address
              <input
                name="email"
                type="email"
                required
                defaultValue={user?.email}
              />
            </label>
            <label>
              Subject
              <input name="subject" required maxLength={200} />
            </label>
            <label>
              Message
              <textarea name="message" required maxLength={10000} rows={6} />
            </label>
            <ErrorBox error={mutation.error} />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Sending…" : "Send message"}{" "}
              <ArrowRight size={16} />
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
export function NotFound() {
  return (
    <div className="container public-page empty">
      <h1>This page took a different path.</h1>
      <p>Let’s get you back to your workspace.</p>
      <Button to="/">
        Go home <ArrowRight size={16} />
      </Button>
    </div>
  );
}
