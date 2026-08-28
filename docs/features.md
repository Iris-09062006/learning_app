# Features Specification

## F-AICOURSE-03 â€” Topic-based reviewed multi-source Course creation

An active Admin may research a topic, review up to 20 stateless candidates, explicitly select up
to eight discovered/manual/file sources, and ingest only that set. Every accepted web page becomes
immutable private evidence. One Course outline uses source-qualified evidence; source changes
before Continue require a replacement immutable revision, and Continue locks evidence.

The remaining flow is editable outline -> Continue -> per-Lesson generation -> content review ->
atomic/idempotent publication. Legacy document-only imports remain supported. Published
Course/Lesson, learner access, enrollment/progress, and separate per-published-Lesson Exercise
generation/moderation/publication remain unchanged. Learners receive no new citation UI or
Admin-only relevance/authority/provenance data.

## F-ADMIN-06 â€” Äuá»•i há»c viÃªn vÃ  xÃ³a khÃ³a há»c an toÃ n

**Actor:** Active Admin

- Admin can remove a Learner's access by deactivating the account after confirmation.
- Admin can remove a Course from the product after confirmation.
- Course removal archives/unpublishes curriculum rather than destroying learning history.
- Both operations are authorized at the server/database boundary and audited.

## Product decision â€” hai AI pipeline Ä‘á»™c láº­p

Quyáº¿t Ä‘á»‹nh nÃ y thay tháº¿ mÃ´ hÃ¬nh cÅ© coi `AI Exercise Generation â†’ Moderation â†’ Publish`
lÃ  AI-generation flow duy nháº¥t. PDF import vÃ  Lesson-to-Exercises lÃ  hai pipeline Ä‘á»™c láº­p;
khÃ´ng API, prompt, schema hoáº·c review action nÃ o Ä‘Æ°á»£c giáº£ Ä‘á»‹nh ráº±ng má»™t láº§n duyá»‡t cÃ³ thá»ƒ
xá»­ lÃ½ cáº£ Course draft láº«n Exercise draft.

### F-AICOURSE-01 â€” Import Course from PDF

Active Admin upload PDF, server extract/chunk ná»™i dung, AI chá»‰ táº¡o Course outline trÆ°á»›c,
Admin review/edit outline rá»“i má»›i yÃªu cáº§u sinh ná»™i dung cho tá»«ng Lesson. Pipeline nÃ y
khÃ´ng Ä‘Æ°á»£c táº¡o exercise, quiz, answer hoáº·c solution.

### F-AICOURSE-02 â€” Review and Publish AI Course Draft

Admin review Course draft vÃ  cÃ¡c Lesson draft, cÃ³ thá»ƒ sá»­a hoáº·c regenerate riÃªng tá»«ng
Lesson, rá»“i publish Course + Lessons báº±ng má»™t transaction. Item Ä‘Ã£ publish/reject pháº£i
biáº¿n máº¥t khá»i pending queue sau reload mÃ  khÃ´ng xÃ³a lá»‹ch sá»­ draft/source.

### F-AIEXERCISE-01 â€” Generate Exercises for Lesson

Exercise generation luÃ´n báº¯t Ä‘áº§u tá»« Ä‘Ãºng má»™t Lesson Ä‘Ã£ chá»n, dÃ¹ng title, learning
objectives vÃ  content cá»§a Lesson lÃ m context chÃ­nh, rá»“i lÆ°u quan há»‡
`generated_exercises.lesson_id`. KhÃ´ng cÃ³ action generate exercise á»Ÿ cáº¥p Course.

### F-AIEXERCISE-02 â€” Review and Publish Exercise Draft

Exercise draft Ä‘i qua queue/edit/approve/publish riÃªng. Exercise chÆ°a approved khÃ´ng
Ä‘Æ°á»£c xuáº¥t hiá»‡n cho learner; publish pháº£i giá»¯ Ä‘Ãºng `lesson_id` vÃ  cháº¡y nguyÃªn tá»­.

## 1. Má»¥c tiÃªu

TÃ i liá»‡u nÃ y Ä‘á»‹nh nghÄ©a chi tiáº¿t toÃ n bá»™ tÃ­nh nÄƒng cá»§a há»‡ thá»‘ng.

Má»¥c tiÃªu:

- AI agent hiá»ƒu Ä‘Ãºng yÃªu cáº§u tá»«ng tÃ­nh nÄƒng.
- PhÃ¢n Ä‘á»‹nh rÃµ pháº¡m vi MVP vÃ  cÃ¡c tÃ­nh nÄƒng nÃ¢ng cao.
- XÃ¡c Ä‘á»‹nh rÃµ Actor, Input, Flow, Business Rules vÃ  Output.
- LÃ m cÄƒn cá»© viáº¿t Task, Test cases vÃ  Acceptance Criteria.

---

## 2. Danh sÃ¡ch Module vÃ  Feature ID

| Module | Feature ID | TÃªn tÃ­nh nÄƒng | Æ¯u tiÃªn |
|---|---|---|---|
| Authentication | F-AUTH-01 | ÄÄƒng kÃ½ tÃ i khoáº£n | P0 |
| | F-AUTH-02 | ÄÄƒng nháº­p | P0 |
| | F-AUTH-03 | ÄÄƒng xuáº¥t | P0 |
| | F-AUTH-04 | KhÃ´i phá»¥c máº­t kháº©u | P1 |
| Course Catalog | F-COURSE-01 | Xem danh sÃ¡ch khÃ³a há»c | P0 |
| | F-COURSE-02 | TÃ¬m kiáº¿m khÃ³a há»c | P1 |
| | F-COURSE-03 | Xem chi tiáº¿t khÃ³a há»c | P0 |
| Enrollment | F-ENROLL-01 | ÄÄƒng kÃ½ há»c (Enroll) | P0 |
| Roadmap | F-ROADMAP-01 | Xem lá»™ trÃ¬nh bÃ i há»c | P0 |
| | F-ROADMAP-02 | Theo dÃµi tiáº¿n Ä‘á»™ lá»™ trÃ¬nh | P0 |
| Lesson | F-LESSON-01 | Xem ná»™i dung bÃ i há»c | P0 |
| | F-LESSON-02 | Báº¯t Ä‘áº§u bÃ i há»c | P0 |
| Exercise | F-EXERCISE-01 | Xem bÃ i táº­p Predict Output | P0 |
| | F-EXERCISE-02 | Xem bÃ i táº­p Fix the Bug (MVP) | P0 |
| | F-EXERCISE-03 | Xem bÃ i táº­p Fix the Bug (Drag-and-Drop) | P1 |
| | F-EXERCISE-04 | Cháº¥m bÃ i táº­p tÄ©nh | P0 |
| Submission | F-SUBMISSION-01 | Ná»™p bÃ i táº­p | P0 |
| | F-SUBMISSION-02 | Xem lá»‹ch sá»­ ná»™p bÃ i | P1 |
| Progress | F-PROGRESS-01 | Cáº­p nháº­t tiáº¿n Ä‘á»™ há»c | P0 |
| | F-PROGRESS-02 | Tá»± Ä‘á»™ng má»Ÿ khÃ³a bÃ i há»c tiáº¿p theo | P0 |
| AI Mentor | F-AI-01 | Giáº£i thÃ­ch Ä‘Ã¡p Ã¡n sai / bÃ i táº­p | P0 |
| | F-AI-02 | Xem lá»‹ch sá»­ giáº£i thÃ­ch | P1 |
| | F-AI-03 | Äá» xuáº¥t bÆ°á»›c há»c tiáº¿p theo | P2 |
| AI Course | F-AICOURSE-01 | Import Course tá»« PDF qua outline review | P1 |
| | F-AICOURSE-02 | Review vÃ  publish AI Course draft | P1 |
| AI Exercise | F-AIEXERCISE-01 | Táº¡o bÃ i táº­p cho má»™t Lesson | P1 |
| | F-AIEXERCISE-02 | Review vÃ  publish Exercise draft | P1 |
| Profile | F-PROFILE-01 | Xem há»“ sÆ¡ cÃ¡ nhÃ¢n | P0 |
| | F-PROFILE-02 | Cáº­p nháº­t username | P1 |
| Admin | F-ADMIN-01 | Xem danh sÃ¡ch ngÆ°á»i dÃ¹ng | P1 |
| | F-ADMIN-02 | Thay Ä‘á»•i role ngÆ°á»i dÃ¹ng | P1 |
| | F-ADMIN-03 | KÃ­ch hoáº¡t / VÃ´ hiá»‡u hÃ³a tÃ i khoáº£n | P1 |
| | F-ADMIN-04 | Äáº·t láº¡i máº­t kháº©u ngÆ°á»i dÃ¹ng | P2 |
| | F-ADMIN-05 | Xem tráº¡ng thÃ¡i há»‡ thá»‘ng | P2 |
| System | F-SYSTEM-01 | Health check API | P1 |
| | F-SYSTEM-02 | Audit log há»‡ thá»‘ng | P1 |

