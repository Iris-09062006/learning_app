# Feature Specification: Topic-Based Multi-Source Course Creation

**Feature Identity**: `001-topic-course-research` (planning artifacts currently live on Git branch
`agent/update-project-guidance`; no dedicated feature branch was created by a hook)

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "Allow an Admin to create an AI-generated Course from a topic by researching, reviewing, selecting, and ingesting multiple web, URL, and optional document sources while preserving the existing outline, Lesson review, publication, and separate Exercise flows."

## Clarifications

### Session 2026-08-13

- Q: Which capacity profile should govern each research round and Course? → A: Show up to 20 research results per round and allow up to 8 selected sources per Course.
- Q: When should the selected source set become locked against removal or replacement? → A: Allow source changes before Continue, require a new outline revision after every source change, and lock the approved evidence set at Continue.
- Q: When the Admin chooses Research More, how should the candidate list change? → A: Append new unique results, preserve current selections, and keep at most 20 candidates visible.
- Q: What source and scoring information should learners see with published Lesson citations? → A: Add no new learner citation UI; show full source provenance and authority/relevance scores only to Admins.
- Q: Which web-acquisition policy should apply to topic research and URL ingestion? → A: Use Vietnamese-first, topic/source-language-aware research; preserve retry, manual URL, and file-upload fallbacks during provider outages; accept readable HTML or plain-text pages up to 2 MiB.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Research a Topic and Choose Evidence (Priority: P1)

An Admin enters a topic instead of uploading a PDF, requests research, reviews the resulting web sources, and explicitly selects the sources that may become evidence for the Course. The Admin can select and unselect candidates before ingestion, and no unselected candidate is retained as Course evidence.

**Why this priority**: This is the defining user value of the feature: Course creation can begin from an idea while the Admin remains responsible for choosing the evidence.

**Independent Test**: Enter a valid topic, receive reviewable research results, change the selection, and verify that only the final selection proceeds to ingestion without requiring a file.

**Acceptance Scenarios**:

1. **Given** an authorized Admin on the Course creation screen with no uploaded document, **When** the Admin enters a valid topic and starts research, **Then** the Admin sees a reviewable list of candidate web sources relevant to that topic.
2. **Given** research results are displayed, **When** the Admin selects and unselects candidates, **Then** the interface clearly reflects the current selection and does not ingest any candidate merely because it appeared in the results.
3. **Given** the Admin has selected one or more candidates, **When** the Admin confirms ingestion, **Then** only the sources selected at confirmation are submitted as Course evidence.
4. **Given** no candidate is selected, **When** the Admin attempts to continue to ingestion or outline generation, **Then** the system prevents the action and explains that at least one usable source is required.
5. **Given** research returns no usable results or is temporarily unavailable, **When** the result is shown, **Then** the Admin receives a clear, recoverable outcome and may retry, add a URL, or upload a document without losing the entered topic.
6. **Given** research results and source selections are already displayed, **When** the Admin chooses Research More, **Then** new unique candidates are appended, existing selections are preserved, and no more than 20 candidates are visible.
7. **Given** an Admin enters a Vietnamese topic or a topic associated with useful sources in another language, **When** research runs, **Then** discovery prioritizes Vietnamese while also allowing relevant queries and sources in languages indicated by the topic or source context.

---

### User Story 2 - Build an Outline from Multiple Reviewed Sources (Priority: P1)

An Admin ingests the selected sources as fixed evidence and generates one Course outline using multiple sources. The generated outline identifies its supporting evidence without confusing similarly numbered portions from different sources.

**Why this priority**: Topic research creates value only when the selected evidence can reliably produce a traceable, multi-source Course outline.

**Independent Test**: Select at least two sources, ingest them, generate an outline, and verify that the outline uses only those sources and retains distinguishable citations to both.

**Acceptance Scenarios**:

1. **Given** the Admin selected at least two usable sources, **When** ingestion succeeds, **Then** each selected web page is represented by an immutable snapshot and the sources are shown as attached evidence for one Course import.
2. **Given** multiple sources have been ingested, **When** the Admin generates the outline, **Then** one editable Course outline is produced from the attached evidence without requiring a PDF.
3. **Given** two sources contain portions with the same source-local position or number, **When** the outline cites them, **Then** each citation remains associated with the correct source.
4. **Given** the generated outline draws on multiple sources, **When** the Admin reviews its Lessons, **Then** the supporting source for each citation can be distinguished by source identity and source-local location.
5. **Given** a candidate was not selected or failed ingestion, **When** the outline is generated, **Then** that candidate's content is not used or cited.

---

