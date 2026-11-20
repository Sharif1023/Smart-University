import {RoleOverview,serviceLinks} from "./ServiceLinks";
import Operations from "./Operations";
import {
  useState,
  useEffect,
  useRef,
  Component,
  type ReactNode,
  type FormEvent,
} from "react";
import { createRoot } from "react-dom/client";
import Catalog from "./Catalog";
import {
  api,
  Brand,
  models,
  roleName,
  Status,
  useLoad,
  type User,
  type Row,
} from "./shared";
import "./style.css";
const DEMO_PASSWORD = "CampusDemo2026!";
const demoAccounts = [
  { role: "ADMIN", label: "Admin", email: "admin@campus.test" },
  { role: "STUDENT", label: "Student", email: "student@campus.test" },
  { role: "TEACHER", label: "Teacher", email: "teacher@campus.test" },
  { role: "ADVISOR", label: "Advisor", email: "advisor@campus.test" },
  {
    role: "ACCOUNTS_OFFICER",
    label: "Accounts officer",
    email: "accounts_officer@campus.test",
  },
  { role: "LIBRARIAN", label: "Librarian", email: "librarian@campus.test" },
  {
    role: "THESIS_SUPERVISOR",
    label: "Thesis supervisor",
    email: "thesis_supervisor@campus.test",
  },
] as const;
function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [err, error] = useState(""),
    [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedDemo, setSelectedDemo] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    error("");
    try {
      onLogin(
        (await api<User>("/auth/login", "POST", Object.fromEntries(form))).data,
      );
    } catch (e) {
      error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <section className="identity">
        <Brand />
        <div>
          <div className="rule" />
          <h1>
            Smart University
            <br />
            ERP
          </h1>
          <p>Academic records and campus administration</p>
        </div>
        <span>University information system</span>
      </section>
      <section className="loginform">
        <form onSubmit={submit}>
          <h2>Sign in</h2>
          <p className="muted">Enter your university account details.</p>
          <section className="demo-picker" aria-label="Demo accounts">
            <div className="demo-picker-heading">
              <strong>Choose a demo role</strong>
              <span>Click a role to fill the sign-in form.</span>
            </div>
            <div className="demo-account-list" role="group" aria-label="Demo roles">
              {demoAccounts.map((account) => (
                <button
                  key={account.role}
                  className="demo-account"
                  type="button"
                  aria-label={`Use ${account.label} demo account`}
                  aria-pressed={selectedDemo === account.role}
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(DEMO_PASSWORD);
                    setSelectedDemo(account.role);
                    error("");
                  }}
                >
                  <strong>{account.label}</strong>
                  <span className="demo-account-email">{account.email}</span>
                  <small>Password: <code>{DEMO_PASSWORD}</code></small>
                </button>
              ))}
            </div>
            <p className="demo-password-note">
              These credentials use the default <code>DEMO_PASSWORD</code>. If
              you changed it in <code>.env</code>, enter that password instead.
            </p>
          </section>
          <label>
            Email address
            <input
              name="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setSelectedDemo("");
              }}
              autoComplete="username"
              required
              placeholder="name@university.edu"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setSelectedDemo("");
              }}
              autoComplete="current-password"
              required
            />
          </label>
          {err && <Status error={err} />}
          <button className="primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in →"}
          </button>
        </form>
      </section>
    </main>
  );
}
function CommandPalette({ items }: { items: [string, string][] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
    if (open) requestAnimationFrame(() => search.current?.focus());
  }, [open]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k")
        return;
      const target = event.target as HTMLElement;
      if (
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      )
        return;
      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  const normalized = query.trim().toLowerCase();
  const results = items.filter(([path, title]) =>
    (path + " " + title).toLowerCase().includes(normalized),
  );

  return (
    <>
      <button
        className="quick-open"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span>⌕</span>
        <span>Search workspace</span>
        <kbd>Ctrl K</kbd>
      </button>
      <dialog
        className="command-palette"
        ref={dialog}
        aria-label="Search workspace"
        onClose={() => {
          setOpen(false);
          setQuery("");
        }}
      >
        <div className="command-search">
          <label className="sr-only" htmlFor="workspace-search">
            Search pages and services
          </label>
          <input
            id="workspace-search"
            ref={search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages and services…"
            autoComplete="off"
          />
          <button aria-label="Close search" onClick={() => setOpen(false)}>
            Esc
          </button>
        </div>
        <p className="command-caption">PAGES AND SERVICES</p>
        <ul className="command-results">
          {results.map(([path, title]) => (
            <li key={path}>
              <button
                onClick={() => {
                  location.hash = "/" + path;
                  setOpen(false);
                }}
              >
                <span>{title}</span>
                <small>{path.replaceAll("/", " · ")}</small>
              </button>
            </li>
          ))}
        </ul>
        {!results.length && (
          <p className="command-empty">No pages match “{query}”.</p>
        )}
        <p className="command-hint">Use the search box to filter your role’s workspace.</p>
      </dialog>
    </>
  );
}
function Profile() {
  const { data, error } = useLoad<Row>("/profile");
  if (!data) return <Status error={error} />;
  const fields: Record<string, string> = {
    name: "Full name",
    email: "Email",
    role: "Account role",
    student_no: "Student ID",
    batch: "Batch",
    program: "Program",
    department: "Department",
    status: "Academic status",
  };
  return (
    <>
      <h1>My profile</h1>
      <section className="panel">
        <dl>
          {Object.entries(fields)
            .filter(([k]) => data[k])
            .map(([k, label]) => (
              <div key={k}>
                <dt>{label}</dt>
                <dd>{k === "role" ? roleName(String(data[k])) : data[k]}</dd>
              </div>
            ))}
        </dl>
      </section>
    </>
  );
}
function Password({ logout }: { logout: () => void }) {
  const [err, error] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(
        "/auth/password",
        "POST",
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      logout();
    } catch (e) {
      error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>Account security</h1>
      <form className="panel narrow" onSubmit={save}>
        <h2>Change password</h2>
        <label>
          Current password
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <label>
          New password
          <input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={256}
            required
          />
        </label>
        <p className="muted">
          Use at least 12 characters. Changing your password signs you out on
          all devices.
        </p>
        {err && <Status error={err} />}
        <button disabled={busy} className="primary">
          Change password
        </button>
      </form>
    </>
  );
}
type Overview = {
  term: { name: string; starts_on: string; ends_on: string } | null;
  counts?: Record<string, number>;
  activity?: Row[];
};
function Dashboard({ user }: { user: User }) {
  const { data, error } = useLoad<Overview>("/overview");
  return (
    <>
      <h1>Workspace overview</h1>
      <section className="banner">
        <span>{roleName(user.role)} workspace</span>
        <a href="#/services" style={{color:"inherit"}}>Open campus services →</a>
        <h2>Welcome, {user.name.split(" ")[0]}.</h2>
        {data && (
          <p>
            {data.term
              ? data.term.name +
                " · " +
                data.term.starts_on +
                " — " +
                data.term.ends_on
              : "No active semester today"}
          </p>
        )}
      </section>
      <RoleOverview user={user}/>
      {!data ? (
        <Status error={error} />
      ) : (
        <>
          {data.counts && (
            <>
              <h2>Academic directory</h2>
              <div className="cards">
                {Object.entries(data.counts).map(([k, n]) => (
                  <a key={k} href={"#/" + k}>
                    <span>{models[k].title} ↗</span>
                    <strong>{n}</strong>
                    <small>Active records</small>
                  </a>
                ))}
              </div>
            </>
          )}
          {data.activity ? (
            <section className="panel">
              <h2>Recent activity</h2>
              {data.activity.length ? (
                data.activity.map((r) => (
                  <div className="activity" key={String(r.id)}>
                    <span>
                      <b>{r.name}</b> · {roleName(String(r.action))} ·{" "}
                      {String(r.resource).replaceAll("_", " ")} #{r.record_id}
                    </span>
                    <small>
                      {new Date(
                        String(r.created_at).replace(" ", "T") + "Z",
                      ).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}
                    </small>
                  </div>
                ))
              ) : (
                <Status>Changes to academic records will appear here.</Status>
              )}
            </section>
          ) : (
            <section className="panel">
              <h2>My university record</h2>
              <p>View your account and academic details.</p>
              <a href="#/profile">Open my profile →</a>
            </section>
          )}
        </>
      )}
    </>
  );
}
function App() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [err, error] = useState(""),
    [path, setPath] = useState(location.hash.slice(2) || "overview"),
    [open, toggle] = useState(false);
  function reset() {
    setUser(null);
    location.hash = "/overview";
  }
  useEffect(() => {
    function navigate() {
      setPath(location.hash.slice(2) || "overview");
      toggle(false);
    }
    window.addEventListener("hashchange", navigate);
    window.addEventListener("signed-out", reset);
    api<User>("/auth/me")
      .then((r) => setUser(r.data))
      .catch((e) => {
        if (!/Please sign in|session has ended/.test(e.message))
          error(e.message);
      })
      .finally(() => setLoading(false));
    return () => {
      window.removeEventListener("hashchange", navigate);
      window.removeEventListener("signed-out", reset);
    };
  }, []);
  if (loading) return <Status>Opening workspace…</Status>;
  if (!user)
    return (
      <>
        {err && <Status error={err} />}
        <Login
          onLogin={(u) => {
            error("");
            setUser(u);
            location.hash = "/overview";
          }}
        />
      </>
    );
  const nav: Record<string, string> = {
    overview: "Overview",
    services: "Campus services",
    ...(user.role === "ADMIN"
      ? Object.fromEntries(Object.entries(models).map(([k, v]) => [k, v.title]))
      : {}),
    ...serviceLinks(user.role),
    profile: "My profile",
    security: "Account security",
  };
  return (
    <div className="shell">
      <aside className={open ? "open" : ""}>
        <Brand />
        <nav aria-label="Workspace navigation">
          {Object.entries(nav).map(([k, v]) => (
            <a
              key={k}
              aria-current={path === k ? "page" : undefined}
              href={"#/" + k}
            >
              {v}
            </a>
          ))}
        </nav>
        <div className="sidefoot">Smart University ERP</div>
      </aside>
      <main className="workspace">
        <div className="top">
          <button
            className="mobile"
            aria-expanded={open}
            onClick={() => toggle(!open)}
          >
            Menu
          </button>
          <span>
            Workspace / <b>{nav[path] || "Page"}</b>
          </span>
          <CommandPalette items={Object.entries(nav)} />
          <div>
            <strong>{user.name}</strong>
            <button
              onClick={async () => {
                try {
                  await api("/auth/logout", "POST");
                  reset();
                } catch (e) {
                  error((e as Error).message);
                }
              }}
            >
              Sign out
            </button>
          </div>
        </div>
        <article>
          {err && <Status error={err} />}{" "}
          {!Object.hasOwn(nav, path) ? (
            <>
              <h1>Page unavailable</h1>
              <a href="#/overview">Return to overview</a>
            </>
          ) : path === "overview" ? (
            <Dashboard user={user} />
          ) : (path === "services"||path.startsWith("services/")) ? (
            <Operations key={path} initialGroup={path.split("/")[1]??"Analytics"} />
          ) : path === "profile" ? (
            <Profile />
          ) : path === "security" ? (
            <Password logout={reset} />
          ) : (
            <Catalog key={path} model={path} />
          )}
        </article>
      </main>
    </div>
  );
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main>
        <h1>Unable to open this page</h1>
        <button onClick={() => location.reload()}>Reload</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <Boundary>
    <App />
  </Boundary>,
);
