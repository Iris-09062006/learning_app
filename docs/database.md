# Database

## Topic Course multi-source compatibility â€” migration 030

`030_topic_course_multi_source.sql` is additive and preserves all historical draft, citation,
publication, Course, Chapter, Lesson, learner, progress, and Exercise rows. It adds the compatible
source initialization flag, nullable immutable initialization identity, Admin-only provenance
metadata, and an exclusive ordered one-to-eight-source ownership bridge.

Backfill creates exactly one file metadata row per existing source and one order-zero bridge row
per legacy job. Every job anchor must equal its order-zero bridge. Staged/failed/zero-chunk sources
remain unattached. Initialization, attach/detach, job-wide outline/citation persistence, and
publication are active-Admin `SECURITY DEFINER` RPCs with empty `search_path`; `PUBLIC`/`anon`
execution is revoked. Publication still performs official curriculum writes and all-source
archival atomically and returns the prior publication on retry.

Before rollout, apply migrations 001 through 030 to a clean production-like database, compare
protected row content/counts before and after 030, run invariant/ACL/RLS checks, and regenerate
types. Migration history must never be rewritten or down-migrated destructively.

## TASK-056 Course archival

- `courses.archived_at timestamptz null` distinguishes manageable courses from courses
  removed from the product. `courses_archived_not_published` prevents any legacy publish
  path from making an archived Course public again.
- `admin_archive_course(bigint)` is an authenticated-only, `SECURITY DEFINER`, empty
  `search_path` RPC. It verifies `auth.uid()` is an active Admin, locks the Course,
  unpublishes the Course and all descendant curriculum, stamps `archived_at`, and writes
  `course.archived` to `admin_logs` in one transaction.
- The RPC never deletes enrollments, progress, submissions, exercises, source documents,
  or drafts. Referential history is preserved.

## AI Course import persistence â€” implemented by TASK-057

Migration `025_pdf_to_course_pipeline.sql` implements the normalized two-stage model below.
Migration `023` remains compatibility-only: it creates official unpublished curriculum
before review and therefore is not used by the Admin default PDF-to-Course flow.

### Normalized draft model

Migration `025` creates:

```text
source_documents
  â””â”€â”€ course_import_jobs
        â””â”€â”€ course_drafts
              â”œâ”€â”€ course_draft_objectives
              â””â”€â”€ course_outline_lessons (ordered)
                    â”œâ”€â”€ course_outline_lesson_objectives
                    â”œâ”€â”€ course_outline_lesson_sources
                    â””â”€â”€ lesson_content_drafts
                          â””â”€â”€ lesson_content_draft_citations
```

- `course_import_jobs` lÃ  state-machine/audit identity cá»§a má»™t láº§n import vÃ  tham chiáº¿u
  Ä‘Ãºng má»™t `source_document_id`.
- `course_drafts` giá»¯ metadata/revision cá»§a Course draft; chÆ°a pháº£i `courses`.
- `course_outline_lessons` giá»¯ Lesson identity/order/title/summary/source references Ä‘á»ƒ
  add/remove/reorder Ä‘á»™c láº­p trÆ°á»›c khi sinh content.
- `lesson_content_drafts` giá»¯ content/revision/provider state riÃªng cho tá»«ng outline
  Lesson; má»™t revision `status = 'ready'` lÃ  checkpoint hoÃ n táº¥t authoritative cho Lesson Ä‘Ã³,
  vÃ  job-level failure khÃ´ng xÃ³a hoáº·c invalidate checkpoint nÃ y. Regenerate má»™t Lesson khÃ´ng ghi
  Ä‘Ã¨ Lesson khÃ¡c.
- Objective, Lesson order vÃ  source relation cáº§n edit/query Ä‘á»™c láº­p pháº£i lÃ  row/column cÃ³
  constraint; khÃ´ng nhÃ©t toÃ n bá»™ Course outline vÃ o má»™t JSON blob.

### State and invariants

```text
uploaded â†’ processing â†’ outline_review â†’ generating_content
         â†’ content_review â†’ ready_to_publish â†’ published
         â†˜ failed
outline_review|content_review â†’ rejected
```

- Transition pháº£i compare-and-set hoáº·c lock job row Ä‘á»ƒ retry/concurrent request khÃ´ng
  táº¡o duplicate Course/Lesson.
- Chá»‰ má»™t approved outline revision Ä‘Æ°á»£c dÃ¹ng Ä‘á»ƒ generate Lesson content.
- `ready_to_publish` yÃªu cáº§u má»i outline Lesson cÃ²n hiá»‡u lá»±c cÃ³ valid content draft.
- Pipeline A khÃ´ng cÃ³ FK, trigger hoáº·c RPC insert vÃ o `generated_exercises`, `exercises`,
  `exercise_options` hoáº·c `exercise_solutions`.

### Atomic publish

Má»™t RPC/transaction `publish_course_import_job` (hoáº·c tÃªn tÆ°Æ¡ng Ä‘Æ°Æ¡ng Ä‘Æ°á»£c chá»‘t trong
migration) pháº£i lock job á»Ÿ `ready_to_publish`, táº¡o official Course/Chapter/Lessons tá»«
approved draft, ghi publication/audit mapping vÃ  chuyá»ƒn job sang `published` trong cÃ¹ng
transaction. Báº¥t ká»³ lá»—i insert Lesson/audit/mapping nÃ o pháº£i rollback toÃ n bá»™; retry sau
success tráº£ cÃ¹ng published identity thay vÃ¬ táº¡o báº£n sao.

Reject chá»‰ chuyá»ƒn job/draft sang `rejected`; khÃ´ng táº¡o hoáº·c xÃ³a official curriculum.
Pending query chá»‰ láº¥y `outline_review|content_review|ready_to_publish` (vÃ  revision state
cÃ³ thá»ƒ hÃ nh Ä‘á»™ng), nÃªn resolved item biáº¿n máº¥t bá»n vá»¯ng sau reload.

### Exercise ownership remains separate

KhÃ´ng thÃªm `course_id` vÃ o báº£ng bÃ i táº­p. `generated_exercises.lesson_id` vÃ 
`exercises.lesson_id` váº«n lÃ  ownership duy nháº¥t cá»§a bÃ i táº­p. Exercise generation/review
khÃ´ng Ä‘Æ°á»£c thay Ä‘á»•i `course_import_jobs` hoáº·c Course draft state.

## TASK-050 â€” Separated content destination RPCs

`create_content_curriculum(p_course_title text, p_course_slug text,
p_chapter_title text)` creates one unpublished course, first chapter, and initial
lesson in a single active-Admin-authorized transaction. The chapter and lesson use
the server-derived source filename. The server owns slug generation; `PUBLIC` and
`anon` have no execute permission.

`create_content_target_in_course(p_course_id bigint, p_chapter_title text)` locks an
existing course, appends an unpublished chapter at the next order, and creates its
initial unpublished lesson atomically. It uses the same active-Admin check, empty
search path, execute restrictions, and audit boundary. Existing curriculum rows are
not modified.

## TASK-046 â€” New lesson content target RPC

`create_lesson_content_target(p_chapter_id bigint, p_title text)` is an
`authenticated`-only security-definer RPC with an empty search path. It verifies an
active Admin, locks the selected chapter to serialize order allocation, inserts an
unpublished lesson at `max(lesson_order) + 1`, and records
`lesson_content_target.created` in `admin_logs`. `PUBLIC` and `anon` have no execute
permission.

## 1. Má»¥c tiÃªu

TÃ i liá»‡u nÃ y lÃ  **nguá»“n chuáº©n duy nháº¥t** Ä‘á»ƒ AI agent táº¡o migration, Supabase types, repository vÃ  service liÃªn quan Ä‘áº¿n database.

Database sá»­ dá»¥ng:

- Supabase PostgreSQL.
- Supabase Auth.
- Row Level Security (RLS).
- SQL migration trong thÆ° má»¥c `supabase/migrations/`.

Thiáº¿t káº¿ Æ°u tiÃªn:

