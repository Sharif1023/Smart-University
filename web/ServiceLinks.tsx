import { useLoad, Status, type User } from "./shared";
const catalog: Record<string, [string, string][]> = {
  STUDENT: [
    ["Registration", "Course registration"],
    ["Teaching", "My courses, attendance & results"],
    ["Finance", "My fees"],
    ["Routine", "Class routine"],
    ["Library", "Library"],
    ["Thesis", "My thesis"],
  ],
  TEACHER: [
    ["Teaching", "My sections & assessments"],
    ["Routine", "Teaching schedule"],
  ],
  ADVISOR: [
    ["People", "My advisees"],
    ["Registration", "Registration requests"],
    ["Analytics", "Academic records"],
  ],
  ADMIN: [
    ["People", "Users & roles"],
    ["Registration", "Offerings & sections"],
    ["Teaching", "Teaching & results"],
    ["Routine", "Rooms & routine"],
    ["Thesis", "Thesis management"],
    ["Administration", "Settings & audit log"],
    ["Finance", "Finance"],
    ["Library", "Library"],
  ],
  ACCOUNTS_OFFICER: [["Finance", "Student finance"]],
  LIBRARIAN: [["Library", "Library circulation"]],
  THESIS_SUPERVISOR: [["Thesis", "Supervision & viva"]],
};
export const serviceLinks = (role: string) =>
  Object.fromEntries(
    [
      ...(catalog[role] ?? []),
      ["Notices", "Notices"],
      ["Notifications", "Notifications"],
    ].map(([section, title]) => ["services/" + section, title]),
  );
type Grid = { title: string; items: Record<string, string | number | null>[] };
type Summary = {
  metrics: { label: string; value: string | number }[];
  groups: Record<string, { tables: Grid[] }>;
};
export function RoleOverview({ user }: { user: User }) {
  const { data, error } = useLoad<Summary>("/operations");
  if (!data) return <Status error={error} />;
  const lookup = (group: string, title: string) =>
    data.groups[group]?.tables.find((t) => t.title.startsWith(title))?.items ??
    [];
  const standing = lookup("Analytics", "Academic standing")[0];
  return (
    <section className="panel">
      <h2>
        {user.role === "STUDENT"
          ? "My semester at a glance"
          : "Workspace summary"}
      </h2>
      <div className="op-metrics">
        {data.metrics.map((m) => (
          <div key={m.label}>
            <span>{m.label}</span>
            <strong>{m.value}</strong>
          </div>
        ))}
      </div>
      {user.role === "STUDENT" && (
        <>
          <p>
            CGPA <b>{standing?.cgpa ?? "Awaiting results"}</b> · Earned credits{" "}
            <b>{standing?.earned ?? 0}</b> · Advisor{" "}
            <b>{standing?.advisor ?? "Unassigned"}</b>
          </p>
          <p>
            Thesis{" "}
            <b>
              {lookup("Thesis", "Thesis projects")[0]?.status ??
                "No proposal yet"}
            </b>{" "}
            · Scheduled classes{" "}
            <b>{lookup("Routine", "Weekly timetable").length}</b>
          </p>
        </>
      )}
      <a href="#/services/Notifications">View my notifications</a>
    </section>
  );
}