---

# 3. Authentication Module

## F-AUTH-01 â€” ÄÄƒng kÃ½ tÃ i khoáº£n

**Má»©c Æ°u tiÃªn:** P0  
**Actor:** Guest

### Input

- Username.
- Email.
- Password.
- Confirm password.

### Luá»“ng chÃ­nh

1. Guest nháº­p thÃ´ng tin Ä‘Äƒng kÃ½.
2. Client validate cÆ¡ báº£n.
3. Client gá»­i request Ä‘Äƒng kÃ½.
4. Server validate Ä‘á»‹nh dáº¡ng email, password vÃ  username.
5. Supabase Auth táº¡o tÃ i khoáº£n.
6. Trigger database tá»± Ä‘á»™ng táº¡o record trong `profiles` vá»›i role `learner`.
7. Há»‡ thá»‘ng Ä‘Äƒng nháº­p tá»± Ä‘á»™ng hoáº·c yÃªu cáº§u xÃ¡c nháº­n email tÃ¹y cáº¥u hÃ¬nh.
8. Tráº£ vá» thÃ´ng tin user an toÃ n.

### Quy táº¯c nghiá»‡p vá»¥

- Email pháº£i duy nháº¥t trong há»‡ thá»‘ng Supabase Auth.
- Password pháº£i tuÃ¢n thá»§ chÃ­nh sÃ¡ch máº­t kháº©u (tá»‘i thiá»ƒu 6 hoáº·c 8 kÃ½ tá»± tÃ¹y config).
- Username dÃ i 3â€“50 kÃ½ tá»±, tá»± Ä‘á»™ng trim khoáº£ng tráº¯ng Ä‘áº§u cuá»‘i.
- User má»›i Ä‘Äƒng kÃ½ luÃ´n cÃ³ role `learner` vÃ  tráº¡ng thÃ¡i `is_active = true`.
- KhÃ´ng cho phÃ©p ngÆ°á»i dÃ¹ng chá»n role khi Ä‘Äƒng kÃ½.
- Náº¿u email Ä‘Ã£ tá»“n táº¡i, tráº£ vá» thÃ´ng bÃ¡o lá»—i an toÃ n, khÃ´ng lÃ m rÃ² rá»‰ chi tiáº¿t há»‡ thá»‘ng.

### API liÃªn quan

```text
POST /api/auth/register
```

### TiÃªu chÃ­ hoÃ n thÃ nh

- Táº¡o Ä‘Æ°á»£c user trong Supabase Auth vÃ  record trong `profiles`.
- KhÃ´ng táº¡o Ä‘Æ°á»£c user náº¿u input khÃ´ng há»£p lá»‡.
- User má»›i cÃ³ role `learner`.

---

## F-AUTH-02 â€” ÄÄƒng nháº­p

**Má»©c Æ°u tiÃªn:** P0  
**Actor:** Guest

### Input

- Email.
- Password.

### Luá»“ng chÃ­nh

1. Guest nháº­p email vÃ  password.
2. Server gá»­i yÃªu cáº§u xÃ¡c thá»±c tá»›i Supabase Auth.
3. Supabase Auth kiá»ƒm tra vÃ  tráº£ vá» session / JWT cookie.
4. Server Ä‘á»c `profiles` Ä‘á»ƒ láº¥y role vÃ  tráº¡ng thÃ¡i `is_active`.
5. Náº¿u `is_active = false`, tá»« chá»‘i Ä‘Äƒng nháº­p vÃ  xÃ³a session.
6. Tráº£ vá» thÃ´ng tin user vÃ  chuyá»ƒn hÆ°á»›ng Ä‘áº¿n trang tÆ°Æ¡ng á»©ng vá»›i role.

### Quy táº¯c nghiá»‡p vá»¥

- KhÃ´ng tiáº¿t lá»™ rÃµ email hay password sai (thÃ´ng bÃ¡o chung: "ThÃ´ng tin Ä‘Äƒng nháº­p khÃ´ng há»£p lá»‡").
- TÃ i khoáº£n bá»‹ vÃ´ hiá»‡u hÃ³a (`is_active = false`) khÃ´ng Ä‘Æ°á»£c phÃ©p Ä‘Äƒng nháº­p.
- KhÃ³a session an toÃ n báº±ng HttpOnly Cookie qua Supabase SSR.

### API liÃªn quan

```text
POST /api/auth/login
```

---

## F-AUTH-03 â€” ÄÄƒng xuáº¥t

**Má»©c Æ°u tiÃªn:** P0  
**Actor:** Authenticated user

### Luá»“ng chÃ­nh

1. User chá»n ÄÄƒng xuáº¥t.
2. Client gá»­i request Ä‘Äƒng xuáº¥t tá»›i server.
3. Server há»§y session Supabase Auth vÃ  xÃ³a cookie.
4. Chuyá»ƒn hÆ°á»›ng ngÆ°á»i dÃ¹ng vá» trang chá»§ hoáº·c trang Ä‘Äƒng nháº­p.

### API liÃªn quan

```text
POST /api/auth/logout
```

---

## F-AUTH-04 â€” KhÃ´i phá»¥c máº­t kháº©u

**Má»©c Æ°u tiÃªn:** P1  
**Actor:** Guest / User quÃªn máº­t kháº©u

### Luá»“ng chÃ­nh

1. User nháº­p email yÃªu cáº§u reset máº­t kháº©u.
2. Server gá»i Supabase Auth gá»­i email khÃ´i phá»¥c.
3. User nháº¥n link trong email, chuyá»ƒn tá»›i trang Ä‘áº·t láº¡i máº­t kháº©u.
4. User nháº­p máº­t kháº©u má»›i.
5. Supabase Auth cáº­p nháº­t máº­t kháº©u.

---

# 4. Course Catalog Module

## F-COURSE-01 â€” Xem danh sÃ¡ch khÃ³a há»c

**Má»©c Æ°u tiÃªn:** P0  
**Actor:** Guest, Learner

### Input

- Query params: `page`, `pageSize`.

### Luá»“ng chÃ­nh

1. User truy cáº­p trang Danh sÃ¡ch khÃ³a há»c.
2. Server truy váº¥n báº£ng `courses` vá»›i Ä‘iá»u kiá»‡n `is_published = true`.
3. Náº¿u user Ä‘Ã£ Ä‘Äƒng nháº­p, há»£p nháº¥t thÃ´ng tin `course_enrollments` Ä‘á»ƒ biáº¿t tráº¡ng thÃ¡i Ä‘Ã£ Ä‘Äƒng kÃ½ chÆ°a.
4. Tráº£ vá» danh sÃ¡ch khÃ³a há»c kÃ¨m metadata (tiÃªu Ä‘á», mÃ´ táº£, ngÃ´n ngá»¯, má»©c Ä‘á»™, sá»‘ bÃ i há»c).

### Quy táº¯c nghiá»‡p vá»¥

- Guest vÃ  Learner chá»‰ tháº¥y khÃ³a há»c Ä‘Ã£ xuáº¥t báº£n (`is_published = true`).
- Danh sÃ¡ch cÃ³ phÃ¢n trang.

### API liÃªn quan

```text
GET /api/courses
```

---

## F-COURSE-02 â€” TÃ¬m kiáº¿m khÃ³a há»c

**Má»©c Æ°u tiÃªn:** P1  
**Actor:** Guest, Learner

### Input

- Search term (`search`).

### Quy táº¯c nghiá»‡p vá»¥

- TÃ¬m kiáº¿m tÆ°Æ¡ng Ä‘á»‘i theo `title` hoáº·c `description`.
- Chá»‰ tÃ¬m trÃªn cÃ¡c khÃ³a há»c Ä‘Ã£ xuáº¥t báº£n.

---

## F-COURSE-03 â€” Xem chi tiáº¿t khÃ³a há»c

**Má»©c Æ°u tiÃªn:** P0  
**Actor:** Guest, Learner

### Input

- `courseId` hoáº·c `slug`.

### Luá»“ng chÃ­nh

1. User chá»n má»™t khÃ³a há»c.
2. Server láº¥y thÃ´ng tin khÃ³a há»c, danh sÃ¡ch chapter vÃ  lesson Ä‘Ã£ xuáº¥t báº£n.
3. Náº¿u Learner Ä‘Ã£ Ä‘Äƒng nháº­p, kiá»ƒm tra tráº¡ng thÃ¡i enrollment vÃ  pháº§n trÄƒm hoÃ n thÃ nh.
4. Tráº£ vá» dá»¯ liá»‡u chi tiáº¿t khÃ³a há»c.

