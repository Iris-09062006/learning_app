# Decisions

## ADR-Topic-001 â€” Additive multi-source evidence in the existing Course-import pipeline

**Status:** Accepted

Topic research remains stateless until selection. Selected URLs/files become immutable private
evidence attached through an ordered exclusive bridge while the singular order-zero anchor remains
for compatibility. Source-qualified refs map through request-local provider refs to canonical
chunk IDs. Continue remains the evidence lock; publication remains atomic/idempotent; learner and
Exercise architecture remains separate.

Rollout order is migration/backfill -> bridge-aware app -> multi-source generation -> manual
URL/file ingestion -> topic research. Rollback retains additive schema, snapshots, bridge rows,
and immutable revisions; research and URL entry paths can be disabled independently. Crawlers,
research-session tables, embeddings/vector storage, redesign, and destructive down-migration are
not part of this decision.

## 1. Má»¥c Ä‘Ã­ch

TÃ i liá»‡u nÃ y lÆ°u cÃ¡c quyáº¿t Ä‘á»‹nh quan trá»ng cá»§a dá»± Ã¡n.

Má»¥c tiÃªu:

- GiÃºp cÃ¡c thÃ nh viÃªn hiá»ƒu vÃ¬ sao má»™t lá»±a chá»n Ä‘Æ°á»£c Ä‘Æ°a ra.
- NgÄƒn viá»‡c thay Ä‘á»•i kiáº¿n trÃºc tÃ¹y Ã½.
- GiÃºp AI agent biáº¿t pháº§n nÃ o Ä‘Ã£ Ä‘Æ°á»£c chá»‘t.
- Ghi láº¡i cÃ¡c Ä‘Ã¡nh Ä‘á»•i ká»¹ thuáº­t.
- LÃ m cÆ¡ sá»Ÿ review khi cáº§n thay Ä‘á»•i quyáº¿t Ä‘á»‹nh sau nÃ y.

Má»—i quyáº¿t Ä‘á»‹nh gá»“m:

- ID.
- Tráº¡ng thÃ¡i.
- Bá»‘i cáº£nh.
- Quyáº¿t Ä‘á»‹nh.
- LÃ½ do.
- Há»‡ quáº£.
- PhÆ°Æ¡ng Ã¡n Ä‘Ã£ cÃ¢n nháº¯c.
- Äiá»u kiá»‡n xem xÃ©t láº¡i.

---

## 2. Tráº¡ng thÃ¡i quyáº¿t Ä‘á»‹nh

| Tráº¡ng thÃ¡i | Ã nghÄ©a |
|---|---|
| Proposed | Äang Ä‘Æ°á»£c Ä‘á» xuáº¥t |
| Accepted | ÄÃ£ Ä‘Æ°á»£c cháº¥p nháº­n |
| Superseded | ÄÃ£ bá»‹ thay tháº¿ bá»Ÿi quyáº¿t Ä‘á»‹nh má»›i |
| Rejected | KhÃ´ng Ä‘Æ°á»£c chá»n |
| Deprecated | KhÃ´ng cÃ²n khuyáº¿n nghá»‹ nhÆ°ng chÆ°a loáº¡i bá» hoÃ n toÃ n |

AI agent chá»‰ Ä‘Æ°á»£c triá»ƒn khai theo quyáº¿t Ä‘á»‹nh cÃ³ tráº¡ng thÃ¡i `Accepted`.

---

# ADR-001 â€” Sá»­ dá»¥ng Modular Monolith

**Tráº¡ng thÃ¡i:** Accepted

## Bá»‘i cáº£nh

Dá»± Ã¡n cÃ³ cÃ¡c module:

- Authentication.
- Course.
- Enrollment.
- Roadmap.
- Lesson.
- Exercise.
- Submission.
- Progress.
- AI Mentor.
- Moderation.
- Admin.

Quy mÃ´ hiá»‡n táº¡i lÃ  Ä‘á»“ Ã¡n nhá» Ä‘áº¿n vá»«a, chÆ°a cáº§n cÃ¡c service Ä‘á»™c láº­p.

## Quyáº¿t Ä‘á»‹nh

Sá»­ dá»¥ng kiáº¿n trÃºc:

```text
Clientâ€“Server + Modular Monolith
```

ToÃ n bá»™ á»©ng dá»¥ng chÃ­nh náº±m trong má»™t repository Next.js, nhÆ°ng Ä‘Æ°á»£c chia module theo nghiá»‡p vá»¥.

## LÃ½ do

