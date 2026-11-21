import { useLoad, Status, type User } from "./shared";
const catalog: Record<string, [string, string][]> = {
  STUDENT: [
    ["Analytics", "Academic progress, alerts & assistant"],
    ["People", "Academic advising"],
    ["Registration", "Course registration"],
    ["Teaching", "My courses, attendance & results"],
    ["Finance", "My fees"],
    ["Routine", "Class routine"],
    ["Library", "Library"],
    ["Thesis", "My thesis"],
    ["Student services", "Student services"],
    ["Student documents", "Student documents"],
    ["Student support", "Student support"],
    ["Career & internship", "Career & internship"],
    ["Account settings", "Account settings"],
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
    ["Student documents", "Student documents"],
    ["Student support", "Student support"],
    ["Career & internship", "Career & internship"],
    ["Account settings", "Account settings"],
  ],
  ACCOUNTS_OFFICER: [["Finance", "Student finance"]],
  LIBRARIAN: [["Library", "Library circulation"]],
  THESIS_SUPERVISOR: [["Thesis", "Supervision & viva"]],
};
export const serviceLinks = (role: string) =>
  Object.fromEntries(
    [
      ...(catalog[role] ?? []),
      ["Account settings", "Account settings"],
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
  const dhakaToday = new Date(Date.now() + 6 * 3600000)
      .toISOString()
      .slice(0, 10),
    nextExam = lookup("Routine", "Exam schedule").find(
      (x) => x.state === "Published" && String(x.exam_date) >= dhakaToday,
    ),
    weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
      new Date(Date.parse(dhakaToday + "T00:00:00Z")).getUTCDay()
    ],
    todayClasses = lookup("Routine", "Weekly timetable").filter(
      (x) => x.current_term === "Current" && String(x.time ?? "").startsWith(weekday),
    ),
    latestResults = lookup("Teaching", "Assessment and results")
      .filter((x) => x.publication === "Published")
      .slice(0, 3),
    nextAssessment = lookup("Teaching", "Assessments")
      .filter((x) => String(x.due) >= dhakaToday)
      .sort((a, b) => String(a.due).localeCompare(String(b.due)))[0];
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
          <p>
            Next exam <b>{nextExam ? `${nextExam.course_name} · ${nextExam.exam_date} · ${nextExam.starts_at}` : "No published exam"}</b>
            {nextAssessment && <> · Next assessment <b>{nextAssessment.code} · {nextAssessment.title} · {nextAssessment.due}</b></>}
          </p>
          <p>
            Today's classes <b>{todayClasses.length ? todayClasses.map((x) => `${x.code} ${x.time} · ${x.room_name}`).join("; ") : "No scheduled classes"}</b>
          </p>
          <p>
            Latest published results <b>{latestResults.length ? latestResults.map((x) => `${x.code} ${x.mark}/100 (${x.letter ?? "—"})`).join("; ") : "No published results"}</b>
          </p>
        </>
      )}
      <a href="#/services/Notifications">View my notifications</a>
    </section>
  );
}
