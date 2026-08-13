# AI Course Creation: Current Implementation

## Scope

This document audits the implementation that exists at repository commit
`8d21221a11c08be9e260cd0a9bd31330c1120555`. It covers the active Admin
PDF/document-to-Course flow and the separate Published-Lesson-to-Exercise flow. It is a
description of current behavior, not a redesign proposal.

The current implementation has two independent pipelines:

1. **Course import:** source upload -> extraction/chunking -> AI Course outline -> Admin
   outline editing -> AI Lesson-content generation -> Admin content review -> atomic
   publication of Course, Chapter, and Lessons.
2. **Exercise creation:** one published Lesson -> AI Exercise draft -> Moderator/Admin
   review and optional edit -> publication of the Exercise, options, and private solution.

The Course-import pipeline does not generate Exercises. The Exercise pipeline does not
read the original PDF and does not modify Course-import state.

## End-to-end flow

```text
/admin/content
  -> POST /api/admin/content-sources
     -> private storage object + source_documents
     -> trigger creates course_import_jobs
  -> POST /api/admin/content-sources/:id/extract
     -> parse/normalize text -> document_chunks
  -> POST /api/admin/content-sources/:id/course-outline
     -> AI structured outline
     -> course_drafts + objectives + outline Lessons + source links
  -> Admin edits/saves or regenerates the outline
     -> a new complete outline revision is persisted
  -> POST /api/admin/course-drafts/:jobId/lessons/generate
     -> current outline revision becomes approved
     -> AI generates each Lesson independently
     -> lesson_content_drafts + citations
  -> Admin edits or regenerates individual Lesson drafts
  -> POST /api/admin/course-drafts/:jobId/reviews { decision: "published" }
     -> ready_to_publish transition
     -> atomic creation of courses + one chapter + lessons + publication mappings

/moderation/lessons
  -> select one published Lesson
  -> POST /api/ai/exercises/generate
     -> generated_exercises(status = pending)
  -> /moderation -> review/edit/approve
     -> exercise_reviews + generated_exercises(status = approved)
  -> POST /api/moderation/generated-exercises/:id/publish
     -> exercises + exercise_options + exercise_solutions
     -> generated_exercises(status = published)
```

### 1. Admin entry point

`src/app/(main)/admin/content/page.tsx` requires an active Admin through
`assertAdminAccess()` and renders `ContentPipelineAdmin`. Unauthenticated users are
redirected to `/login`; authenticated non-Admins are redirected to `/dashboard`.

`ContentPipelineAdmin` owns the entire browser-side Course-import workflow. On mount it
calls `GET /api/admin/course-drafts` and selects the first actionable import. It also keeps
a `sessionStorage` checkpoint under `learningapp.course-outline-generation` after
successful extraction so an outline request can be retried without uploading the file
again.

### 2. Source upload and import-job creation

The upload form accepts `.pdf`, `.txt`, `.md`, and `.docx`. The browser sends the selected
file as multipart field `file` to `POST /api/admin/content-sources`.

`uploadContentSource()`:

- requires an active Admin;
- limits the object to 1 byte through 10 MiB;
- validates the MIME type against the supported list;
- creates a private path of
  `<admin-id>/<random-uuid>/<sanitized-filename>`;
- uploads the object to the private `lesson-sources` Supabase Storage bucket; and
- inserts metadata into `source_documents`.

The database trigger `initialize_course_import_job_after_source` runs after the
`source_documents` insert. Its function `initialize_course_import_job()` creates one
`course_import_jobs` row with `source_document_id = source_documents.id` and status
`uploaded`. The unique constraint on `course_import_jobs.source_document_id` makes the
current model one import job per source document.

No `courses`, `chapters`, `lessons`, or Exercise rows exist at this stage.

### 3. PDF/document processing

The UI next calls `POST /api/admin/content-sources/:id/extract`.

`extractContentSource()` changes the source status to `extracting`, downloads the private
object, and dynamically loads the document extractor. `extractDocumentText()` currently
uses:

- `pdf-parse` for PDFs, with `@napi-rs/canvas` globals installed for the PDF runtime;
- `TextDecoder("utf-8", { fatal: true })` for text and Markdown; and
- `mammoth.extractRawText()` for DOCX.

The extracted text is normalized by removing disallowed control characters, normalizing
line endings, trimming trailing line whitespace, and collapsing runs of blank lines. Empty
documents fail. Extracted content is capped at 200,000 characters. There is no OCR path.

