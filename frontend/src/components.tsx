import { useState } from "react";
import type { ReactNode, ElementType } from "react";
import { Link, NavLink, Navigate, Outlet } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  ArrowUpRight,
  LayoutDashboard,
  FileText,
  ScanText,
  Sparkles,
  CreditCard,
  Gift,
  LifeBuoy,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  Bell,
  LogOut,
  Layers,
  ChevronRight,
  CircleHelp,
  Download,
} from "lucide-react";
import { useAuth, useConfig, useToast } from "./state";
import { api, errorText } from "./api";

export function Logo() {
  const { data } = useConfig();
  return (
    <Link to="/" className="logo">
      <span className="logo-icon">
        <ShieldCheck size={22} />
      </span>
      <span>{data?.brand || "CheckWise AI"}</span>
    </Link>
  );
}
export function ThemeToggle() {
  const [dark, setDark] = useState(
    document.documentElement.dataset.theme === "dark",
  );
  return (
    <button
      className="icon-button"
      aria-label="Toggle dark mode"
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.dataset.theme = next ? "dark" : "light";
        localStorage.setItem("theme", next ? "dark" : "light");
      }}
    >
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
export function Button({
  children,
  to,
  secondary = false,
  ...props
}: {
  children: ReactNode;
  to?: string;
  secondary?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const className = `button ${secondary ? "secondary" : ""} ${props.className || ""}`;
  return to ? (
    <Link to={to} className={className}>
      {children}
    </Link>
  ) : (
    <button {...props} className={className}>
      {children}
    </button>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={"card " + className}>{children}</div>;
}
export function Badge({
  children,
  status,
}: {
  children: ReactNode;
  status?: string;
}) {
  return <span className={`badge ${status || ""}`}>{children}</span>;
}
export function ErrorBox({ error }: { error: unknown }) {
  return error ? (
    <div role="alert" className="error-box">
      {errorText(error)}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="loading" aria-label="Loading">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
export function Empty({
  title = "Nothing here yet",
  text,
  action,
}: {
  title?: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <FileText size={28} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function PageHeader({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow?: string;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}
export function StatCard({
  label,
  value,
  icon: Icon,
  detail,
}: {
  label: string;
  value: string | number;
  icon: ElementType;
  detail?: string;
}) {
  return (
    <Card className="stat">
      <div className="stat-top">
        <span>{label}</span>
        <Icon size={20} />
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </Card>
  );
}
export function ConfirmationDialog({
  title,
  text,
  onConfirm,
  onClose,
  busy,
}: {
  title: string;
  text: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <div className="modal-backdrop">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="card modal"
      >
        <h2 id="dialog-title">{title}</h2>
        <p>{text}</p>
        <div className="button-row">
          <Button secondary onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={busy}>
            Confirm
          </Button>
        </div>
      </section>
    </div>
  );
}
export function Pagination({
  page,
  count,
  change,
}: {
  page: number;
  count: number;
  change: (page: number) => void;
}) {
  return count > 30 ? (
    <div className="pagination">
      <Button secondary disabled={page <= 1} onClick={() => change(page - 1)}>
        Previous
      </Button>
      <span>
        Page {page} of {Math.ceil(count / 30)}
      </span>
      <Button
        secondary
        disabled={page * 30 >= count}
        onClick={() => change(page + 1)}
      >
        Next
      </Button>
    </div>
  ) : null;
}
export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  return (
    <>
      <header className="public-header">
        <div className="container header-inner">
          <Logo />
          <nav
            className={open ? "public-nav open" : "public-nav"}
            aria-label="Main navigation"
          >
            <NavLink to="/features" onClick={() => setOpen(false)}>
              Features
            </NavLink>
            <NavLink to="/how-it-works" onClick={() => setOpen(false)}>
              How it works
            </NavLink>
            <NavLink to="/pricing" onClick={() => setOpen(false)}>
              Pricing
            </NavLink>
            <NavLink to="/faq" onClick={() => setOpen(false)}>
              FAQs
            </NavLink>
          </nav>
          <div className="header-actions">
            <ThemeToggle />
            {user ? (
              <Button to="/app">
                Dashboard <ArrowUpRight size={16} />
              </Button>
            ) : (
              <>
                <Link className="login-link" to="/login">
                  Sign in
                </Link>
                <Button to="/register">
                  Get started <ArrowUpRight size={16} />
                </Button>
              </>
            )}
            <button
              className="icon-button mobile-only"
              aria-label="Toggle navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Logo />
          <p>
            Clarity for every word.
            <br />
            Confidence in your next draft.
          </p>
        </div>
        <div>
          <h4>Product</h4>
          {[
            ["Plagiarism checker", "/plagiarism-checker"],
            ["AI detector", "/ai-detector"],
            ["AI humanizer", "/humanizer"],
            ["Pricing", "/pricing"],
          ].map(([t, p]) => (
            <Link key={p} to={p}>
              {t}
            </Link>
          ))}
        </div>
        <div>
          <h4>Company</h4>
          {[
            ["About us", "/about"],
            ["How it works", "/how-it-works"],
            ["Contact", "/contact"],
            ["FAQs", "/faq"],
          ].map(([t, p]) => (
            <Link key={p} to={p}>
              {t}
            </Link>
          ))}
        </div>
        <div>
          <h4>The details</h4>
          {[
            ["Privacy policy", "/privacy"],
            ["Terms of service", "/terms"],
            ["Refund policy", "/refund-policy"],
          ].map(([t, p]) => (
            <Link key={p} to={p}>
              {t}
            </Link>
          ))}
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} CheckWise AI. Write with integrity.
        </span>
        <span>
          <ShieldCheck size={14} /> Private by design
        </span>
      </div>
    </footer>
  );
}
const nav: [string, string, ElementType][] = [
  ["Overview", "/app", LayoutDashboard],
  ["New check", "/app/check/combined", ScanText],
  ["My documents", "/app/documents", FileText],
  ["Reports", "/app/reports", Layers],
  ["Humanizer", "/app/check/humanize", Sparkles],
  ["Buy credits", "/app/credits", CreditCard],
  ["Transactions", "/app/payments", CreditCard],
  ["Credit ledger", "/app/ledger", Layers],
  ["Subscriptions", "/app/subscriptions", Layers],
  ["Referrals & reseller", "/app/referrals", Gift],
  ["Support", "/app/support", LifeBuoy],
  ["Account settings", "/app/settings", Settings],
];
export function DashboardLayout() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const client = useQueryClient();
  const balance = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => (await api.get<{ balance: string }>("credits/")).data,
    enabled: !!user,
  });
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="dashboard-shell">
      <aside className={"sidebar " + (open ? "open" : "")}>
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-button mobile-only"
            aria-label="Close sidebar"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <span className="sidebar-label">WORKSPACE</span>
        <nav aria-label="Dashboard navigation">
          {nav.map(([label, path, Icon]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/app"}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
          {user.is_staff && (
            <NavLink to="/app/admin">
              <Settings size={18} />
              Administration
            </NavLink>
          )}
        </nav>
        <div className="sidebar-credit">
          <div>
            <ShieldCheck size={21} />
            <span>Your credit balance</span>
          </div>
          <strong>
            {balance.data?.balance ?? "—"} <small>credits</small>
          </strong>
          <Link to="/app/credits">
            Top up your account <ChevronRight size={15} />
          </Link>
        </div>
        <div className="sidebar-help">
          <CircleHelp size={17} />
          <Link to="/app/support">Need a little help?</Link>
        </div>
      </aside>
      {open && (
        <button
          aria-label="Close menu overlay"
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="dashboard-main">
        <header className="app-topbar">
          <div>
            <button
              className="icon-button mobile-only"
              aria-label="Open sidebar"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </button>
            <span className="breadcrumb">
              Workspace <ChevronRight size={14} /> <strong>CheckWise AI</strong>
            </span>
          </div>
          <div className="header-actions">
            <ThemeToggle />
            <Link
              className="icon-button"
              aria-label="Notifications"
              to="/app/notifications"
            >
              <Bell size={20} />
            </Link>
            <span className="avatar">
              {(user.first_name || user.email).slice(0, 1).toUpperCase()}
            </span>
            <button
              className="icon-button"
              aria-label="Sign out"
              onClick={() =>
                logout()
                  .then(() => client.clear())
                  .catch((e) => toast(errorText(e)))
              }
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="workspace">
          {!user.email_verified && (
            <div className="notice">
              Verify your email before making purchases or running checks.{" "}
              <Link to="/app/settings">Resend verification</Link>
            </div>
          )}
          <DevelopmentNotice />
          <Outlet />
        </main>
        <div className="app-footer">
          A little clarity goes a long way.{" "}
          <Link to="/privacy">
            Privacy & security <ShieldCheck size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
export function DevelopmentNotice() {
  const { data } = useConfig();
  return data?.development &&
    (data.detection_mock ||
      data.payment_provider === "mock" ||
      data.rewrite_mock) ? (
    <div className="development-notice">
      <span className="status-dot" /> Development mode ·{" "}
      {data.detection_mock
        ? "Detection uses labeled mocks; no real scores. "
        : ""}
      {data.payment_provider === "mock"
        ? "Payments are simulated."
        : "Daraja is configured; verify sandbox status with your operator."}
    </div>
  ) : null;
}
export function DownloadButton({ onClick }: { onClick: () => void }) {
  return (
    <Button secondary onClick={onClick}>
      <Download size={16} /> Download PDF
    </Button>
  );
}
