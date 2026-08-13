import { createServer } from "node:http";

const host = "127.0.0.1";
const port = 54321;
const createdAt = "2026-01-01T00:00:00.000Z";

const seededUsers = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    email: "learner@example.com",
    password: "Password123!",
    username: "E2E Learner",
    role: "learner",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    email: "moderator@example.com",
    password: "Password123!",
    username: "E2E Moderator",
    role: "moderator",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    email: "admin@example.com",
    password: "Password123!",
    username: "E2E Admin",
    role: "admin",
  },
];

const multiSourceCourseImportFixture = {
  sources: [
    { sourceDocumentId: 9, sourceOrder: 0, sourceType: "file", ingestionMethod: "uploaded",
      title: "Nguồn A", filename: "a.md", sourceUrl: null, canonicalUrl: null, domain: null,
      authorityScore: null, relevanceScore: null, status: "ready_for_review", errorCode: null, chunkCount: 1 },
    { sourceDocumentId: 10, sourceOrder: 1, sourceType: "web_page", ingestionMethod: "manual_url",
      title: "Nguồn B", filename: "b.md", sourceUrl: "https://b.test", canonicalUrl: "https://b.test",
      domain: "b.test", authorityScore: 0.7, relevanceScore: 0.8, status: "ready_for_review",
      errorCode: null, chunkCount: 1 },
  ],
  chunks: [
    { documentChunkId: 101, sourceDocumentId: 9, sourceOrder: 0, chunkIndex: 0 },
    { documentChunkId: 202, sourceDocumentId: 10, sourceOrder: 1, chunkIndex: 0 },
  ],
};

let state;

function resetState() {
  state = {
    users: structuredClone(seededUsers),
    enrollments: [],
    progress: [],
    submissions: [],
    explanations: [],
    nextSubmissionId: 1,
    nextExplanationId: 1,
  };
}

resetState();

function base64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function createAccessToken(user) {
  const now = Math.floor(Date.now() / 1000);
  return `${base64Url({ alg: "HS256", typ: "JWT" })}.${base64Url({
    aud: "authenticated",
    exp: now + 3600,
    iat: now,
    iss: "http://127.0.0.1:54321/auth/v1",
    role: "authenticated",
    sub: user.id,
    email: user.email,
    user_metadata: { username: user.username },
  })}.e2e-signature`;
}

function toAuthUser(user) {
  return {
    id: user.id,
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    email_confirmed_at: createdAt,
    confirmed_at: createdAt,
    created_at: createdAt,
    updated_at: createdAt,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { username: user.username },
    identities: [],
  };
}

function sessionFor(user) {
  return {
    access_token: createAccessToken(user),
    refresh_token: `e2e-refresh-${user.id}`,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: toAuthUser(user),
  };
}

function userFromRequest(request) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length);

  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return state.users.find((user) => user.id === payload.sub) ?? null;
  } catch {
    return null;
  }
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function tableRows(table) {
  const staticTables = {
    courses: [
      {
        id: 1,
        slug: "python-foundations",
        title: "Python căn bản",
        description: "Nắm vững biến, kiểu dữ liệu và biểu thức Python.",
        level: "beginner",
        language: "python",
        is_published: true,
      },
    ],
    chapters: [
      {
        id: 11,
        course_id: 1,
        title: "Nền tảng Python",
        description: "Các khái niệm đầu tiên.",
        chapter_order: 1,
        is_published: true,
        lessons: [{ count: 2 }],
      },
    ],
    lessons: [
      {
        id: 101,
        chapter_id: 11,
        title: "Biến và phép gán",
        content: "Biến giúp lưu trữ giá trị. Trong Python, dùng dấu = để gán giá trị cho biến.",
        lesson_order: 1,
        estimated_minutes: 8,
        is_published: true,
        chapters: { course_id: 1 },
      },
      {
        id: 102,
        chapter_id: 11,
        title: "Kiểu số và chuỗi",
        content: "Python hỗ trợ số nguyên, số thực và chuỗi.",
        lesson_order: 2,
        estimated_minutes: 10,
        is_published: true,
        chapters: { course_id: 1 },
      },
    ],
    exercises: [
      {
        id: 1001,
        lesson_id: 101,
        title: "Giá trị của biến",
        description: "Đoạn mã sau in ra giá trị nào?",
        exercise_type: "predict_output",
        difficulty: "easy",
        exercise_order: 1,
        code_snippet: "score = 2 + 3\nprint(score)",
        is_required: true,
        is_published: true,
        lessons: { chapters: { course_id: 1 } },
      },
    ],
    exercise_options: [
      { id: 2001, exercise_id: 1001, content: "4", option_order: 1 },
      { id: 2002, exercise_id: 1001, content: "5", option_order: 2 },
    ],
    exercise_solutions: [
      {
        exercise_id: 1001,
        solution: { selectedOptionId: 2002 },
        static_explanation: "2 cộng 3 bằng 5, nên chương trình in ra 5.",
      },
    ],
    generated_exercises: [],
    exercise_reviews: [],
    admin_logs: [],
  };

  if (table === "profiles") {
    return state.users.map((user) => ({
      id: user.id,
      username: user.username,
      role: user.role,
      is_active: true,
      created_at: createdAt,
      updated_at: createdAt,
    }));
  }
  if (table === "course_enrollments") return state.enrollments;
  if (table === "user_progress") return state.progress;
  if (table === "submissions") return state.submissions;
  if (table === "ai_explanations") return state.explanations;
  return staticTables[table] ?? [];
}