`chunkDocumentText()` groups paragraphs into deterministic chunks of at most 4,000
characters. Oversized paragraphs are split into fixed-size pieces. Every chunk receives a
zero-based `chunkIndex`, character offsets, and a SHA-256 content hash.

`replaceDocumentChunks()` calls the `replace_document_chunks` RPC. That transaction
replaces the source's `document_chunks`, stores the original file SHA-256 and extracted
character count, and moves the source to `extracted`. A failure moves the source to
`failed` with an extraction error code.

### 4. AI Course outline generation

The UI calls `POST /api/admin/content-sources/:id/course-outline`. The route allows up to
60 seconds and delegates to `generateCourseOutline()`.

The service:

- requires an active Admin and the `ai:course-outline` rate-limit allowance;
- loads `source_documents` and ordered `document_chunks`;
- requires extracted content, while allowing retry from `failed` or `ready_for_review`;
- sends the leading available chunks up to an 80,000-character provider context;
- sets the source status to `generating`; and
- calls `NineRouterLessonDraftProvider.generateCourseOutline()`.

The provider calls the configured OpenAI-compatible endpoint with a strict structural JSON
schema. Its prompt asks for Course metadata, Course objectives, and 2-20 ordered outline
Lessons containing `clientKey`, title, summary, objectives, and source chunk indexes. It
explicitly excludes Lesson body content, exercises, quizzes, answers, and solutions. Source
chunks are framed as untrusted reference data.

The response is parsed and validated again in application code. Unknown fields, duplicate
client keys, missing objectives, invalid Lesson counts, and invalid chunk ownership fail.
For a one-chunk source, provider chunk references are normalized to that sole server-owned
chunk. Invalid structured responses receive one bounded correction attempt, subject to the
same rate limit.

`persistCourseOutline()` calls `create_course_outline`. The RPC creates the first
`course_drafts` revision, its Course objectives, ordered `course_outline_lessons`, each
Lesson's objectives, and each Lesson-to-chunk relation. It updates
`course_import_jobs.current_outline_revision`, moves the job to `outline_review`, and moves
the source to `ready_for_review`.

This RPC is the exact point where `course_drafts` is created. The same RPC creates every
later outline revision produced by Admin editing or AI regeneration.

### 5. Admin outline review and editing

At `outline_review`, `ContentPipelineAdmin` lets the Admin edit Course title, description,
and objectives; edit Lesson title, summary, objectives, and chunk indexes; add, remove, and
reorder Lessons; save; or regenerate the entire outline.

- **Save** calls `PATCH /api/admin/course-drafts/:jobId/outline`.
  `updateCourseOutline()` validates the complete submitted outline and verifies every
  source chunk index against the job's persisted chunks. It then calls
  `create_course_outline` with provider `admin_edit`, creating a new immutable outline
  revision rather than updating the existing rows.
- **Regenerate outline** calls
  `POST /api/admin/course-drafts/:jobId/outline/regenerate`, which reruns the outline
  provider and persists another complete revision.
- **Continue** calls
  `POST /api/admin/course-drafts/:jobId/lessons/generate`.

There is no separate outline-approval API or outline-review row. The Continue action calls
`prepare_course_lesson_generation`, which sets
`approved_outline_revision = current_outline_revision` and changes the job to
`generating_content`. That persisted transition is the current outline-approval checkpoint.

### 6. Lesson-content generation and persistence

`generateCourseLessonContents()` loads the approved Course import and all chunks, calls
`prepare_course_lesson_generation()`, and generates every outline Lesson that does not
already have a content draft. The missing Lessons are generated concurrently with
`Promise.all()`.

For each Lesson, `generateOneCourseLesson()`:

- takes the source chunk indexes persisted on that outline Lesson;
- selects only those chunks from the job's one source document;
- sends the source filename, Lesson title, Lesson objectives, and selected chunks to
  `NineRouterLessonDraftProvider.generateLessonDraft()`; and
- validates a structured result containing title, summary, estimated minutes, sections,
  Markdown bodies, and at least one citation chunk index per section.

`persistCourseLessonContent()` calls `persist_lesson_content_draft`. The RPC inserts a new
`lesson_content_drafts` revision. For every section/chunk reference it also inserts
`lesson_content_draft_citations`, but only when the chunk is among that outline Lesson's
allowed `course_outline_lesson_sources`. The citation `quote` is currently the first 500
characters of the referenced chunk, not a provider-selected exact quotation.