- Dá»… phÃ¡t triá»ƒn.
- Dá»… deploy.
- Dá»… debug.
- Ãt chi phÃ­ váº­n hÃ nh.
- KhÃ´ng cáº§n xá»­ lÃ½ distributed transaction.
- Váº«n cÃ³ thá»ƒ tÃ¡ch service sau náº¿u cáº§n.

## Há»‡ quáº£

TÃ­ch cá»±c:

- Má»™t codebase.
- Má»™t pipeline deploy.
- Dá»… chia module.
- PhÃ¹ há»£p Vercel.

ÄÃ¡nh Ä‘á»•i:

- CÃ¡c module dÃ¹ng chung runtime.
- KhÃ´ng scale Ä‘á»™c láº­p ngay tá»« Ä‘áº§u.
- Cáº§n giá»¯ boundary giá»¯a cÃ¡c module.

## KhÃ´ng chá»n

- Microservices.
- Event-driven architecture.
- Serverless service riÃªng cho tá»«ng module.

## Xem xÃ©t láº¡i khi

- AI traffic tÄƒng máº¡nh.
- CÃ³ background job phá»©c táº¡p.
- Module cáº§n scale hoáº·c deploy Ä‘á»™c láº­p.
- Má»™t repository trá»Ÿ nÃªn khÃ³ quáº£n lÃ½.

---

# ADR-002 â€” Sá»­ dá»¥ng Next.js vÃ  TypeScript

**Tráº¡ng thÃ¡i:** Accepted

## Bá»‘i cáº£nh

Há»‡ thá»‘ng cáº§n:

- Web responsive.
- Frontend.
- Server-side API.
- Authentication integration.
- Deploy Ä‘Æ¡n giáº£n.

## Quyáº¿t Ä‘á»‹nh

Sá»­ dá»¥ng:

```text
Next.js + TypeScript
```

## LÃ½ do

- Frontend vÃ  server trong cÃ¹ng project.
- Há»— trá»£ Route Handlers vÃ  Server Actions.
- TÆ°Æ¡ng thÃ­ch tá»‘t vá»›i Vercel.
- TypeScript giÃºp giáº£m lá»—i contract.
- PhÃ¹ há»£p modular monolith.

## Há»‡ quáº£

- KhÃ´ng cáº§n backend repository riÃªng.
- Server logic pháº£i Ä‘Æ°á»£c tÃ¡ch khá»i UI component.
- Máº·c Ä‘á»‹nh Æ°u tiÃªn Server Component.
- Chá»‰ dÃ¹ng Client Component khi cáº§n tÆ°Æ¡ng tÃ¡c phÃ­a browser.

## KhÃ´ng chá»n

- React SPA + Express riÃªng.
- NestJS riÃªng.
- Django/FastAPI.
- Spring Boot.

## Xem xÃ©t láº¡i khi

- CÃ³ mobile app hoáº·c external client cáº§n backend Ä‘á»™c láº­p.
- Backend workload vÆ°á»£t kháº£ nÄƒng phÃ¹ há»£p cá»§a Next.js.
- CÃ³ nhiá»u service cáº§n deploy riÃªng.

---

# ADR-003 â€” Sá»­ dá»¥ng Tailwind CSS

**Tráº¡ng thÃ¡i:** Accepted

## Quyáº¿t Ä‘á»‹nh

Sá»­ dá»¥ng Tailwind CSS cho giao diá»‡n.

## LÃ½ do

- PhÃ¡t triá»ƒn nhanh.
- Responsive thuáº­n tiá»‡n.
- Dá»… giá»¯ spacing vÃ  typography thá»‘ng nháº¥t.
- PhÃ¹ há»£p vá»›i component-based UI.

## Há»‡ quáº£

- KhÃ´ng dÃ¹ng class Tailwind lÃ m selector trong test.
- Class láº·p láº¡i nhiá»u pháº£i tÃ¡ch component hoáº·c helper.
- KhÃ´ng láº¡m dá»¥ng arbitrary value.

## KhÃ´ng chá»n

- CSS framework khÃ¡c lÃ m ná»n táº£ng chÃ­nh.
- CSS-in-JS phá»©c táº¡p.
- UI library lá»›n báº¯t buá»™c toÃ n há»‡ thá»‘ng.

---

# ADR-004 â€” Sá»­ dá»¥ng Supabase cho Database vÃ  Authentication

**Tráº¡ng thÃ¡i:** Accepted

## Bá»‘i cáº£nh

Dá»± Ã¡n cáº§n:

- PostgreSQL.
- Authentication.
- Session.
- Row Level Security.
- Deploy nhanh.

## Quyáº¿t Ä‘á»‹nh

Sá»­ dá»¥ng:

```text
Supabase PostgreSQL
Supabase Auth
Supabase Row Level Security
```