### User Story 3 - Add Manual and File Sources (Priority: P2)

An Admin may supplement or replace discovered results by adding a specific web URL and/or uploading a supported document. Neither option is mandatory for topic-based Course creation.

**Why this priority**: Admins need control over known authoritative materials and internal documents, while the topic-only path must remain complete on its own.

**Independent Test**: Start with a topic, add a manual URL and a supported file independently and together, then verify that each can be reviewed and included without making the other mandatory.

**Acceptance Scenarios**:

1. **Given** an Admin is reviewing sources, **When** the Admin adds a valid public web URL, **Then** the page is presented as a source for review and is not evidence until the Admin chooses to ingest it.
2. **Given** an Admin is reviewing sources, **When** the Admin uploads a supported document, **Then** the document can be included alongside web sources in the same Course import.
3. **Given** an Admin has usable selected web sources and no uploaded file, **When** the Admin continues, **Then** Course creation proceeds without requiring a PDF or any other file.
4. **Given** an Admin has only a supported uploaded document, **When** the Admin follows the existing file-only path, **Then** the existing PDF/document-to-Course behavior remains available.
5. **Given** an entered URL is invalid, unsupported, unsafe, unreachable, or does not yield usable content, **When** ingestion is attempted, **Then** the system rejects that source with a clear source-specific error and does not treat it as Course evidence.
6. **Given** discovered sources, a manual URL, and an uploaded document are all available, **When** the Admin selects them within the Course source limit, **Then** all three source origins can coexist in the same Course import.
7. **Given** a URL returns content other than readable HTML or plain text, or its retrieved page exceeds 2 MiB, **When** ingestion is attempted, **Then** that URL fails with a source-specific explanation and the Admin may use another source or the existing file-upload path.

---

### User Story 4 - Recover from Source Ingestion Failures (Priority: P2)

An Admin can see which selected sources succeeded or failed during ingestion and can remove or retry failed sources without losing successful sources or restarting the entire Course creation flow.

**Why this priority**: Web sources are inherently unreliable; partial failure must not make the workflow fragile or cause accidental evidence use.

**Independent Test**: Ingest a selection containing one successful source and one failing source, then remove or retry the failure and continue using the successful source.

**Acceptance Scenarios**:

1. **Given** several selected sources are being ingested, **When** one source fails, **Then** the failed source is identified separately and every successful source remains available.
2. **Given** a failed source is displayed, **When** the Admin removes it, **Then** it is excluded from the Course evidence and the remaining successful sources are preserved.
3. **Given** a failed source is retryable, **When** the Admin retries it, **Then** the system attempts that source again without duplicating successful sources or creating a duplicate Course import.
4. **Given** at least one usable source remains after failures, **When** the Admin continues, **Then** outline generation may proceed using only the successfully ingested evidence.
5. **Given** all selected sources fail, **When** ingestion completes, **Then** outline generation is unavailable and the Admin is guided to retry, remove, or add sources.

---

### User Story 5 - Review, Publish, and Preserve Existing Flows (Priority: P1)

After multi-source outline generation, an Admin uses the existing editable outline review, Continue action, Lesson generation, content review, and Course publication journey. Exercise generation remains a separate action performed for individual published Lessons.

**Why this priority**: The new entry path must extend the proven production workflow without weakening review, history, publication safety, or downstream learner behavior.

**Independent Test**: Complete a topic-based multi-source Course from outline editing through publication, then verify the published Lessons and separate Exercise workflow behave as before.

**Acceptance Scenarios**:

1. **Given** a generated multi-source outline, **When** the Admin edits Course or Lesson details, adds/removes/reorders Lessons, or saves the outline, **Then** the outline remains editable using the existing review capabilities and each saved version preserves prior revisions.
2. **Given** an outline exists but the Admin has not used Continue, **When** the Admin changes the selected source set, **Then** the prior outline revision remains unchanged and the Admin must generate a new outline revision from the updated sources before continuing.
3. **Given** an Admin has an acceptable outline based on the current selected sources, **When** the Admin uses Continue, **Then** the current outline and its evidence set are approved and locked for existing Lesson generation with no additional approval workflow.
4. **Given** Lesson content has been generated, **When** the Admin edits, regenerates, reviews, requests revision, rejects, or publishes as currently permitted, **Then** the existing content-review behavior remains available and citations remain tied to the reviewed evidence.
5. **Given** the Course is ready to publish, **When** the Admin publishes it, **Then** the complete Course is published once as a consistent unit; retrying after a completed publication does not create duplicate published Courses or Lessons.
6. **Given** a Course has been published from multiple sources, **When** its Lessons are viewed, **Then** the published Course, Chapter, Lesson, learner access, enrollment, and progress behavior remain consistent with existing Courses.
7. **Given** a Lesson from the new Course is published, **When** an authorized user starts Exercise generation, **Then** the existing per-Lesson Exercise generation, moderation, and publication flow remains separate and unchanged.
8. **Given** an existing PDF-only import or previously published Course, **When** the new feature becomes available, **Then** the import remains usable and the historical Course, revisions, citations, and publication records are not rewritten.
9. **Given** a Course created from multiple sources is published, **When** a learner views its Lessons, **Then** the learner citation experience remains unchanged and internal source-ranking scores are not shown.