When every outline Lesson in the approved revision has a ready content draft, the RPC moves
the job to `content_review`. A generation failure moves the job to `failed` with
`LESSON_GENERATION_FAILED`.

At this stage the Lesson structure is in `course_outline_lessons` and the Lesson bodies are
in `lesson_content_drafts`. Nothing has yet been inserted into the official `lessons` table.

### 7. Admin Course-content review

At `content_review` or `ready_to_publish`, the Admin can select each outline Lesson and use
the internal `ContentEditor` to edit title, summary, section headings, and Markdown bodies.
The existing estimated duration is preserved in the submitted draft, and the UI displays
each section's citation chunk indexes.

- Saving calls `PATCH /api/admin/lesson-drafts/:contentDraftId` with
  `pipeline: "course_import"`. The shared route dispatches to
  `updateCourseLessonContent()`, which calls `revise_lesson_content_draft`. The RPC inserts a
  new `lesson_content_drafts` revision and copies the prior immutable citation rows. Admin
  edits cannot change the number of sections or their citation indexes.
- Regenerating one Lesson calls
  `POST /api/admin/course-drafts/:jobId/lessons/:outlineLessonId/regenerate`. It reloads only
  that outline Lesson's allowed chunks, generates a new content revision, and leaves the
  other Lessons untouched.
- `needs_revision` records a Course-import review and keeps the job in `content_review`.
- `rejected` records a review and moves the job to `rejected`; no official curriculum is
  created.

There is no independent approve/reject state for each `lesson_content_drafts` row in this
pipeline. The Course-level decision governs publication, and publication selects the latest
`ready` content revision for each outline Lesson.

### 8. Final Course and Lesson publication

The Publish button sends `{ decision: "published", comment }` to
`POST /api/admin/course-drafts/:jobId/reviews`.

`submitCourseImportReview()` first transitions a `content_review` job to
`ready_to_publish` through `review_course_import_job`, recording a
`course_import_reviews` row. It then calls `publish_course_import_job` with a server-derived
slug. If publication fails after the first RPC, the persisted `ready_to_publish` job is
retryable.

`publish_course_import_job` is the atomic official-curriculum transaction. It:

1. locks and verifies the `ready_to_publish` job;
2. loads the approved `course_drafts` revision;
3. inserts one published row into `courses`;
4. inserts one published `chapters` row titled `Ná»™i dung chÃ­nh`;
5. inserts `course_import_publications` linking the import job, Course, Chapter, outline
   revision, and publisher;
6. iterates the ordered outline Lessons, loads each latest ready content revision,
   concatenates its sections into Markdown, and inserts published `lessons` rows;
7. inserts one `course_import_lesson_publications` row per Lesson, linking the outline
   Lesson, exact content revision, and final Lesson;
8. sets `course_import_jobs.status = published` and
   `course_import_jobs.published_course_id = courses.id`;
9. archives the source document;
10. records a `published` Course-import review and a `course_import.published` Admin audit
    log.

If any insert or audit write fails, the RPC transaction rolls back the official Course,
Chapter, Lessons, and publication mappings. A retry after success is idempotent and returns
the existing published identities.

The original PDF is not attached to `courses` through a direct foreign key. Its durable
association is:

```text
source_documents.id
  <- course_import_jobs.source_document_id
  -> course_import_jobs.published_course_id -> courses.id

course_import_jobs.id
  -> course_import_publications.job_id
  -> course_import_publications.course_id -> courses.id
```

The second mapping also preserves the published Chapter, outline revision, publisher, and
publication timestamp. Per-Lesson publication mappings preserve the exact outline Lesson and
content revision used.

### 9. Exercise generation, review, and publication

After Course publication, the Admin content screen links to `/moderation/lessons`. That page
uses `getExerciseLessonTargets()` to list published Lessons whose parent Chapter and Course
are published and whose Course is not archived.

The actor selects one Lesson and opens
`/moderation/lessons/:lessonId/exercises/new`, which renders `ExerciseGenerationForm`.
`getExerciseGenerationContext()` calls `get_lesson_exercise_generation_context`. The RPC
returns the published Lesson title and content, parent Course metadata, and Lesson objectives.
For imported Lessons, objectives are recovered through
`course_import_lesson_publications -> course_outline_lesson_objectives`.