## LÃ½ do

- Giáº£m khá»‘i lÆ°á»£ng backend háº¡ táº§ng.
- CÃ³ PostgreSQL chuáº©n.
- CÃ³ Auth tÃ­ch há»£p.
- CÃ³ RLS.
- PhÃ¹ há»£p MVP vÃ  Vercel.

## Há»‡ quáº£

- KhÃ´ng tá»± lÆ°u password.
- `auth.users` quáº£n lÃ½ danh tÃ­nh.
- `profiles` lÆ°u dá»¯ liá»‡u á»©ng dá»¥ng.
- Má»i thay Ä‘á»•i schema pháº£i dÃ¹ng migration.
- RLS lÃ  báº¯t buá»™c vá»›i dá»¯ liá»‡u riÃªng.

## KhÃ´ng chá»n

- MongoDB.
- Firebase Firestore.
- Tá»± xÃ¢y auth.
- PostgreSQL self-hosted.

## Xem xÃ©t láº¡i khi

- CÃ³ yÃªu cáº§u háº¡ táº§ng riÃªng.
- CÃ³ constraint phÃ¡p lÃ½ hoáº·c dá»¯ liá»‡u.
- Chi phÃ­ hoáº·c giá»›i háº¡n Supabase khÃ´ng cÃ²n phÃ¹ há»£p.

---

# ADR-005 â€” TÃ¡ch `auth.users` vÃ  `profiles`

**Tráº¡ng thÃ¡i:** Accepted

## Quyáº¿t Ä‘á»‹nh

Supabase Auth quáº£n lÃ½:

- Email.
- Password.
- Session.

Báº£ng `profiles` quáº£n lÃ½:

- Username.
- Role.
- Active status.
- Dá»¯ liá»‡u á»©ng dá»¥ng.

## LÃ½ do

- KhÃ´ng tá»± lÆ°u password.
- Khá»›p mÃ´ hÃ¬nh Supabase.
- Giáº£m rá»§i ro báº£o máº­t.
- Dá»… Ã¡p dá»¥ng RLS.

## Há»‡ quáº£

- `profiles.id` dÃ¹ng cÃ¹ng UUID vá»›i `auth.users.id`.
- Khi Ä‘Äƒng kÃ½ pháº£i táº¡o profile tÆ°Æ¡ng á»©ng.
- KhÃ´ng query password tá»« application database.

---

# ADR-006 â€” DÃ¹ng má»™t role chÃ­nh cho má»—i tÃ i khoáº£n

**Tráº¡ng thÃ¡i:** Accepted

## Quyáº¿t Ä‘á»‹nh

Má»—i profile cÃ³ má»™t role:

```text
learner
moderator
admin
```

Guest lÃ  tráº¡ng thÃ¡i chÆ°a Ä‘Äƒng nháº­p, khÃ´ng lÆ°u trong database.

## LÃ½ do

- ÄÆ¡n giáº£n.
- Äá»§ cho MVP.
- Dá»… kiá»ƒm tra quyá»n.
- KhÃ´ng cáº§n permission matrix phá»©c táº¡p.

## Há»‡ quáº£

- Má»™t user khÃ´ng cÃ³ nhiá»u role Ä‘á»“ng thá»i.
- Admin cÃ³ thá»ƒ Ä‘Æ°á»£c phÃ©p thá»±c hiá»‡n chá»©c nÄƒng Moderator.
- Náº¿u cáº§n permission chi tiáº¿t hÆ¡n pháº£i táº¡o quyáº¿t Ä‘á»‹nh má»›i.

---

# ADR-007 â€” KhÃ´ng cho client tá»± cáº­p nháº­t progress

**Tráº¡ng thÃ¡i:** Accepted

## Bá»‘i cáº£nh

Náº¿u client cÃ³ quyá»n cáº­p nháº­t progress, learner cÃ³ thá»ƒ tá»± Ä‘Ã¡nh dáº¥u lesson completed.

## Quyáº¿t Ä‘á»‹nh

Progress chá»‰ Ä‘Æ°á»£c cáº­p nháº­t bá»Ÿi server sau khi business logic xÃ¡c nháº­n.

Client khÃ´ng Ä‘Æ°á»£c tá»± gá»­i:

```text
status
isCorrect
score
completedAt
```

## LÃ½ do

- NgÄƒn gian láº­n.
- Báº£o vá»‡ tÃ­nh toÃ n váº¹n dá»¯ liá»‡u.
- Äáº£m báº£o progress khá»›p submission.

## Há»‡ quáº£