### Edge Cases

- The topic is empty, only whitespace, too short to express useful intent, or excessively long.
- Research returns duplicate or equivalent URLs, unsupported URL schemes, malformed entries, or results lacking useful titles or summaries.
- Research More would exceed 20 visible candidates; selected candidates remain visible and duplicate or lower-priority unselected candidates do not displace them.
- The search provider is unavailable after the Admin has entered a topic or selected candidates; existing work remains intact and manual URL/file fallbacks remain usable.
- The Admin changes selection repeatedly, starts ingestion twice, refreshes during ingestion, or retries after an uncertain response.
- A page redirects, changes while being fetched, becomes unavailable, contains no meaningful main content, or exceeds accepted source limits.
- A page is larger than 2 MiB or is not delivered as readable HTML or plain text.
- A web page contains instructions intended to manipulate the Course-generation process; such page content remains untrusted evidence and cannot override Admin or system rules.
- A file is unsupported, empty, too large, corrupt, encrypted, or cannot be extracted.
- One source succeeds while one or more other selected sources fail.
- The Admin attempts to remove the only remaining usable source, change sources without generating a replacement outline revision, or change the locked evidence set after Continue.
- Multiple attached sources contain identically numbered portions; citations must still resolve to the correct source.
- The combined evidence is larger than can reasonably be used in one generation request; the outcome must remain deterministic, traceable, and source-aware rather than silently favoring one source.
- Outline or Lesson generation fails after all sources were ingested; a retry must reuse the same immutable evidence rather than fetching live pages again.
- Publication is retried after an uncertain response or after success; the result must not contain duplicate Course, Chapter, or Lesson records.
- Existing unpublished PDF imports and existing published Courses are opened after rollout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow an authorized Admin to start Course creation by entering a topic without uploading a document.
- **FR-002**: The system MUST keep existing authorization rules for Course creation and review.
- **FR-003**: The system MUST validate topic input and provide a clear correction message when it cannot be researched.
- **FR-003A**: Topic research MUST prioritize Vietnamese queries while also using topic- or source-language-aware discovery when another language is relevant; results MUST NOT be restricted to Vietnamese-only sources.
- **FR-004**: The system MUST return no more than 20 reviewable web-source candidates per research round relevant to the submitted topic.
- **FR-004A**: Research More MUST append unique candidates to the existing list, preserve current selections, and keep at most 20 candidates visible, with selected candidates retained when the limit is reached.
- **FR-004B**: If the search provider is unavailable, the system MUST preserve the Admin's current topic, candidates, and selections, provide a retry option, and keep manual URL and file-upload paths available.
- **FR-005**: Each research candidate MUST show enough provenance for an Admin to make a selection decision, including a title, web location or domain, summary, and any available ranking or relevance indicator.
- **FR-006**: Research results MUST remain candidates only and MUST NOT become stored Course evidence before explicit Admin selection and ingestion.
- **FR-007**: The Admin MUST be able to select and unselect individual research candidates before ingestion.
- **FR-007A**: The system MUST allow no more than 8 selected sources for one Course and MUST explain the limit when the Admin attempts to exceed it.
- **FR-008**: The system MUST require at least one successfully ingested source before outline generation.
- **FR-009**: The Admin MUST be able to add a public web URL as a candidate source.
- **FR-010**: A manually added URL MUST be reviewed and explicitly included under the same evidence-selection rules as discovered results.
- **FR-011**: The Admin MUST be able to optionally upload any document type supported by the existing Course-import flow.
- **FR-011A**: Discovered web sources, manually added URLs, and uploaded documents MUST be allowed to coexist within the same Course's eight-source limit.
- **FR-012**: Topic-based Course creation MUST NOT require a PDF or any uploaded file when at least one selected web source is successfully ingested.
- **FR-013**: Only sources in the Admin's final confirmed selection MUST be ingested as evidence for that Course import.
- **FR-014**: Each selected web page MUST be captured as an immutable snapshot before its content is eligible for outline or Lesson generation.
- **FR-014A**: URL ingestion MUST accept only readable HTML or plain-text page content no larger than 2 MiB; unsupported or oversized URL content MUST fail as an individual source without changing existing uploaded-document limits.
- **FR-015**: Retries of generation MUST use the already captured snapshot and MUST NOT silently replace it with newer live-page content.
- **FR-016**: The system MUST retain source-qualified identity and provenance for every evidence segment; FR-024 defines its collision behavior and FR-030 defines its durable citation behavior.
- **FR-017**: The system MUST treat all external source content as untrusted and MUST prevent source text from overriding Course-creation rules or gaining access to credentials, privileged actions, or unrelated data.
- **FR-018**: The system MUST show ingestion progress and a source-specific success or failure outcome for every selected source.
- **FR-019**: Failure of one source MUST NOT discard, duplicate, or invalidate other successfully ingested sources.
- **FR-020**: The Admin MUST be able to remove a failed source and retry an eligible failed source without restarting successful ingestion.
- **FR-021**: The system MUST prevent outline generation when no usable evidence remains.
- **FR-022**: The system MUST generate one Course outline using the successfully ingested sources attached to that Course import.
- **FR-023**: The generated outline MUST use and cite only evidence attached to the same Course import.
- **FR-024**: To satisfy FR-016, source references from different documents MUST remain unambiguous even when their source-local positions are identical; multi-source references MUST resolve through source identity to canonical evidence segments rather than a bare source-local position.
- **FR-025**: The existing Admin capabilities to edit Course metadata, edit Lesson metadata, add Lessons, remove Lessons, reorder Lessons, save revisions, and regenerate the outline MUST remain available.
- **FR-026**: Every saved or regenerated outline MUST preserve the existing immutable revision history; historical revisions MUST NOT be changed in place.
- **FR-026A**: Before Continue, the Admin MAY change the selected source set after an outline exists, but the system MUST require a new outline revision generated from the updated source set before Continue becomes available.
- **FR-027**: The existing Continue action MUST remain the approval checkpoint for the current outline and the start of Lesson generation, and it MUST lock that outline's evidence set against later source addition, removal, or replacement.
- **FR-028**: Lesson generation and regeneration MUST use only the evidence approved for each Lesson in the approved outline revision.
- **FR-029**: Existing Lesson-content editing, regeneration, citation retention, Course-level review, rejection, revision request, and publication behavior MUST remain available.
- **FR-030**: Building on FR-016 and FR-024, persisted citations MUST remain durable and tied to the correct canonical segment of immutable source evidence; this requirement governs persistence and review history rather than introducing another identity format.
- **FR-030A**: During Admin review, citation provenance MUST identify the source title, domain or URL, source-local location, and retained excerpt when available.
- **FR-030B**: Authority and relevance scores MUST be visible only to authorized Admins and MUST NOT be presented to learners.
- **FR-030C**: This feature MUST NOT add or change learner-facing citation presentation.
- **FR-031**: Course publication MUST remain atomic and idempotent so that partial or repeated publication attempts do not create incomplete or duplicate published curriculum.
- **FR-032**: Publication MUST preserve the exact reviewed outline and Lesson-content revisions used for the published Course.
- **FR-033**: Existing PDF/document-only Course imports MUST continue to complete their current upload, extraction, outline review, Lesson review, and publication journey without requiring topic research.
- **FR-034**: Existing unpublished imports MUST remain readable and actionable without rewriting their stored revisions or citations.
- **FR-035**: Existing published Courses and their Course, Chapter, Lesson, citation, enrollment, progress, and publication history MUST NOT be rewritten by this feature.
- **FR-036**: Exercise generation MUST remain a separate per-published-Lesson workflow and MUST NOT be triggered as part of topic research, source ingestion, Course outline generation, or Course publication.
- **FR-037**: Existing Exercise generation, moderation, publication, private solution handling, and learner-visible Exercise behavior MUST remain unchanged.
- **FR-038**: The system MUST NOT require semantic embeddings, vector search, or automated site crawling to deliver this feature.
- **FR-039**: The system MUST preserve successfully selected and ingested sources across recoverable retries so the Admin does not create duplicate evidence or duplicate Course imports.
- **FR-040**: The system MUST prevent source changes after Continue and MUST preserve all evidence relationships used by an approved outline, reviewed Lesson content, or published history.

