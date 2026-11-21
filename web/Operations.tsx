import { useEffect, useState, type FormEvent } from "react";
import { api, useLoad, Status } from "./shared";
type Opt = { id: string | number; label: string };
type Field = { key: string; type: string; choices?: Opt[]; defaultValue?: string };
type Action = { key: string; title: string; fields: Field[] };
type Grid = {
  title: string;
  columns: string[];
  items: Record<string, string | number | null>[];
};
type Group = { tables: Grid[]; forms: Action[] };
type Workspace = {
  phase4: boolean;
  role: string;
  settings: {
    timezone_name: string;
    date_locale: string;
    currency_code: string;
  };
  groups: Record<string, Group>;
  metrics: { label: string; value: string | number }[];
};
function WhatIfGpa({ current, attempted }: { current: number | null; attempted: number }) {
  const [credits, setCredits] = useState("3"),
    [grade, setGrade] = useState("3.5"),
    nextCredits = Number(credits),
    nextGrade = Number(grade),
    estimate =
      nextCredits > 0 && nextGrade >= 0 && nextGrade <= 4
        ? Number((((current ?? 0) * attempted + nextGrade * nextCredits) / (attempted + nextCredits)).toFixed(2))
        : null;
  return (
    <section className="panel what-if">
      <h3>What-if GPA calculator</h3>
      <p className="muted">Estimate one hypothetical new course using your published GPA. This stays in your browser and does not change your academic record.</p>
      <div className="what-if-fields">
        <label>Hypothetical credits<input type="number" min="0.5" max="20" step="0.5" value={credits} onChange={(e) => setCredits(e.target.value)} /></label>
        <label>Hypothetical grade points<input type="number" min="0" max="4" step="0.01" value={grade} onChange={(e) => setGrade(e.target.value)} /></label>
      </div>
      <p>Estimated GPA after this scenario: <strong>{estimate === null ? "Enter valid values" : estimate.toFixed(2)}</strong></p>
      <small className="muted">Current published GPA: {current === null ? "not available yet" : current.toFixed(2)} · attempted credits: {attempted}</small>
    </section>
  );
}
const labels: Record<string, string> = {
  weight: "Coursework weight (%)",
  reg: "Student registration",
  session: "Held class session",
  correction: "Attendance correction request",
  request: "Review request",
  document_request: "Document request",
  ticket: "Support ticket",
  reservation: "Book reservation",
  renewal: "Loan renewal request",
  opportunity: "Career opportunity",
  application: "Student application",
  schedule: "Exam schedule",
  room: "Exam venue",
  assessment: "Coursework mark (0–100)",
  exam: "Exam or final exam mark (0–100)",
  prediction: "Estimated mark / 100",
  neighbors: "Historical examples",
  required_course: "Required prior course",
  target: "Audience target",
  amount: "Amount (BDT)",
  student_no: "Student number",
  document: "PDF attachment (optional, 1 MiB)",
  reference: "Unique receipt reference",
  earned: "Credits earned",
  remaining: "Credits remaining",
  day: "Class date",
  exam_date: "Exam date",
  starts_at: "Start time",
  ends_at: "End time",
  requested_due: "Requested due date",
  requested_status: "Requested attendance status",
  review_reason: "Review note (optional)",
  document_type: "Document type",
  opportunity_type: "Opportunity type",
  application_url: "Application link (optional, HTTPS)",
  cover_note: "Application note (optional)",
  description: "Description",
  purpose: "Purpose",
  message: "Message",
  status: "Status",
  present: "Attendance",
  kind: "Type",
  title: "Title",
  id: "ID",
};
const label = (s: string) =>
  labels[s] || s.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