function parseValue(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+$/u.test(raw)) return Number(raw);
  return raw.replace(/^"|"$/gu, "");
}

function applyFilters(rows, url) {
  let filtered = [...rows];
  const ignored = new Set(["select", "order", "offset", "limit", "or"]);

  for (const [field, expression] of url.searchParams) {
    if (ignored.has(field)) continue;
    if (expression.startsWith("eq.")) {
      const expected = parseValue(expression.slice(3));
      filtered = filtered.filter((row) => row[field] === expected);
    } else if (expression.startsWith("in.(") && expression.endsWith(")")) {
      const values = expression.slice(4, -1).split(",").map(parseValue);
      filtered = filtered.filter((row) => values.includes(row[field]));
    }
  }

  const order = url.searchParams.get("order");
  if (order) {
    const [field, direction] = order.split(".");
    filtered.sort((left, right) => {
      const comparison = String(left[field] ?? "").localeCompare(String(right[field] ?? ""));
      return direction === "desc" ? -comparison : comparison;
    });
  }

  return filtered;
}

function sendPostgrestRows(request, response, rows) {
  const total = rows.length;
  const range = request.headers.range?.match(/(\d+)-(\d+)/u);
  const sliced = range ? rows.slice(Number(range[1]), Number(range[2]) + 1) : rows;
  const wantsObject = request.headers.accept?.includes("application/vnd.pgrst.object+json");
  const headers = { "content-range": total ? `0-${sliced.length - 1}/${total}` : "*/0" };

  if (wantsObject) {
    if (sliced.length === 1) return sendJson(response, 200, sliced[0], headers);
    return sendJson(response, 406, {
      code: "PGRST116",
      details: `The result contains ${sliced.length} rows`,
      hint: null,
      message: "JSON object requested, multiple (or no) rows returned",
    }, headers);
  }

  return sendJson(response, 200, sliced, headers);
}

async function handleAuth(request, response, url) {
  if (request.method === "POST" && url.pathname === "/auth/v1/signup") {
    const body = await readJson(request);
    if (state.users.some((user) => user.email === body.email)) {
      return sendJson(response, 422, { message: "User already registered" });
    }
    const user = {
      id: `10000000-0000-4000-8000-${String(state.users.length + 1).padStart(12, "0")}`,
      email: body.email,
      password: body.password,
      username: body.data?.username ?? "E2E User",
      role: "learner",
    };
    state.users.push(user);
    return sendJson(response, 200, { user: toAuthUser(user), session: null });
  }

  if (request.method === "POST" && url.pathname === "/auth/v1/token") {
    const body = await readJson(request);
    const user = url.searchParams.get("grant_type") === "refresh_token"
      ? state.users.find((candidate) => body.refresh_token === `e2e-refresh-${candidate.id}`)
      : state.users.find(
          (candidate) => candidate.email === body.email && candidate.password === body.password,
        );
    if (!user) return sendJson(response, 400, { message: "Invalid login credentials" });
    return sendJson(response, 200, sessionFor(user));
  }

  if (request.method === "GET" && url.pathname === "/auth/v1/user") {
    const user = userFromRequest(request);
    return user
      ? sendJson(response, 200, toAuthUser(user))
      : sendJson(response, 401, { message: "Invalid JWT" });
  }

  if (request.method === "GET" && url.pathname === "/auth/v1/admin/users") {
    return sendJson(response, 200, {
      users: state.users.map(toAuthUser),
      aud: "authenticated",
    });
  }

  if (request.method === "POST" && url.pathname === "/auth/v1/logout") {
    return sendJson(response, 204, null);
  }

  return sendJson(response, 404, { message: "Mock auth endpoint not found" });
}