### Key Entities

- **Topic**: The Admin's description of the subject to research; it starts discovery but is not itself Course evidence.
- **Research Candidate**: A reviewable web result associated with a topic. It includes provenance and ranking information but is not evidence until selected and ingested.
- **Source**: A selected uploaded document or immutable snapshot of a web page that can serve as Course evidence.
- **Source Selection**: The Admin's current reviewed choice of candidates, manual URLs, and optional documents for one Course creation attempt.
- **Course Import**: The existing pre-publication Course workflow, extended to use one or more ordered Sources while retaining a primary legacy Source for compatibility.
- **Source Evidence Segment**: A stable portion of one Source used to support outline Lessons and Lesson content; its identity remains source-qualified.
- **Course Outline Revision**: An immutable, editable-at-the-workflow-level version of Course metadata, ordered Lessons, objectives, and their supporting evidence.
- **Lesson Content Revision**: An immutable reviewed version of generated Lesson content with durable citations to Source evidence.
- **Published Course**: The final Course, Chapter, and Lessons produced from the approved revisions through the existing publication workflow.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance testing, an Admin can complete the path from a topic with no file upload to an editable Course outline using at least two selected web sources.
- **SC-002**: In all selection tests, 100% of unselected research candidates are absent from ingested Course evidence and generated citations.
- **SC-003**: In all multi-source citation tests, every citation displayed to an Admin and every persisted citation resolves to the correct source even when different sources use the same source-local position.
- **SC-004**: In partial-failure testing, an Admin can continue with successful sources or retry/remove failed sources without losing successful ingestion or creating duplicate evidence.
- **SC-005**: In generation-retry testing, 100% of retries use the same immutable web snapshots unless the Admin explicitly removes and re-adds a source.
- **SC-006**: At least 90% of representative Admin test users can reach the editable outline from a topic on their first attempt without assistance.
- **SC-007**: For a selection of up to eight sources, the Admin receives a visible ingestion outcome for every source and reaches either an editable outline or an actionable error state within five minutes. Automated acceptance MUST verify this with controlled provider/fetch latencies at the configured upper bounds; unusually slow external websites are excluded from live smoke-test timing.
- **SC-008**: The established PDF/document-only Course-import acceptance journey completes with no additional required steps and no changed user-facing contract.
- **SC-009**: Repeated publication attempts for the same approved Course import produce exactly one published Course and one final Lesson per approved outline Lesson.
- **SC-010**: Existing acceptance coverage for Course outline editing, Lesson-content review, publication, learner access, enrollment, progress, Exercise generation, Exercise moderation, and Exercise publication remains passing.
- **SC-011**: Existing published Courses and historical draft revisions show no data or behavior changes after the feature is introduced.
- **SC-012**: Accessibility validation of the source-review interactions reports no serious violations, and selection, removal, retry, and continuation can be completed using a keyboard.