The form sends one Lesson ID, Exercise type, difficulty, learning objective, and optional
topic hint to `POST /api/ai/exercises/generate`. `generateExercise()` requires an active
Moderator or Admin, applies the `ai:exercise-generation` rate limit, reloads the authorized
published Lesson context, and calls `OpenAIApiProvider.generateExercise()`.

The provider receives current Lesson/Course context, not the source PDF. It returns one
structured multiple-choice Exercise. `validateGeneratedExerciseContent()` validates the
title, description, code, 2-6 unique options, correct answer membership, and explanation.
`create_generated_exercise_draft` then inserts a `generated_exercises` row with the selected
`lesson_id` and status `pending`.

`/moderation` renders the queue. `/moderation/:id` loads the draft and review history and
allows an active Moderator/Admin to approve, reject, request revision, or submit a complete
edited snapshot. `review_generated_exercise_draft` locks the draft, validates edits, inserts
`exercise_reviews`, and updates the generated draft and status in the same transaction.

An approved draft is published through
`POST /api/moderation/generated-exercises/:id/publish`. The idempotent
`publish_generated_exercise` RPC:

- verifies the draft and published parent Lesson;
- takes a transaction advisory lock for the Lesson;
- inserts the next ordered, required, published, `ai_generated` row in `exercises`;
- inserts its ordered `exercise_options`;
- inserts `exercise_solutions` with the real correct option ID and static explanation;
- links `generated_exercises.published_exercise_id` to the final Exercise and marks the
  draft `published`; and
- writes a `generated_exercise.published` Admin audit log.

Learners see the final Exercise through `LessonContentView`, which receives published
Exercises from the Lesson service. Drafts in `generated_exercises` are never part of the
learner Lesson response.

## UI inventory

### Course import and review

| UI | Current responsibility |
|---|---|
| `src/app/(main)/admin/content/page.tsx` | Active-Admin gate and page entry point. |
| `src/features/content-pipeline/components/content-pipeline-admin.tsx` — `ContentPipelineAdmin` | Upload, extraction/outline retry checkpoint, import queue, outline editor, Continue action, Lesson-content selection, Course review, reject, and publish. |
| Same file — internal `ContentEditor` | Edit and save one Lesson-content revision; display section citation indexes; regenerate the selected Lesson. |

### Exercise generation and moderation

| UI | Current responsibility |
|---|---|
| `src/app/(main)/moderation/lessons/page.tsx` — `ExerciseLessonListPage` | List eligible published Lessons and choose the exact Exercise owner. |
| `src/app/(main)/moderation/lessons/[lessonId]/exercises/new/page.tsx` | Load authorized Lesson generation context. |
| `src/features/ai/components/exercise-generation-form.tsx` — `ExerciseGenerationForm` | Collect Exercise type, difficulty, objective, and optional topic hint; create one pending draft. |
| `src/app/(main)/moderation/page.tsx` | Render the moderation queue. |
| `src/features/moderation/components/moderation-queue-view.tsx` | Fetch/filter/page generated Exercise drafts. |
| `src/features/moderation/components/moderation-queue-item-card.tsx` | Render one queue item and link to its review screen. |
| `src/app/(main)/moderation/[id]/page.tsx` | Validate the draft ID and render the detail view. |
| `src/features/moderation/components/moderation-detail-view.tsx` | Load draft/review history and expose publication for approved drafts. |
| `src/features/moderation/components/moderation-review-form.tsx` | Approve/reject/request revision, with optional complete draft editing. |

### Published learner result

| UI | Current responsibility |
|---|---|
| `src/app/(main)/courses/[courseId]/page.tsx` and `CourseDetailView` | Render the published Course reached by the Admin confirmation link. |
| `src/app/(main)/lessons/[lessonId]/page.tsx` and `LessonContentView` | Render published Lesson Markdown and final published Exercises. |

## API route inventory

### Routes called by the active Course-import UI