- Submission vÃ  progress update pháº£i qua service.
- RLS pháº£i cháº·n client update trá»±c tiáº¿p.
- NÃªn dÃ¹ng transaction hoáº·c RPC an toÃ n.

---

# ADR-008 â€” TÃ¡ch Ä‘Ã¡p Ã¡n Ä‘Ãºng khá»i báº£ng bÃ i táº­p cÃ´ng khai

**Tráº¡ng thÃ¡i:** Accepted

## Quyáº¿t Ä‘á»‹nh

Dá»¯ liá»‡u Ä‘Æ°á»£c tÃ¡ch:

```text
exercises
exercise_options
exercise_solutions
```

`exercise_solutions` lÃ  server-only.

## LÃ½ do

- TrÃ¡nh client Ä‘á»c Ä‘Ã¡p Ã¡n Ä‘Ãºng.
- TrÃ¡nh API vÃ´ tÃ¬nh tráº£ solution.
- Dá»… kiá»ƒm soÃ¡t quyá»n.

## Há»‡ quáº£

- Endpoint láº¥y exercise khÃ´ng tráº£ solution.
- Server pháº£i Ä‘á»c solution khi cháº¥m bÃ i.
- RLS khÃ´ng cho Learner select `exercise_solutions`.

---

# ADR-009 â€” Sá»­ dá»¥ng JSONB cho Ä‘Ã¡p Ã¡n cÃ³ cáº¥u trÃºc khÃ¡c nhau

**Tráº¡ng thÃ¡i:** Accepted

## Bá»‘i cáº£nh

Fix the Bug vÃ  Predict the Output cÃ³ cáº¥u trÃºc answer khÃ¡c nhau.

## Quyáº¿t Ä‘á»‹nh

Sá»­ dá»¥ng JSONB cho:

- Learner answer.
- Exercise solution.
- Generated exercise content.
- Má»™t sá»‘ metadata.

## LÃ½ do

- Linh hoáº¡t.
- KhÃ´ng cáº§n táº¡o quÃ¡ nhiá»u báº£ng cho tá»«ng exercise type.
- Dá»… má»Ÿ rá»™ng loáº¡i bÃ i.

## Há»‡ quáº£

- Pháº£i validate báº±ng schema theo exercise type.
- KhÃ´ng Ä‘Æ°á»£c coi JSONB lÃ  dá»¯ liá»‡u tá»± do khÃ´ng kiá»ƒm soÃ¡t.
- TypeScript types vÃ  Zod schema pháº£i Ä‘á»“ng bá»™.

---

# ADR-010 â€” Chá»‰ há»— trá»£ hai loáº¡i bÃ i táº­p trong MVP

**Tráº¡ng thÃ¡i:** Accepted

## Quyáº¿t Ä‘á»‹nh

MVP há»— trá»£:

```text
Fix the Bug
Predict the Output
```

## LÃ½ do

- ÄÃºng pháº¡m vi ban Ä‘áº§u.
- KhÃ´ng cáº§n code execution sandbox.
- Dá»… kiá»ƒm thá»­.
- PhÃ¹ há»£p learner má»›i.

## Há»‡ quáº£

- KhÃ´ng xÃ¢y IDE Ä‘áº§y Ä‘á»§.
- KhÃ´ng cháº¡y code Python khÃ´ng tin cáº­y.
- Loáº¡i bÃ i má»›i cáº§n evaluator, validation vÃ  UI riÃªng.

---

# ADR-011 â€” KhÃ´ng sá»­ dá»¥ng code execution sandbox trong MVP

**Tráº¡ng thÃ¡i:** Accepted

## Quyáº¿t Ä‘á»‹nh

KhÃ´ng cháº¡y code Python do learner nháº­p trÃªn server trong MVP.

## LÃ½ do

- Rá»§i ro báº£o máº­t.
- Cáº§n container isolation.
- Cáº§n CPU, memory vÃ  network limits.
- NgoÃ i pháº¡m vi Ä‘á»“ Ã¡n hiá»‡n táº¡i.

## Há»‡ quáº£

- Cháº¥m bÃ i dá»±a trÃªn lá»±a chá»n hoáº·c logic tÄ©nh.
- KhÃ´ng cÃ³ hidden test case.
- KhÃ´ng cÃ³ terminal hoáº·c IDE.

## Xem xÃ©t láº¡i khi

- CÃ³ yÃªu cáº§u bÃ i táº­p viáº¿t code tá»± do.
- CÃ³ thiáº¿t káº¿ sandbox an toÃ n.
- CÃ³ háº¡ táº§ng riÃªng phÃ¹ há»£p.

---

# ADR-012 â€” AI Explanation dÃ¹ng context trá»±c tiáº¿p, chÆ°a dÃ¹ng RAG