## Assumptions

- The feature is available only to the same authorized Admin role that owns the existing Course-import workflow.
- Topic research and independent source ingestion occur before an import is created. A new-path
  Course import begins only when one atomic job-centric initialization accepts the complete
  ordered set of currently usable selected sources; that set may contain a single source.
- One successfully ingested source is sufficient to proceed, although the feature supports multiple sources.
- Research ranking helps the Admin review candidates but never substitutes for explicit Admin selection.
- Search candidates that are never selected do not need to be retained as Course evidence or historical Course provenance.
- A manual URL and a discovered URL follow the same safety, snapshot, review, and evidence rules.
- Existing supported document types, file limits, and extraction behavior remain the defaults for optional uploads.
- Source addition, removal, or replacement is permitted only before Continue; any such change after an outline exists requires a new outline revision, while every prior revision remains unchanged.
- Citations remain part of the existing Course-import provenance and review model; this feature improves multi-source identity and display but does not redesign citations.
- Web-content usage, retention, and source-provider terms will follow approved product, legal, and security policy before production rollout.
- The existing Course import and Exercise pipelines remain separate; Exercises use published Lesson context rather than research sources.

## Scope Boundaries

### In Scope

- Topic entry and web-source research for Admin Course creation.
- Admin review, selection, and deselection of candidates.
- Manual URL and optional supported-document sources.
- Safe ingestion of selected sources as immutable evidence.
- Multi-source outline and Lesson generation within the existing review and publication journey.
- Source-qualified citation presentation and backward-compatible file-only imports.

### Out of Scope

- Replacing the existing Course-import workflow or its review checkpoints.
- Rewriting existing published Courses or historical outline/content revisions.
- Changing learner authentication, enrollment, progress, Course, Chapter, or Lesson behavior.
- Redesigning Exercise generation, moderation, publication, solutions, or learner delivery.
- Automated crawling of entire websites, embeddings, vector search, or semantic retrieval infrastructure.
- Automatically ingesting all research results without Admin review.