| Method and route | Route handler delegates to |
|---|---|
| `POST /api/admin/content-sources` | `uploadContentSource` |
| `POST /api/admin/content-sources/:id/extract` | `extractContentSource` |
| `POST /api/admin/content-sources/:id/course-outline` | `generateCourseOutline` |
| `GET /api/admin/course-drafts` | `getCourseDraftQueue` |
| `PATCH /api/admin/course-drafts/:jobId/outline` | `updateCourseOutline` |
| `POST /api/admin/course-drafts/:jobId/outline/regenerate` | `regenerateCourseOutline` |
| `POST /api/admin/course-drafts/:jobId/lessons/generate` | `generateCourseLessonContents` |
| `POST /api/admin/course-drafts/:jobId/lessons/:outlineLessonId/regenerate` | `regenerateCourseLessonContent` |
| `PATCH /api/admin/lesson-drafts/:contentDraftId` with `pipeline: "course_import"` | `updateCourseLessonContent` |
| `POST /api/admin/course-drafts/:jobId/reviews` | `submitCourseImportReview` |

`GET /api/admin/lesson-drafts/:id` is implemented by the same shared route and delegates to
the historical `getLessonDraftDetail`; the active Course-import UI does not use that GET
because `GET /api/admin/course-drafts` already embeds current content drafts and citations.

### Routes called by the Exercise flow

| Method and route | Route handler delegates to |
|---|---|
| `POST /api/ai/exercises/generate` | `generateExercise` |
| `GET /api/moderation/generated-exercises` | `ModerationService.listQueueItems` |
| `GET /api/moderation/generated-exercises/:id` | `ModerationService.getQueueItemDetails` |
| `POST /api/moderation/generated-exercises/:id/reviews` | `ModerationService.submitReview` |
| `POST /api/moderation/generated-exercises/:id/publish` | `ModerationService.publishExercise` |

### Compatibility routes not used by the active Course-import UI

`POST /api/admin/content-sources/:id/generate` dispatches to the historical
`generateCourseDraft()` or `generateLessonDraft()` path. That path uses `lesson_drafts` and,
for whole-Course generation, can create unpublished official curriculum before review via
the migration-023 RPCs. It is still present for compatibility but is not part of the current
Admin PDF-to-Course flow documented above.

The `content-targets`, `content-curriculum`, one-Lesson draft review, and one-Lesson draft
publish endpoints are likewise historical adjacent content-pipeline surfaces, not steps in
the active Course-import UI.

## Service, provider, extraction, repository, and RPC inventory

### Course-import application services

`src/features/content-pipeline/services/content-pipeline-service.ts`:

- `requireAdmin`, `requireAiCapacity`, `sanitizeFilename`, `asPositiveId`
- `uploadContentSource`, `extractContentSource`
- `generateCourseOutline`, `updateCourseOutline`, `regenerateCourseOutline`
- `validateCourseOutline`, `validateStringList`, `selectProviderChunks`
- `generateCourseLessonContents`, `generateOneCourseLesson`,
  `regenerateCourseLessonContent`
- `getCourseDraftQueue`, `updateCourseLessonContent`, `submitCourseImportReview`
- `curriculumSlug` for the final server-derived Course slug

### Course-import extraction and provider functions

- `document-extractor.ts`: `extractDocumentText`, `extractPdf`, `normalizeText`,
  `chunkDocumentText`.
- `lesson-draft-provider.ts`: `NineRouterLessonDraftProvider.generateCourseOutline`,
  `requestCourseOutline`, `generateLessonDraft`, `parseCourseOutline`, `parseDraft`, and
  `parseProviderResponse`.

### Course-import repository functions

`src/features/content-pipeline/repositories/content-pipeline-repository.ts`:

- source/storage: `createSourceDocument`, `uploadSourceObject`, `removeSourceObject`,
  `getSourceDocument`, `updateSourceStatus`, `downloadSourceObject`,
  `replaceDocumentChunks`;
- generation context: `getCourseGenerationContext`, `getCourseImportChunks`;
- outline/import state: `persistCourseOutline`, `loadCourseImports`, `listCourseImports`,
  `getCourseImport`, `prepareCourseLessonGeneration`, `failCourseImport`;
- Lesson content: `persistCourseLessonContent`, `reviseCourseLessonContent`;
- Course review/publication: `reviewCourseImport`, `publishCourseImport`.

### Course-import database functions and trigger

- `initialize_course_import_job` and trigger `initialize_course_import_job_after_source`
- `replace_document_chunks`
- `create_course_outline`
- `prepare_course_lesson_generation`
- `persist_lesson_content_draft`
- `fail_course_import_job`
- `revise_lesson_content_draft`
- `review_course_import_job`
- `publish_course_import_job` (latest definition is migration 027)

### Exercise services, provider, repositories, and RPCs

