import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, role: string) {
  await page.goto("/");
  await page.getByLabel("Email address").fill(role + "@campus.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.DEMO_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: "Workspace overview" }),
  ).toBeVisible();
}
test("admin opens academic directory and views a saved course", async ({
  page,
}) => {
  await login(page, "admin");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Courses", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Search by code or name" })
    .fill("CSE101");
  await expect(page.getByText("Introduction to Computing")).toBeVisible();
  await page.getByRole("button", { name: "Edit CSE101" }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Introduction to Computing",
  );
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Courses" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
test("student mobile profile and restricted navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "student");
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Departments" }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "My profile" })
    .click();
  await expect(page.getByText("2026-CSE-001")).toBeVisible();
  await page.goto("/#/departments");
  await expect(
    page.getByRole("heading", { name: "Page unavailable" }),
  ).toBeVisible();
});
test("student views own tuition ledger in Phase 1–3", async ({ page }) => {
  await login(page, "student");
  await page
    .getByRole("link", { name: "Campus services", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Academic standing" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finance", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "9000.00", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Ask Campus" })).toHaveCount(0);
});

test("integrated role journeys share published records and reject unrelated accounts", async ({
  browser,
}) => {
  test.setTimeout(150000);
  const id = Date.now().toString(36),
    password = process.env.DEMO_PASSWORD!,
    base = "http://127.0.0.1:4178";
  const contexts: import("@playwright/test").BrowserContext[] = [];
  async function session(email: string) {
    const ctx = await browser.newContext({ baseURL: base });
    contexts.push(ctx);
    const page = await ctx.newPage();
    const res = await ctx.request.post("/api/v1/auth/login", {
      data: { email, password },
    });
    expect(res.status()).toBe(200);
    await page.goto("/#/services");
    await expect(
      page.getByRole("heading", { name: "Campus services" }),
    ).toBeVisible();
    return page;
  }
  async function api(p: Page, path: string, body?: object) {
    const req = p.context().request;
    const r = body
      ? await req.post("/api/v1/" + path, { data: body })
      : await req.get("/api/v1/" + path);
    const raw = await r.text();
    expect(r.ok(), raw).toBeTruthy();
    return JSON.parse(raw).data;
  }
  async function catalog(p: Page, table: string, fields: object) {
    return (
      await api(p, "catalog/" + table, {
        code: id + table.slice(0, 2),
        name: "QA " + id + " " + table,
        active: true,
        ...fields,
      })
    ).id;
  }
  async function submit(
    p: Page,
    section: string,
    title: string,
    values: Record<string, string | number>,
  ) {
    await p.reload();
    await p.getByRole("button", { name: section, exact: true }).click();
    const box = p
      .locator("details")
      .filter({ has: p.locator("summary", { hasText: title }) });
    await box.locator("summary").click();
    for (const [key, value] of Object.entries(values)) {
      const input = box.locator('[name="' + key + '"]');
      if ((await input.evaluate((el) => el.tagName)) === "SELECT")
        await input.selectOption(String(value));
      else await input.fill(String(value));
    }
    p.once("dialog", (dialog) => dialog.accept());
    const response = p.waitForResponse((r) =>
      r.url().includes("/operations/action/"),
    );
    await box.getByRole("button", { name: title, exact: true }).click();
    const r = await response;
    expect(r.ok(), await r.text()).toBeTruthy();
    await expect(
      p.getByRole("status", { name: "" }).filter({ hasText: "Saved" }).first(),
    ).toBeVisible();
    p.removeAllListeners("dialog");
  }
  async function choices(p: Page, group: string, key: string, field: string) {
    const w = await api(p, "operations");
    return w.groups[group].forms
      .find((f: { key: string }) => f.key === key)
      .fields.find((f: { key: string }) => f.key === field).choices as {
      id: number;
      label: string;
    }[];
  }
  const date = (n: number) =>
    new Date(Date.now() + 21600000 + n * 86400000).toISOString().slice(0, 10);
  try {
    const admin = await session("admin@campus.test"),
      teacher = await session("teacher@campus.test"),
      advisor = await session("advisor@campus.test"),
      acc = await session("accounts_officer@campus.test"),
      lib = await session("librarian@campus.test"),
      sup = await session("thesis_supervisor@campus.test");
    const dept = await catalog(admin, "departments", {}),
      program = await catalog(admin, "programs", {
        department_id: dept,
        credits: 120,
      }),
      year = await catalog(admin, "academic_years", {
        starts_on: date(-40),
        ends_on: date(150),
      }),
      term = await catalog(admin, "semesters", {
        year_id: year,
        starts_on: date(-5),
        ends_on: date(80),
        opens_on: date(-10),
        closes_on: date(15),
        drop_on: date(20),
      }),
      course = await catalog(admin, "courses", {
        department_id: dept,
        credits: 3,
      });
    const email = "qa-" + id + "@campus.test",
      name = "QA student " + id;
    await api(admin, "operations/action/user", {
      email,
      name,
      password,
      role: "STUDENT",
    });
    const studentId = (
        await choices(admin, "People", "profile", "student")
      ).find((x) => x.label === name)!.id,
      teacherId = (await api(teacher, "auth/me")).id,
      advisorId = (await api(advisor, "auth/me")).id,
      supId = (await api(sup, "auth/me")).id;
    await api(admin, "operations/action/profile", {
      student: studentId,
      program,
      batch: id,
      status: "ACTIVE",
      student_no: "QA-" + id,
    });
    await api(admin, "operations/action/advise", {
      student: studentId,
      advisor: advisorId,
    });
    await submit(admin, "Registration", "Open a section", {
      course,
      term,
      teacher: teacherId,
      program,
      batch: id,
      section: "QA",
      capacity: 8,
      kind: "Classroom",
    });
    const student = await session(email),
      offer = (
        await choices(student, "Registration", "register", "offering")
      )[0].id;
    await submit(student, "Registration", "Request registration", {
      offering: offer,
    });
    const reg = (await choices(advisor, "Registration", "review", "reg")).find(
      (x) => x.label.includes(name),
    )!.id;
    await submit(advisor, "Registration", "Review registration", {
      reg,
      status: "Approved",
    });
    await submit(teacher, "Teaching", "Record or correct attendance", {
      reg,
      day: date(0),
      present: "Present",
    });
    await submit(teacher, "Teaching", "Create weighted assessment", {
      offering: offer,
      title: "Practical " + id,
      category: "Lab",
      maximum: 50,
      weight: 100,
      due: date(0),
    });
    const assessment = (
      await choices(teacher, "Teaching", "assessment_mark", "assessment")
    ).find((a) => a.label.includes(id))!.id;
    await submit(teacher, "Teaching", "Enter assessment mark", {
      assessment,
      reg,
      mark: 40,
    });
    await submit(teacher, "Teaching", "Calculate draft from assessments", {
      reg,
    });
    await submit(teacher, "Teaching", "Publish result", { reg });
    await student.reload();
    await student
      .getByRole("button", { name: "Teaching", exact: true })
      .click();
    await expect(
      student.getByRole("cell", { name: "A+", exact: true }),
    ).toBeVisible();
    await expect(
      student.getByRole("cell", { name: "Present", exact: true }),
    ).toBeVisible();
    await submit(acc, "Finance", "Issue an invoice", {
      student: studentId,
      label: "Lab " + id,
      amount: 1250,
      due: date(7),
    });
    const invoice = (await choices(acc, "Finance", "payment", "invoice")).find(
      (x) => x.label.includes(name),
    )!.id;
    await submit(acc, "Finance", "Record payment or waiver", {
      invoice,
      amount: 250,
      kind: "Payment",
      reference: "QA-" + id,
    });
    await student.reload();
    await student.getByRole("button", { name: "Finance", exact: true }).click();
    await expect(
      student.getByRole("cell", { name: "1000.00", exact: true }),
    ).toBeVisible();
    const copy = (await choices(lib, "Library", "issue_copy", "copy"))[0].id;
    await submit(lib, "Library", "Issue a specific copy", {
      student: studentId,
      copy,
      due: date(7),
    });
    const loan = (await choices(lib, "Library", "return", "loan")).find((x) =>
      x.label.includes(name),
    )!.id;
    await submit(lib, "Library", "Return a book", { loan });
    await submit(admin, "Routine", "Generate term draft", { term });
    await submit(admin, "Routine", "Validate and review routine", { term });
    await submit(admin, "Routine", "Publish term routine", { term });
    await student.reload();
    await student.getByRole("button", { name: "Routine", exact: true }).click();
    await expect(
      student.getByRole("cell", { name: "Published", exact: true }),
    ).toBeVisible();
    await submit(student, "Thesis", "Submit thesis proposal", {
      title: "QA Thesis " + id,
      proposal: "A study of attendance",
    });
    const thesis = (await choices(admin, "Thesis", "allocate", "thesis")).find(
      (x) => x.label.includes(name),
    )!.id;
    await submit(admin, "Thesis", "Approve topic and assign supervisor", {
      thesis,
      supervisor: supId,
    });
    await api(student, "operations/action/progress", {
      thesis,
      note: "First version",
      document: {
        name: "draft.pdf",
        data: Buffer.from("%PDF-1.4\n%%EOF").toString("base64"),
      },
    });
    const submission = (
      await choices(sup, "Thesis", "feedback", "submission")
    ).find((x) => x.label.startsWith("draft.pdf"))!.id;
    await submit(sup, "Thesis", "Review a submitted version", {
      submission,
      note: "Review recorded",
    });
    expect(
      (
        await student
          .context()
          .request.get("/api/v1/operations/file/" + submission)
      ).status(),
    ).toBe(200);
    const outsider = await session("student01@demo.campus.test");
    expect(
      (
        await outsider
          .context()
          .request.get("/api/v1/operations/file/" + submission)
      ).status(),
    ).toBe(404);
    const otherTeacher = await session("teacher01@demo.campus.test");
    expect(
      (
        await otherTeacher
          .context()
          .request.post("/api/v1/operations/action/attendance", {
            data: { reg, day: date(0), present: "Absent", reason: "Check" },
          })
      ).status(),
    ).toBe(422);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
