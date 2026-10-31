import { useState } from "react";
import { ResellerCustomers, ResellerPreference } from "./reseller";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Plus,
  FileText,
  ScanText,
  Sparkles,
  Coins,
  Clock3,
  CircleCheck,
  UploadCloud,
  Download,
  Trash2,
  ArrowUpRight,
  Copy,
  CreditCard,
  Gift,
  Users,
  Bell,
  Settings,
  ShieldCheck,
  Search,
} from "lucide-react";
import type { ElementType } from "react";
import { api, download, errorText } from "./api";
import { useAuth, useConfig, useToast } from "./state";
import {
  Badge,
  Button,
  Card,
  ConfirmationDialog,
  DownloadButton,
  Empty,
  ErrorBox,
  Loading,
  PageHeader,
  Pagination,
  StatCard,
} from "./components";
import type {
  Doc,
  Job,
  Page,
  Payment,
  Report,
  Ledger,
  Ticket,
  Notice,
  Subscription,
  Package,
} from "./types";

const date = (s: string) =>
  new Date(s).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
export function useList<T>(path: string, page = 1, polling = false) {
  return useQuery({
    queryKey: [path, page],
    queryFn: async () =>
      (await api.get<Page<T>>(path, { params: { page } })).data,
    refetchInterval: polling ? 4000 : false,
  });
}
function useRefresh() {
  const client = useQueryClient();
  return () => client.invalidateQueries();
}
function useDownload() {
  const toast = useToast();
  return (path: string, name: string) =>
    download(path, name).catch((e) => toast(errorText(e)));
}
export function Overview() {
  const { user } = useAuth();
  const jobs = useList<Job>("detection/", 1, true);
  const stats = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () =>
      (
        await api.get<{
          balance: string;
          reserved: string;
          documents: number;
          completed: number;
          pending: number;
          usage: { day: string; checks: number }[];
        }>("dashboard/")
      ).data,
    refetchInterval: 10000,
  });
  return (
    <>
      <PageHeader
        eyebrow="YOUR WRITING WORKSPACE"
        title={`A fresh perspective${user?.first_name ? ", " + user.first_name : ""}.`}
        text="Bring your ideas. We’ll help you see them more clearly."
        action={
          <Button to="/app/check/combined">
            <Plus size={17} /> New check
          </Button>
        }
      />
      <ErrorBox error={stats.error} />
      {!stats.data ? (
        <Loading />
      ) : (
        <>
          <div className="stats-grid">
            <StatCard
              label="Available credits"
              value={stats.data.balance}
              icon={Coins}
              detail={`${stats.data.reserved} credits reserved`}
            />
            <StatCard
              label="Documents"
              value={stats.data.documents}
              icon={FileText}
              detail="Your private library"
            />
            <StatCard
              label="Completed checks"
              value={stats.data.completed}
              icon={CircleCheck}
              detail="Ready for your review"
            />
            <StatCard
              label="In progress"
              value={stats.data.pending}
              icon={Clock3}
              detail="We’ll notify you when ready"
            />
          </div>
          <div className="workspace-grid">
            <Card className="quick-start">
              <span className="eyebrow">WHAT ARE YOU WORKING ON?</span>
              <h2>Make your next draft count.</h2>
              <p>
                Upload your document and get a clearer picture, one check at a
                time.
              </p>
              <div className="quick-tools">
                {[
                  ["Originality & AI", "combined", ScanText],
                  ["AI detection", "ai", ShieldCheck],
                  ["Refine your voice", "humanize", Sparkles],
                ].map(([t, k, Icon]) => {
                  const I = Icon as ElementType;
                  return (
                    <Link key={String(k)} to={"/app/check/" + k}>
                      <span className="feature-icon indigo">
                        <I size={20} />
                      </span>
                      <strong>{String(t)}</strong>
                      <ArrowUpRight size={16} />
                    </Link>
                  );
                })}
              </div>
              <Link to="/app/check/plagiarism" className="text-link">
                Run a plagiarism-only check <ArrowRight size={15} />
              </Link>
            </Card>
            <Card>
              <div className="card-heading">
                <h2>Your writing activity</h2>
                <Badge>Last 14 days</Badge>
              </div>
              {stats.data.usage.length ? (
                <div
                  className="chart"
                  role="img"
                  aria-label="Completed checks over the last fourteen days"
                >
                  <ResponsiveContainer width="100%" height={210}>
                    <AreaChart data={stats.data.usage}>
                      <defs>
                        <linearGradient id="usage" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor="#5864db"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor="#5864db"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="day"
                        tickFormatter={(s) => date(s).split(",")[0]}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis allowDecimals={false} width={28} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="checks"
                        stroke="#5864db"
                        strokeWidth={3}
                        fill="url(#usage)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Empty
                  title="Your progress starts here"
                  text="Completed checks will appear in your activity chart."
                />
              )}
            </Card>
          </div>
        </>
      )}
      <Card>
        <div className="card-heading">
          <div>
            <h2>Recent checks</h2>
            <p>A little context for your latest work.</p>
          </div>
          <Link to="/app/reports" className="text-link">
            All reports <ArrowRight size={15} />
          </Link>
        </div>
        <ErrorBox error={jobs.error} />
        {jobs.isPending ? (
          <Loading />
        ) : !jobs.data?.results.length ? (
          <Empty
            title="A blank page, full of possibility"
            text="Your checks will appear here once you submit your first document."
            action={
              <Button secondary to="/app/check/combined">
                Start a check <Plus size={16} />
              </Button>
            }
          />
        ) : (
          <JobTable jobs={jobs.data.results.slice(0, 5)} />
        )}
      </Card>
      <div className="context-note">
        <ShieldCheck size={20} />
        <p>
          <strong>Helpful insights, considered decisions.</strong> AI detection
          is one perspective, not proof of authorship. Always review similarity
          matches in context.
        </p>
      </div>
    </>
  );
}
export function JobTable({ jobs }: { jobs: Job[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Document</th>
            <th>Check</th>
            <th>Status</th>
            <th>Credits</th>
            <th>Submitted</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.id}>
              <td>
                <span className="table-document">
                  <FileText size={18} />
                  <Link to={"/app/jobs/" + j.id}>{j.title}</Link>
                </span>
              </td>
              <td>{j.kind}</td>
              <td>
                <Badge status={j.status}>{j.status}</Badge>
              </td>
              <td>{j.cost}</td>
              <td>{date(j.created_at)}</td>
              <td>
                <Link aria-label={"View " + j.title} to={"/app/jobs/" + j.id}>
                  <ArrowUpRight size={17} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function FileUploader({
  file,
  setFile,
}: {
  file: File | null;
  setFile: (file: File | null) => void;
}) {
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  function select(f?: File) {
    setError("");
    if (!f) return;
    if (f.size > 20 * 1024 * 1024 || !/\.(pdf|docx|txt)$/i.test(f.name)) {
      setError("Choose a PDF, DOCX or TXT file no larger than 20 MB.");
      return;
    }
    setFile(f);
  }
  return (
    <>
      <div
        className={"upload-zone " + (drag ? "dragging" : "")}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          select(e.dataTransfer.files[0]);
        }}
      >
        <UploadCloud size={36} />
        <h3>{file ? file.name : "Drop your document here"}</h3>
        <p>
          {file
            ? `${(file.size / 1024).toFixed(1)} KB · ready to upload`
            : "PDF, DOCX or TXT · up to 20 MB"}
        </p>
        <label className="button secondary file-label">
          {file ? "Choose another file" : "Browse files"}
          <input
            aria-label="Choose document"
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => select(e.target.files?.[0])}
          />
        </label>
        {file && (
          <button
            className="text-link"
            type="button"
            onClick={() => setFile(null)}
          >
            Remove file
          </button>
        )}
      </div>
      {error && (
        <div role="alert" className="error-box">
          {error}
        </div>
      )}
    </>
  );
}
export function NewCheck() {
  const { kind: routeKind = "combined" } = useParams();
  const kind = ["combined", "ai", "plagiarism", "humanize"].includes(routeKind)
    ? routeKind
    : "combined";
  const [search] = useSearchParams();
  const [docId, setDocId] = useState(search.get("document") || "");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState("natural");
  const [inputMode, setInputMode] = useState("paste");
  const [progress, setProgress] = useState(0);
  const [requestKey, setRequestKey] = useState(crypto.randomUUID());
  const nav = useNavigate();
  const refresh = useRefresh();
  const docs = useList<Doc>("documents/");
  const { data: config } = useConfig();
  const quote = useQuery({
    queryKey: ["quote", docId, kind],
    enabled: !!docId,
    queryFn: async () =>
      (
        await api.post<{ credits: string; words: number }>("detection/quote/", {
          document: docId,
          kind,
        })
      ).data,
  });
  const save = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("title", title.trim() || file?.name || "Untitled document");
      if (file && inputMode === "upload") form.append("file", file);
      else form.append("text", text);
      const { data } = await api.post<Doc>("documents/", form, {
        onUploadProgress: (p) =>
          setProgress(Math.round((p.progress || 0) * 100)),
      });
      return data;
    },
    onSuccess: (d) => {
      setDocId(d.id);
      refresh();
    },
  });
  const run = useMutation({
    mutationFn: async () =>
      (
        await api.post<Job>("detection/", {
          document: docId,
          kind,
          mode,
          request_key: requestKey,
        })
      ).data,
    onSuccess: (j) => {
      refresh();
      nav("/app/jobs/" + j.id);
    },
  });
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return (
    <>
      <PageHeader
        eyebrow={
          kind === "humanize"
            ? "FIND YOUR FLOW"
            : "A CLOSER LOOK AT YOUR WRITING"
        }
        title={
          kind === "humanize"
            ? "Make it sound like you."
            : kind === "combined"
              ? "Originality meets insight."
              : kind === "ai"
                ? "Explore AI insights."
                : "Put your sources in context."
        }
        text={
          kind === "humanize"
            ? "Refine clarity and tone. Preserve your ideas. Always review the output."
            : "Start with a document. Choose your check. Review your results in context."
        }
      />
      <div className="check-layout">
        <Card>
          <div className="tab-row">
            {[
              ["combined", "Combined"],
              ["plagiarism", "Plagiarism"],
              ["ai", "AI detection"],
              ["humanize", "Humanizer"],
            ].map(([k, t]) => (
              <Link
                className={kind === k ? "active" : ""}
                to={"/app/check/" + k}
                key={k}
              >
                {t}
              </Link>
            ))}
          </div>
          {docId ? (
            <>
              <div className="selected-document">
                <FileText size={30} />
                <div>
                  <h3>
                    {docs.data?.results.find((d) => d.id === docId)?.title ||
                      "Selected document"}
                  </h3>
                  <p>{quote.data?.words.toLocaleString() || "—"} words</p>
                </div>
                <Button
                  secondary
                  onClick={() => {
                    setDocId("");
                    setRequestKey(crypto.randomUUID());
                  }}
                >
                  Change
                </Button>
              </div>
              {kind === "humanize" && (
                <label>
                  Rewriting mode
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                  >
                    {[
                      "natural",
                      "academic",
                      "professional",
                      "simple",
                      "formal",
                      "conversational",
                    ].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </label>
              )}
              <ErrorBox error={quote.error} />
              <ErrorBox error={run.error} />
              <div className="quote">
                <span>Credits to reserve</span>
                <strong>{quote.data?.credits ?? "—"}</strong>
              </div>
              <p className="muted">
                Credits are consumed on completion and released if processing
                fails.
              </p>
              <Button
                disabled={!quote.data || run.isPending}
                onClick={() => run.mutate()}
              >
                {run.isPending ? "Submitting…" : "Confirm & run check"}{" "}
                <ArrowRight size={17} />
              </Button>
            </>
          ) : (
            <>
              <div className="input-tabs">
                {[
                  ["paste", "Paste text"],
                  ["upload", "Upload file"],
                  ["existing", "My documents"],
                ].map(([m, t]) => (
                  <button
                    key={m}
                    onClick={() => setInputMode(m)}
                    className={inputMode === m ? "active" : ""}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {inputMode === "existing" ? (
                <>
                  <label>
                    Select a document
                    <select
                      value=""
                      onChange={(e) => {
                        setDocId(e.target.value);
                        setRequestKey(crypto.randomUUID());
                      }}
                    >
                      <option value="">
                        Choose from your latest 30 documents…
                      </option>
                      {docs.data?.results.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} · {d.word_count} words
                        </option>
                      ))}
                    </select>
                  </label>
                  <ErrorBox error={docs.error} />
                  <Link to="/app/documents" className="text-link">
                    Browse your full document library <ArrowRight size={15} />
                  </Link>
                </>
              ) : (
                <>
                  <label>
                    Document title
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={200}
                      placeholder="Give this draft a name"
                    />
                  </label>
                  {inputMode === "upload" ? (
                    <FileUploader file={file} setFile={setFile} />
                  ) : (
                    <label>
                      Your text
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        maxLength={1000000}
                        rows={12}
                        placeholder="Every great draft starts with an idea. Paste yours here…"
                      />
                      <small className="word-count">
                        {words.toLocaleString()} words · maximum{" "}
                        {config?.max_words.toLocaleString() || "30,000"}
                      </small>
                    </label>
                  )}
                  {save.isPending && (
                    <div>
                      <progress value={progress} max={100} />
                      <span>
                        {progress < 100
                          ? `Uploading ${progress}%`
                          : "Extracting text…"}
                      </span>
                    </div>
                  )}
                  <ErrorBox error={save.error} />
                  <Button
                    disabled={
                      save.isPending ||
                      (inputMode === "paste" ? !text.trim() : !file)
                    }
                    onClick={() => save.mutate()}
                  >
                    {save.isPending
                      ? "Preparing…"
                      : "Prepare document & view cost"}{" "}
                    <ArrowRight size={17} />
                  </Button>
                </>
              )}
            </>
          )}
        </Card>
        <div className="check-aside">
          <Card>
            <span className="feature-icon indigo">
              <ShieldCheck />
            </span>
            <h3>A little context first</h3>
            <p>
              {kind === "humanize"
                ? "Rewriting helps with clarity and tone. It cannot guarantee a detector score. Citations and factual claims must be reviewed."
                : "AI likelihood is probabilistic. Similarity can include correctly cited sources. Neither score is a verdict on your work."}
            </p>
            <ul className="check-list">
              <li>
                <CheckIcon /> Private document storage
              </li>
              <li>
                <CheckIcon /> Upfront credit quote
              </li>
              <li>
                <CheckIcon /> Downloadable PDF report
              </li>
            </ul>
          </Card>
          {(kind === "humanize"
            ? config?.rewrite_mock
            : config?.detection_mock) && (
            <div className="notice">
              <strong>Development provider</strong>
              <p>
                {kind === "humanize"
                  ? "Mock rewriting returns the original text unchanged. Configure a real provider for revision."
                  : "Mock checks exercise the workflow only. No real AI or similarity score is calculated."}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
function CheckIcon() {
  return <CircleCheck size={16} />;
}
export function JobDetails() {
  const { id } = useParams();
  const toast = useToast();
  const dl = useDownload();
  const job = useQuery({
    queryKey: ["job", id],
    queryFn: async () => (await api.get<Job>(`detection/${id}/`)).data,
    refetchInterval: (q) =>
      ["queued", "processing"].includes(q.state.data?.status || "")
        ? 2000
        : false,
  });
  if (job.isPending) return <Loading />;
  if (job.error) return <ErrorBox error={job.error} />;
  const j = job.data!;
  const r = j.result;
  return (
    <>
      <PageHeader
        eyebrow="YOUR CONTENT REVIEW"
        title={j.title}
        text={`${j.kind} check · ${date(j.created_at)} · ${j.cost} credits`}
        action={
          j.report_id && (
            <DownloadButton
              onClick={() =>
                dl(`reports/${j.report_id}/download/`, `checkwise-${j.id}.pdf`)
              }
            />
          )
        }
      />
      <div className="button-row">
        <Badge status={j.status}>{j.status}</Badge>
        <span className="muted">{j.provider || "Awaiting provider"}</span>
      </div>
      {j.status === "failed" ? (
        <div className="error-box">
          <h3>We couldn’t complete this check.</h3>
          <p>{j.error}</p>
          <Button
            secondary
            to={"/app/check/" + j.kind + "?document=" + j.document}
          >
            Prepare another check
          </Button>
        </div>
      ) : ["queued", "processing"].includes(j.status) ? (
        <Card>
          <Loading />
          <h2>
            Your document is{" "}
            {j.status === "queued" ? "in the queue" : "being reviewed"}.
          </h2>
          <p>
            This page updates automatically. Your credits are reserved while
            processing.
          </p>
        </Card>
      ) : (
        <>
          {r.mock && (
            <div className="notice">
              <strong>Development mock — no real detection performed</strong>
              <p>
                This report validates the application workflow. Scores are
                unavailable because no real analysis was run.
              </p>
            </div>
          )}
          {j.kind !== "humanize" && (
            <div className="result-grid">
              {j.kind !== "ai" && (
                <ScoreCard
                  title="Similarity"
                  score={r.similarity}
                  icon={ScanText}
                />
              )}
              {j.kind !== "plagiarism" && (
                <ScoreCard
                  title="AI likelihood"
                  score={r.ai_likelihood}
                  icon={Sparkles}
                />
              )}
            </div>
          )}
          {j.kind === "humanize" ? (
            <>
              <div className="result-grid">
                <Card>
                  <h2>Original</h2>
                  <div className="text-output">{j.original_text}</div>
                </Card>
                <Card>
                  <div className="card-heading">
                    <h2>Rewritten</h2>
                    <button
                      className="icon-button"
                      aria-label="Copy rewritten text"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(r.rewritten_text || "")
                          .then(() => toast("Copied to clipboard."))
                          .catch(() =>
                            toast(
                              "Clipboard unavailable. Select and copy the text manually.",
                            ),
                          )
                      }
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                  <div className="text-output">{r.rewritten_text}</div>
                  <Button
                    secondary
                    onClick={() => {
                      const a = document.createElement("a");
                      const url = URL.createObjectURL(
                        new Blob([r.rewritten_text || ""], {
                          type: "text/plain",
                        }),
                      );
                      a.href = url;
                      a.download = "rewritten.txt";
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}
                  >
                    <Download size={16} /> Download text
                  </Button>
                </Card>
              </div>
            </>
          ) : (
            <>
              <Card>
                <h2>Matched sources</h2>
                {r.sources?.length ? (
                  r.sources.map((s, i) => (
                    <div className="source" key={i}>
                      <a
                        href={safeSource(s.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {s.title} <ArrowUpRight size={15} />
                      </a>
                      {s.passage && (
                        <blockquote>
                          <mark>{s.passage}</mark>
                        </blockquote>
                      )}
                    </div>
                  ))
                ) : (
                  <p>
                    {r.mock
                      ? "No source comparison was performed."
                      : "No matching sources were returned by this provider."}
                  </p>
                )}
              </Card>
              {!!r.sentences?.length && (
                <Card>
                  <h2>Sentence-level insights</h2>
                  {r.sentences.map((s, i) => (
                    <div className="sentence" key={i}>
                      <p>{s.text}</p>
                      <Badge>
                        {s.ai_likelihood === null
                          ? "Unavailable"
                          : s.ai_likelihood + "% AI likelihood"}
                      </Badge>
                    </div>
                  ))}
                </Card>
              )}
            </>
          )}
          <Card>
            <h3>Read your results in context</h3>
            <p>{r.notes}</p>
            <p>{r.limitations}</p>
          </Card>
        </>
      )}
    </>
  );
}
export function safeSource(url: string) {
  try {
    const u = new URL(url);
    return ["http:", "https:"].includes(u.protocol) ? u.href : "#";
  } catch {
    return "#";
  }
}
function ScoreCard({
  title,
  score,
  icon: Icon,
}: {
  title: string;
  score: number | null | undefined;
  icon: ElementType;
}) {
  return (
    <Card className="score-card">
      <Icon size={24} />
      <h3>{title}</h3>
      <strong>{score == null ? "Unavailable" : `${score}%`}</strong>
      <p>
        {score == null
          ? "No provider score is available."
          : "Provider-reported score. Requires human review."}
      </p>
    </Card>
  );
}
export function Documents() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const docs = useList<Doc>("documents/", page);
  const [deleting, setDeleting] = useState<Doc | null>(null);
  const refresh = useRefresh();
  const toast = useToast();
  const dl = useDownload();
  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`documents/${id}/`),
    onSuccess: () => {
      setDeleting(null);
      refresh();
      toast("Document and related reports deleted.");
    },
  });
  const rows = docs.data?.results.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="YOUR PRIVATE LIBRARY"
        title="A home for your words."
        text="Manage your documents, start a fresh check, or make room for what’s next."
        action={
          <Button to="/app/check/combined">
            <UploadCloud size={17} /> Upload document
          </Button>
        }
      />
      <Card>
        <label className="search-field">
          <Search size={17} />
          <input
            placeholder="Filter documents on this page…"
            aria-label="Search documents"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <ErrorBox error={docs.error} />
        {docs.isPending ? (
          <Loading />
        ) : !rows?.length ? (
          <Empty text="Upload a document to begin your library." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Words</th>
                  <th>Format</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span className="table-document">
                        <FileText size={18} />
                        {d.title}
                      </span>
                    </td>
                    <td>{d.word_count.toLocaleString()}</td>
                    <td>
                      <Badge>{d.format.toUpperCase()}</Badge>
                    </td>
                    <td>{date(d.created_at)}</td>
                    <td>
                      <div className="row-actions">
                        <Link
                          className="text-link"
                          to={"/app/check/combined?document=" + d.id}
                        >
                          Run check
                        </Link>
                        <button
                          className="icon-button"
                          aria-label={"Download " + d.title}
                          onClick={() =>
                            dl(
                              `documents/${d.id}/download/`,
                              `document-${d.id}.${d.format === "text" ? "txt" : d.format}`,
                            )
                          }
                        >
                          <Download size={17} />
                        </button>
                        <button
                          className="icon-button danger"
                          aria-label={"Delete " + d.title}
                          onClick={() => setDeleting(d)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          count={docs.data?.count || 0}
          change={setPage}
        />
      </Card>
      {deleting && (
        <ConfirmationDialog
          title="Delete this document?"
          text="The source file, extracted text, checks and reports will be removed. Credit ledger and financial records remain for accounting."
          onClose={() => {
            setDeleting(null);
            remove.reset();
          }}
          onConfirm={() => remove.mutate(deleting.id)}
          busy={remove.isPending}
        />
      )}
      <ErrorBox error={remove.error} />
    </>
  );
}
export function Reports() {
  const [page, setPage] = useState(1);
  const reports = useList<Report>("reports/", page);
  const dl = useDownload();
  return (
    <>
      <PageHeader
        title="Your reports, in context."
        text="Revisit your results or download a private copy."
        action={
          <Button to="/app/check/combined">
            <Plus size={17} /> New check
          </Button>
        }
      />
      <Card>
        <ErrorBox error={reports.error} />
        {reports.isPending ? (
          <Loading />
        ) : !reports.data?.results.length ? (
          <Empty
            title="Your next insight is ahead"
            text="Completed checks will produce reports here."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Check</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.data.results.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link to={"/app/jobs/" + r.job_id}>{r.title}</Link>{" "}
                      {r.mock && <Badge>Development mock</Badge>}
                    </td>
                    <td>{r.kind}</td>
                    <td>{date(r.created_at)}</td>
                    <td>
                      <button
                        className="text-link"
                        onClick={() =>
                          dl(
                            `reports/${r.id}/download/`,
                            `checkwise-${r.id}.pdf`,
                          )
                        }
                      >
                        <Download size={15} /> Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          count={reports.data?.count || 0}
          change={setPage}
        />
      </Card>
    </>
  );
}
export function PurchaseCredits() {
  const { data: config, error } = useConfig();
  const [selected, setSelected] = useState<Package | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [purchaseKey, setPurchaseKey] = useState(crypto.randomUUID());
  const [phone, setPhone] = useState("");
  const toast = useToast();
  const refresh = useRefresh();
  const purchase = useMutation({
    mutationFn: async () =>
      (
        await api.post<Payment>("payments/", {
          package: selected?.id,
          phone,
          request_key: purchaseKey,
        })
      ).data,
    onSuccess: (p) => {
      setPayment(p);
      refresh();
    },
  });
  const redeem = useMutation({
    mutationFn: async (form: FormData) =>
      (
        await api.post<{ detail: string }>(
          "credits/redeem/",
          Object.fromEntries(form),
        )
      ).data,
    onSuccess: (d) => {
      refresh();
      toast(d.detail);
    },
  });
  const confirm = useMutation({
    mutationFn: async () =>
      (await api.post<Payment>(`payments/${payment?.id}/mock-confirm/`)).data,
    onSuccess: (p) => {
      setPayment(p);
      refresh();
      toast("Simulated payment completed. No money was charged.");
    },
  });
  return (
    <>
      <PageHeader
        eyebrow="ROOM FOR MORE IDEAS"
        title="A little credit. A lot of possibility."
        text="Choose your next allowance. Every price is shown before you pay."
      />
      <ErrorBox error={error} />
      <div className="pricing-grid">
        {config?.packages.map((p) => (
          <Card className="pricing-card" key={p.id}>
            <Badge>
              {p.subscription_days ? "Prepaid subscription" : "Credit package"}
            </Badge>
            <h2>{p.name}</h2>
            <strong className="price">
              KSh {p.price_kes.toLocaleString()}
            </strong>
            <p>
              {p.credits} credits
              {p.subscription_days ? ` · ${p.subscription_days}-day term` : ""}
            </p>
            <Button
              onClick={() => {
                setSelected(p);
                setPayment(null);
                setPurchaseKey(crypto.randomUUID());
                purchase.reset();
                confirm.reset();
              }}
            >
              Choose package <ArrowRight size={16} />
            </Button>
          </Card>
        ))}
      </div>
      <p className="muted">
        No automatic renewal. Credits are added only after verified
        confirmation.
      </p>
      <Card>
        <h2>Have a promotional code?</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            redeem.mutate(new FormData(e.currentTarget));
          }}
        >
          <label>
            Promotional code
            <input name="code" required maxLength={40} />
          </label>
          <ErrorBox error={redeem.error} />
          <Button secondary disabled={redeem.isPending}>
            Redeem code
          </Button>
        </form>
      </Card>
      {selected && (
        <div className="modal-backdrop">
          <section
            className="card modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-title"
          >
            <h2 id="payment-title">
              {payment?.status === "paid"
                ? "You’re all set."
                : `Buy ${selected.credits} credits`}
            </h2>
            <p>
              KSh {selected.price_kes.toLocaleString()} · {selected.name}
            </p>
            {config?.payment_provider === "mock" && (
              <div className="notice">
                <strong>Development payment simulation</strong>
                <p>No STK push is sent and no money is charged.</p>
              </div>
            )}
            {!payment ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  purchase.mutate();
                }}
              >
                <label>
                  M-Pesa phone number
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    placeholder="0712 345 678"
                    required
                    maxLength={20}
                  />
                </label>
                <ErrorBox error={purchase.error} />
                <Button type="submit" disabled={purchase.isPending}>
                  {purchase.isPending
                    ? "Requesting…"
                    : config?.payment_provider === "mock"
                      ? "Create simulated purchase"
                      : "Send M-Pesa prompt"}
                </Button>
              </form>
            ) : (
              <>
                <Badge status={payment.status}>{payment.status}</Badge>
                {payment.error && <p role="alert">{payment.error}</p>}
                {payment.status === "pending" &&
                config?.payment_provider === "mock" ? (
                  <>
                    <p>
                      Confirm the simulated payment to test wallet allocation.
                    </p>
                    <Button
                      onClick={() => confirm.mutate()}
                      disabled={confirm.isPending}
                    >
                      Confirm simulated payment
                    </Button>
                    <ErrorBox error={confirm.error} />
                  </>
                ) : payment.status !== "paid" ? (
                  <p>
                    Approve the prompt on your phone if received. Follow status
                    in your payment history.
                  </p>
                ) : (
                  <p>{payment.credits} credits were added to your wallet.</p>
                )}
              </>
            )}
            <div className="button-row modal-close">
              <Button
                secondary
                onClick={() => setSelected(null)}
                disabled={purchase.isPending || confirm.isPending}
              >
                Close
              </Button>
              {payment && (
                <Button to="/app/payments" secondary>
                  Payment history
                </Button>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
export function Payments() {
  const [page, setPage] = useState(1);
  const payments = useList<Payment>("payments/", page, true);
  const toast = useToast();
  return (
    <>
      <PageHeader
        title="A clear view of every payment."
        text="Track purchases, provider confirmation, and the credits you received."
        action={
          <Button to="/app/credits">
            <Plus size={17} /> Buy credits
          </Button>
        }
      />
      <Card>
        <ErrorBox error={payments.error} />
        {payments.isPending ? (
          <Loading />
        ) : !payments.data?.results.length ? (
          <Empty text="Your credit purchases will appear here." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Amount</th>
                  <th>Credits</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {payments.data.results.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.package_name}
                      <small className="table-subtext">
                        {p.receipt || p.id.slice(0, 8)}
                      </small>
                      {p.error && (
                        <small className="field-error">{p.error}</small>
                      )}
                    </td>
                    <td>KSh {p.amount.toLocaleString()}</td>
                    <td>{p.credits}</td>
                    <td>{p.provider === "mock" ? "Simulation" : p.provider}</td>
                    <td>
                      <Badge status={p.status}>{p.status}</Badge>
                    </td>
                    <td>{date(p.created_at)}</td>
                    <td>
                      {p.status === "pending" && p.provider === "mpesa" && (
                        <button
                          className="text-link"
                          onClick={() =>
                            api
                              .post(`payments/${p.id}/reconcile/`)
                              .then(() => toast("Verification requested."))
                              .catch((e) => toast(errorText(e)))
                          }
                        >
                          Verify status
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          count={payments.data?.count || 0}
          change={setPage}
        />
      </Card>
    </>
  );
}
export function CreditLedger() {
  const [page, setPage] = useState(1);
  const ledger = useList<Ledger>("credits/ledger/", page);
  return (
    <>
      <PageHeader
        title="Every credit, accounted for."
        text="An auditable history of purchases, reservations, usage, refunds and transfers."
      />
      <Card>
        <ErrorBox error={ledger.error} />
        {ledger.isPending ? (
          <Loading />
        ) : !ledger.data?.results.length ? (
          <Empty text="Your credit movements will appear here." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Movement</th>
                  <th>Available change</th>
                  <th>Reserved change</th>
                  <th>Balance after</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {ledger.data.results.map((l) => (
                  <tr key={l.id}>
                    <td>
                      {l.kind.replaceAll("_", " ")}
                      <small className="table-subtext">
                        {l.note || l.reference}
                      </small>
                    </td>
                    <td className={Number(l.amount) > 0 ? "positive" : ""}>
                      {Number(l.amount) > 0 ? "+" : ""}
                      {l.amount}
                    </td>
                    <td>{l.reserved_delta}</td>
                    <td>{l.balance_after}</td>
                    <td>{date(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          count={ledger.data?.count || 0}
          change={setPage}
        />
      </Card>
    </>
  );
}
export function Referrals() {
  const [transferKey, setTransferKey] = useState(crypto.randomUUID());
  const data = useQuery({
    queryKey: ["referrals"],
    queryFn: async () =>
      (
        await api.get<{
          code: string;
          link: string;
          referred_users: number;
          rewarded_users: number;
          earned_credits: string;
          role: string;
        }>("referrals/")
      ).data,
  });
  const toast = useToast();
  const refresh = useRefresh();
  const send = useMutation({
    mutationFn: async (form: FormData) =>
      api.post("referrals/transfer/", {
        ...Object.fromEntries(form),
        request_key: transferKey,
      }),
    onSuccess: () => {
      setTransferKey(crypto.randomUUID());
      refresh();
      toast("Credits transferred.");
    },
  });
  return (
    <>
      <PageHeader
        eyebrow="BETTER, TOGETHER"
        title="Give your circle a clearer view."
        text="Share your referral link. Rewards follow a referred verified account’s first verified purchase."
      />
      <ErrorBox error={data.error} />
      {!data.data ? (
        <Loading />
      ) : (
        <>
          <div className="stats-grid">
            <StatCard
              label="Referred accounts"
              value={data.data.referred_users}
              icon={Users}
            />
            <StatCard
              label="Rewarded referrals"
              value={data.data.rewarded_users}
              icon={Gift}
            />
            <StatCard
              label="Credits earned"
              value={data.data.earned_credits}
              icon={Coins}
            />
          </div>
          <Card>
            <h2>Your personal invitation</h2>
            <div className="copy-field">
              <input
                aria-label="Referral link"
                readOnly
                value={data.data.link}
              />
              <Button
                secondary
                onClick={() =>
                  navigator.clipboard
                    .writeText(data.data!.link)
                    .then(() => toast("Referral link copied."))
                    .catch(() => toast("Select the link and copy it manually."))
                }
              >
                <Copy size={16} /> Copy
              </Button>
            </div>
            <p>
              Code: <strong>{data.data.code}</strong>. Self-referrals do not
              earn rewards. Rewards are limited to one per referred account and
              may be reviewed for abuse.
            </p>
          </Card>
          {data.data.role === "reseller" && (
            <>
              <ResellerCustomers />
              <Card>
                <h2>Allocate credits to a customer</h2>
                <p>
                  Transfers debit your available wallet and create an auditable
                  movement for both accounts.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send.mutate(new FormData(e.currentTarget));
                  }}
                >
                  <label>
                    Verified customer email
                    <input name="email" type="email" required />
                  </label>
                  <label>
                    Credits
                    <input
                      name="credits"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                    />
                  </label>
                  <ErrorBox error={send.error} />
                  <Button disabled={send.isPending}>Transfer credits</Button>
                </form>
              </Card>
            </>
          )}
        </>
      )}
    </>
  );
}
export function Subscriptions() {
  const data = useList<Subscription>("subscriptions/");
  const toast = useToast();
  const refresh = useRefresh();
  const cancel = useMutation({
    mutationFn: async (id: string) =>
      api.patch(`subscriptions/${id}/`, { cancelled: true }),
    onSuccess: () => {
      refresh();
      toast("Subscription marked cancelled. No future billing was scheduled.");
    },
  });
  return (
    <>
      <PageHeader
        title="Plans that leave you in control."
        text="Prepaid terms with a one-time credit grant. No automatic recurring charge."
        action={
          <Button to="/app/credits">
            Explore packages <ArrowRight size={16} />
          </Button>
        }
      />
      <ErrorBox error={data.error} />
      <ErrorBox error={cancel.error} />
      {data.isPending ? (
        <Loading />
      ) : !data.data?.results.length ? (
        <Card>
          <Empty text="Your prepaid subscription terms will appear here." />
        </Card>
      ) : (
        data.data.results.map((s) => (
          <Card key={s.id}>
            <h2>{s.name}</h2>
            <p>
              Term ends {date(s.ends_at)} ·{" "}
              {s.cancelled
                ? "Cancelled"
                : new Date(s.ends_at) < new Date()
                  ? "Expired"
                  : "Active"}
            </p>
            {!s.cancelled && (
              <Button
                secondary
                disabled={cancel.isPending}
                onClick={() => cancel.mutate(s.id)}
              >
                Cancel plan
              </Button>
            )}
          </Card>
        ))
      )}
    </>
  );
}
export function AccountSettings() {
  const { user, reload } = useAuth();
  const toast = useToast();
  const save = useMutation({
    mutationFn: async (form: FormData) =>
      api.patch("auth/me/", Object.fromEntries(form)),
    onSuccess: () => {
      reload();
      toast("Profile updated.");
    },
  });
  const resend = useMutation({
    mutationFn: async () => api.post("auth/resend/"),
    onSuccess: () => toast("Verification email requested. Check your inbox."),
  });
  return (
    <>
      <PageHeader
        title="Make yourself at home."
        text="Manage your account details and email verification."
      />
      <div className="check-layout">
        <Card>
          <h2>Profile</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(new FormData(e.currentTarget));
            }}
          >
            <label>
              Email
              <input type="email" value={user?.email || ""} disabled />
            </label>
            <label>
              First name
              <input
                name="first_name"
                defaultValue={user?.first_name}
                maxLength={150}
              />
            </label>
            <label>
              Last name
              <input
                name="last_name"
                defaultValue={user?.last_name}
                maxLength={150}
              />
            </label>
            <ErrorBox error={save.error} />
            <Button disabled={save.isPending}>Save changes</Button>
          </form>
        </Card>
        <Card>
          <ShieldCheck size={26} />
          <h2>Account security</h2>
          <p>
            Email: {user?.email_verified ? "verified" : "awaiting verification"}
          </p>
          {!user?.email_verified && (
            <Button
              secondary
              disabled={resend.isPending}
              onClick={() => resend.mutate()}
            >
              Resend verification
            </Button>
          )}
          <ErrorBox error={resend.error} />
          <p>Need a new password?</p>
          <Button secondary to="/forgot-password">
            Request password reset
          </Button>
          <p>For account deletion or data export, contact support.</p>
          <Link to="/app/support" className="text-link">
            Open a support ticket <ArrowRight size={15} />
          </Link>
        </Card>
      </div>
      {user?.role === "user" && user.email_verified && <ResellerPreference />}
    </>
  );
}
export function Support() {
  const [page, setPage] = useState(1);
  const data = useList<Ticket>("support/", page);
  const refresh = useRefresh();
  const toast = useToast();
  const { user } = useAuth();
  const create = useMutation({
    mutationFn: async (form: FormData) =>
      api.post("support/", { ...Object.fromEntries(form), email: user?.email }),
    onSuccess: () => {
      refresh();
      toast("Support ticket opened.");
    },
  });
  return (
    <>
      <PageHeader
        title="A helping hand, when you need it."
        text="Share a question or report an issue. Include the job or payment ID, but never passwords or API keys."
      />
      <div className="check-layout">
        <Card>
          <h2>Open a ticket</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(new FormData(e.currentTarget));
            }}
          >
            <label>
              Subject
              <input name="subject" maxLength={200} required />
            </label>
            <label>
              How can we help?
              <textarea name="message" maxLength={10000} rows={6} required />
            </label>
            <ErrorBox error={create.error} />
            <Button disabled={create.isPending}>
              {create.isPending ? "Sending…" : "Send ticket"}{" "}
              <ArrowRight size={16} />
            </Button>
          </form>
        </Card>
        <div>
          <ErrorBox error={data.error} />
          {data.isPending ? (
            <Loading />
          ) : !data.data?.results.length ? (
            <Card>
              <Empty text="Your support conversations will appear here." />
            </Card>
          ) : (
            data.data.results.map((t) => (
              <Card key={t.id}>
                <Badge status={t.status}>{t.status}</Badge>
                <h3>{t.subject}</h3>
                <p className="text-output">{t.message}</p>
                {t.reply && (
                  <div className="notice">
                    <strong>Support reply</strong>
                    <p className="text-output">{t.reply}</p>
                  </div>
                )}
                <small>{date(t.created_at)}</small>
              </Card>
            ))
          )}
          <Pagination
            page={page}
            count={data.data?.count || 0}
            change={setPage}
          />
        </div>
      </div>
    </>
  );
}
export function Notifications() {
  const [page, setPage] = useState(1);
  const data = useList<Notice>("notifications/", page);
  const refresh = useRefresh();
  const toast = useToast();
  return (
    <>
      <PageHeader
        title="A little update for you."
        text="Report completions, credit notices and replies from support."
      />
      <ErrorBox error={data.error} />
      {data.isPending ? (
        <Loading />
      ) : !data.data?.results.length ? (
        <Card>
          <Empty text="You’re all caught up. New updates will appear here." />
        </Card>
      ) : (
        data.data.results.map((n) => (
          <Card key={n.id} className={n.read ? "" : "unread"}>
            <div className="card-heading">
              <h2>{n.title}</h2>
              {!n.read && (
                <button
                  className="text-link"
                  onClick={() =>
                    api
                      .patch(`notifications/${n.id}/`, { read: true })
                      .then(refresh)
                      .catch((e) => toast(errorText(e)))
                  }
                >
                  Mark read
                </button>
              )}
            </div>
            <p>{n.body}</p>
            <small>{date(n.created_at)}</small>
          </Card>
        ))
      )}
      <Pagination page={page} count={data.data?.count || 0} change={setPage} />
    </>
  );
}
export function Administration() {
  const { user } = useAuth();
  const toast = useToast();
  const refresh = useRefresh();
  const data = useQuery({
    queryKey: ["admin"],
    enabled: !!user?.is_staff,
    queryFn: async () =>
      (await api.get<Record<string, number>>("admin/overview/")).data,
  });
  const adjust = useMutation({
    mutationFn: async (form: FormData) =>
      api.post("admin/adjust/", {
        ...Object.fromEntries(form),
        request_key: crypto.randomUUID(),
      }),
    onSuccess: () => {
      refresh();
      toast("Credit adjustment recorded.");
    },
  });
  if (!user?.is_staff)
    return (
      <div role="alert" className="error-box">
        Administrator access required.
      </div>
    );
  const links = [
    ["User management", "accounts/user"],
    ["Credit ledger", "credits/ledgerentry"],
    ["Payments & reconciliation", "payments/payment"],
    ["Document management", "documents/document"],
    ["Job monitoring", "detection/detectionjob"],
    ["Detection providers", "detection/provider"],
    ["Service pricing", "credits/serviceprice"],
    ["Credit packages & plans", "payments/creditpackage"],
    ["Support management", "support/ticket"],
    ["Referral rewards", "referrals/referralreward"],
    ["Promotional codes", "credits/promocode"],
    ["Site settings", "core/sitesetting"],
    ["Audit logs", "core/auditlog"],
  ];
  return (
    <>
      <PageHeader
        eyebrow="PLATFORM OPERATIONS"
        title="A clear view of your platform."
        text="Staff-only analytics and audited operations. Financial records cannot be edited directly."
      />
      <ErrorBox error={data.error} />
      <div className="stats-grid">
        {Object.entries(data.data || {}).map(([label, value]) => (
          <StatCard
            key={label}
            label={label.replaceAll("_", " ")}
            value={value}
            icon={
              label === "users"
                ? Users
                : label === "revenue_kes"
                  ? CreditCard
                  : FileText
            }
          />
        ))}
      </div>
      <div className="check-layout">
        <Card>
          <h2>Administration tools</h2>
          <p>
            Django administration requires a separate staff session. Model
            permissions are enforced server-side.
          </p>
          <div className="admin-links">
            {links.map(([label, path]) => (
              <a key={path} href={"/admin/" + path + "/"}>
                {label}
                <ArrowUpRight size={16} />
              </a>
            ))}
          </div>
        </Card>
        <Card>
          <h2>Audited credit adjustment</h2>
          <p>
            Positive amounts add promotional credits; negative amounts deduct
            available credits. A reason is required.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              adjust.mutate(new FormData(e.currentTarget));
            }}
          >
            <label>
              User email
              <input name="email" type="email" required />
            </label>
            <label>
              Credit adjustment
              <input name="credits" type="number" step="0.01" required />
            </label>
            <label>
              Reason
              <textarea
                name="reason"
                minLength={5}
                maxLength={255}
                required
                rows={3}
              />
            </label>
            <ErrorBox error={adjust.error} />
            <Button disabled={adjust.isPending}>Record adjustment</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
