import { useState, useEffect, useRef, type FormEvent } from "react";
import { api, models, labels, Status, useLoad, type Row } from "./shared";
const parents: Record<string, string> = {
  department_id: "departments",
  year_id: "academic_years",
};
function ParentSelect({
  field,
  value,
  onChange,
}: {
  field: string;
  value: string;
  onChange: (s: string) => void;
}) {
  const [options, set] = useState<Row[]>([]),
    [err, error] = useState("");
  useEffect(() => {
    let live = true;
    async function load() {
      let all: Row[] = [],
        page = 1;
      for (;;) {
        const r = await api<Row[]>(
          "/catalog/" + parents[field] + "?pageSize=100&page=" + page++,
        );
        all = all.concat(r.data);
        if (all.length >= (r.meta?.total ?? 0) || !r.data.length) break;
      }
      if (live) set(all);
    }
    load().catch((e) => {
      if (live) error(e.message);
    });
    return () => {
      live = false;
    };
  }, [field]);
  return (
    <>
      <select required value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select {labels[field].toLowerCase()}</option>
        {options.map((o) => (
          <option key={String(o.id)} value={String(o.id)}>
            {o.name} ({o.code})
          </option>
        ))}
      </select>
      {err && <Status error={err} />}
    </>
  );
}
function Editor({
  model,
  row,
  close,
  done,
}: {
  model: string;
  row: Row;
  close: () => void;
  done: () => void;
}) {
  const [values, set] = useState<Row>({ ...row }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  const change = (key: string, v: string | boolean) =>
    set((old) => ({ ...old, [key]: v }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body: Row = { active: !!values.active };
      for (const key of ["code", "name", ...models[model].fields])
        body[key] =
          parents[key] || key === "credits"
            ? Number(values[key])
            : String(values[key] ?? "");
      await api(
        "/catalog/" + model + (row.id ? "/" + row.id : ""),
        row.id ? "PUT" : "POST",
        body,
      );
      done();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
      aria-labelledby="editor-title"
    >
      <form onSubmit={submit}>
        <h2 id="editor-title">{row.id ? "Edit" : "Add"} record</h2>
        <div className="formgrid">
          {["code", "name", ...models[model].fields].map((k) => (
            <label key={k}>
              {labels[k]}
              {parents[k] ? (
                <ParentSelect
                  field={k}
                  value={String(values[k] ?? "")}
                  onChange={(v) => change(k, v)}
                />
              ) : (
                <input
                  required
                  type={
                    k.endsWith("_on")
                      ? "date"
                      : k === "credits"
                        ? "number"
                        : "text"
                  }
                  min={k === "credits" ? 0.1 : undefined}
                  max={k === "credits" ? 999 : undefined}
                  step={k === "credits" ? 0.1 : undefined}
                  maxLength={k === "code" ? 24 : 140}
                  value={String(values[k] ?? "")}
                  onChange={(e) => change(k, e.target.value)}
                />
              )}
            </label>
          ))}
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={!!values.active}
            onChange={(e) => change("active", e.target.checked)}
          />{" "}
          Active record
        </label>
        {error && <Status error={error} />}
        <footer>
          <button type="button" disabled={busy} onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save record"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
export default function Catalog({ model }: { model: string }) {
  const [q, search] = useState(""),
    [active, filter] = useState(""),
    [page, setPage] = useState(1),
    [tick, refresh] = useState(0),
    [editor, setEditor] = useState<Row | null>(null),
    [notice, notify] = useState("");
  const { data, total, error } = useLoad<Row[]>(
    "/catalog/" +
      model +
      "?q=" +
      encodeURIComponent(q) +
      "&page=" +
      page +
      (active ? "&active=" + active : ""),
    tick,
  );
  return (
    <>
      <header className="heading">
        <h1>{models[model].title}</h1>
        <button className="primary" onClick={() => setEditor({ active: true })}>
          ＋ Add record
        </button>
      </header>
      <section className="panel">
        <div className="toolbar">
          <input
            aria-label="Search by code or name"
            placeholder="Search by code or name"
            value={q}
            onChange={(e) => {
              search(e.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label="Filter status"
            value={active}
            onChange={(e) => {
              filter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>
        {notice && <Status>{notice}</Status>}
        {!data ? (
          <Status error={error} />
        ) : (
          <>
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    {["Code", "Name", "Status", ""].map((x) => (
                      <th key={x}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={String(r.id)}>
                      <td>
                        <strong>{r.code}</strong>
                      </td>
                      <td>{r.name}</td>
                      <td>
                        <span className={"badge " + (!r.active ? "off" : "")}>
                          {r.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => setEditor(r)}
                          aria-label={"Edit " + r.code}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.length && <Status>No matching records.</Status>}
            <footer>
              <small>
                {total} records · Page {page} of{" "}
                {Math.max(1, Math.ceil(total / 10))}
              </small>
              <button disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <button
                disabled={page * 10 >= total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </footer>
          </>
        )}
      </section>
      {editor && (
        <Editor
          model={model}
          row={editor}
          close={() => setEditor(null)}
          done={() => {
            setEditor(null);
            notify("Record saved.");
            refresh(tick + 1);
          }}
        />
      )}
    </>
  );
}