async function handleRpc(request, response, name) {
  const user = userFromRequest(request);
  const body = await readJson(request);
  if (!user) return sendJson(response, 401, { code: "28000", message: "Authentication required" });

  if (name === "enroll_course") {
    if (!state.enrollments.some((item) => item.user_id === user.id && item.course_id === body.p_course_id)) {
      state.enrollments.push({
        id: state.enrollments.length + 1,
        user_id: user.id,
        course_id: body.p_course_id,
        status: "active",
        enrolled_at: new Date().toISOString(),
      });
      state.progress.push(
        { user_id: user.id, lesson_id: 101, status: "unlocked", started_at: null, last_accessed_at: null },
        { user_id: user.id, lesson_id: 102, status: "locked", started_at: null, last_accessed_at: null },
      );
    }
    return sendJson(response, 200, {
      enrollment_id: state.enrollments.find((item) => item.user_id === user.id)?.id,
      course_id: body.p_course_id,
      enrolled_at: new Date().toISOString(),
      first_lesson_id: 101,
    });
  }

  if (name === "start_lesson") {
    const progress = state.progress.find(
      (item) => item.user_id === user.id && item.lesson_id === body.p_lesson_id,
    );
    if (!progress) {
      return sendJson(response, 400, { code: "P0001", message: "Lesson access required" });
    }

    if (progress.status === "unlocked") {
      progress.status = "in_progress";
      progress.started_at ??= new Date().toISOString();
    }
    progress.last_accessed_at = new Date().toISOString();

    return sendJson(response, 200, {
      lesson_id: progress.lesson_id,
      status: progress.status,
      started_at: progress.started_at,
    });
  }

  if (name === "submit_exercise") {
    const isCorrect = body.p_answer?.selectedOptionId === 2002;
    const submission = {
      id: state.nextSubmissionId++,
      user_id: user.id,
      exercise_id: body.p_exercise_id,
      answer: body.p_answer,
      is_correct: isCorrect,
      attempt_number: state.submissions.filter(
        (item) => item.user_id === user.id && item.exercise_id === body.p_exercise_id,
      ).length + 1,
      submitted_at: new Date().toISOString(),
    };
    state.submissions.push(submission);

    if (isCorrect) {
      const lessonOne = state.progress.find((item) => item.user_id === user.id && item.lesson_id === 101);
      const lessonTwo = state.progress.find((item) => item.user_id === user.id && item.lesson_id === 102);
      if (lessonOne) lessonOne.status = "completed";
      if (lessonTwo) lessonTwo.status = "unlocked";
    }

    return sendJson(response, 200, {
      submission_id: submission.id,
      is_correct: isCorrect,
      score: isCorrect ? 100 : 0,
      lesson_completed: isCorrect,
      next_lesson_unlocked_id: isCorrect ? 102 : null,
    });
  }

  return sendJson(response, 404, { code: "PGRST202", message: `Unknown RPC ${name}` });
}

async function handleRest(request, response, url) {
  const segment = url.pathname.slice("/rest/v1/".length);
  if (segment.startsWith("rpc/") && request.method === "POST") {
    return handleRpc(request, response, segment.slice("rpc/".length));
  }

  const table = segment;
  if (request.method === "GET" || request.method === "HEAD") {
    const rows = applyFilters(tableRows(table), url);
    if (request.method === "HEAD") {
      response.writeHead(200, { "content-range": rows.length ? `0-${rows.length - 1}/${rows.length}` : "*/0" });
      return response.end();
    }
    return sendPostgrestRows(request, response, rows);
  }

  if (request.method === "POST" && table === "ai_explanations") {
    const body = await readJson(request);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const row = {
      id: state.nextExplanationId++,
      ...body,
      created_at: new Date().toISOString(),
    };
    state.explanations.push(row);
    return sendPostgrestRows(request, response, [row]);
  }

  if (request.method === "POST" && table === "user_progress") {
    const body = await readJson(request);
    const existing = state.progress.find(
      (item) => item.user_id === body.user_id && item.lesson_id === body.lesson_id,
    );
    if (existing) Object.assign(existing, body);
    else state.progress.push(body);
    return sendPostgrestRows(request, response, [existing ?? body]);
  }

  return sendJson(response, 400, { code: "MOCK_UNSUPPORTED", message: `${request.method} ${table}` });
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${host}:${port}`);

    if (url.pathname === "/__e2e/health") return sendJson(response, 200, { ok: true });
    if (url.pathname === "/__e2e/fixtures/multi-source-course-import") {
      return sendJson(response, 200, structuredClone(multiSourceCourseImportFixture));
    }
    if (url.pathname === "/__e2e/reset" && request.method === "POST") {
      resetState();
      return sendJson(response, 200, { ok: true });
    }
    if (url.pathname.startsWith("/auth/v1/")) return await handleAuth(request, response, url);
    if (url.pathname.startsWith("/rest/v1/")) return await handleRest(request, response, url);
    return sendJson(response, 404, { message: "Mock endpoint not found" });
  } catch (error) {
    return sendJson(response, 500, {
      message: error instanceof Error ? error.message : "Mock server error",
    });
  }
});

server.listen(port, host, () => {
  process.stdout.write(`E2E mock Supabase listening on http://${host}:${port}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