- `ai-service.ts`: `requireExerciseGenerator`, `getExerciseLessonTargets`,
  `getExerciseGenerationContext`, `generateExercise`.
- `ai-provider.ts`: `OpenAIApiProvider.generateExercise`,
  `parseGeneratedExerciseContent`, `createAIProvider`.
- `exercise-draft.ts`: `validateGeneratedExerciseContent` and
  `validateGeneratedExerciseDraft`.
- `ai-repository.ts`: `listPublishedExerciseLessonTargets`,
  `fetchLessonContextForGeneration`, `createGeneratedExerciseRecord`.
- `moderation-service.ts`: `listQueueItems`, `getQueueItemDetails`, `submitReview`,
  `publishExercise`.
- `moderation-repository.ts`: `listQueueItems`, `getQueueItemById`, `createReview`,
  `publishExercise`.
- Database RPCs: `get_lesson_exercise_generation_context`,
  `create_generated_exercise_draft`, `review_generated_exercise_draft`, and
  `publish_generated_exercise`.

Shared supporting functions include `checkRateLimit`, the server Supabase client, the
server-only Admin Supabase client for authorized reads hidden by public curriculum RLS, and
Admin audit-log writes inside publication RPCs.

## Database tables and relationships

### Course import and source provenance

| Table/storage relation | Relationship and current use |
|---|---|
| Supabase Storage bucket `lesson-sources` / `storage.objects` | Private uploaded file bytes. `source_documents.storage_bucket/storage_path` identifies the object. |
| `profiles` | `source_documents.uploaded_by`, `course_import_jobs.requested_by`, review/publish actor FKs, and role/active-state authorization. |
| `source_documents` | One persisted uploaded source. There is no table named `content_sources`. |
| `document_chunks` | Many chunks per source through `source_document_id`; unique by source and `chunk_index`. |
| `course_import_jobs` | Exactly one current import job per source through unique `source_document_id`; later optionally points to one final Course through unique `published_course_id`. |
| `course_drafts` | Many immutable outline revisions per job through `job_id`; unique by job and revision. |
| `course_draft_objectives` | Ordered Course objectives for one `course_drafts` revision. |
| `course_outline_lessons` | Ordered outline Lessons for one Course-draft revision. These are not official `lessons`. |
| `course_outline_lesson_objectives` | Ordered objectives for one outline Lesson. |
| `course_outline_lesson_sources` | Many-to-many bridge from an outline Lesson to allowed `document_chunks`, with source order. The current job still owns only one source document. |
| `lesson_content_drafts` | Many immutable content revisions per outline Lesson. Sections are stored as JSONB. |
| `lesson_content_draft_citations` | Maps one content-draft section to a `document_chunk`, with a persisted quote. |
| `course_import_reviews` | Immutable Course-level review decisions and comments for a job/revision. |
| `course_import_publications` | One-to-one publication bridge from job to final `courses` and the generated `chapters` row. |
| `course_import_lesson_publications` | Per-Lesson publication bridge from the exact outline Lesson and content draft to the final `lessons` row. |
| `courses` | Created only during successful Course publication. |
| `chapters` | One published Chapter is created for the imported Course. The implementation has no `modules` table; Chapter is the persisted grouping level. |
| `lessons` | Final published Lessons, each belonging to the generated Chapter. |
| `admin_logs` | Audit evidence for Course publication. |

Compact relationship view:

```text
profiles
  -> source_documents -> document_chunks
          |
          v
    course_import_jobs -------------------------------> courses
          |                                                |
          v                                                v
    course_drafts -> course_draft_objectives             chapters
          |                                                |
          v                                                v
    course_outline_lessons ----------------------------> lessons
       |       |       |                                  ^
       |       |       +-> lesson_content_drafts          |
       |       |              |                           |
       |       |              +-> lesson_content_draft_citations
       |       +-> course_outline_lesson_sources -> document_chunks
       +-> course_outline_lesson_objectives

course_import_jobs -> course_import_reviews
course_import_jobs -> course_import_publications
course_import_publications -> course_import_lesson_publications -> lessons
```

### Exercise draft, moderation, and final Exercise