### API liÃªn quan

```text
GET /api/courses/:courseId
```

---

# 5. Enrollment Module

## F-ENROLL-01 â€” ÄÄƒng kÃ½ há»c (Enroll)

**Má»©c Æ°u tiÃªn:** P0  
**Actor:** Learner

### Input

- `courseId`.

### Luá»“ng chÃ­nh

1. Learner nháº¥n nÃºt "Báº¯t Ä‘áº§u há»c" hoáº·c "Enroll".
2. Server kiá»ƒm tra Learner Ä‘Ã£ Ä‘Äƒng nháº­p chÆ°a.
3. Server kiá»ƒm tra khÃ³a há»c cÃ³ tá»“n táº¡i vÃ  Ä‘Ã£ `is_published = true` khÃ´ng.
4. Server kiá»ƒm tra Learner Ä‘Ã£ enroll khÃ³a nÃ y chÆ°a.
5. Táº¡o record trong `course_enrollments`.
6. Khá»Ÿi táº¡o toÃ n bá»™ `user_progress` cho cÃ¡c lesson Ä‘Ã£ xuáº¥t báº£n trong khÃ³a há»c:
   - Lesson Ä‘áº§u tiÃªn (theo `chapter_order` vÃ  `lesson_order`) cÃ³ tráº¡ng thÃ¡i `unlocked`.
   - CÃ¡c lesson cÃ²n láº¡i cÃ³ tráº¡ng thÃ¡i `locked`.
7. Tráº£ vá» káº¿t quáº£ thÃ nh cÃ´ng vÃ  ID cá»§a lesson Ä‘áº§u tiÃªn.

### Quy táº¯c nghiá»‡p vá»¥

- Viá»‡c táº¡o enrollment vÃ  khá»Ÿi táº¡o `user_progress` pháº£i náº±m trong 1 Transaction / RPC nguyÃªn tá»­.
- Náº¿u Ä‘Ã£ enroll trÆ°á»›c Ä‘Ã³, tráº£ vá» lá»—i `409 CONFLICT` hoáº·c tráº£ vá» thÃ´ng tin enrollment hiá»‡n táº¡i.
- Guest khÃ´ng thá»ƒ enroll (yÃªu cáº§u chuyá»ƒn hÆ°á»›ng Ä‘Äƒng nháº­p).

### API liÃªn quan

```text
POST /api/courses/:courseId/enroll
```

---

# 6. Roadmap Module

## F-ROADMAP-01 â€” Xem lá»™ trÃ¬nh bÃ i há»c

**Má»©c Æ°u tiÃªn:** P0  
**Actor:** Learner (Ä‘Ã£ enroll)

### Input

- `courseId`.

### Luá»“ng chÃ­nh

1. Learner má»Ÿ trang Roadmap cá»§a khÃ³a há»c.
2. Server láº¥y cáº¥u trÃºc Chapter -> Lesson cá»§a khÃ³a há»c.
3. Server láº¥y `user_progress` tÆ°Æ¡ng á»©ng vá»›i `user_id` hiá»‡n táº¡i.
4. Tráº£ vá» cÃ¢y lá»™ trÃ¬nh gá»“m thÃ´ng tin tá»«ng bÃ i há»c vÃ  tráº¡ng thÃ¡i há»c táº­p (`locked`, `unlocked`, `in_progress`, `completed`).

### Quy táº¯c nghiá»‡p vá»¥

- Chá»‰ hiá»ƒn thá»‹ bÃ i há»c thuá»™c cÃ¡c chapter Ä‘Ã£ xuáº¥t báº£n.
- Tráº¡ng thÃ¡i tá»«ng bÃ i há»c pháº£n Ã¡nh chÃ­nh xÃ¡c dá»¯ liá»‡u trong `user_progress`.

### API liÃªn quan

```text
GET /api/courses/:courseId/roadmap
```

---

## F-ROADMAP-02 â€” Theo dÃµi tiáº¿n Ä‘á»™ lá»™ trÃ¬nh

**Má»©c Æ°u tiÃªn:** P0  
**Actor:** Learner

### Ná»™i dung

- Hiá»ƒn thá»‹ tá»•ng sá»‘ bÃ i há»c, sá»‘ bÃ i há»c Ä‘Ã£ hoÃ n thÃ nh.
- Hiá»ƒn thá»‹ thanh pháº§n trÄƒm tiáº¿n Ä‘á»™ (% completed).
- ÄÃ¡nh dáº¥u rÃµ bÃ i há»c tiáº¿p theo cáº§n há»c.

---

# 7. Lesson Module

## F-LESSON-01 â€” Xem ná»™i dung bÃ i há»c

**Má»©c Æ°u tiÃªn:** P0  
**Actor:** Learner (Ä‘Ã£ enroll vÃ  bÃ i há»c khÃ´ng bá»‹ `locked`)

### Input

- `lessonId`.

### Luá»“ng chÃ­nh

1. Learner nháº¥n chá»n má»™t bÃ i há»c tá»« Roadmap.
2. Server kiá»ƒm tra `user_progress`:
   - Náº¿u lesson cÃ³ tráº¡ng thÃ¡i `locked` -> tá»« chá»‘i truy cáº­p (`423 LESSON_LOCKED`).
   - Náº¿u `unlocked`, `in_progress`, hoáº·c `completed` -> cho phÃ©p.
3. Server láº¥y ná»™i dung bÃ i há»c (ná»™i dung lÃ½ thuyáº¿t Markdown) vÃ  danh sÃ¡ch bÃ i táº­p kÃ¨m theo.
4. Tráº£ vá» thÃ´ng tin bÃ i há»c (khÃ´ng chá»©a Ä‘Ã¡p Ã¡n Ä‘Ãºng cá»§a bÃ i táº­p).

### API liÃªn quan

```text
GET /api/lessons/:lessonId
```

---

## F-LESSON-02 â€” Báº¯t Ä‘áº§u bÃ i há»c

**Má»©c Æ°u tiÃªn:** P0  
**Actor:** Learner

### Input

- `lessonId`.

### Luá»“ng chÃ­nh

1. Khi Learner má»Ÿ bÃ i há»c láº§n Ä‘áº§u (tráº¡ng thÃ¡i Ä‘ang lÃ  `unlocked`).
2. Client gá»­i request thÃ´ng bÃ¡o báº¯t Ä‘áº§u bÃ i há»c.
3. Server cáº­p nháº­t `user_progress.status = 'in_progress'` vÃ  ghi nháº­n `started_at`, `last_accessed_at`.
4. Tráº£ vá» tráº¡ng thÃ¡i má»›i.
5. Khi ná»™i dung Ä‘Ã£ hiá»ƒn thá»‹ vÃ  cÃ²n bÃ i published liá»n sau, Learner cÃ³ thá»ƒ nháº¥n â€œTiáº¿p theoâ€ Ä‘á»ƒ
   báº¯t Ä‘áº§u vÃ  chuyá»ƒn ngay sang bÃ i Ä‘Ã³ mÃ  khÃ´ng pháº£i chá» Ä‘á»§ thá»i lÆ°á»£ng Æ°á»›c tÃ­nh.

### Quy táº¯c nghiá»‡p vá»¥

- Náº¿u bÃ i há»c Ä‘Ã£ á»Ÿ tráº¡ng thÃ¡i `in_progress` hoáº·c `completed`, giá»¯ nguyÃªn status vÃ  chá»‰ cáº­p nháº­t `last_accessed_at`.
- â€œTiáº¿p theoâ€ chá»‰ má»Ÿ Ä‘Ãºng bÃ i published liá»n sau; khÃ´ng cho phÃ©p nháº£y cÃ³c qua nhiá»u bÃ i báº±ng API.
- Thao tÃ¡c nÃ y khÃ´ng Ä‘Ã¡nh dáº¥u bÃ i hiá»‡n táº¡i `completed`; completion váº«n pháº£n Ã¡nh káº¿t quáº£ cÃ¡c bÃ i
  táº­p báº¯t buá»™c.

### API liÃªn quan

```text
POST /api/lessons/:lessonId/start
```

---

# 8. Exercise Module

## F-EXERCISE-01 â€” Xem bÃ i táº­p Predict Output

**Má»©c Æ°u tiÃªn:** P0  
**Actor:** Learner

### Ná»™i dung

- Äoáº¡n code Python máº«u (`code_snippet`).
- CÃ¢u há»i/mÃ´ táº£.
- Danh sÃ¡ch cÃ¡c lá»±a chá»n Ä‘áº§u ra (options).

