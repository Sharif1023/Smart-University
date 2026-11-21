import { extraForms, extraOptions } from "./blueprint.js";
import { slots, roles, eligible, today } from "./records.js";
const form = (section, title, roles, fields) => ({
  section,
  title,
  roles: roles.split(" "),
  fields: fields.split(" ").map((f) => {
    const [key, type = "text"] = f.split(":");
    return { key, type };
  }),
});
export const actions = {
  ...Object.fromEntries(
    extraForms.map(([key, ...args]) => [key, form(...args)]),
  ),
  user: form(
    "People",
    "Create an account",
    "ADMIN",
    "name email:email password:password role:roles",
  ),
  account_status: form(
    "People",
    "Activate or deactivate account",
    "ADMIN",
    "account:accounts access:access",
  ),
  profile: form(
    "People",
    "Set student profile",
    "ADMIN",
    "student:studentUsers student_no program:programs batch status:statuses",
  ),
  faculty: form(
    "People",
    "Set faculty profile",
    "ADMIN",
    "teacher:facultyUsers department:departments designation",
  ),
  advise: form(
    "People",
    "Assign an advisor",
    "ADMIN",
    "student:students advisor:advisors",
  ),
  prerequisite: form(
    "Registration",
    "Add prerequisite",
    "ADMIN",
    "course:courses required_course:courses",
  ),
  offering: form(
    "Registration",
    "Open a section",
    "ADMIN",
    "course:courses term:semesters teacher:teachers program:programs batch section capacity:integer kind:kinds",
  ),
  register: form(
    "Registration",
    "Request registration",
    "STUDENT",
    "offering:eligible",
  ),
  review: form(
    "Registration",
    "Review registration",
    "ADVISOR ADMIN",
    "reg:pending status:decisions reason:optional",
  ),
  drop: form("Registration", "Drop registration", "STUDENT", "reg:droppable"),
  attendance: form(
    "Teaching",
    "Record or correct attendance",
    "TEACHER",
    "reg:enrolled day:date present:presence reason:optional",
  ),
  marks: form(
    "Teaching",
    "Save marks",
    "TEACHER",
    "reg:unlocked assessment:mark exam:mark",
  ),
  publish: form("Teaching", "Publish result", "ADMIN TEACHER", "reg:drafts"),
  weight: form(
    "Teaching",
    "Set coursework weight before marking",
    "ADMIN TEACHER",
    "offering:ownedSections weight:integer",
  ),
  material: form(
    "Teaching",
    "Share course material",
    "TEACHER",
    "offering:ownedSections title url:url",
  ),
  fee_type: form(
    "Finance",
    "Create standard fee",
    "ACCOUNTS_OFFICER ADMIN",
    "label amount:money",
  ),
  standard_invoice: form(
    "Finance",
    "Bill a standard fee",
    "ACCOUNTS_OFFICER ADMIN",
    "student:students fee:feeTypes term:semesters due:date",
  ),
  invoice: form(
    "Finance",
    "Issue an invoice",
    "ACCOUNTS_OFFICER ADMIN",
    "student:students label amount:money due:date",
  ),
  payment: form(
    "Finance",
    "Record payment or waiver",
    "ACCOUNTS_OFFICER ADMIN",
    "invoice:outstanding kind:receipts amount:money reference method:optional reason:optional",
  ),
  request_payment: form(
    "Finance",
    "Submit a fee payment for verification",
    "STUDENT",
    "invoice:payableInvoices amount:money method:paymentMethods reference reason:optional",
  ),
  payment_request_review: form(
    "Finance",
    "Verify student payment",
    "ACCOUNTS_OFFICER ADMIN",
    "request:pendingPaymentRequests decision:decisions review_reason:optional",
  ),
  notice: form(
    "Notices",
    "Publish notice",
    "ADMIN",
    "title body:long audience:audiences target:targets",
  ),
  read: form("Notices", "Mark as read", "*", "notice:unread"),
  book: form(
    "Library",
    "Add library title",
    "LIBRARIAN ADMIN",
    "code title author copies:integer",
  ),
  issue: form(
    "Library",
    "Issue a book",
    "LIBRARIAN ADMIN",
    "book:available student:students due:date",
  ),
  return: form("Library", "Return a book", "LIBRARIAN ADMIN", "loan:openLoans"),
  room: form(
    "Routine",
    "Add room or laboratory",
    "ADMIN",
    "name kind:kinds capacity:integer",
  ),
  block: form(
    "Routine",
    "Mark teaching slot unavailable",
    "TEACHER",
    "slot:slots",
  ),
  unblock: form(
    "Routine",
    "Restore availability",
    "TEACHER",
    "slot:blockedSlots",
  ),
  generate: form("Routine", "Generate term draft", "ADMIN", "term:semesters"),
  release: form("Routine", "Publish term routine", "ADMIN", "term:semesters"),
  topic: form(
    "Thesis",
    "Submit thesis proposal",
    "STUDENT",
    "title proposal:long",
  ),
  allocate: form(
    "Thesis",
    "Approve topic and assign supervisor",
    "ADMIN",
    "thesis:openTheses supervisor:supervisors",
  ),
  progress: form(
    "Thesis",
    "Record progress or attach PDF",
    "STUDENT THESIS_SUPERVISOR",
    "thesis:activeTheses note:long document:pdf",
  ),
  milestone: form(
    "Thesis",
    "Record milestone and feedback",
    "THESIS_SUPERVISOR",
    "thesis:activeTheses status:milestones note:long",
  ),
};
export function options(d, studentUsers = [], u = {}, semesterId = null) {
  const pick = (arr, label) => arr.map((r) => ({ id: r.id, label: label(r) }));
  const choices = (arr) => arr.map((v) => ({ id: v, label: v }));
  const name = (r) => r.name,
    course = (r) => r.code + " · " + r.name;
  const reg = (r) =>
    r.student_name + " · " + r.semester + " / " + r.code + " / " + r.section;
  const offer = (r) => r.code + " · " + r.semester + " / " + r.section;
  const live = (r) => r.status === "Approved";
  const thesis = (r) => r.student_name + " · " + r.title;
  const catalog = Object.fromEntries(
    Object.entries(d.catalog).map(([k, v]) => [
      k,
      pick(
        v.filter((x) => x.active),
        course,
      ),
    ]),
  );
  return {
    ...catalog,
    ...extraOptions(d, u, semesterId),
    accounts: pick(
      [...studentUsers, ...d.staff].filter((r) => r.id !== u.id),
      (r) => r.name + " · " + (r.active ? "Active" : "Inactive"),
    ),
    access: choices(["Active", "Inactive"]),
    ownedSections: pick(
      d.offerings.filter(
        (o) => (u.role === "ADMIN" || o.teacher === u.id) && (!semesterId || Number(o.term) === Number(semesterId)),
      ),
      offer,
    ),
    feeTypes: pick(d.feeTypes, (r) => r.label + " · BDT " + r.amount),
    roles: choices(roles),
    students: pick(d.people, (r) => r.name + " · " + r.student_no),
    studentUsers: pick(
      studentUsers.filter((r) => r.active),
      name,
    ),
    facultyUsers: pick(
      d.staff.filter((r) =>
        ["TEACHER", "ADVISOR", "THESIS_SUPERVISOR"].includes(r.role),
      ),
      name,
    ),
    teachers: pick(
      d.staff.filter((r) => r.role === "TEACHER"),
      name,
    ),
    advisors: pick(
      d.staff.filter((r) => r.role === "ADVISOR"),
      name,
    ),
    supervisors: pick(
      d.staff.filter((r) => r.role === "THESIS_SUPERVISOR"),
      name,
    ),
    statuses: choices([
      "ACTIVE",
      "ON_LEAVE",
      "GRADUATED",
      "SUSPENDED",
      "INACTIVE",
    ]),
    kinds: choices(["Classroom", "Lab"]),
    decisions: choices(["Approved", "Rejected"]),
    presence: choices(["Present", "Absent", "Late", "Excused"]),
    eligible: pick(
      d.offerings.filter(
        (o) =>
          (!semesterId || Number(o.term) === Number(semesterId)) &&
          d.people[0] &&
          eligible(d.people[0], o, d.regs, d.requirements) &&
          today() >= o.opens_on &&
          today() <= o.closes_on &&
          o.enrolled < o.capacity,
      ),
      offer,
    ),
    pending: pick(
      d.regs.filter((r) => r.status === "Pending" && (!semesterId || Number(r.term) === Number(semesterId))),
      reg,
    ),
    droppable: pick(
      d.regs.filter(
        (r) =>
          ["Pending", "Approved"].includes(r.status) &&
          (!semesterId || Number(r.term) === Number(semesterId)) &&
          !r.published &&
          today() <= d.offerings.find((o) => o.id === r.offering).drop_on,
      ),
      reg,
    ),
    enrolled: pick(d.regs.filter((r) => live(r) && (!semesterId || Number(r.term) === Number(semesterId))), reg),
    unlocked: pick(
      d.regs.filter((r) => live(r) && !r.published && (!semesterId || Number(r.term) === Number(semesterId))),
      reg,
    ),
    drafts: pick(
      d.regs.filter((r) => live(r) && r.assessment != null && !r.published && (!semesterId || Number(r.term) === Number(semesterId))),
      reg,
    ),
    outstanding: pick(
      d.bills.filter((r) => Number(r.balance) > 0 && (!semesterId || Number(r.term) === Number(semesterId))),
      (r) => r.student_name + " · " + r.label + " · BDT " + r.balance,
    ),
    receipts: choices(["Payment", "Waiver"]),
    audiences: choices([
      "All",
      ...roles,
      "Department",
      "Program",
      "User",
      "Semester",
      "Offering",
    ]),
    targets: [
      { id: "0", label: "Everyone in selected audience" },
      ...[...studentUsers, ...d.staff].map((r) => ({
        id: "users-" + r.id,
        label: r.name,
      })),
      ...["departments", "programs", "semesters"].flatMap((k) =>
        catalog[k].map((r) => ({ ...r, id: k + "-" + r.id })),
      ),
      ...pick(d.offerings, offer).map((r) => ({
        ...r,
        id: "offerings-" + r.id,
      })),
    ],
    unread: pick(
      d.notices.filter((r) => r.read_status === "Unread"),
      (r) => r.title,
    ),
    available: pick(
      d.books.filter((r) => r.available > 0),
      (r) => r.code + " · " + r.title,
    ),
    openLoans: pick(
      d.loans.filter((r) => !r.returned),
      (r) => r.borrower + " · " + r.title,
    ),
    slots,
    blockedSlots: slots.filter((s) => d.blocked.some((b) => b.slot === s.id)),
    openTheses: pick(
      d.theses.filter(
        (r) => !["Defended", "Draft", "Revision requested"].includes(r.status),
      ),
      thesis,
    ),
    activeTheses: pick(
      d.theses.filter(
        (r) =>
          r.supervisor &&
          !["Defended", "Draft", "Revision requested"].includes(r.status),
      ),
      thesis,
    ),
    milestones: choices(["In progress", "Draft reviewed"]),
  };
}