| Table | Relationship and current use |
|---|---|
| `generated_exercises` | Many drafts can belong to one final `lessons` row through `lesson_id`; an optional unique `published_exercise_id` links a published draft to `exercises`. |
| `exercise_reviews` | Many immutable reviews per generated Exercise; each review points to `profiles.reviewer_id`. |
| `exercises` | Final published Exercise owned by exactly one Lesson. |
| `exercise_options` | Ordered answer options belonging to one Exercise. |
| `exercise_solutions` | One private solution per Exercise, including the real correct option ID and static explanation. |
| `admin_logs` | Audit evidence for generated-Exercise publication. |

The private `rate_limit_buckets` table is an operational supporting table reached through
the shared rate-limit RPCs for Course-outline, Lesson-content, Exercise-generation, and
moderation mutation limits. It does not carry curriculum data.

## Direct answers to the requested trace points

### Where `content_sources` is used

There is no `content_sources` symbol or database table in tracked production code. The
hyphenated name `content-sources` is the Admin API namespace and appears in
`ContentPipelineAdmin`, its route handlers/tests, API documentation, and the Next.js PDF
runtime tracing configuration. Those routes persist to `source_documents`,
`document_chunks`, and the private `lesson-sources` storage bucket.

### Where `course_drafts` is created

`generateCourseOutline()` or `updateCourseOutline()`/`regenerateCourseOutline()` calls
repository `persistCourseOutline()`, which invokes `create_course_outline`. That RPC inserts
one new `course_drafts` row and its normalized child rows. It never overwrites a prior
revision.

### Where a PDF becomes associated with a Course

At upload, the PDF becomes associated with `course_import_jobs`, not an official Course.
The final Course association is created only inside `publish_course_import_job` through
`course_import_jobs.published_course_id` and `course_import_publications.course_id`. There is
no direct source-document FK on `courses`.

### Where modules and Lessons are persisted

There is no module table. `chapters` is the Course grouping level. Before publication,
Lesson structure is stored in `course_outline_lessons` and bodies in
`lesson_content_drafts`. The one final Chapter and all final Lessons are inserted only by
`publish_course_import_job`; the exact draft-to-final mapping is stored in the two
publication bridge tables.

### Where Exercises are generated

Exercises are generated only after a Lesson is published. `POST /api/ai/exercises/generate`
calls `generateExercise()`, which loads one Lesson through
`get_lesson_exercise_generation_context`, calls the AI provider, validates the response, and
persists a pending `generated_exercises` row through `create_generated_exercise_draft`.
Final `exercises`, `exercise_options`, and `exercise_solutions` rows are created later by
`publish_generated_exercise` after moderation approval.

## Existing parts reusable for later capabilities

This section identifies reusable behavior already present; it does not prescribe a new
architecture.

| Later capability | Existing reusable parts | Current boundary/limitation |
|---|---|---|
| Web research | Server-only source processing boundary; untrusted-source prompt framing; structured provider interfaces and parsers; source status/error handling; rate limits; immutable review/publication model. | `source_documents` accepts only file MIME types and private storage paths. There is no URL, retrieval run, web-result, or web-page provenance model. |
| Multiple sources | `source_documents`, stable `document_chunks`, chunk hashes/offsets, normalized outline-to-chunk bridge, Lesson-section citation bridge, and validation of allowed source ownership. | `course_import_jobs.source_document_id` is unique and singular; `create_course_outline`, repository loaders, and generation services assume all chunks belong to that one source. |
| Editable curriculum outline | Already implemented end to end: normalized Course objectives, outline Lessons, Lesson objectives, source links, stable `clientKey`, add/remove/reorder UI, strict server validation, immutable outline revisions, regenerate, and Continue-as-approval. | Editing is available only in `outline_review`; Continue fixes one approved revision for subsequent content generation. |
| Citations | Stable chunks with hashes/offsets; outline-to-source ownership; per-section citation indexes; `lesson_content_draft_citations` with quotes; provider validation; Admin display of section chunk indexes; publication mappings that preserve the exact cited draft. | The current source identity is a private uploaded document. Citation quotes are the first 500 characters of a referenced chunk, the Admin UI shows indexes rather than rich source metadata, and final `lessons.content` contains only concatenated Markdown—citations remain in draft/provenance tables rather than being embedded in the learner Lesson. |

Other reusable cross-cutting pieces already shared by the two pipelines are active-role
authorization, server-only provider calls, strict response validation, bounded provider
timeouts, distributed rate limiting, immutable review history, transactional/idempotent
publication RPCs, and `admin_logs` audit evidence. The Course and Exercise domain state
machines themselves are currently separate and are not implemented as a shared polymorphic
review system.