### Quy táº¯c nghiá»‡p vá»¥

- API tráº£ vá» danh sÃ¡ch options khÃ´ng Ä‘Æ°á»£c chá»©a cá» Ä‘Ã¡nh dáº¥u Ä‘Ã¡p Ã¡n Ä‘Ãºng.

---

## F-EXERCISE-02 â€” Xem bÃ i táº­p Fix the Bug (MVP)

**Má»©c Æ°u tiÃªn:** P0  
**Actor:** Learner

### Ná»™i dung trong MVP

- Äoáº¡n code cÃ³ lá»—i (`code_snippet`).
- Vá»‹ trÃ­ lá»—i hoáº·c mÃ´ táº£ lá»—i.
- Danh sÃ¡ch cÃ¡c lá»±a chá»n Ä‘oáº¡n code sá»­a Ä‘Ãºng (tráº¯c nghiá»‡m chá»n Ä‘oáº¡n code Ä‘Ãºng Ä‘á»ƒ thay tháº¿).

### Quy táº¯c nghiá»‡p vá»¥

- MVP Æ°u tiÃªn giao diá»‡n chá»n lá»±a chá»n thay vÃ¬ kÃ©o tháº£ phá»©c táº¡p Ä‘á»ƒ Ä‘áº£m báº£o á»•n Ä‘á»‹nh vÃ  dá»… kiá»ƒm thá»­.

---

## F-EXERCISE-03 â€” Xem bÃ i táº­p Fix the Bug (Drag-and-Drop)

**Má»©c Æ°u tiÃªn:** P1  
**Actor:** Learner

### Ná»™i dung

- CÃ¡c máº£nh code (code blocks) cÃ³ thá»ƒ kÃ©o tháº£ vÃ o vá»‹ trÃ­ trá»‘ng.
- ÄÃ¢y lÃ  cáº£i tiáº¿n UI P1, backend váº«n nháº­n ID lá»±a chá»n hoáº·c chuá»—i code káº¿t quáº£.

---

## F-EXERCISE-04 â€” Cháº¥m bÃ i táº­p tÄ©nh

**Má»©c Æ°u tiÃªn:** P0  
**Actor:** System / Server

### Luá»“ng chÃ­nh

1. Server nháº­n cÃ¢u tráº£ lá»i cá»§a Learner.
2. Server truy váº¥n báº£ng `exercise_solutions` (server-only).
3. So sÃ¡nh Ä‘Ã¡p Ã¡n cá»§a Learner vá»›i `solution`:
   - Vá»›i Predict Output: So sÃ¡nh `selectedOptionId` vá»›i `correctOptionId`.
   - Vá»›i Fix the Bug (MVP): So sÃ¡nh `selectedOptionId` vá»›i `correctOptionId`.
4. XÃ¡c Ä‘á»‹nh káº¿t quáº£ `is_correct` (true/false).
5. Chuáº©n bá»‹ feedback tÆ°Æ¡ng á»©ng.

### Quy táº¯c nghiá»‡p vá»¥

- Viá»‡c cháº¥m bÃ i diá»…n ra hoÃ n toÃ n á»Ÿ Server.
- KhÃ´ng Ä‘Æ°a logic cháº¥m bÃ i xuá»‘ng Client.
- Báº£ng `exercise_solutions` khÃ´ng cÃ³ RLS read cho Learner.

---

# 9. Submission Module

## F-SUBMISSION-01 â€” Ná»™p bÃ i táº­p

**Má»©c Æ°u tiÃªn:** P0  
**Actor:** Learner

### Input

- `exerciseId`.
- `answer` (JSON object chá»©a `selectedOptionId`).

### Luá»“ng chÃ­nh

1. Learner chá»n Ä‘Ã¡p Ã¡n vÃ  nháº¥n "Ná»™p bÃ i".
2. Server láº¥y `user_id` tá»« session.
3. Server kiá»ƒm tra Learner cÃ³ quyá»n lÃ m bÃ i táº­p nÃ y khÃ´ng (bÃ i há»c khÃ´ng bá»‹ `locked`).
4. Server tÃ­nh sá»‘ láº§n thá»­ (`attempt_number = count + 1`).
5. Server thá»±c hiá»‡n cháº¥m bÃ i (F-EXERCISE-04).
6. Server lÆ°u káº¿t quáº£ vÃ o báº£ng `submissions`.
7. Náº¿u káº¿t quáº£ **ÄÃšNG** (`is_correct = true`):
   - Kiá»ƒm tra xem Learner Ä‘Ã£ hoÃ n thÃ nh táº¥t cáº£ bÃ i táº­p báº¯t buá»™c trong bÃ i há»c chÆ°a.
   - Náº¿u Ä‘Ã£ hoÃ n thÃ nh Ä‘á»§ -> Cáº­p nháº­t `user_progress` cá»§a bÃ i há»c hiá»‡n táº¡i thÃ nh `completed` vÃ  tá»± Ä‘á»™ng `unlocked` bÃ i há»c tiáº¿p theo (F-PROGRESS-02).
8. Tráº£ vá» káº¿t quáº£ cho Client: `is_correct`, `feedback`, `attemptNumber`, thÃ´ng tin tiáº¿n Ä‘á»™ bÃ i há»c.

### Quy táº¯c nghiá»‡p vá»¥

- ToÃ n bá»™ bÆ°á»›c 4-7 pháº£i náº±m trong 1 Transaction / RPC duy nháº¥t Ä‘á»ƒ Ä‘áº£m báº£o tÃ­nh nguyÃªn tá»­.
- KhÃ´ng tráº£ vá» toÃ n bá»™ Ä‘Ã¡p Ã¡n Ä‘Ãºng trong response náº¿u lÃ m sai.

### API liÃªn quan

```text
POST /api/exercises/:exerciseId/submissions
```

---

## F-SUBMISSION-02 â€” Xem lá»‹ch sá»­ ná»™p bÃ i

**Má»©c Æ°u tiÃªn:** P1  
**Actor:** Learner

### Input

- `exerciseId`.

### Luá»“ng chÃ­nh

1. Learner xem láº¡i danh sÃ¡ch cÃ¡c láº§n Ä‘Ã£ ná»™p bÃ i táº­p Ä‘Ã³.
2. Server tráº£ vá» danh sÃ¡ch submissions cá»§a chÃ­nh Learner Ä‘Ã³.

---

# 10. Progress Module

## F-PROGRESS-01 â€” Cáº­p nháº­t tiáº¿n Ä‘á»™ há»c

**Má»©c Æ°u tiÃªn:** P0  
**Actor:** System

### Quy táº¯c nghiá»‡p vá»¥

- Tráº¡ng thÃ¡i bÃ i há»c gá»“m: `locked` -> `unlocked` -> `in_progress` -> `completed`.
- BÃ i published liá»n sau cÃ³ thá»ƒ chuyá»ƒn trá»±c tiáº¿p tá»« `locked` sang `in_progress` khi Learner chá»§
  Ä‘á»™ng chá»n â€œTiáº¿p theoâ€ tá»« bÃ i hiá»‡n táº¡i.
- BÃ i há»c chuyá»ƒn sang `completed` khi vÃ  chá»‰ khi Learner ná»™p Ä‘Ãºng táº¥t cáº£ cÃ¡c bÃ i táº­p cÃ³ `is_required = true` trong bÃ i há»c Ä‘Ã³.
- BÃ i há»c Ä‘Ã£ `completed` sáº½ khÃ´ng bá»‹ háº¡ xuá»‘ng tráº¡ng thÃ¡i khÃ¡c dÃ¹ Learner cÃ³ lÃ m láº¡i bÃ i táº­p vÃ  sai.

---

## F-PROGRESS-02 â€” Tá»± Ä‘á»™ng má»Ÿ khÃ³a bÃ i há»c tiáº¿p theo

**Má»©c Æ°u tiÃªn:** P0  
**Actor:** System

### Luá»“ng chÃ­nh

1. Khi bÃ i há»c hiá»‡n táº¡i chuyá»ƒn sang `completed`.
2. Server tÃ¬m bÃ i há»c tiáº¿p theo trong khÃ³a há»c dá»±a trÃªn thá»© tá»±:
   - CÃ¹ng chapter: `lesson_order` tiáº¿p theo.
   - Háº¿t chapter: `chapter_order` tiáº¿p theo, `lesson_order` Ä‘áº§u tiÃªn.