**Tráº¡ng thÃ¡i:** Accepted

## Bá»‘i cáº£nh

AI giáº£i thÃ­ch dá»±a trÃªn bÃ i táº­p hiá»‡n táº¡i, nÃªn há»‡ thá»‘ng Ä‘Ã£ cÃ³:

- Lesson.
- Exercise.
- Learner answer.
- Correct solution.
- User question.

## Quyáº¿t Ä‘á»‹nh

MVP dÃ¹ng context injection trá»±c tiáº¿p.

KhÃ´ng triá»ƒn khai RAG trong phiÃªn báº£n Ä‘áº§u.

## LÃ½ do

- Äá»§ cho use case hiá»‡n táº¡i.
- ÄÆ¡n giáº£n hÆ¡n.
- KhÃ´ng cáº§n embedding pipeline.
- KhÃ´ng cáº§n vector database.
- Dá»… kiá»ƒm thá»­.

## Há»‡ quáº£

- AI chá»‰ giáº£i thÃ­ch trong pháº¡m vi context Ä‘Æ°á»£c cung cáº¥p.
- KhÃ´ng tÃ¬m kiáº¿m trong kho tÃ i liá»‡u lá»›n.
- AI Provider interface váº«n pháº£i cho phÃ©p má»Ÿ rá»™ng sau.

## Xem xÃ©t láº¡i khi

- CÃ³ nhiá»u tÃ i liá»‡u.
- AI Mentor tráº£ lá»i cÃ¢u há»i tá»± do.
- Cáº§n citation.
- Cáº§n truy xuáº¥t theo course hoáº·c lesson.

---

# ADR-013 â€” AI chá»‰ Ä‘Æ°á»£c gá»i phÃ­a server

**Tráº¡ng thÃ¡i:** Accepted

## Quyáº¿t Ä‘á»‹nh

Browser khÃ´ng gá»i trá»±c tiáº¿p AI Provider.

Luá»“ng:

```text
Client
â†’ Next.js Server
â†’ Validation
â†’ Context Builder
â†’ AI Provider
â†’ Response Validator
â†’ Client
```

## LÃ½ do

- Báº£o vá»‡ API key.
- Kiá»ƒm soÃ¡t prompt.
- Kiá»ƒm tra ownership.
- Rate limit.
- Validate response.

## Há»‡ quáº£

- AI key lÃ  server-only.
- KhÃ´ng cÃ³ `NEXT_PUBLIC_AI_API_KEY`.
- Client khÃ´ng gá»­i system prompt.
- CÃ³ timeout vÃ  error handling.

---

# ADR-014 â€” Generated Exercise pháº£i qua Moderator

**Tráº¡ng thÃ¡i:** Accepted

## Quyáº¿t Ä‘á»‹nh

Luá»“ng ná»™i dung AI:

```text
pending
â†’ review
â†’ approved / rejected / needsRevision
â†’ published
```

AI khÃ´ng Ä‘Æ°á»£c publish tá»± Ä‘á»™ng.

## LÃ½ do

- Giáº£m hallucination.
- Äáº£m báº£o Ä‘Ã¡p Ã¡n Ä‘Ãºng.
- Äáº£m báº£o phÃ¹ há»£p curriculum.
- Giá»¯ con ngÆ°á»i chá»‹u trÃ¡ch nhiá»‡m cuá»‘i.

## Há»‡ quáº£

- Cáº§n `generated_exercises`.
- Cáº§n `exercise_reviews`.
- Publish pháº£i cháº¡y transaction.
- Moderator/Admin má»›i cÃ³ quyá»n.

---

# ADR-015 â€” Sá»­ dá»¥ng REST-style Route Handlers

**Tráº¡ng thÃ¡i:** Accepted

## Quyáº¿t Ä‘á»‹nh

API chÃ­nh sá»­ dá»¥ng:

- Next.js Route Handlers.
- REST-style endpoint.
- Server Actions cho form ná»™i bá»™ phÃ¹ há»£p.

## LÃ½ do

- Dá»… hiá»ƒu.
- Dá»… test.
- Khá»›p `api_contract.md`.
- KhÃ´ng cáº§n GraphQL.

## Há»‡ quáº£

- Response pháº£i thá»‘ng nháº¥t.
- API field dÃ¹ng camelCase.
- Database field dÃ¹ng snake_case.
- Mapper chuyá»ƒn Ä‘á»•i giá»¯a hai lá»›p.

---

# ADR-016 â€” Response API cÃ³ cáº¥u trÃºc thá»‘ng nháº¥t

**Tráº¡ng thÃ¡i:** Accepted