- Äá»§ Ä‘Æ¡n giáº£n Ä‘á»ƒ hoÃ n thÃ nh MVP.
- KhÃ´ng Ä‘á»ƒ lá»™ Ä‘Ã¡p Ã¡n Ä‘Ãºng hoáº·c khÃ³a bÃ­ máº­t cho client.
- Há»— trá»£ Learner, Moderator vÃ  Admin.
- Há»— trá»£ Course â†’ Chapter â†’ Lesson â†’ Exercise.
- LÆ°u tiáº¿n Ä‘á»™, láº§n ná»™p bÃ i vÃ  lá»i giáº£i thÃ­ch AI.
- Kiá»ƒm duyá»‡t bÃ i táº­p do AI táº¡o trÆ°á»›c khi xuáº¥t báº£n.
- CÃ³ thá»ƒ má»Ÿ rá»™ng thÃªm khÃ³a há»c, dáº¡ng bÃ i táº­p vÃ  RAG sau nÃ y.

---

## 1.1 Pháº¡m vi theo milestone

### Core Learning MVP

CÃ¡c báº£ng báº¯t buá»™c:

```text
profiles
courses
course_enrollments
chapters
lessons
exercises
exercise_options
exercise_solutions
user_progress
submissions
ai_explanations
```

### P1 / Operations Extension

CÃ¡c báº£ng chá»‰ triá»ƒn khai khi task tÆ°Æ¡ng á»©ng Ä‘Æ°á»£c duyá»‡t:

```text
generated_exercises
exercise_reviews
admin_logs
course_import_jobs
course_drafts
course_draft_objectives
course_outline_lessons
course_outline_lesson_objectives
course_outline_lesson_sources
lesson_content_drafts
lesson_content_draft_citations
```

AI generation, moderation vÃ  Admin mutation khÃ´ng Ä‘Æ°á»£c báº­t trÆ°á»›c migration, RLS, transaction vÃ  test cá»§a nhÃ³m báº£ng P1.

---

## 2. Káº¿t luáº­n review thiáº¿t káº¿ cÅ©

Thiáº¿t káº¿ PA2 cÃ³ ná»n táº£ng Ä‘Ãºng, nhÆ°ng cáº§n chá»‰nh má»™t sá»‘ Ä‘iá»ƒm khi triá»ƒn khai vá»›i Supabase:

1. KhÃ´ng táº¡o báº£ng `users` riÃªng chá»©a password. Supabase Auth quáº£n lÃ½ email, password vÃ  session.
2. ThÃªm báº£ng `profiles` liÃªn káº¿t má»™t-má»™t vá»›i `auth.users`.
3. ThÃªm báº£ng `course_enrollments` Ä‘á»ƒ biáº¿t learner Ä‘ang há»c khÃ³a nÃ o vÃ  trÃ¡nh phá»¥ thuá»™c vÃ o giáº£ Ä‘á»‹nh chá»‰ cÃ³ má»™t khÃ³a há»c.
4. KhÃ´ng lÆ°u `correct_answer` trong báº£ng `exercises` mÃ  client cÃ³ thá»ƒ Ä‘á»c. ÄÃ¡p Ã¡n Ä‘Ãºng Ä‘Æ°á»£c tÃ¡ch sang báº£ng riÃªng `exercise_solutions`, chá»‰ server Ä‘Æ°á»£c truy cáº­p.
5. `exercise_options` chá»‰ chá»©a lá»±a chá»n hiá»ƒn thá»‹, khÃ´ng chá»©a cá» `is_correct`.
6. Bá»• sung unique constraint, check constraint, foreign-key action vÃ  index rÃµ rÃ ng.
7. Chuáº©n hÃ³a tráº¡ng thÃ¡i bÃ i há»c thÃ nh `locked`, `unlocked`, `in_progress`, `completed`.
8. `ai_explanations.response` pháº£i cho phÃ©p `NULL` khi lá»i gá»i AI tháº¥t báº¡i.
9. Má»i thay Ä‘á»•i tiáº¿n Ä‘á»™, cháº¥m bÃ i vÃ  xuáº¥t báº£n bÃ i táº­p AI pháº£i Ä‘i qua server-side service hoáº·c database function an toÃ n.

Schema bÃªn dÆ°á»›i lÃ  schema Ä‘Æ°á»£c chá»‘t Ä‘á»ƒ AI code.

---

## 3. NguyÃªn táº¯c báº¯t buá»™c

- TÃªn báº£ng vÃ  cá»™t dÃ¹ng `snake_case`.
- User ID dÃ¹ng `uuid` vÃ  tham chiáº¿u `auth.users(id)`.
- CÃ¡c ID ná»™i dung dÃ¹ng `bigint generated always as identity`.
- Timestamp dÃ¹ng `timestamptz` vÃ  máº·c Ä‘á»‹nh `now()`.
- Má»i báº£ng trong schema `public` pháº£i báº­t RLS.
- Client khÃ´ng Ä‘Æ°á»£c dÃ¹ng `SUPABASE_SERVICE_ROLE_KEY`.
- Client khÃ´ng Ä‘Æ°á»£c Ä‘á»c báº£ng `exercise_solutions`.
- Client khÃ´ng Ä‘Æ°á»£c tá»± gá»­i hoáº·c tá»± cáº­p nháº­t `is_correct`, `score`, `role`, `status` cá»§a tiáº¿n Ä‘á»™.
- KhÃ´ng dÃ¹ng `select('*')` trong repository production náº¿u khÃ´ng cáº§n toÃ n bá»™ cá»™t.
- Database schema chá»‰ thay Ä‘á»•i báº±ng migration.
- Route/UI khÃ´ng truy váº¥n database trá»±c tiáº¿p; query náº±m trong feature repository hoáº·c RPC Ä‘Ã£ chá»‘t.
- KhÃ´ng triá»ƒn khai báº£ng P1 chá»‰ vÃ¬ schema Ä‘Ã£ Ä‘Æ°á»£c mÃ´ táº£ náº¿u task dependency chÆ°a sáºµn sÃ ng.

---

## 4. Enum Ä‘Æ°á»£c chá»‘t

```sql
create type public.user_role as enum (
  'learner',
  'moderator',
  'admin'
);

create type public.enrollment_status as enum (
  'active',
  'completed',
  'cancelled'
);

create type public.exercise_type as enum (
  'fix_the_bug',
  'predict_output',
  'multiple_choice',
  'true_false',
  'short_answer',
  'ordering',
  'matching',
  'scenario'
);

create type public.difficulty_level as enum (
  'easy',
  'medium',
  'hard'
);

create type public.exercise_source as enum (
  'manual',
  'ai_generated'
);

create type public.progress_status as enum (
  'locked',
  'unlocked',
  'in_progress',
  'completed'
);

create type public.ai_response_status as enum (
  'success',
  'failed'
);

create type public.generated_exercise_status as enum (
  'pending',
  'needs_revision',
  'approved',
  'rejected',
  'published'
);

create type public.review_status as enum (
  'approved',
  'rejected',
  'needs_revision'
);
```

KhÃ´ng thÃªm giÃ¡ trá»‹ enum má»›i náº¿u chÆ°a cáº­p nháº­t tÃ i liá»‡u nÃ y vÃ  migration tÆ°Æ¡ng á»©ng.

---