3. Náº¿u tÃ¬m tháº¥y bÃ i há»c tiáº¿p theo vÃ  tráº¡ng thÃ¡i cá»§a nÃ³ Ä‘ang lÃ  `locked`:
   - Cáº­p nháº­t `user_progress` cá»§a bÃ i há»c Ä‘Ã³ thÃ nh `unlocked`.
4. Náº¿u táº¥t cáº£ bÃ i há»c trong khÃ³a há»c Ä‘Ã£ `completed`:
   - Cáº­p nháº­t `course_enrollments.status = 'completed'` vÃ  ghi nháº­n `completed_at`.

---

# 11. AI Mentor Module

## F-AI-01 â€” Giáº£i thÃ­ch Ä‘Ã¡p Ã¡n sai / bÃ i táº­p

**Má»©c Æ°u tiÃªn:** P0  
**Actor:** Learner

### Input

- `submissionId`.
- `question` (tÃ¹y chá»n, cÃ¢u há»i thÃªm cá»§a Learner).

### Luá»“ng chÃ­nh

1. Learner nháº¥n "Nhá» AI giáº£i thÃ­ch" táº¡i trang káº¿t quáº£ bÃ i táº­p.
2. Server kiá»ƒm tra `submissionId` thuá»™c vá» Ä‘Ãºng `user_id` hiá»‡n táº¡i.
3. Server thu tháº­p context phÃ­a Server:
   - TiÃªu Ä‘á» & ná»™i dung bÃ i há»c.
   - Ná»™i dung bÃ i táº­p & cÃ¡c lá»±a chá»n.
   - ÄÃ¡p Ã¡n Learner Ä‘Ã£ chá»n.
   - ÄÃ¡p Ã¡n Ä‘Ãºng (láº¥y tá»« `exercise_solutions`).
   - CÃ¢u há»i cá»§a Learner (náº¿u cÃ³).
4. Server gá»i Prompt Builder táº¡o prompt.
5. Server gá»­i prompt tá»›i AI Provider (Gemini / LLM).
6. Server nháº­n response, truyá»n qua Response Validator Ä‘á»ƒ kiá»ƒm tra cáº¥u trÃºc JSON.
7. Server lÆ°u káº¿t quáº£ vÃ o báº£ng `ai_explanations`.
8. Server tráº£ káº¿t quáº£ giáº£i thÃ­ch cho Learner.

### Context tá»‘i thiá»ƒu

- Lesson title hoáº·c content liÃªn quan.
- Exercise type.
- Code snippet.
- Learner answer.
- Correct solution.
- User question.

### Quy táº¯c nghiá»‡p vá»¥

- KhÃ´ng cáº§n RAG trong MVP.
- KhÃ´ng cho client gá»­i system prompt.
- KhÃ´ng gá»i AI tá»« browser.
- CÃ³ timeout.
- CÃ³ rate limit.
- KhÃ´ng gá»­i email hoáº·c secret Ä‘áº¿n provider.
- KhÃ´ng thá»±c thi code AI tráº£ vá».

### API liÃªn quan

```text
POST /api/ai/explanations
```

### TiÃªu chÃ­ hoÃ n thÃ nh

- Explanation Ä‘Ãºng schema.
- Provider lá»—i Ä‘Æ°á»£c xá»­ lÃ½ an toÃ n.
- User khÃ´ng dÃ¹ng submission cá»§a ngÆ°á»i khÃ¡c.
- KhÃ´ng lá»™ raw prompt hoáº·c API key.

---

## F-AI-02 â€” Xem lá»‹ch sá»­ giáº£i thÃ­ch

**Má»©c Æ°u tiÃªn:** P1  
**Actor:** Learner

### API liÃªn quan

```text
GET /api/submissions/:submissionId/explanations
```

### Quy táº¯c nghiá»‡p vá»¥

- Chá»‰ chá»§ submission Ä‘Æ°á»£c xem.
- KhÃ´ng tráº£ raw prompt náº¿u khÃ´ng cáº§n.

---

## F-AI-03 â€” Äá» xuáº¥t bÆ°á»›c há»c tiáº¿p theo

**Má»©c Æ°u tiÃªn:** P2  
**Actor:** Learner

### Gá»£i Ã½ triá»ƒn khai Ä‘Æ¡n giáº£n

KhÃ´ng cáº§n AI trong MVP.

CÃ³ thá»ƒ dÃ¹ng rule-based:

- Náº¿u lesson hiá»‡n táº¡i chÆ°a completed, Ä‘á» xuáº¥t tiáº¿p tá»¥c lesson Ä‘Ã³.
- Náº¿u completed, Ä‘á» xuáº¥t lesson unlocked tiáº¿p theo.
- Náº¿u sai nhiá»u láº§n, Ä‘á» xuáº¥t xem láº¡i lesson hiá»‡n táº¡i.

Chá»‰ dÃ¹ng AI recommendation khi cÃ³ yÃªu cáº§u rÃµ rÃ ng sau.

---

# 13. AI Course Generation Module

## F-AICOURSE-01 â€” Import Course from PDF

**Má»©c Æ°u tiÃªn:** P1
**Actor:** Active Admin

### Luá»“ng báº¯t buá»™c

1. Upload PDF vÃ  táº¡o import/generation job; chÆ°a táº¡o official Course.
2. Extract vÃ  normalize ná»™i dung hoÃ n toÃ n server-side.
3. AI phÃ¢n tÃ­ch tri thá»©c cá»‘t lÃµi vÃ  tráº£ Course outline Ä‘Ã£ qua schema validation.
4. Admin sá»­a Course metadata, add/remove/reorder Lesson hoáº·c regenerate outline.
5. Chá»‰ sau action Continue, AI sinh content riÃªng cho tá»«ng Lesson dá»±a trÃªn approved outline.
6. Admin sá»­a/regenerate riÃªng tá»«ng Lesson trong Course draft.
7. Admin publish Course + Lessons hoáº·c reject.

### Quy táº¯c nghiá»‡p vá»¥

- Outline gá»“m Course title, description, learning objectives vÃ  danh sÃ¡ch Lesson cÃ³
  title, summary, learning objectives/source references; chÆ°a cÃ³ full Lesson content.
- Pipeline khÃ´ng cÃ³ exercise, quiz, answer hoáº·c solution trong prompt, schema hay dá»¯ liá»‡u
  persistence.
- Regenerate má»™t Lesson khÃ´ng báº¯t buá»™c regenerate Course hay cÃ¡c Lesson khÃ¡c.
- AI output khÃ´ng tá»± publish vÃ  má»i transition pháº£i persist phÃ­a server.

## F-AICOURSE-02 â€” Review and Publish AI Course Draft

**Má»©c Æ°u tiÃªn:** P1
**Actor:** Active Admin

- Outline review vÃ  Course-content review lÃ  hai checkpoint khÃ¡c nhau.
- Publish chá»‰ há»£p lá»‡ khi má»i Lesson báº¯t buá»™c Ä‘Ã£ generate vÃ  Course draft á»Ÿ tráº¡ng thÃ¡i
  ready-to-publish.
- Publish Course, Chapter vÃ  Lessons pháº£i atomic; lá»—i giá»¯a chá»«ng rollback toÃ n bá»™.
- Approve/publish hoáº·c reject pháº£i resolve item bá»n vá»¯ng Ä‘á»ƒ pending queue khÃ´ng hiá»ƒn thá»‹
  láº¡i sau reload.

---

# 14. AI Exercise Generation and Moderation Module

## F-AIEXERCISE-01 â€” Táº¡o bÃ i táº­p cho má»™t Lesson

**Má»©c Æ°u tiÃªn:** P1  
**Actor:** Active Moderator hoáº·c Active Admin
**Implementation:** `VERIFIED` bá»Ÿi TASK-058 (migration `026` vÃ  Lesson-specific UI)

### Input

- Lesson ID.
- Difficulty.
- Learning objective cá»§a Lesson hoáº·c má»¥c tiÃªu cá»¥ thá»ƒ trong Lesson.

### Luá»“ng chÃ­nh

1. Moderator/Admin má»Ÿ `/moderation/lessons`, chá»n Ä‘Ãºng má»™t Lesson Ä‘Ã£ publish vÃ  yÃªu cáº§u táº¡o bÃ i.
2. Server kiá»ƒm tra role.
3. Láº¥y title, summary, learning objectives vÃ  content hiá»‡n táº¡i cá»§a Lesson lÃ m context chÃ­nh.
4. Prompt Builder táº¡o prompt.
5. AI Provider tráº£ structured response.
6. Response validator kiá»ƒm tra schema.
7. LÆ°u vÃ o `generated_exercises` vá»›i tráº¡ng thÃ¡i pending.
8. KhÃ´ng publish tá»± Ä‘á»™ng.

### Quy táº¯c nghiá»‡p vá»¥

