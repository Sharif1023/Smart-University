import { useEffect, useState, type ReactNode } from "react";
export type Row = Record<string, string | number | boolean>;
export type User = { id: number; name: string; email: string; role: string };
export const models: Record<string, { title: string; fields: string[] }> = {
  departments: { title: "Departments", fields: [] },
  programs: { title: "Programs", fields: ["department_id", "credits"] },
  academic_years: { title: "Academic years", fields: ["starts_on", "ends_on"] },
  semesters: {
    title: "Semesters",
    fields: [
      "year_id",
      "starts_on",
      "ends_on",
      "opens_on",
      "closes_on",
      "drop_on",
    ],
  },
  courses: { title: "Courses", fields: ["department_id", "credits"] },
};
export const labels: Record<string, string> = {
  department_id: "Department",
  year_id: "Academic year",
  starts_on: "Start date",
  ends_on: "End date",
  opens_on: "Registration opens",
  closes_on: "Registration closes",
  drop_on: "Add/drop deadline",
  credits: "Credits",
  code: "Code",
  name: "Name",
};
export const roleName = (s: string) =>
  s
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<{ data: T; meta?: { total: number } }> {
  const res = await fetch("/api/v1" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/login"))
      window.dispatchEvent(new Event("signed-out"));
    const message = json.error?.message || "Request failed.";
    const reference = json.error?.requestId;
    throw Error(
      res.status >= 500 && reference
        ? `${message} (Reference: ${reference})`
        : message,
    );
  }
  return json;
}
export function useLoad<T>(path: string, tick = 0) {
  const [state, set] = useState<{ data?: T; error?: string; total: number }>({
    total: 0,
  });
  useEffect(() => {
    let alive = true;
    set({ total: 0 });
    api<T>(path)
      .then((r) => {
        if (alive) set({ data: r.data, total: r.meta?.total ?? 0 });
      })
      .catch((e) => {
        if (alive) set({ error: e.message, total: 0 });
      });
    return () => {
      alive = false;
    };
  }, [path, tick]);
  return state;
}
export function Status({
  error,
  children,
}: {
  error?: string;
  children?: ReactNode;
}) {
  return (
    <p role={error ? "alert" : "status"} className={error ? "error" : "muted"}>
      {error || children || "Loading…"}
    </p>
  );
}
export function Brand() {
  return (
    <div className="brand">
      <span className="crest" aria-hidden="true">
        U
      </span>
      <span>Campus Desk</span>
    </div>
  );
}