## 5. SÆ¡ Ä‘á»“ quan há»‡

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : has

    PROFILES ||--o{ COURSE_ENROLLMENTS : enrolls
    COURSES ||--o{ COURSE_ENROLLMENTS : receives

    COURSES ||--o{ CHAPTERS : contains
    CHAPTERS ||--o{ LESSONS : contains
    LESSONS ||--o{ EXERCISES : contains
    EXERCISES ||--o{ EXERCISE_OPTIONS : has
    EXERCISES ||--|| EXERCISE_SOLUTIONS : has_private_solution

    PROFILES ||--o{ USER_PROGRESS : owns
    LESSONS ||--o{ USER_PROGRESS : tracks

    PROFILES ||--o{ SUBMISSIONS : creates
    EXERCISES ||--o{ SUBMISSIONS : receives
    SUBMISSIONS ||--o{ AI_EXPLANATIONS : has

    LESSONS ||--o{ GENERATED_EXERCISES : receives
    PROFILES ||--o{ GENERATED_EXERCISES : requests
    GENERATED_EXERCISES ||--o{ EXERCISE_REVIEWS : reviewed
    PROFILES ||--o{ EXERCISE_REVIEWS : performs

    PROFILES ||--o{ ADMIN_LOGS : acts
```

---

## 6. Danh sÃ¡ch báº£ng chÃ­nh

### Core Learning MVP

```text
profiles
courses
course_enrollments
chapters
lessons
exercises
exercise_options
exercise_solutions
user_progress
submissions
ai_explanations
```

### P1 / Operations Extension

```text
generated_exercises
exercise_reviews
admin_logs
```

`admin_logs` lÃ  báº¯t buá»™c trÆ°á»›c khi báº­t Admin role/status mutation hoáº·c publish generated exercise trong mÃ´i trÆ°á»ng dÃ¹ng tháº­t.

---
# 7. Chi tiáº¿t báº£ng

## 7.1 profiles

LÆ°u thÃ´ng tin á»©ng dá»¥ng cá»§a tÃ i khoáº£n Supabase Auth.

| Cá»™t | Kiá»ƒu | RÃ ng buá»™c |
|---|---|---|
| id | uuid | PK, FK â†’ auth.users(id), ON DELETE CASCADE |
| username | varchar(50) | NOT NULL |
| role | user_role | NOT NULL, DEFAULT 'learner' |
| is_active | boolean | NOT NULL, DEFAULT true |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

Constraint:

```sql
check (char_length(trim(username)) between 3 and 50)
```

Quyáº¿t Ä‘á»‹nh:

- KhÃ´ng lÆ°u email vÃ  password trong `profiles`.
- Email láº¥y tá»« Supabase Auth khi tháº­t sá»± cáº§n.
- `username` khÃ´ng báº¯t buá»™c unique trong MVP vÃ¬ Ä‘Ã¢y lÃ  tÃªn hiá»ƒn thá»‹, khÃ´ng pháº£i thÃ´ng tin Ä‘Äƒng nháº­p.
- NgÆ°á»i dÃ¹ng khÃ´ng Ä‘Æ°á»£c tá»± thay Ä‘á»•i `role` hoáº·c `is_active`.

---

## 7.2 courses

| Cá»™t | Kiá»ƒu | RÃ ng buá»™c |
|---|---|---|
| id | bigint | PK, identity |
| title | varchar(150) | NOT NULL |
| slug | varchar(160) | NOT NULL, UNIQUE |
| description | text | NULL |
| language | varchar(50) | NOT NULL, DEFAULT 'Python' |
| level | varchar(50) | NOT NULL, DEFAULT 'Beginner' |
| is_published | boolean | NOT NULL, DEFAULT false |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

Constraints:

```sql
check (char_length(trim(title)) between 1 and 150)
check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
```

MVP cÃ³ thá»ƒ chá»‰ seed má»™t course `python-for-beginners`, nhÆ°ng schema váº«n há»— trá»£ nhiá»u course.

---

## 7.3 course_enrollments

LÆ°u quan há»‡ learner tham gia course.

| Cá»™t | Kiá»ƒu | RÃ ng buá»™c |
|---|---|---|
| id | bigint | PK, identity |
| user_id | uuid | FK â†’ profiles(id), ON DELETE CASCADE, NOT NULL |
| course_id | bigint | FK â†’ courses(id), ON DELETE RESTRICT, NOT NULL |
| status | enrollment_status | NOT NULL, DEFAULT 'active' |
| enrolled_at | timestamptz | NOT NULL, DEFAULT now() |
| completed_at | timestamptz | NULL |

Constraint:

```sql
unique (user_id, course_id)
```

Quy táº¯c:

- Khi learner báº¯t Ä‘áº§u course, server táº¡o enrollment náº¿u chÆ°a tá»“n táº¡i.
- `completed_at` chá»‰ cÃ³ giÃ¡ trá»‹ khi `status = 'completed'`.
- Course Catalog cÃ³ thá»ƒ hiá»ƒn thá»‹ course mÃ  learner chÆ°a enroll.

---

## 7.4 chapters

| Cá»™t | Kiá»ƒu | RÃ ng buá»™c |
|---|---|---|
| id | bigint | PK, identity |
| course_id | bigint | FK â†’ courses(id), ON DELETE RESTRICT, NOT NULL |
| title | varchar(150) | NOT NULL |
| description | text | NULL |
| chapter_order | integer | NOT NULL |
| is_published | boolean | NOT NULL, DEFAULT false |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

Constraints:

```sql
unique (course_id, chapter_order)
check (chapter_order > 0)
```

---

## 7.5 lessons

Database dÃ¹ng thuáº­t ngá»¯ `lesson`. Giao diá»‡n cÃ³ thá»ƒ hiá»ƒn thá»‹ â€œStepâ€ náº¿u cáº§n, nhÆ°ng khÃ´ng táº¡o thÃªm báº£ng `steps` trong MVP.

| Cá»™t | Kiá»ƒu | RÃ ng buá»™c |
|---|---|---|
| id | bigint | PK, identity |
| chapter_id | bigint | FK â†’ chapters(id), ON DELETE RESTRICT, NOT NULL |
| title | varchar(150) | NOT NULL |
| content | text | NULL |
| lesson_order | integer | NOT NULL |
| estimated_minutes | integer | NULL |
| is_published | boolean | NOT NULL, DEFAULT false |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

Constraints:

```sql
unique (chapter_id, lesson_order)
check (lesson_order > 0)
check (estimated_minutes is null or estimated_minutes > 0)
```

---

## 7.6 exercises

Chá»©a dá»¯ liá»‡u bÃ i táº­p Ä‘Æ°á»£c phÃ©p hiá»ƒn thá»‹. KhÃ´ng chá»©a Ä‘Ã¡p Ã¡n Ä‘Ãºng.

| Cá»™t | Kiá»ƒu | RÃ ng buá»™c |
|---|---|---|
| id | bigint | PK, identity |
| lesson_id | bigint | FK â†’ lessons(id), ON DELETE RESTRICT, NOT NULL |
| title | varchar(150) | NOT NULL |
| description | text | NULL |
| exercise_type | exercise_type | NOT NULL |
| difficulty | difficulty_level | NOT NULL, DEFAULT 'easy' |
| code_snippet | text | NULL |
| exercise_order | integer | NOT NULL |
| is_required | boolean | NOT NULL, DEFAULT true |
| is_published | boolean | NOT NULL, DEFAULT false |
| source | exercise_source | NOT NULL, DEFAULT 'manual' |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

Constraints:

```sql
unique (lesson_id, exercise_order)
check (exercise_order > 0)
```

Quy táº¯c:

- Chá»‰ exercise `is_published = true` má»›i xuáº¥t hiá»‡n cho Guest/Learner.
- Chá»‰ `fix_the_bug` vÃ  `predict_output` dÃ¹ng `code_snippet`; modality khÃ´ng-code lÆ°u NULL.
- `exercise_options.metadata` chá»©a answer pool cÃ´ng khai cho matching nhÆ°ng khÃ´ng chá»©a mapping Ä‘Ãºng.
- `exercise_solutions.solution` dÃ¹ng schema riÃªng theo `exercise_type`.

---

## 7.7 exercise_options

Chá»©a cÃ¡c lá»±a chá»n hiá»ƒn thá»‹ cho bÃ i táº­p.

| Cá»™t | Kiá»ƒu | RÃ ng buá»™c |
|---|---|---|
| id | bigint | PK, identity |
| exercise_id | bigint | FK â†’ exercises(id), ON DELETE CASCADE, NOT NULL |
| content | text | NOT NULL |
| option_order | integer | NOT NULL |
| metadata | jsonb | NOT NULL, DEFAULT '{}'::jsonb |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

Constraints:

```sql
unique (exercise_id, option_order)
check (option_order > 0)
check (char_length(trim(content)) > 0)
```

KhÃ´ng táº¡o cá»™t `is_correct` trong báº£ng nÃ y.

---

## 7.8 exercise_solutions

Báº£ng riÃªng chá»©a Ä‘Ã¡p Ã¡n Ä‘Ãºng vÃ  dá»¯ liá»‡u cháº¥m bÃ i. ÄÃ¢y lÃ  báº£ng **server-only**.

| Cá»™t | Kiá»ƒu | RÃ ng buá»™c |
|---|---|---|
| exercise_id | bigint | PK, FK â†’ exercises(id), ON DELETE CASCADE |
| solution | jsonb | NOT NULL |
| static_explanation | text | NULL |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

VÃ­ dá»¥ `predict_output`:

```json
{
  "correctOptionId": 12,
  "acceptedValues": ["10"]
}
```

VÃ­ dá»¥ `fix_the_bug`:

```json
{
  "correctOptionId": 25,
  "acceptedAnswers": ["for i in range(5):"]
}
```

Quy táº¯c:

- Má»—i exercise pháº£i cÃ³ Ä‘Ãºng má»™t solution trÆ°á»›c khi Ä‘Æ°á»£c publish.
- KhÃ´ng táº¡o policy SELECT cho role `anon` hoáº·c `authenticated`.
- Chá»‰ server-side code dÃ¹ng service role hoáº·c security-definer function Ä‘Æ°á»£c Ä‘á»c báº£ng nÃ y.
- API tráº£ bÃ i táº­p cho learner tuyá»‡t Ä‘á»‘i khÃ´ng serialize `solution`.

---

## 7.9 user_progress

LÆ°u tráº¡ng thÃ¡i cá»§a learner Ä‘á»‘i vá»›i tá»«ng lesson.

| Cá»™t | Kiá»ƒu | RÃ ng buá»™c |
|---|---|---|
| id | bigint | PK, identity |
| user_id | uuid | FK â†’ profiles(id), ON DELETE CASCADE, NOT NULL |
| lesson_id | bigint | FK â†’ lessons(id), ON DELETE RESTRICT, NOT NULL |
| status | progress_status | NOT NULL, DEFAULT 'locked' |
| started_at | timestamptz | NULL |
| completed_at | timestamptz | NULL |
| last_accessed_at | timestamptz | NULL |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

Constraint:

```sql
unique (user_id, lesson_id)
```

Quy táº¯c MVP:

- Lesson Ä‘áº§u tiÃªn cá»§a course Ä‘Æ°á»£c `unlocked` sau khi enroll.
- Lesson khÃ¡c máº·c Ä‘á»‹nh `locked`.
- Má»Ÿ lesson láº§n Ä‘áº§u chuyá»ƒn sang `in_progress`.
- HoÃ n thÃ nh táº¥t cáº£ exercise báº¯t buá»™c chuyá»ƒn lesson thÃ nh `completed`.
- HoÃ n thÃ nh lesson má»Ÿ khÃ³a lesson tiáº¿p theo theo thá»© tá»± chapter vÃ  lesson.
- Client chá»‰ Ä‘Æ°á»£c Ä‘á»c progress cá»§a chÃ­nh mÃ¬nh; cáº­p nháº­t progress pháº£i qua server.

---

## 7.10 submissions

LÆ°u tá»«ng láº§n learner ná»™p Ä‘Ã¡p Ã¡n.

| Cá»™t | Kiá»ƒu | RÃ ng buá»™c |
|---|---|---|
| id | bigint | PK, identity |
| user_id | uuid | FK â†’ profiles(id), ON DELETE RESTRICT, NOT NULL |
| exercise_id | bigint | FK â†’ exercises(id), ON DELETE RESTRICT, NOT NULL |
| answer | jsonb | NOT NULL |
| is_correct | boolean | NOT NULL |
| score | numeric(5,2) | NULL |
| attempt_number | integer | NOT NULL |
| submitted_at | timestamptz | NOT NULL, DEFAULT now() |

Constraints:

```sql
unique (user_id, exercise_id, attempt_number)
check (attempt_number > 0)
check (score is null or (score >= 0 and score <= 100))
```

Quy táº¯c:

- Client gá»­i `exercise_id` vÃ  `answer`.
- Server láº¥y `user_id` tá»« session, khÃ´ng láº¥y tá»« request body.
- Server Ä‘á»c `exercise_solutions`, cháº¥m bÃ i, sau Ä‘Ã³ tá»± táº¡o `is_correct`, `score` vÃ  `attempt_number`.
- Viá»‡c táº¡o submission vÃ  cáº­p nháº­t progress pháº£i cháº¡y trong cÃ¹ng transaction hoáº·c RPC an toÃ n.

---

## 7.11 ai_explanations

LÆ°u lá»i giáº£i thÃ­ch AI gáº¯n vá»›i má»™t submission.

| Cá»™t | Kiá»ƒu | RÃ ng buá»™c |
|---|---|---|
| id | bigint | PK, identity |
| submission_id | bigint | FK â†’ submissions(id), ON DELETE CASCADE, NOT NULL |
| user_question | text | NULL |
| response | text | NULL |
| provider | varchar(50) | NOT NULL |
| model | varchar(100) | NULL |
| status | ai_response_status | NOT NULL |
| error_code | varchar(100) | NULL |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

Quyáº¿t Ä‘á»‹nh:

- KhÃ´ng báº¯t buá»™c lÆ°u toÃ n bá»™ prompt. Prompt cÃ³ thá»ƒ Ä‘Æ°á»£c tÃ¡i táº¡o tá»« lesson, exercise vÃ  submission.
- `response` Ä‘Æ°á»£c phÃ©p NULL khi `status = 'failed'`.
- KhÃ´ng lÆ°u API key hoáº·c token.
- Chá»‰ chá»§ sá»Ÿ há»¯u submission Ä‘Æ°á»£c Ä‘á»c explanation.
- CÃ³ thá»ƒ táº¡o nhiá»u explanation cho má»™t submission.

---

## 7.12 generated_exercises

LÆ°u bÃ i táº­p do AI táº¡o trÆ°á»›c khi xuáº¥t báº£n.

| Cá»™t | Kiá»ƒu | RÃ ng buá»™c |
|---|---|---|
| id | bigint | PK, identity |
| lesson_id | bigint | FK â†’ lessons(id), ON DELETE RESTRICT, NOT NULL |
| requested_by | uuid | FK â†’ profiles(id), ON DELETE SET NULL, NULL |
| title | varchar(150) | NOT NULL |
| description | text | NULL |
| exercise_type | exercise_type | NOT NULL |
| difficulty | difficulty_level | NOT NULL |
| content | jsonb | NOT NULL |
| status | generated_exercise_status | NOT NULL, DEFAULT 'pending' |
| provider | varchar(50) | NOT NULL |
| model | varchar(100) | NULL |
| published_exercise_id | bigint | FK â†’ exercises(id), ON DELETE SET NULL, NULL |
| published_at | timestamptz | NULL |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

Quy táº¯c:

- `content` lÃ  discriminated JSONB theo `type`; chá»‰ chá»©a field phÃ¹ há»£p vá»›i modality, solution vÃ  explanation do AI Ä‘á» xuáº¥t.
- Learner khÃ´ng Ä‘Æ°á»£c Ä‘á»c báº£ng nÃ y.
- `approved` chÆ°a Ä‘á»“ng nghÄ©a Ä‘Ã£ xuáº¥t hiá»‡n trong course.
- Khi publish, server táº¡o `exercises`, `exercise_options`, `exercise_solutions`, sau Ä‘Ã³ cáº­p nháº­t `published_exercise_id`, `published_at` vÃ  status `published` trong cÃ¹ng transaction.
- Má»™t generated exercise chá»‰ Ä‘Æ°á»£c publish má»™t láº§n.
- `published_at` chá»‰ cÃ³ giÃ¡ trá»‹ khi status lÃ  `published`.
- Draft hiá»‡n táº¡i trong record nÃ y lÃ  nguá»“n Ä‘Æ°á»£c publish; má»i chá»‰nh sá»­a tá»« review pháº£i Ä‘Æ°á»£c validate vÃ  Ã¡p dá»¥ng vÃ o record trÆ°á»›c khi approve.

Constraint gá»£i Ã½:

```sql
unique (published_exercise_id)
```

---

## 7.13 exercise_reviews

LÆ°u lá»‹ch sá»­ kiá»ƒm duyá»‡t.

| Cá»™t | Kiá»ƒu | RÃ ng buá»™c |
|---|---|---|
| id | bigint | PK, identity |
| generated_exercise_id | bigint | FK â†’ generated_exercises(id), ON DELETE CASCADE, NOT NULL |
| reviewer_id | uuid | FK â†’ profiles(id), ON DELETE RESTRICT, NOT NULL |
| status | review_status | NOT NULL |
| comment | text | NULL |
| edited_snapshot | jsonb | NULL |
| reviewed_at | timestamptz | NOT NULL, DEFAULT now() |

Quy táº¯c:

- Reviewer pháº£i cÃ³ role `moderator` hoáº·c `admin`.
- Má»—i láº§n review táº¡o record má»›i; khÃ´ng ghi Ä‘Ã¨ lá»‹ch sá»­ cÅ©.
- Náº¿u cÃ³ `edited_snapshot`, snapshot pháº£i chá»©a toÃ n bá»™ draft Ä‘Ã£ chá»‰nh gá»“m title, description, type, difficulty vÃ  content; server validate láº¡i trÆ°á»›c khi approve.
- Review service cáº­p nháº­t generated exercise vÃ  táº¡o review history trong cÃ¹ng transaction.

---


## 7.14 admin_logs â€” P1

LÆ°u audit tá»‘i thiá»ƒu cho thao tÃ¡c quáº£n trá»‹ vÃ  publish nháº¡y cáº£m.

KhÃ´ng dÃ¹ng báº£ng nÃ y nhÆ° application log tá»•ng quÃ¡t.

| Cá»™t | Kiá»ƒu | RÃ ng buá»™c |
|---|---|---|
| id | bigint | PK, identity |
| actor_id | uuid | FK â†’ profiles(id), ON DELETE RESTRICT, NOT NULL |
| action | varchar(100) | NOT NULL |
| target_type | varchar(100) | NOT NULL |
| target_id | text | NOT NULL |
| metadata | jsonb | NOT NULL, DEFAULT '{}'::jsonb |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

Constraints:

```sql
check (char_length(trim(action)) between 1 and 100)
check (char_length(trim(target_type)) between 1 and 100)
check (char_length(trim(target_id)) between 1 and 200)
```

CÃ¡c action tá»‘i thiá»ƒu:

```text
user.role_changed
user.activated
user.deactivated
generated_exercise.approved
generated_exercise.rejected
generated_exercise.needs_revision
generated_exercise.published
```

Quy táº¯c:

- Client thÃ´ng thÆ°á»ng khÃ´ng Ä‘Æ°á»£c insert, update hoáº·c delete.
- Actor láº¥y tá»« session Ä‘Ã£ xÃ¡c thá»±c.
- Metadata khÃ´ng chá»©a password, token, secret, correct solution hoáº·c full AI prompt.
- Audit record Ä‘Æ°á»£c táº¡o trong cÃ¹ng use case/transaction khi thao tÃ¡c chÃ­nh thÃ nh cÃ´ng.
- Audit log khÃ´ng thay tháº¿ `exercise_reviews`; review history váº«n náº±m trong `exercise_reviews`.
- KhÃ´ng báº­t Admin mutation hoáº·c publish workflow trÆ°á»›c khi audit storage vÃ  test liÃªn quan tá»“n táº¡i.

---

# 8. Index báº¯t buá»™c

PostgreSQL khÃ´ng tá»± táº¡o index cho foreign key, vÃ¬ váº­y migration pháº£i táº¡o cÃ¡c index sau:

```sql
create index idx_course_enrollments_user_id
  on public.course_enrollments(user_id);

create index idx_course_enrollments_course_id
  on public.course_enrollments(course_id);

create index idx_chapters_course_order
  on public.chapters(course_id, chapter_order);

create index idx_lessons_chapter_order
  on public.lessons(chapter_id, lesson_order);

create index idx_exercises_lesson_order
  on public.exercises(lesson_id, exercise_order);

create index idx_exercise_options_exercise_id
  on public.exercise_options(exercise_id);

create index idx_user_progress_user_id
  on public.user_progress(user_id);

create index idx_user_progress_lesson_id
  on public.user_progress(lesson_id);

create index idx_submissions_user_exercise
  on public.submissions(user_id, exercise_id, submitted_at desc);

create index idx_ai_explanations_submission_id
  on public.ai_explanations(submission_id);

create index idx_generated_exercises_status_created
  on public.generated_exercises(status, created_at);

create index idx_exercise_reviews_generated_id
  on public.exercise_reviews(generated_exercise_id, reviewed_at desc);

create index idx_admin_logs_actor_created
  on public.admin_logs(actor_id, created_at desc);

create index idx_admin_logs_target
  on public.admin_logs(target_type, target_id, created_at desc);
```

Hai index `admin_logs` chá»‰ táº¡o trong migration P1 cÃ¹ng báº£ng.

KhÃ´ng táº¡o index Ä‘Æ¡n trÃªn `courses.title` cho search. Khi `F-COURSE-02` Ä‘Æ°á»£c triá»ƒn khai vÃ  dá»¯ liá»‡u Ä‘á»§ lá»›n, táº¡o migration riÃªng dÃ¹ng `pg_trgm` hoáº·c full-text search theo quyáº¿t Ä‘á»‹nh Ä‘Ã£ review.

---
# 9. Row Level Security Ä‘Æ°á»£c chá»‘t

## 9.1 HÃ m kiá»ƒm tra role

Táº¡o helper function server/database:

```sql
public.has_role(required_role public.user_role)
```

YÃªu cáº§u:

- DÃ¹ng `security definer`.
- CÃ³ `set search_path = public`.
- Chá»‰ tráº£ boolean.
- KhÃ´ng nháº­n user ID tá»« client; dÃ¹ng `auth.uid()`.

## 9.2 profiles

- User authenticated Ä‘Æ°á»£c SELECT profile cá»§a chÃ­nh mÃ¬nh.
- User authenticated chá»‰ Ä‘Æ°á»£c UPDATE `username` cá»§a chÃ­nh mÃ¬nh thÃ´ng qua server hoáº·c policy an toÃ n.
- Moderator/Admin khÃ´ng tá»± Ä‘á»™ng Ä‘Æ°á»£c Ä‘á»c má»i profile náº¿u use case khÃ´ng cáº§n.
- Admin service dÃ¹ng server-side authorization Ä‘á»ƒ quáº£n lÃ½ role vÃ  tráº¡ng thÃ¡i.

## 9.3 courses, chapters, lessons, exercises, exercise_options

- `anon` vÃ  `authenticated`: SELECT chá»‰ record `is_published = true` vÃ  cÃ³ parent Ä‘Ã£ publish.
- INSERT/UPDATE/DELETE: khÃ´ng cáº¥p cho client thÃ´ng thÆ°á»ng.
- Moderator/Admin thá»±c hiá»‡n thay Ä‘á»•i thÃ´ng qua server-side route/service.

## 9.4 exercise_solutions

- KhÃ´ng táº¡o policy cho `anon` hoáº·c `authenticated`.
- Chá»‰ service role hoáº·c security-definer RPC cháº¥m bÃ i Ä‘Æ°á»£c truy cáº­p.

## 9.5 course_enrollments

- Learner chá»‰ SELECT enrollment cá»§a chÃ­nh mÃ¬nh.
- Viá»‡c enroll/cancel/complete thá»±c hiá»‡n qua server.

## 9.6 user_progress

- Learner chá»‰ SELECT record cÃ³ `user_id = auth.uid()`.
- KhÃ´ng cho client UPDATE trá»±c tiáº¿p.

## 9.7 submissions

- Learner chá»‰ SELECT submission cÃ³ `user_id = auth.uid()`.
- KhÃ´ng cho client INSERT trá»±c tiáº¿p vÃ¬ client khÃ´ng Ä‘Æ°á»£c quyáº¿t Ä‘á»‹nh káº¿t quáº£ cháº¥m.
- Server/RPC táº¡o submission.

## 9.8 ai_explanations

Learner chá»‰ SELECT explanation khi submission liÃªn quan thuá»™c vá» chÃ­nh mÃ¬nh:

```sql
exists (
  select 1
  from public.submissions s
  where s.id = ai_explanations.submission_id
    and s.user_id = auth.uid()
)
```

## 9.9 generated_exercises vÃ  exercise_reviews

- Learner vÃ  Guest: khÃ´ng cÃ³ quyá»n SELECT.
- Moderator/Admin: truy cáº­p thÃ´ng qua server-side authorization.
- KhÃ´ng dá»±a vÃ o viá»‡c áº©n route hoáº·c nÃºt trÃªn UI.

---

## 9.10 admin_logs

- Learner, Guest vÃ  client thÃ´ng thÆ°á»ng: khÃ´ng cÃ³ quyá»n INSERT, UPDATE hoáº·c DELETE.
- Admin chá»‰ Ä‘á»c audit log thÃ´ng qua server-side endpoint Ä‘Ã£ kiá»ƒm tra role.
- Write audit record thá»±c hiá»‡n báº±ng server-side service role hoáº·c security-definer function háº¹p quyá»n.
- KhÃ´ng táº¡o policy cho phÃ©p client tá»± khai bÃ¡o `actor_id`.
# 10. Trigger vÃ  function

## 10.1 handle_new_user

Khi Supabase Auth táº¡o user, trigger táº¡o `profiles`.

YÃªu cáº§u:

- Username láº¥y tá»« `raw_user_meta_data.username`.
- Username Ä‘Æ°á»£c trim vÃ  pháº£i dÃ i tá»« 3 Ä‘áº¿n 50 kÃ½ tá»±.
- Náº¿u thiáº¿u hoáº·c khÃ´ng há»£p lá»‡, táº¡o display name máº·c Ä‘á»‹nh nhÆ° `learner-<8 kÃ½ tá»± Ä‘áº§u UUID>`.
- Username khÃ´ng pháº£i thÃ´ng tin Ä‘Äƒng nháº­p vÃ  khÃ´ng báº¯t buá»™c unique trong MVP.
- Role luÃ´n máº·c Ä‘á»‹nh `learner`; khÃ´ng láº¥y role tá»« metadata client gá»­i lÃªn.

## 10.2 set_updated_at

Táº¡o má»™t trigger function dÃ¹ng chung Ä‘á»ƒ cáº­p nháº­t `updated_at` cho:

- profiles
- courses
- chapters
- lessons
- exercises
- exercise_solutions
- user_progress
- generated_exercises

## 10.3 enroll_course RPC hoáº·c transaction service

Enrollment pháº£i nguyÃªn tá»­:

1. XÃ¡c thá»±c `auth.uid()`.
2. Kiá»ƒm tra profile active vÃ  role learner.
3. Kiá»ƒm tra course tá»“n táº¡i vÃ  published.
4. Tá»« chá»‘i enrollment trÃ¹ng theo contract `409 CONFLICT`.
5. Táº¡o `course_enrollments`.
6. Láº¥y táº¥t cáº£ lesson published theo `chapter_order`, `lesson_order`.
7. Táº¡o progress cho lesson Ä‘áº§u tiÃªn lÃ  `unlocked`.
8. Táº¡o progress cho lesson cÃ²n láº¡i lÃ  `locked`.
9. Tráº£ enrollment vÃ  first lesson an toÃ n.

KhÃ´ng dÃ¹ng lazy progress creation trong MVP vÃ¬ roadmap cáº§n tráº¡ng thÃ¡i xÃ¡c Ä‘á»‹nh cho má»i lesson published.

## 10.4 start_lesson RPC hoáº·c transaction service

1. XÃ¡c thá»±c `auth.uid()`.
2. Kiá»ƒm tra learner Ä‘Ã£ enroll course chá»©a lesson.
3. Kiá»ƒm tra progress thuá»™c user hiá»‡n táº¡i.
4. Náº¿u `locked`, chá»‰ cho phÃ©p khi lesson lÃ  bÃ i published liá»n sau má»™t lesson mÃ  learner Ä‘Ã£ cÃ³
   progress khÃ¡c `locked` trong cÃ¹ng course; má»i trÆ°á»ng há»£p nháº£y cÃ³c khÃ¡c Ä‘á»u bá»‹ tá»« chá»‘i.
5. Náº¿u `locked` há»£p lá»‡ hoáº·c `unlocked`, chuyá»ƒn `in_progress`, set `started_at` vÃ 
   `last_accessed_at`.
6. Náº¿u Ä‘Ã£ `in_progress` hoáº·c `completed`, giá»¯ status vÃ  cáº­p nháº­t `last_accessed_at` khi phÃ¹ há»£p.
7. Viá»‡c báº¯t Ä‘áº§u bÃ i liá»n sau khÃ´ng cáº­p nháº­t bÃ i trÆ°á»›c thÃ nh `completed`; completion váº«n chá»‰ do
   `submit_exercise` quyáº¿t Ä‘á»‹nh.
8. Client khÃ´ng update progress trá»±c tiáº¿p.

## 10.5 submit_exercise RPC hoáº·c transaction service

Má»™t láº§n ná»™p bÃ i pháº£i thá»±c hiá»‡n nguyÃªn tá»­:

1. XÃ¡c thá»±c `auth.uid()`.
2. Kiá»ƒm tra user active vÃ  role learner.
3. Kiá»ƒm tra exercise Ä‘Ã£ publish vÃ  lesson khÃ´ng locked.
4. Validate answer theo `exercise_type`.
5. Äá»c solution server-only.
6. TÃ­nh attempt number.
7. Cháº¥m Ä‘Ã¡p Ã¡n.
8. Insert submission.
9. Náº¿u Ä‘Ãºng, kiá»ƒm tra lesson Ä‘Ã£ hoÃ n thÃ nh cÃ¡c exercise báº¯t buá»™c chÆ°a.
10. Cáº­p nháº­t progress vÃ  unlock lesson tiáº¿p theo náº¿u Ä‘á»§ Ä‘iá»u kiá»‡n.
11. Náº¿u hoÃ n thÃ nh toÃ n course, cáº­p nháº­t enrollment.
12. Tráº£ vá» káº¿t quáº£ an toÃ n, khÃ´ng tráº£ raw solution.

KhÃ´ng triá»ƒn khai logic nÃ y báº±ng trigger rá»i ráº¡c sau má»—i insert vÃ¬ khÃ³ kiá»ƒm thá»­ vÃ  dá»… táº¡o tráº¡ng thÃ¡i ná»­a chá»«ng.

## 10.6 publish_generated_exercise RPC hoáº·c transaction service â€” P1

Migration `026_lesson_to_exercise_pipeline.sql` triá»ƒn khai contract nÃ y báº±ng
`SECURITY DEFINER`, empty `search_path`, row/advisory locks vÃ  idempotent retry. CÃ¹ng migration
thu há»“i direct INSERT/UPDATE/DELETE trÃªn `generated_exercises` vÃ  `exercise_reviews`; create,
review/edit vÃ  publish chá»‰ Ä‘i qua cÃ¡c RPC Ä‘Ã£ grant cho `authenticated` vÃ  tá»± kiá»ƒm tra active
Moderator/Admin.

Thá»±c hiá»‡n nguyÃªn tá»­:

1. XÃ¡c thá»±c actor vÃ  kiá»ƒm tra role Moderator/Admin.
2. Kiá»ƒm tra generated exercise Ä‘ang `approved`.
3. Kiá»ƒm tra chÆ°a cÃ³ `published_exercise_id`.
4. Validate full draft hiá»‡n táº¡i.
5. Kiá»ƒm tra lesson vÃ  parent content Ä‘Ã£ publish.
6. Táº¡o exercise.
7. Táº¡o options.
8. Táº¡o solution private.
9. Cáº­p nháº­t generated exercise thÃ nh `published`.
10. GÃ¡n `published_exercise_id` vÃ  `published_at`.
11. Táº¡o `admin_logs` action `generated_exercise.published`.
12. Tráº£ response an toÃ n.

Náº¿u Ä‘Ã£ publish, tráº£ conflict vÃ  khÃ´ng táº¡o record trÃ¹ng.

---
# 11. Quy táº¯c dá»¯ liá»‡u nghiá»‡p vá»¥

## 11.1 HoÃ n thÃ nh lesson

MVP dÃ¹ng quy táº¯c:

- Learner pháº£i tráº£ lá»i Ä‘Ãºng táº¥t cáº£ exercise cÃ³ `is_required = true` trong lesson.
- Chá»‰ cáº§n cÃ³ Ã­t nháº¥t má»™t submission Ä‘Ãºng cho má»—i exercise báº¯t buá»™c.
- KhÃ´ng yÃªu cáº§u Ä‘Ãºng ngay láº§n Ä‘áº§u.
- Khi lesson hoÃ n thÃ nh, `completed_at = now()`.

## 11.2 Má»Ÿ khÃ³a lesson tiáº¿p theo

Thá»© tá»± toÃ n course Ä‘Æ°á»£c xÃ¡c Ä‘á»‹nh bá»Ÿi:

1. `chapters.chapter_order`.
2. `lessons.lesson_order`.

KhÃ´ng dÃ¹ng ID Ä‘á»ƒ suy ra thá»© tá»±.

## 11.3 Course hoÃ n thÃ nh

Course Ä‘Æ°á»£c hoÃ n thÃ nh khi táº¥t cáº£ lesson Ä‘Ã£ publish trong course cÃ³ progress `completed`.

Khi Ä‘Ã³:

- `course_enrollments.status = 'completed'`.
- `course_enrollments.completed_at = now()`.

## 11.4 Publish content

KhÃ´ng publish exercise náº¿u:

- Lesson hoáº·c chapter cha chÆ°a publish.
- ChÆ°a cÃ³ solution.
- KhÃ´ng cÃ³ Ä‘á»§ option cáº§n thiáº¿t cho loáº¡i bÃ i táº­p.

---

# 12. JSON schema á»Ÿ Application Layer

PostgreSQL lÆ°u JSONB nhÆ°ng TypeScript/Zod pháº£i validate cáº¥u trÃºc.

## 12.1 Choice/coding answer

```ts
const predictOutputAnswerSchema = z.object({
  selectedOptionId: z.number().int().positive(),
});
```

## 12.2 Subject-agnostic answers

```ts
const shortAnswerSchema = z.object({ answerText: z.string().trim().min(1).max(1000) });
const orderingAnswerSchema = z.object({ orderedOptionIds: z.array(z.number().int().positive()).min(2) });
const matchingAnswerSchema = z.object({
  matches: z.array(z.object({ optionId: z.number().int().positive(), answer: z.string().trim().min(1).max(500) })).min(2),
});
```

`multiple_choice`, `true_false`, `scenario`, `predict_output` vÃ  `fix_the_bug` dÃ¹ng
`selectedOptionId`. Short answer, ordering vÃ  matching dÃ¹ng payload riÃªng á»Ÿ trÃªn. Má»i cháº¥m Ä‘iá»ƒm
diá»…n ra trong security-definer RPC; client khÃ´ng Ä‘á»c `exercise_solutions`.

## 12.3 solution

Solution schema pháº£i Ä‘Æ°á»£c chá»n theo `exercise_type`. KhÃ´ng dÃ¹ng má»™t schema JSON chung rá»“i Ã©p kiá»ƒu báº±ng `as`.

MVP:

```ts
const predictOutputSolutionSchema = z.object({
  correctOptionId: z.number().int().positive(),
  acceptedValues: z.array(z.string()).optional(),
});

const fixTheBugSolutionSchema = z.object({
  correctOptionId: z.number().int().positive(),
});
```

## 12.4 generated exercise edited snapshot â€” P1

```ts
const generatedExerciseEditedSnapshotSchema = z.object({
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().max(5000).nullable(),
  type: z.enum(["fixTheBug", "predictOutput"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  content: generatedExerciseContentSchema,
});
```

Snapshot pháº£i chá»©a full draft, khÃ´ng chá»‰ pháº§n `content`, Ä‘á»ƒ review history cÃ³ thá»ƒ truy váº¿t thay Ä‘á»•i.

---
# 13. ChÃ­nh sÃ¡ch xÃ³a

- Course, chapter, lesson vÃ  exercise Ä‘Ã£ cÃ³ dá»¯ liá»‡u há»c táº­p: Æ°u tiÃªn `is_published = false`, khÃ´ng xÃ³a cá»©ng.
- User: Æ°u tiÃªn `profiles.is_active = false`.
- `exercise_options` vÃ  `exercise_solutions`: Ä‘Æ°á»£c cascade khi exercise chÆ°a cÃ³ lá»‹ch sá»­ hoáº·c khi xÃ³a trong mÃ´i trÆ°á»ng development.
- `submissions`: dÃ¹ng `ON DELETE RESTRICT` vá»›i user vÃ  exercise Ä‘á»ƒ giá»¯ lá»‹ch sá»­.
- KhÃ´ng cascade tá»« course xuá»‘ng toÃ n bá»™ lá»‹ch sá»­ há»c táº­p.

---

# 14. Migration order

Core M2:

```text
supabase/migrations/
â”œâ”€â”€ 001_create_enums.sql
â”œâ”€â”€ 002_create_profiles.sql
â”œâ”€â”€ 003_create_curriculum_tables.sql
â”œâ”€â”€ 004_create_learning_tables.sql
â”œâ”€â”€ 005_create_ai_explanation_table.sql
â”œâ”€â”€ 006_create_indexes.sql
â”œâ”€â”€ 007_create_triggers.sql
â”œâ”€â”€ 008_create_rls_policies.sql
â””â”€â”€ 009_create_core_rpc_functions.sql
```

P1 / M6 Operations Extension:

```text
010_create_ai_moderation_tables.sql
011_create_admin_logs.sql
012_create_operations_indexes_and_rls.sql
013_create_operations_rpc_functions.sql
```

TÃªn migration thá»±c táº¿ cÃ³ thá»ƒ dÃ¹ng timestamp do Supabase CLI táº¡o, nhÆ°ng ná»™i dung vÃ  dependency pháº£i giá»¯ Ä‘Ãºng thá»© tá»± logic.

Quy táº¯c:

- KhÃ´ng sá»­a migration Ä‘Ã£ cháº¡y trÃªn mÃ´i trÆ°á»ng chung.
- Thay Ä‘á»•i má»›i pháº£i táº¡o migration má»›i.
- Má»i migration pháº£i cháº¡y Ä‘Æ°á»£c trÃªn database trá»‘ng theo Ä‘Ãºng thá»© tá»±.
- Core MVP khÃ´ng phá»¥ thuá»™c báº£ng P1.
- Sau migration pháº£i generate láº¡i Supabase TypeScript types.
- KhÃ´ng dÃ¹ng Supabase MCP sá»­a schema rá»“i bá» qua migration trong repository.

---
# 15. Seed data tá»‘i thiá»ƒu

`supabase/seed.sql` pháº£i táº¡o:

- Má»™t course `Python for Beginners`.
- Ãt nháº¥t 2 chapter.
- Má»—i chapter Ã­t nháº¥t 2 lesson.
- Ãt nháº¥t 1 bÃ i `fix_the_bug`.
- Ãt nháº¥t 1 bÃ i `predict_output`.
- Options vÃ  private solution tÆ°Æ¡ng á»©ng.

Seed khÃ´ng chá»©a:

- Production user.
- Password.
- API key.
- Access token.

---

# 16. RAG má»Ÿ rá»™ng sau MVP

MVP AI Explanation láº¥y context trá»±c tiáº¿p tá»« lesson, exercise, submission vÃ  solution. ChÆ°a cáº§n RAG.

Chá»‰ khi AI Mentor cáº§n tÃ¬m kiáº¿m trong nhiá»u tÃ i liá»‡u má»›i thÃªm:

```text
knowledge_documents
knowledge_chunks
```

Khi Ä‘Ã³ dÃ¹ng `pgvector` trong migration riÃªng. KhÃ´ng táº¡o hai báº£ng nÃ y á»Ÿ MVP.

---

# 17. Checklist dÃ nh cho AI code

TrÆ°á»›c khi táº¡o hoáº·c sá»­a database, AI agent pháº£i kiá»ƒm tra:

- [ ] Äá»c `AGENTS.md`, `CODEX.md`, task packet vÃ  Required context.
- [ ] Task Ä‘ang `READY` vÃ  cho phÃ©p sá»­a migration.
- [ ] Äang dÃ¹ng Supabase local hoáº·c mÃ´i trÆ°á»ng Ä‘Æ°á»£c task chá»‰ rÃµ.
- [ ] KhÃ´ng táº¡o báº£ng password riÃªng.
- [ ] CÃ³ `profiles` liÃªn káº¿t `auth.users`.
- [ ] Username lÃ  display name 3â€“50 kÃ½ tá»±, khÃ´ng báº¯t buá»™c unique trong MVP.
- [ ] CÃ³ `course_enrollments`.
- [ ] Enrollment táº¡o progress Ä‘áº§y Ä‘á»§ trong transaction/RPC.
- [ ] ÄÃ¡p Ã¡n Ä‘Ãºng náº±m trong `exercise_solutions`.
- [ ] Má»i báº£ng public Ä‘Ã£ báº­t RLS.
- [ ] KhÃ´ng cáº¥p SELECT client cho `exercise_solutions`.
- [ ] CÃ³ unique/check constraints vÃ  index cáº§n thiáº¿t.
- [ ] Start lesson, submission vÃ  progress khÃ´ng do client update trá»±c tiáº¿p.
- [ ] Client khÃ´ng truyá»n user ID, role, score hoáº·c `is_correct`.
- [ ] Fix the Bug MVP dÃ¹ng `selectedOptionId`.
- [ ] Generated exercise pháº£i review trÆ°á»›c khi publish.
- [ ] Admin mutation/publish cÃ³ audit log khi P1 Ä‘Æ°á»£c báº­t.
- [ ] Migration, seed vÃ  generated TypeScript types Ä‘Æ°á»£c cáº­p nháº­t cÃ¹ng nhau.
- [ ] KhÃ´ng tá»± thÃªm báº£ng hoáº·c enum ngoÃ i tÃ i liá»‡u nÃ y.
- [ ] KhÃ´ng sá»­a production qua Supabase MCP náº¿u task khÃ´ng yÃªu cáº§u rÃµ.
- [ ] Náº¿u tÃ i liá»‡u mÃ¢u thuáº«n, tráº£ `BLOCKED`.

---
# 18. Definition of Done cho database

Database task chá»‰ hoÃ n thÃ nh khi:

- Migration cháº¡y thÃ nh cÃ´ng trÃªn Supabase local/database trá»‘ng.
- Seed cháº¡y thÃ nh cÃ´ng náº¿u task áº£nh hÆ°á»Ÿng seed.
- RLS Ä‘Ã£ báº­t vÃ  cÃ³ integration test quyá»n.
- Learner khÃ´ng Ä‘á»c Ä‘Æ°á»£c solution.
- Learner khÃ´ng Ä‘á»c Ä‘Æ°á»£c progress/submission cá»§a user khÃ¡c.
- Learner khÃ´ng tá»± thay Ä‘á»•i role, progress, score hoáº·c `is_correct`.
- Enrollment, start lesson vÃ  submit flow giá»¯ tÃ­nh nguyÃªn tá»­ theo contract.
- Moderator/Admin flow Ä‘Æ°á»£c kiá»ƒm tra server-side khi thuá»™c task P1.
- Audit log Ä‘Æ°á»£c ghi vá»›i action nháº¡y cáº£m khi task yÃªu cáº§u.
- TypeScript types Ä‘Æ°á»£c generate láº¡i.
- Repository khÃ´ng dÃ¹ng `any` hoáº·c `select('*')` khÃ´ng cáº§n thiáº¿t.
- Unit/integration/RLS tests pass.
- E2E chá»‰ báº¯t buá»™c khi task lÃ  critical user flow.
- Codex tráº£ `READY_FOR_REVIEW`; Gemini review diff vÃ  test Ä‘á»™c láº­p.

---
# 19. Quyáº¿t Ä‘á»‹nh cuá»‘i cÃ¹ng

| Háº¡ng má»¥c | Quyáº¿t Ä‘á»‹nh |
|---|---|
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| User profile | `profiles`, username 3â€“50, khÃ´ng unique trong MVP |
| Course membership | `course_enrollments` |
| Curriculum | Course â†’ Chapter â†’ Lesson â†’ Exercise |
| UI Step | Chá»‰ lÃ  nhÃ£n cá»§a Lesson, khÃ´ng cÃ³ báº£ng `steps` |
| Exercise options | `exercise_options` |
| Correct answer | `exercise_solutions` server-only |
| Fix the Bug MVP | Chá»n option báº±ng `selectedOptionId` |
| Progress | Má»™t record cho má»—i user + published lesson |
| Enrollment initialization | Transaction/RPC, first unlocked, cÃ²n láº¡i locked |
| Submission | Má»™t record cho má»—i láº§n ná»™p, cháº¥m server-side |
| AI explanation | Gáº¯n vá»›i submission |
| AI-generated exercise | P1, human review trÆ°á»›c publish |
| Review edits | Full `edited_snapshot` |
| Admin/publish audit | `admin_logs` P1 |
| Authorization | Server checks + RLS |
| Schema changes | SQL migrations trong Git |
| MCP database access | Æ¯u tiÃªn local/read-only, khÃ´ng thay migration |
| RAG | KhÃ´ng thuá»™c MVP |

Thiáº¿t káº¿ nÃ y Ä‘á»§ Ä‘á»ƒ Codex triá»ƒn khai tá»«ng task mÃ  khÃ´ng tá»± suy Ä‘oÃ¡n schema. Gemini/Antigravity review migration, RLS vÃ  test thÃ´ng qua workflow thá»§ cÃ´ng do ngÆ°á»i dÃ¹ng lÃ m cáº§u ná»‘i.
# Legacy Document-to-Lesson schema extension

Migration `015_document_to_lesson.sql` bá»• sung:

- Private Storage bucket `lesson-sources` (10 MiB, MIME allowlist, active Admin only).
- `source_documents`: metadata, extraction/generation state vÃ  object provenance.
- `document_chunks`: Ä‘oáº¡n nguá»“n á»•n Ä‘á»‹nh, offsets vÃ  SHA-256.
- `lesson_drafts`: structured content, target course/chapter/lesson, revision vÃ  state.
- `lesson_draft_citations`: mapping section/revision sang Ä‘Ãºng source chunk.
- `lesson_draft_reviews`: immutable Admin decisions theo revision.
- `lesson_draft_publications`: idempotency/audit record cho publish.

Táº¥t cáº£ báº£ng public báº­t RLS vÃ  chá»‰ active Admin Ä‘Æ°á»£c truy cáº­p. CÃ¡c RPC ghi nhiá»u báº£ng lÃ 
`SECURITY DEFINER` vá»›i `search_path = ''`, tá»± kiá»ƒm tra `auth.uid()` + active Admin,
revoke `PUBLIC`/`anon` vÃ  chá»‰ grant `authenticated`. `publish_lesson_draft` khÃ³a cÃ¡c row
liÃªn quan, yÃªu cáº§u approved revision hiá»‡n táº¡i vÃ  citation Ä‘áº§y Ä‘á»§ trÆ°á»›c khi cáº­p nháº­t
lesson/chapter/course trong cÃ¹ng transaction.

CÃ¡c object migration `015` vÃ  batch RPC migration `023` Ä‘Æ°á»£c giá»¯ cho compatibility vÃ 
lá»‹ch sá»­. ChÃºng khÃ´ng Ä‘Ã¡p á»©ng two-stage outline contract vÃ¬ `lesson_drafts` yÃªu cáº§u official
target Lesson vÃ  batch RPC táº¡o curriculum trÆ°á»›c review. Admin default flow dÃ¹ng normalized
Course-import draft model vÃ  atomic publish boundary cá»§a migration `025`; khÃ´ng sá»­a ngÆ°á»£c
migration cÅ©.

# Distributed rate-limit state

TASK-038 adds `private.rate_limit_buckets` for atomic fixed-window counters shared by
all Vercel Function instances. Identifiers are SHA-256 hashed before storage. The
table is outside the exposed `public` schema, has RLS enabled, and grants access only
to `service_role`. Public RPC `consume_rate_limit` is `SECURITY INVOKER`; execution is
revoked from `PUBLIC`, `anon`, and `authenticated`, then granted only to `service_role`.