## Quyáº¿t Ä‘á»‹nh

ThÃ nh cÃ´ng:

```ts
{
  success: true,
  data: ...
}
```

Tháº¥t báº¡i:

```ts
{
  success: false,
  error: {
    code: string,
    message: string
  }
}
```

## LÃ½ do

- Frontend xá»­ lÃ½ nháº¥t quÃ¡n.
- Dá»… test.
- KhÃ´ng lá»™ lá»—i ná»™i bá»™.
- AI agent khÃ´ng tá»± táº¡o format khÃ¡c.

## Há»‡ quáº£

- Route Handler chá»‹u trÃ¡ch nhiá»‡m map lá»—i.
- Service khÃ´ng phá»¥ thuá»™c `NextResponse`.
- KhÃ´ng tráº£ raw Supabase error.

---

# ADR-017 â€” Sá»­ dá»¥ng Zod cho validation náº¿u Ä‘Æ°á»£c cÃ i Ä‘áº·t

**Tráº¡ng thÃ¡i:** Accepted

## Quyáº¿t Ä‘á»‹nh

DÃ¹ng Zod cho:

- API input.
- Form input quan trá»ng.
- AI response.
- JSONB content.
- Query params.

## LÃ½ do

- Runtime validation.
- TÃ­ch há»£p TypeScript tá»‘t.
- PhÃ¹ há»£p dá»¯ liá»‡u tá»« client vÃ  AI.

## Há»‡ quáº£

- Client validation khÃ´ng thay tháº¿ server validation.
- Schema pháº£i Ä‘Æ°á»£c tÃ¡i sá»­ dá»¥ng khi phÃ¹ há»£p.
- KhÃ´ng dÃ¹ng type assertion thay validation.

---

# ADR-018 â€” Sá»­ dá»¥ng Playwright cho E2E

**Tráº¡ng thÃ¡i:** Accepted

## Quyáº¿t Ä‘á»‹nh

Playwright lÃ  cÃ´ng cá»¥ E2E chÃ­nh.

## LÃ½ do

- Kiá»ƒm tra luá»“ng ngÆ°á»i dÃ¹ng.
- Há»— trá»£ browser automation.
- PhÃ¹ há»£p Next.js.
- CÃ³ screenshot vÃ  trace.

## Há»‡ quáº£

- KhÃ´ng dÃ¹ng Tailwind class lÃ m selector.
- KhÃ´ng dÃ¹ng timeout cá»‘ Ä‘á»‹nh náº¿u cÃ³ thá»ƒ.
- Test khÃ´ng dÃ¹ng production database.
- Critical flows pháº£i cÃ³ E2E test.

---

# ADR-019 â€” Vitest lÃ  lá»±a chá»n cho Unit vÃ  Integration Test

**Tráº¡ng thÃ¡i:** Accepted

## Quyáº¿t Ä‘á»‹nh

Sá»­ dá»¥ng Vitest cho unit test vÃ  integration test.

## LÃ½ do

- Nhanh.
- PhÃ¹ há»£p TypeScript.
- Dá»… mock AI provider.
- TÃ¡ch khá»i Playwright.

## Há»‡ quáº£

- Playwright khÃ´ng thay tháº¿ unit test.
- Business logic quan trá»ng pháº£i Ä‘Æ°á»£c test Ä‘á»™c láº­p.
- KhÃ´ng gá»i AI provider tháº­t trong test máº·c Ä‘á»‹nh.

---

# ADR-020 â€” Deploy báº±ng Vercel

**Tráº¡ng thÃ¡i:** Accepted

## Quyáº¿t Ä‘á»‹nh

Next.js Ä‘Æ°á»£c deploy trÃªn Vercel.

## LÃ½ do

- TÃ­ch há»£p Next.js tá»‘t.
- Preview deployment.
- Deploy tá»« GitHub.
- Quáº£n lÃ½ environment variables.

## Há»‡ quáº£

- Production branch lÃ  `main`.
- Preview vÃ  Production cáº§n environment riÃªng.
- KhÃ´ng Ä‘Æ°a secret vÃ o repository.
- Rollback á»©ng dá»¥ng báº±ng deployment trÆ°á»›c.

---

# ADR-021 â€” GitHub lÃ  nguá»“n mÃ£ chÃ­nh

**Tráº¡ng thÃ¡i:** Accepted

## Quyáº¿t Ä‘á»‹nh

GitHub dÃ¹ng cho:

- Source control.
- Pull request.
- Code review.
- Issue.
- CI náº¿u báº­t.

## Há»‡ quáº£