- Há»— trá»£ bá»™ modality nhá»: multiple choice, true/false, short answer, ordering, matching,
  scenario, predict output vÃ  fix the bug.
- Provider tá»± chá»n modality theo Ä‘iá»u learner cáº§n hiá»ƒu/lÃ m; client khÃ´ng Ã©p loáº¡i trÆ°á»›c.
- Generated JSON sá»Ÿ há»¯u `type` nhÆ°ng khÃ´ng sá»Ÿ há»¯u `difficulty`: provider tráº£ discriminator
  `type`, cÃ²n application truyá»n vÃ  persist difficulty tá»« request metadata.
- Chá»‰ chá»n `predict_output` hoáº·c `fix_the_bug` khi code lÃ  má»™t pháº§n tháº­t sá»± cá»§a Lesson objective;
  cáº¥m bá»c khÃ¡i niá»‡m khÃ´ng-code trong code giáº£.
- KhÃ´ng sinh theo Course vÃ  khÃ´ng gá»­i toÃ n PDF náº¿u Lesson context Ä‘Ã£ Ä‘á»§.
- Má»i generated exercise pháº£i persist Ä‘Ãºng `lesson_id` cá»§a Lesson Ä‘Æ°á»£c chá»n.
- Correct solution pháº£i cÃ³.
- Generated content pháº£i qua review.
- Provider response sai schema bá»‹ tá»« chá»‘i.
- Má»—i modality dÃ¹ng schema riÃªng, exact fields vÃ  validation chÃ­nh xÃ¡c; choice/coding draft cÃ³
  2â€“6 option text duy nháº¥t vÃ  `correctAnswer` pháº£i khá»›p chÃ­nh xÃ¡c má»™t option.
- Provider cÃ³ timeout 180 giÃ¢y; timeout/response lá»—i khÃ´ng Ä‘Æ°á»£c persist draft.
- Client khÃ´ng Ä‘Æ°á»£c INSERT/UPDATE trá»±c tiáº¿p generated draft; má»i transition Ä‘i qua RPC.

---

## F-AIEXERCISE-02 â€” Review vÃ  publish Exercise draft

Feature nÃ y sá»Ÿ há»¯u toÃ n bá»™ queue, edit, approve/reject/needs-revision vÃ  publish cá»§a
Exercise draft. CÃ¡c má»¥c F-MOD-01/02/03 cÅ© bÃªn dÆ°á»›i lÃ  cÃ¡c capability con cá»§a
F-AIEXERCISE-02, khÃ´ng pháº£i review model dÃ¹ng chung vá»›i Course draft.

**Implementation:** `VERIFIED` bá»Ÿi TASK-058. Review/edit lÃ  má»™t transaction cÃ³ row lock;
publish approved draft lÃ  transaction idempotent vÃ  solution lÆ°u option ID tháº­t.

### F-MOD-01 â€” Xem hÃ ng Ä‘á»£i bÃ i táº­p AI

**Má»©c Æ°u tiÃªn:** P1  
**Actor:** Moderator, Admin

### UI liÃªn quan

```text
/moderation
```

### Ná»™i dung

- Generated exercise.
- Lesson liÃªn quan.
- Type.
- Difficulty.
- Provider.
- Status.
- Created at.

### API liÃªn quan

```text
GET /api/moderation/generated-exercises
```

---

### F-MOD-02 â€” Review bÃ i táº­p AI

**Má»©c Æ°u tiÃªn:** P1  
**Actor:** Moderator, Admin

### Quyáº¿t Ä‘á»‹nh

- Approved.
- Rejected.
- Needs Revision.

### CÃ³ thá»ƒ chá»‰nh sá»­a

- Title.
- Description.
- Code snippet.
- Options.
- Solution.
- Explanation.
- Difficulty.

### Quy táº¯c nghiá»‡p vá»¥

- Edited content pháº£i validate láº¡i.
- Má»—i review táº¡o lá»‹ch sá»­.
- Learner khÃ´ng truy cáº­p Ä‘Æ°á»£c.
- KhÃ´ng review exercise Ä‘Ã£ published.

### API liÃªn quan

```text
POST /api/moderation/generated-exercises/:id/reviews
```

---

### F-MOD-03 â€” Publish bÃ i táº­p Ä‘Ã£ duyá»‡t

**Má»©c Æ°u tiÃªn:** P1  
**Actor:** Moderator, Admin

### Äiá»u kiá»‡n trÆ°á»›c

- Generated exercise á»Ÿ tráº¡ng thÃ¡i approved.
- ChÆ°a publish.
- Lesson tá»“n táº¡i.
- Content há»£p lá»‡.

### Luá»“ng chÃ­nh

1. Táº¡o record trong `exercises`.
2. Táº¡o `exercise_options`.
3. Táº¡o `exercise_solutions`.
4. LiÃªn káº¿t `publishedExerciseId`.
5. Chuyá»ƒn generated exercise thÃ nh published.
6. Ghi review/audit log.

### Quy táº¯c nghiá»‡p vá»¥

- Thá»±c hiá»‡n trong transaction.
- KhÃ´ng táº¡o exercise trÃ¹ng.
- Pending hoáº·c rejected khÃ´ng Ä‘Æ°á»£c publish.

---

# 15. Profile Module

## F-PROFILE-01 â€” Xem há»“ sÆ¡ cÃ¡ nhÃ¢n

**Má»©c Æ°u tiÃªn:** P0  
**Actor:** Learner, Moderator, Admin

### Ná»™i dung

- Username.
- Email.
- Role.
- NgÃ y táº¡o tÃ i khoáº£n.
- Thá»‘ng kÃª há»c táº­p cÆ¡ báº£n náº¿u lÃ  Learner.

### Quy táº¯c nghiá»‡p vá»¥

- User chá»‰ xem profile cá»§a mÃ¬nh qua endpoint thÃ´ng thÆ°á»ng.
- Admin dÃ¹ng endpoint riÃªng khi quáº£n lÃ½ user.

---

## F-PROFILE-02 â€” Cáº­p nháº­t username

**Má»©c Æ°u tiÃªn:** P1  
**Actor:** Authenticated user

### Quy táº¯c nghiá»‡p vá»¥

- Username Ä‘Ãºng validation.
- Username khÃ´ng báº¯t buá»™c unique trong MVP.
- KhÃ´ng update role.
- KhÃ´ng update active status.
- KhÃ´ng update user ID.

---

# 16. Admin Module

## F-ADMIN-01 â€” Xem danh sÃ¡ch ngÆ°á»i dÃ¹ng

**Má»©c Æ°u tiÃªn:** P1  
**Actor:** Admin

### Chá»©c nÄƒng

- Pagination.
- Search theo email hoáº·c username.
- Filter theo role.
- Filter theo active status.

### API liÃªn quan

```text
GET /api/admin/users
```

---

## F-ADMIN-02 â€” Thay Ä‘á»•i role

**Má»©c Æ°u tiÃªn:** P1  
**Actor:** Admin

### Quy táº¯c nghiá»‡p vá»¥

- Role há»£p lá»‡:
  - learner.
  - moderator.
  - admin.
- KhÃ´ng cÃ³ role Guest.
- Ghi audit log.
- CÃ³ thá»ƒ ngÄƒn háº¡ quyá»n admin cuá»‘i cÃ¹ng.

### API liÃªn quan

```text
PATCH /api/admin/users/:userId/role
```

---

## F-ADMIN-03 â€” KÃ­ch hoáº¡t hoáº·c vÃ´ hiá»‡u hÃ³a tÃ i khoáº£n

**Má»©c Æ°u tiÃªn:** P1  
**Actor:** Admin

### Quy táº¯c nghiá»‡p vá»¥

- Æ¯u tiÃªn deactivate thay vÃ¬ xÃ³a.
- Inactive user khÃ´ng truy cáº­p route private.
- Ghi audit log.

### API liÃªn quan

```text
PATCH /api/admin/users/:userId/status
```

---

## F-ADMIN-04 â€” Äáº·t láº¡i máº­t kháº©u

**Má»©c Æ°u tiÃªn:** P2  
**Actor:** Admin hoáº·c chÃ­nh user qua Supabase flow

### LÆ°u Ã½

KhÃ´ng tá»± táº¡o hoáº·c hiá»ƒn thá»‹ password má»›i trong database á»©ng dá»¥ng.

Æ¯u tiÃªn dÃ¹ng Supabase password reset flow.

---

## F-ADMIN-05 â€” Xem tráº¡ng thÃ¡i há»‡ thá»‘ng

**Má»©c Æ°u tiÃªn:** P2  
**Actor:** Admin

### Ná»™i dung tá»‘i thiá»ƒu