function Form({ action, saved }: { action: Action; saved: () => void }) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form),
      body: Record<string, unknown> = {};
    if (
      [
        "void_receipt",
        "publish",
        "release",
        "change_role",
        "reopen",
        "outcome",
        "account_status",
        "drop",
        "lock_result",
      ].includes(action.key) &&
      !window.confirm(action.title + "?")
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      for (const f of action.fields) {
        const v = fd.get(f.key);
        if (v instanceof File) {
          if (v.size) {
            if (v.size > 1048576) throw Error("Choose a PDF under 1 MiB.");
            const data = await new Promise<string>((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(String(r.result).split(",")[1]);
              r.onerror = () => reject(Error("File could not be read."));
              r.readAsDataURL(v);
            });
            body[f.key] = { name: v.name, data };
          }
        } else body[f.key] = v;
      }
      await api("/operations/action/" + action.key, "POST", body);
      form.reset();
      saved();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="op-form">
      <summary>{action.title}</summary>
      <form onSubmit={submit}>
        {action.fields.map((f) => (
          <label key={f.key}>
            {label(f.key)}
            {f.choices ? (
              <select name={f.key} required defaultValue={f.defaultValue ?? ""}>
                <option value="">
                  {f.choices.length
                    ? "Select an option"
                    : "No eligible records"}
                </option>
                {f.choices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "long" ? (
              <textarea name={f.key} required maxLength={5000} />
            ) : f.type === "pdf" ? (
              <input type="file" name={f.key} accept="application/pdf" />
            ) : (
              <input
                name={f.key}
                required={f.type !== "optional"}
                type={
                  (
                    {
                      integer: "number",
                      money: "number",
                      moneyOrZero: "number",
                      mark: "number",
                      password: "password",
                      email: "email",
                      date: "date",
                      time: "time",
                      optional: "text",
                    } as Record<string, string>
                  )[f.type] || "text"
                }
                step={f.type === "integer" ? 1 : "any"}
                min={
                  f.type === "mark"
                    ? 0
                    : f.type === "money"
                      ? 0.01
                      : f.type === "integer"
                        ? 1
                        : undefined
                }
                max={f.type === "mark" ? 100 : undefined}
                minLength={f.type === "password" ? 12 : undefined}
              />
            )}
          </label>
        ))}
        {message && <Status error={message} />}
        <button
          className="primary"
          disabled={busy || action.fields.some((f) => f.choices?.length === 0)}
        >
          {busy ? "Saving…" : action.title}
        </button>
      </form>
    </details>
  );
}
function TranscriptDownload() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function download() {
    setBusy(true);
    setError("");
    try {
      const { data } = await api<{
        student: { student_no?: string; name?: string } | null;
        cgpa: number | null;
        earned_credits: number;
        results: {
          semester: string;
          course: string;
          credits: number;
          mark: number;
          grade: string | null;
          points: number | null;
          state: string | null;
        }[];
      }>("/students/me/transcript");
      const cell = (value: unknown) => {
        let text = String(value ?? "");
        if (/^[\t\r ]*[=+\-@]/.test(text)) text = "'" + text;
        return '"' + text.replaceAll('"', '""') + '"';
      };
      const lines = [
        ["Student ID", data.student?.student_no, "Student name", data.student?.name],
        ["CGPA", data.cgpa, "Earned credits", data.earned_credits],
        [],
        ["Semester", "Course", "Credits", "Mark", "Grade", "Grade points", "Publication state"],
        ...data.results.map((r) => [r.semester, r.course, r.credits, r.mark, r.grade, r.points, r.state]),
      ];
      const csv = "\uFEFF" + lines.map((row) => row.map(cell).join(",")).join("\r\n"),
        blob = new Blob([csv], { type: "text/csv;charset=utf-8" }),
        url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = "student-transcript-" + (data.student?.student_no || "records") + ".csv";
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel transcript-download">
      <h3>Official published results</h3>
      <p className="muted">Download a CSV grade sheet. Unpublished grades are excluded.</p>
      <button onClick={download} disabled={busy}>{busy ? "Preparing…" : "Download grade sheet (CSV)"}</button>
      {error && <Status error={error} />}
    </section>
  );
}
function GridView({
  grid,
  settings,
}: {
  grid: Grid;
  settings: Workspace["settings"];
}) {
  const display = (key: string, value: string | number | null) => {
    if (
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2})?$/.test(value)
    ) {
      const timed = value.length > 10;
      const date = new Date(
        value.replace(" ", "T") + (timed ? "Z" : "T12:00:00Z"),
      );
      return new Intl.DateTimeFormat(settings.date_locale, {
        dateStyle: "medium",
        ...(timed ? { timeStyle: "short" as const } : {}),
        timeZone: timed ? settings.timezone_name : "UTC",
      }).format(date);
    }
    if (
      [
        "status",
        "state",
        "result_state",
        "publication",
        "read_status",
      ].includes(key) &&
      value
    )
      return <span className="status-pill">{value}</span>;
    return value ?? "—";
  };
  const [q, setQ] = useState(""),
    [page, setPage] = useState(0),
    [filter, setFilter] = useState(""),
    [sort, setSort] = useState(""),
    [desc, setDesc] = useState(false);
  const field = grid.columns.find((c) =>
    ["status", "state", "publication", "kind", "role"].includes(c),
  );
  const items = grid.items.filter(
    (r) =>
      Object.values(r).join(" ").toLowerCase().includes(q.toLowerCase()) &&
      (!field || !filter || String(r[field]) === filter),
  );
  if (sort)
    items.sort(
      (a, b) =>
        (desc ? -1 : 1) *
        String(a[sort] ?? "").localeCompare(String(b[sort] ?? ""), undefined, {
          numeric: true,
        }),
    );
  return (
    <section className="op-table">
      <header>
        <h2>{grid.title.replaceAll("BDT", settings.currency_code)}</h2>
        <input
          aria-label={"Search " + grid.title}
          placeholder="Search records"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
        {field && (
          <select
            aria-label={"Filter " + grid.title}
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All {label(field)}</option>
            {[...new Set(grid.items.map((r) => String(r[field] ?? "")))]
              .filter(Boolean)
              .map((x) => (
                <option key={x}>{x}</option>
              ))}
          </select>
        )}
      </header>
      <div className="op-scroll">
        <table>
          <thead>
            <tr>
              {grid.columns.map((c) => (
                <th
                  key={c}
                  aria-sort={
                    c === sort ? (desc ? "descending" : "ascending") : "none"
                  }
                >
                  <button
                    className="column-sort"
                    onClick={() => {
                      setDesc(c === sort ? !desc : false);
                      setSort(c);
                      setPage(0);
                    }}
                  >
                    {label(c)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.slice(page * 10, page * 10 + 10).map((r, n) => (
              <tr key={n}>
                {grid.columns.map((c) => (
                  <td key={c}>
                    {["attendance", "prediction", "cgpa", "gpa"].includes(c) &&
                    r[c] != null ? (
                      <span className="op-value">
                        <span>
                          {r[c]}
                          {c === "attendance" ? "%" : ""}
                        </span>
                        <meter
                          aria-label={label(c)}
                          value={Number(r[c])}
                          min={0}
                          max={c === "cgpa" || c === "gpa" ? 4 : 100}
                        />
                      </span>
                    ) : c === "url" && r[c] ? (
                      <a href={String(r[c])} target="_blank" rel="noreferrer">
                        Open material
                      </a>
                    ) : c === "filename" && r[c] ? (
                      <a
                        href={
                          "/api/v1/operations/" +
                          (grid.title === "Noticeboard"
                            ? "notice-file/"
                            : "file/") +
                          (r.submission ?? r.id)
                        }
                      >
                        {r[c]}
                      </a>
                    ) : (
                      display(c, r[c])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {items.length > 10 && (
          <nav aria-label={grid.title + " pages"}>
            <button disabled={!page} onClick={() => setPage(page - 1)}>
              Previous
            </button>{" "}
            {page + 1} / {Math.ceil(items.length / 10)}{" "}
            <button
              disabled={(page + 1) * 10 >= items.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </nav>
        )}
        {!items.length && <p className="muted">No matching records.</p>}
      </div>
    </section>
  );
}
export default function Operations({
  initialGroup = "Analytics",
}: {
  initialGroup?: string;
}) {
  const [tick, setTick] = useState(0),
    [active, setActive] = useState(initialGroup),
    [success, setSuccess] = useState(""),
    [q, setQ] = useState(""),
    [answer, setAnswer] = useState(""),
    [asking, setAsking] = useState(false);
  const { data, error } = useLoad<Workspace>("/operations", tick);
  useEffect(() => {
    setSuccess("");
  }, [active]);
  if (!data)
    return error ? (
      <Status error={error} />
    ) : (
      <div className="op-skeleton" role="status" aria-live="polite">
        Loading campus services…
      </div>
    );
  const group = data.groups[active],
    standing = group?.tables.find((t) => t.title === "Academic standing")?.items[0];
  return (
    <>
      <h1>Campus services</h1>
      <div className="op-tabs">
        {[
          ...Object.keys(data.groups),
          ...(data.phase4 ? ["Academic Assistant"] : []),
        ].map((k) => (
          <button
            aria-pressed={active === k}
            key={k}
            onClick={() => setActive(k)}
          >
            {k}
          </button>
        ))}
      </div>
      <h2>{active}</h2>
      {success && <p role="status">{success}</p>}
      {active === "Analytics" && (
        <>
          <div className="op-metrics">
            {data.metrics.map((m) => (
              <div key={m.label}>
                <span>
                  {m.label.replaceAll("BDT", data.settings.currency_code)}
                </span>
                <strong>{m.value}</strong>
              </div>
            ))}
          </div>
          {group.tables.some((t) => t.title.includes("estimates")) && (
            <p className="muted">
              These are transparent rule-based estimates from up to five comparable historical results, not a trained AI model or an official grade. A blank estimate means there are fewer than three usable examples or missing indicators.
            </p>
          )}
          {data.role === "STUDENT" && standing && (
            <WhatIfGpa
              current={standing.cgpa == null ? null : Number(standing.cgpa)}
              attempted={Number(standing.attempted ?? 0)}
            />
          )}
        </>
      )}
      {active === "Academic Assistant" ? (
        <form
          className="op-chat"
          onSubmit={async (e) => {
            e.preventDefault();
            setAsking(true);
            try {
              setAnswer(
                (await api<string>("/operations/ask", "POST", { question: q }))
                  .data,
              );
            } catch (err) {
              setAnswer((err as Error).message);
            } finally {
              setAsking(false);
            }
          }}
        >
          <label>
            Ask about your campus records (answers use only records you are allowed to see)
            <input
              value={q}
              maxLength={400}
              onChange={(e) => setQ(e.target.value)}
              required
              placeholder="What is my next exam?"
            />
          </label>
          <button className="primary" disabled={asking}>
            {asking ? "Checking…" : "Ask Campus"}
          </button>
          <p className="muted">Intent-based lookup of university records. It does not run generated SQL or make academic decisions.</p>
          <p role="status">{answer}</p>
        </form>
      ) : group ? (
        <>
          {active === "Teaching" && data.role === "STUDENT" && <TranscriptDownload />}
          {group.forms.map((a) => (
            <Form
              key={a.key + tick}
              action={a}
              saved={() => {
                setSuccess(a.title + " · Saved");
                setTick((t) => t + 1);
              }}
            />
          ))}
          {group.tables.map((t) => (
            <GridView
              key={active + t.title}
              grid={t}
              settings={data.settings}
            />
          ))}
        </>
      ) : (
        <Status error="This workspace section is unavailable." />
      )}
    </>
  );
}