- KhÃ´ng push secret.
- DÃ¹ng branch vÃ  pull request.
- Commit message pháº£i rÃµ.
- Migration pháº£i Ä‘Æ°á»£c commit.

---

# ADR-022 â€” Chá»‰ dÃ¹ng má»™t package manager

**Tráº¡ng thÃ¡i:** Accepted

## Quyáº¿t Ä‘á»‹nh

Project sá»­ dá»¥ng npm vÃ  commit:

```text
package-lock.json
```

ToÃ n bá»™ local development, CI vÃ  deployment dÃ¹ng npm.

## LÃ½ do

- TrÃ¡nh lock file xung Ä‘á»™t.
- CI vÃ  local cÃ i cÃ¹ng dependency.
- Dá»… dÃ¹ng `npm ci`.

## Há»‡ quáº£

- KhÃ´ng táº¡o thÃªm `yarn.lock` hoáº·c `pnpm-lock.yaml`.
- Muá»‘n Ä‘á»•i package manager cáº§n quyáº¿t Ä‘á»‹nh má»›i.

---

# ADR-023 â€” Database thay Ä‘á»•i báº±ng migration

**Tráº¡ng thÃ¡i:** Accepted

## Quyáº¿t Ä‘á»‹nh

Má»i thay Ä‘á»•i database schema pháº£i dÃ¹ng SQL migration file.

## LÃ½ do

- LÆ°u lá»‹ch sá»­ database.
- TÃ¡i táº¡o mÃ´i trÆ°á»ng dá»… dÃ ng.
- TÃ­ch há»£p vá»›i CI/CD.
- TrÃ¡nh sai lá»‡ch giá»¯a local vÃ  production.

## Há»‡ quáº£

- KhÃ´ng sá»­a database thá»§ cÃ´ng.
- Migration pháº£i Ä‘Æ°á»£c commit.
- Generate láº¡i TypeScript types sau khi Ä‘á»•i schema.

---

# ADR-024 â€” Luá»“ng khÃ´i phá»¥c máº­t kháº©u dÃ¹ng Supabase Auth + má»™t endpoint

**Tráº¡ng thÃ¡i:** Accepted

## Bá»‘i cáº£nh

TASK-035 lÃ  giai Ä‘oáº¡n 2 cá»§a Auth UI, bao gá»“m chá»©c nÄƒng khÃ´i phá»¥c máº­t kháº©u (F-AUTH-04). Táº¡i thá»i Ä‘iá»ƒm chá»‘t contract, `docs/api_contract.md` chÆ°a Ä‘á»‹nh nghÄ©a endpoint nÃ o cho luá»“ng nÃ y vÃ  `docs/security.md` chÆ°a cÃ³ sá»‘ liá»‡u rate limit riÃªng cho forgot-password. Theo AGENTS.md, agent khÃ´ng Ä‘Æ°á»£c tá»± thÃªm endpoint/contract khi chÆ°a cÃ³ quyáº¿t Ä‘á»‹nh sáº£n pháº©m, nÃªn task bá»‹ cháº·n Ä‘á»ƒ chá»‘t phÆ°Æ¡ng Ã¡n.

## Quyáº¿t Ä‘á»‹nh

Sá»­ dá»¥ng phÆ°Æ¡ng Ã¡n B:

- ThÃªm Ä‘Ãºng má»™t endpoint `POST /api/auth/forgot-password`.
- Äáº·t láº¡i máº­t kháº©u má»›i thá»±c hiá»‡n báº±ng Supabase client-side `updateUser` táº¡i trang `/reset-password`, khÃ´ng cáº§n endpoint riÃªng.

## LÃ½ do

- `docs/features.md` F-AUTH-04 yÃªu cáº§u "Æ¯u tiÃªn dÃ¹ng Supabase password reset flow" vÃ  "CÃ³ rate limit".
- Endpoint `forgot-password` cáº§n tá»“n táº¡i phÃ­a server Ä‘á»ƒ Ã¡p dá»¥ng rate limit 5/IP/giá» vÃ  khÃ´ng lá»™ thÃ´ng tin user, nháº¥t quÃ¡n vá»›i cÃ¡c endpoint `/api/auth/*` hiá»‡n cÃ³.
- BÆ°á»›c Ä‘áº·t máº­t kháº©u má»›i Ä‘Æ°á»£c Supabase xá»­ lÃ½ an toÃ n vá»›i recovery session tá»« link trong email; khÃ´ng cáº§n tá»± xÃ¢y endpoint, giáº£m bá» máº·t táº¥n cÃ´ng vÃ  khá»‘i lÆ°á»£ng code.
- Giá»¯ tá»‘i giáº£n API trong khi váº«n nháº¥t quÃ¡n kiáº¿n trÃºc `Clientâ€“Server + Modular Monolith`.