- Database connected/unavailable.
- Application status.
- AI provider status náº¿u kiá»ƒm tra riÃªng.
- Timestamp.

KhÃ´ng hiá»ƒn thá»‹ secret hoáº·c lá»—i ná»™i bá»™ chi tiáº¿t.

---

# 17. System Module

## F-SYSTEM-01 â€” Health check

**Má»©c Æ°u tiÃªn:** P1  
**Actor:** System, Developer

### API liÃªn quan

```text
GET /api/system/health
```

### Response

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "..."
}
```

### Quy táº¯c nghiá»‡p vá»¥

- KhÃ´ng tráº£ database URL.
- KhÃ´ng tráº£ API key.
- KhÃ´ng gá»i AI provider á»Ÿ basic health check.

---

## F-SYSTEM-02 â€” Audit log

**Má»©c Æ°u tiÃªn:** P1  
**Actor:** System, Admin

### Sá»± kiá»‡n cáº§n log

- Change role.
- Activate/deactivate account.
- Approve/reject exercise.
- Publish exercise.
- TÃ¡c vá»¥ dÃ¹ng service role cÃ³ áº£nh hÆ°á»Ÿng dá»¯ liá»‡u.

### Quy táº¯c nghiá»‡p vá»¥

- Log Ä‘Æ°á»£c ghi server-side.
- User thÆ°á»ng khÃ´ng Ä‘Æ°á»£c táº¡o, sá»­a hoáº·c xÃ³a log.
- Má»—i log cÃ³ actor, action, target, metadata an toÃ n vÃ  timestamp.
- KhÃ´ng lÆ°u password, token, cookie, API key hoáº·c secret.
- Admin mutation vÃ  publish khÃ´ng Ä‘Æ°á»£c báº­t náº¿u audit storage báº¯t buá»™c chÆ°a tá»“n táº¡i.

---

# 18. Feature dependencies

```text
Authentication
  â””â”€â”€ Profile

Course Catalog
  â””â”€â”€ Enrollment
        â””â”€â”€ Roadmap
              â””â”€â”€ Lesson
                    â””â”€â”€ Exercise
                          â””â”€â”€ Submission
                                â”œâ”€â”€ Progress
                                â””â”€â”€ AI Explanation

PDF Source
  â””â”€â”€ Extract
        â””â”€â”€ Course Outline
              â””â”€â”€ Admin Outline Review
                    â””â”€â”€ Lesson Content Generation
                          â””â”€â”€ Admin Course Review
                                â””â”€â”€ Atomic Course Publish

Published/Approved Lesson
  â””â”€â”€ Exercise Generation
        â””â”€â”€ Exercise Draft Review
              â””â”€â”€ Publish Exercise

Authentication
  â””â”€â”€ Role Authorization
        â”œâ”€â”€ Moderator
        â””â”€â”€ Admin
```

AI agent pháº£i triá»ƒn khai theo dependency.

VÃ­ dá»¥:

- KhÃ´ng lÃ m Roadmap trÆ°á»›c khi cÃ³ Enrollment vÃ  Progress model.
- KhÃ´ng lÃ m AI Explanation trÆ°á»›c khi cÃ³ Submission.
- KhÃ´ng generate Lesson content trÆ°á»›c khi Admin cháº¥p thuáº­n outline.
- KhÃ´ng publish Course trÆ°á»›c khi Course/Lesson review hoÃ n táº¥t.
- KhÃ´ng publish Exercise trÆ°á»›c khi cÃ³ Generated Exercise vÃ  Exercise review.
- KhÃ´ng lÃ m Admin role change trÆ°á»›c khi cÃ³ server-side authorization.

---

# 19. MVP scope

## 19.1 Báº¯t buá»™c

- Register.
- Login.
- Logout.
- Profile cÆ¡ báº£n.
- Course list.
- Course detail.
- Enrollment.
- Roadmap.
- Lesson content.
- Predict the Output.
- Fix the Bug.
- Submission.
- Correct/Incorrect feedback.
- Retry sau Ä‘Ã¡p Ã¡n sai.
- Progress.
- Unlock next lesson.
- AI explanation.
- Role authorization.
- RLS.
- Deployment cÆ¡ báº£n.
- Playwright cho critical flow.

## 19.2 Operations Extension / NÃªn cÃ³

- Search course.
- Submission history.
- AI explanation history.
- Import Course tá»« PDF qua outline review vÃ  Course review.
- AI exercise generation cho má»™t Lesson.
- Exercise draft review vÃ  publish.
- Admin user management.
- Audit log.
- Health check.

## 19.3 NgoÃ i MVP

- Mobile native app.
- Offline learning.
- Payment.
- Subscription.
- Nhiá»u ngÃ´n ngá»¯ láº­p trÃ¬nh.
- Code execution sandbox.
- IDE hoÃ n chá»‰nh.
- Social network.
- Leaderboard phá»©c táº¡p.
- Real-time multiplayer.
- RAG.
- Automatic AI publishing.
- Microservices.
- Advanced analytics.

---

# 20. Feature implementation template

Gemini/Antigravity khÃ´ng giao trá»±c tiáº¿p toÃ n bá»™ feature lá»›n cho Codex náº¿u feature chÆ°a Ä‘á»§ nhá».

Task packet pháº£i dÃ¹ng máº«u:

```markdown
# TASK-XXX â€” TÃªn task

## Status
READY

## Owner
Codex

## Reviewer
Gemini / Antigravity

## Feature ID
F-...

## Objective
Má»™t má»¥c tiÃªu duy nháº¥t vÃ  cÃ³ thá»ƒ kiá»ƒm tra.

## Dependencies
- TASK-...

## Required context
- `AGENTS.md`
- `CODEX.md`
- `docs/features.md`
- CÃ¡c tÃ i liá»‡u chuyÃªn biá»‡t liÃªn quan

## Current state
Code hoáº·c contract hiá»‡n cÃ³ liÃªn quan.

## In scope
- ...

## Out of scope
- ...

## Files allowed to change
- ...

## Files not allowed to change
- ...

## Implementation requirements
- ...

## API requirements
- ...

## Database requirements
- ...

## Security requirements
- ...

## UI requirements
- ...

## Tests required
- ...

## Acceptance criteria
- [ ] ...