## Há»‡ quáº£

TÃ­ch cá»±c:

- CÃ³ má»™t endpoint server-side cho bÆ°á»›c gá»­i email khÃ´i phá»¥c, kiá»ƒm soÃ¡t rate limit.
- BÆ°á»›c Ä‘áº·t máº­t kháº©u má»›i dÃ¹ng cÆ¡ cháº¿ recovery session chuáº©n cá»§a Supabase Auth.
- PhÃ¹ há»£p yÃªu cáº§u F-AUTH-04.

ÄÃ¡nh Ä‘á»•i:

- Trang `/reset-password` pháº£i xá»­ lÃ½ recovery session phÃ­a client; pháº£i kiá»ƒm tra lá»—i `AuthSessionMissingError` vÃ  hiá»ƒn thá»‹ thÃ´ng bÃ¡o há»£p lÃ½.
- KhÃ´ng cÃ³ endpoint riÃªng cho bÆ°á»›c Ä‘áº·t máº­t kháº©u má»›i nÃªn khÃ´ng Ã¡p dá»¥ng Ä‘Æ°á»£c rate limit server-side cho riÃªng bÆ°á»›c nÃ y (Ä‘Æ°á»£c Supabase quáº£n lÃ½).

## KhÃ´ng chá»n

- PhÆ°Æ¡ng Ã¡n A â€” thÃªm cáº£ `POST /api/auth/update-password`: thÃªm API khÃ´ng cáº§n thiáº¿t, láº·p chá»©c nÄƒng Supabase client-side.
- PhÆ°Æ¡ng Ã¡n C â€” bá» háº³n endpoint server-side cho forgot-password: khÃ³ Ã¡p rate limit vÃ  thiáº¿u nháº¥t quÃ¡n vá»›i `/api/auth/*`.

## Xem xÃ©t láº¡i khi

- CÃ³ yÃªu cáº§u Ä‘áº·t máº­t kháº©u má»›i pháº£i qua server (vÃ­ dá»¥ kiá»ƒm tra policy máº­t kháº©u riÃªng, cháº·n password cÅ© trÃ¹ng).
- Cáº§n ghi log hÃ nh vi Ä‘áº·t láº¡i máº­t kháº©u phÃ­a server.
- CÃ³ yÃªu cáº§u tÃ­ch há»£p provider xÃ¡c thá»±c khÃ¡c ngoÃ i Supabase Auth.

---

# ADR-025 â€” Exercise modality theo ná»™i dung Lesson

**Tráº¡ng thÃ¡i:** Accepted â€” supersedes ADR-010

## Quyáº¿t Ä‘á»‹nh

Exercise dÃ¹ng discriminated contract vá»›i tÃ¡m modality tá»‘i thiá»ƒu:

```text
multiple_choice, true_false, short_answer, ordering,
matching, scenario, predict_output, fix_the_bug
```

Provider chá»n modality tá»« Lesson title, summary, learning objectives vÃ  content. Hai modality coding
chá»‰ há»£p lá»‡ khi Lesson thá»±c sá»± dáº¡y láº­p trÃ¬nh hoáº·c suy luáº­n code; code khÃ´ng Ä‘Æ°á»£c dÃ¹ng lÃ m wrapper trang
trÃ­ cho kiáº¿n thá»©c khÃ´ng-code.

## LÃ½ do

LearningApp há»— trá»£ mÃ´n há»c tÃ¹y Ã½. Giá»›i háº¡n cÅ© á»Ÿ hai loáº¡i coding táº¡o bÃ i táº­p sai má»¥c tiÃªu sÆ° pháº¡m cho
Lesson lÃ½ thuyáº¿t. JSONB hiá»‡n cÃ³ cho generated content, learner answer vÃ  solution cho phÃ©p má»Ÿ rá»™ng
schema theo type mÃ  khÃ´ng táº¡o cá»™t giáº£.

## Há»‡ quáº£

- PostgreSQL enum `exercise_type` Ä‘Æ°á»£c má»Ÿ rá»™ng báº±ng migration tÆ°Æ¡ng thÃ­ch ngÆ°á»£c.
- Parser/application validator vÃ  RPC validator Ä‘á»u kiá»ƒm tra exact fields theo type.
- `exercise_solutions` tiáº¿p tá»¥c server-only; learner DTO khÃ´ng chá»©a Ä‘Ã¡p Ã¡n.
- Existing `predict_output` vÃ  `fix_the_bug` rows, option IDs vÃ  `correctOptionId` váº«n há»£p lá»‡.