## Required commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Expected handoff
- Implementation Report
- Files changed
- Commands executed
- Test results
- Known limitations
```

CÃ¡c má»¥c khÃ´ng liÃªn quan ghi `Not applicable`.

Codex khÃ´ng Ä‘Æ°á»£c báº¯t Ä‘áº§u náº¿u thiáº¿u:

- Objective.
- Files allowed to change.
- Acceptance criteria.
- Required commands.

Feature cÃ³ database change pháº£i xÃ¡c Ä‘á»‹nh migration, generated types, RLS vÃ  test trÆ°á»›c khi chuyá»ƒn `READY`.

---

# 21. Definition of Done chung

Codex chá»‰ Ä‘Æ°á»£c chuyá»ƒn implementation sang `READY_FOR_REVIEW` khi:

- ÄÃºng feature/task objective.
- KhÃ´ng thÃªm chá»©c nÄƒng ngoÃ i In scope.
- Chá»‰ sá»­a `Files allowed to change`.
- UI Ä‘Ãºng `ui.md` vÃ  design reference Ä‘Ã£ duyá»‡t.
- API Ä‘Ãºng `api_contract.md`.
- Database Ä‘Ãºng `database.md`.
- PhÃ¢n quyá»n Ä‘Ãºng `security.md`.
- Code Ä‘Ãºng `coding_standards.md`.
- CÃ³ test Ä‘Ãºng `testing.md`.
- CÃ³ loading, empty vÃ  error state khi phÃ¹ há»£p.
- KhÃ´ng lá»™ secret.
- KhÃ´ng lá»™ solution.
- TypeScript khÃ´ng lá»—i.
- Lint thÃ nh cÃ´ng.
- Unit/integration test liÃªn quan thÃ nh cÃ´ng.
- Build thÃ nh cÃ´ng.
- E2E thÃ nh cÃ´ng náº¿u task yÃªu cáº§u.
- Documentation Ä‘Æ°á»£c cáº­p nháº­t náº¿u behavior hoáº·c contract thay Ä‘á»•i.
- Implementation Report ghi Ä‘Ãºng command vÃ  káº¿t quáº£ tháº­t.

Gemini/Antigravity chá»‰ Ä‘Ã¡nh dáº¥u `VERIFIED` khi:

- Review diff thá»±c táº¿.
- KhÃ´ng cÃ³ thay Ä‘á»•i ngoÃ i scope.
- KhÃ´ng cÃ²n finding Critical, High hoáº·c Medium.
- Required commands Ä‘Æ°á»£c cháº¡y Ä‘á»™c láº­p hoáº·c cÃ³ báº±ng chá»©ng Ä‘áº§y Ä‘á»§.
- Acceptance criteria Ä‘á»u Ä‘áº¡t.

Task chá»‰ chuyá»ƒn `DONE` sau khi Ä‘Ã£ `VERIFIED` vÃ  Ä‘Æ°á»£c ngÆ°á»i dÃ¹ng cháº¥p nháº­n hoáº·c merge.

---

# 22. Quy táº¯c dÃ nh cho AI Agent

## 22.1 Context theo task

Má»i agent pháº£i Ä‘á»c:

```text
AGENTS.md
file theo vai trÃ²: CODEX.md hoáº·c GEMINI.md
task packet Ä‘ang hoáº¡t Ä‘á»™ng
Required context
source file liÃªn quan trá»±c tiáº¿p
```

KhÃ´ng báº¯t buá»™c Ä‘á»c toÃ n bá»™ tÃ i liá»‡u cho má»i task.

Planner pháº£i Ä‘Æ°a `features.md` vÃ o context khi task thay Ä‘á»•i hÃ nh vi nghiá»‡p vá»¥.

## 22.2 Workflow thá»§ cÃ´ng

Codex Ä‘Æ°á»£c dÃ¹ng dÆ°á»›i dáº¡ng extension Ä‘á»™c láº­p.

KhÃ´ng cÃ³ automation bridge giá»¯a Gemini vÃ  Codex.

```text
Gemini táº¡o task packet
â†’ ngÆ°á»i dÃ¹ng chuyá»ƒn task sang Codex
â†’ Codex implement + test + report
â†’ ngÆ°á»i dÃ¹ng yÃªu cáº§u Gemini review
â†’ Gemini tráº£ PASS hoáº·c FIX_REQUIRED
```

Gemini khÃ´ng Ä‘Æ°á»£c giáº£ vá» Ä‘Ã£ tá»± gá»­i task cho Codex.

Codex khÃ´ng Ä‘Æ°á»£c tá»± chá»n task tiáº¿p theo.

## 22.3 Planner

Gemini/Antigravity pháº£i:

1. Chá»n Ä‘Ãºng feature ID.
2. Kiá»ƒm tra dependency.
3. Chia feature thÃ nh task nhá».
4. XÃ¡c Ä‘á»‹nh Required context.
5. KhÃ³a In scope vÃ  Out of scope.
6. KhÃ³a Files allowed to change.
7. XÃ¡c Ä‘á»‹nh acceptance criteria vÃ  test.
8. Dá»«ng náº¿u API, database hoáº·c business rule chÆ°a rÃµ.

## 22.4 Implementer

Codex pháº£i:

1. Chá»‰ lÃ m má»™t task `READY`.
2. KhÃ´ng tá»± thÃªm role, table, endpoint, enum hoáº·c status.
3. KhÃ´ng tá»± Ä‘á»•i tÃªn field.
4. KhÃ´ng Ä‘á»•i kiáº¿n trÃºc Ä‘á»ƒ tiá»‡n code.
5. KhÃ´ng lÃ m P1/P2 náº¿u task chá»‰ yÃªu cáº§u P0.
6. KhÃ´ng bá» validation, authentication, authorization hoáº·c ownership check.
7. KhÃ´ng tráº£ exercise solution cho client.
8. KhÃ´ng gá»i AI tá»« browser.
9. KhÃ´ng dÃ¹ng production database cho test.
10. Viáº¿t test cÃ¹ng implementation.
11. BÃ¡o file, command, káº¿t quáº£ vÃ  giá»›i háº¡n.
12. Chá»‰ tráº£ `READY_FOR_REVIEW`, `FIXED_FOR_REVIEW` hoáº·c `BLOCKED`.

## 22.5 Reviewer/Tester

Gemini/Antigravity pháº£i:

1. Review diff thá»±c táº¿.
2. Kiá»ƒm tra scope, architecture, API, database, security, UI vÃ  test.
3. KhÃ´ng tá»± sá»­a code trong cÃ¹ng vÃ²ng review.
4. Ghi finding cá»¥ thá»ƒ.
5. Cháº¡y quality gate khi mÃ´i trÆ°á»ng cho phÃ©p.
6. Chá»‰ tráº£ PASS khi khÃ´ng cÃ²n finding cháº·n.

## 22.6 MCP

- `context`: tÃ¬m file vÃ  symbol.
- `context7`: tra API Ä‘Ãºng package/version.
- `StitchMCP`: táº¡o reference theo `ui.md`, khÃ´ng quyáº¿t Ä‘á»‹nh business rule.
- `supabase`: Æ°u tiÃªn local/read-only; schema change pháº£i cÃ³ migration.
- `playwright`: reproduce vÃ  review UI; khÃ´ng thay tháº¿ E2E test Ä‘Æ°á»£c commit.
- `github-mcp-server`: máº·c Ä‘á»‹nh read-only; khÃ´ng tá»± merge, push hoáº·c thay settings.

Náº¿u thiáº¿u quyáº¿t Ä‘á»‹nh quan trá»ng, agent pháº£i tráº£ `BLOCKED`, khÃ´ng tá»± phÃ¡t minh.

---

# 23. Thá»© tá»± triá»ƒn khai gá»£i Ã½

Thá»© tá»± task chi tiáº¿t Ä‘Æ°á»£c quáº£n lÃ½ trong `TASKS.md`.

## Phase 0 â€” Documentation vÃ  Agent Workflow

- KhÃ³a requirements, architecture vÃ  feature scope.
- KhÃ³a database, API vÃ  security contract.
- KhÃ³a `AGENTS.md`, `CODEX.md`, `GEMINI.md`.
- KhÃ³a `ui.md`, `TASKS.md`, `ROADMAP.md`.
- Cross-document review.

## Phase 1 â€” Project Foundation

- Bootstrap Next.js.
- TypeScript strict.
- ESLint vÃ  Prettier.
- Vitest.
- Playwright.
- Supabase local.
- Environment validation.
- CI quality gates.
- API result vÃ  error foundation.

ChÆ°a triá»ƒn khai feature nghiá»‡p vá»¥ trong phase nÃ y.

## Phase 2 â€” Database vÃ  Auth Foundation

- Database migrations.
- Constraints vÃ  indexes.
- RLS policies.
- Transaction/RPC foundation.
- Seed.
- Generated Supabase types.
- Browser/server Supabase clients.
- Session, `requireUser` vÃ  role helpers.

## Phase 3 â€” Authentication vÃ  Learning Core

- F-AUTH-01.
- F-AUTH-02.
- F-AUTH-03.
- F-PROFILE-01.
- F-COURSE-01.
- F-COURSE-03.
- F-ENROLL-01.
- F-ROADMAP-01.
- F-LESSON-01.
- F-LESSON-02.

## Phase 4 â€” Exercise, Submission vÃ  Progress

- F-EXERCISE-01.
- F-EXERCISE-02.
- F-EXERCISE-03.
- F-EXERCISE-04.
- F-SUBMISSION-01.
- F-PROGRESS-01.
- F-PROGRESS-02.
- F-ROADMAP-02.

## Phase 5 â€” AI Mentor

- AI provider interface vÃ  mock provider.
- Prompt builder.
- Response validator.
- Timeout, rate limit vÃ  fallback.
- F-AI-01.
- F-AI-02 náº¿u Ä‘Æ°á»£c chá»n.

## Phase 6 â€” Operations Extension

- F-AICOURSE-01.
- F-AICOURSE-02.
- F-AIEXERCISE-01.
- F-AIEXERCISE-02 (bao gá»“m capability F-MOD-01/02/03 lá»‹ch sá»­).
- F-ADMIN-01.
- F-ADMIN-02.
- F-ADMIN-03.
- F-SYSTEM-01.
- F-SYSTEM-02.

Operations Extension chá»‰ triá»ƒn khai sau Core Learning MVP vÃ  khi ngÆ°á»i dÃ¹ng xÃ¡c nháº­n scope.

## Phase 7 â€” Hardening vÃ  Deployment

- Full RLS/security regression.
- Critical-flow Playwright.
- Accessibility review.
- Performance review.
- Preview deployment.
- Production checklist.
- Production deploy chá»‰ khi ngÆ°á»i dÃ¹ng yÃªu cáº§u rÃµ.

---

# 24. Káº¿t luáº­n

CÃ¡c feature Ä‘Æ°á»£c tá»• chá»©c theo module Ä‘á»™c láº­p nhÆ°ng cÃ³ dependency rÃµ rÃ ng.

