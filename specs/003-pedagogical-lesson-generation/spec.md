# Feature Specification: Pedagogical Lesson Generation

**Feature Branch**: `003-pedagogical-lesson-generation`

**Created**: 2026-08-14

**Status**: Draft

**Input**: User description: "Improve Lesson quality by inserting evidence synthesis, pedagogical blueprinting, section generation, and quality review between approved per-Lesson evidence and the existing structured Lesson draft boundary, without changing persistence, publication, learner, Admin, Exercise, source-ingestion, or provider contracts."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate an Intentionally Taught Lesson (Priority: P1)

As an Admin preparing a Course, I want each Lesson generated from its approved evidence to follow an intentional learning progression so that learners receive instruction rather than a linear explanatory article.

**Why this priority**: Improving the instructional quality of generated Lessons is the feature's primary value.

**Independent Test**: Provide approved evidence containing concepts, prerequisites, a procedure, an example, and a misconception; generate the Lesson; verify that its ordered sections have distinct, appropriate teaching purposes and form a coherent progression while remaining within the approved Lesson intent.

**Acceptance Scenarios**:

1. **Given** an approved Lesson whose evidence supports prerequisite explanation, a core concept, and an example, **When** Lesson content is generated, **Then** the final sections introduce the prerequisite before the dependent concept and place the example where it reinforces that concept.
2. **Given** an approved Lesson whose evidence supports only a concise concept explanation and summary, **When** Lesson content is generated, **Then** the Lesson uses only the section purposes that fit that evidence and does not add artificial practice, misconceptions, or examples.
3. **Given** evidence that supports a procedure, **When** a procedure section is generated, **Then** it presents supported prerequisites, ordered steps, the expected result, and any supported common mistake in a teachable order.

---

### User Story 2 - Preserve Evidence and Citation Integrity (Priority: P1)

As an Admin reviewing generated curriculum, I want every teaching decision and final section to remain grounded in evidence already approved for that Lesson so that no unsupported or foreign content can enter the Course.

**Why this priority**: Pedagogical improvement is unacceptable if it weakens provenance, citation ownership, or scope control.

**Independent Test**: Generate a Lesson from a known set of source-qualified chunks that includes evidence gaps and similarly named foreign chunks; verify that all included claims and sections trace only to the allowed chunks, gaps are not invented away, and invalid references prevent persistence.

**Acceptance Scenarios**:

1. **Given** approved evidence with a known coverage gap, **When** the Lesson is generated, **Then** the system does not introduce unsupported facts merely to make the Lesson appear richer.
2. **Given** a generated section that refers to a missing, foreign, or ambiguous source reference, **When** the candidate is validated, **Then** the candidate is rejected and no new Lesson draft revision is persisted.
3. **Given** a valid final Lesson, **When** its citations are inspected, **Then** every section has at least one citation mapped to a canonical chunk approved for that exact Lesson.

---

### User Story 3 - Correct Quality Problems Before Review (Priority: P2)

As an Admin, I want detectable teaching-quality problems corrected before the draft reaches Course review so that I spend review time refining a viable Lesson instead of repairing avoidable structural defects.

**Why this priority**: A pre-persistence quality gate turns the multi-stage pipeline into a reliable improvement rather than additional generation steps without accountability.

**Independent Test**: Supply candidate sections containing duplication, unsupported claims, shallow coverage, and scope drift; verify that the quality gate identifies the defects, corrects affected sections when feasible, revalidates the full Lesson, and persists only a compliant result.

**Acceptance Scenarios**:

1. **Given** a candidate Lesson with one duplicated section and otherwise valid content, **When** quality review runs, **Then** correction is limited to the affected content where feasible and unrelated valid sections remain substantively unchanged.
2. **Given** a candidate Lesson that remains invalid after its bounded correction allowance, **When** generation concludes, **Then** no invalid draft is persisted and the existing Lesson-generation failure/retry behavior remains available.
3. **Given** a candidate Lesson that passes instructional, scope, and citation checks, **When** quality review completes, **Then** it is normalized into the existing structured draft and follows the existing persistence and Admin review flow.

---

### User Story 4 - Preserve Existing Admin and Learner Workflows (Priority: P2)

As an Admin or learner, I want the improved generation process to fit the current Course workflow so that no retraining, content migration, or learner-rendering change is required.

**Why this priority**: The feature is intentionally bounded to generation quality and must not destabilize completed Course, publication, learner, progress, or Exercise systems.

**Independent Test**: Complete the existing Continue, Lesson generation, Lesson-wide regeneration, Admin edit/review, publication, learner display, and Exercise flows using a pedagogically generated draft; verify that existing external behavior and stored contracts are unchanged.

**Acceptance Scenarios**:

1. **Given** an approved outline, **When** the Admin uses Continue, **Then** the existing per-Lesson generation and progress semantics remain unchanged from the Admin's perspective.
2. **Given** a generated Lesson ready for Admin review, **When** the Admin edits its title, summary, section heading, or Markdown body, **Then** the existing editing capabilities and restrictions remain unchanged.
3. **Given** an approved Course review, **When** the Course is published, **Then** ordered Lesson sections are serialized to the existing Markdown learner contract and downstream learner and Exercise behavior remains unchanged.

### Edge Cases

- Approved evidence is valid but too sparse to support a coherent Lesson with at least one cited section.
- Evidence supports a useful concept but not the example, practice activity, misconception, or best-practice section suggested by a generic teaching pattern.
- Evidence contains conflicting, duplicated, or overlapping statements across multiple approved source-qualified chunks.
- A prerequisite is necessary for comprehension but is absent from the approved evidence.
- A blueprint assigns no valid evidence to a proposed section or assigns evidence outside the approved Lesson scope.
- A generated section cites an allowed chunk but includes claims that the cited evidence does not support.
- Provider references are missing, foreign, duplicated, malformed, or ambiguous when mapped back to canonical chunks.
- Quality correction fixes one defect but introduces a new citation, repetition, progression, or scope defect elsewhere.
- A Lesson has only one pedagogically justified section and a concise summary; the pipeline must not pad it with irrelevant sections.
- Generation or quality review fails partway through one Lesson while other Lessons in the existing Course workflow are already valid.
- Lesson-wide regeneration is requested for a previously reviewed Lesson; the new revision must use the same approved outline-to-evidence boundary and leave other Lessons unchanged.
- Markdown contains lists, code blocks, or callout-style blockquotes that must survive the existing publication serialization.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST insert a pedagogical generation process between approved per-Lesson evidence and the existing structured Lesson draft persistence boundary.
- **FR-002**: The process MUST use only source-qualified chunks already approved for the Lesson being generated or regenerated.
- **FR-003**: Before prose is written, the process MUST synthesize supported core concepts, prerequisites, definitions, procedures, comparisons, worked or practical examples, common mistakes or misconceptions, best practices, relationships, and evidence coverage gaps.
- **FR-004**: Every synthesized item MUST remain traceable to one or more supplied source references, and unsupported categories MUST be omitted or recorded as gaps rather than invented.
- **FR-005**: Before prose is written, the process MUST create a Lesson blueprint that defines learning progression, section order, section purpose, supporting evidence, and the expected teaching role of each section.
- **FR-006**: The blueprint MUST use a reusable section-purpose vocabulary comprising `introduction`, `objectives`, `concept`, `procedure`, `comparison`, `example`, `worked_example`, `deep_dive`, `practice`, `misconception`, `best_practice`, `recap`, and `summary`.
- **FR-007**: The blueprint MUST adapt to the approved Lesson intent and available evidence and MUST NOT require every Lesson to contain every section purpose.
- **FR-008**: Every blueprint section MUST have a distinct instructional purpose and at least one supporting approved source reference before section generation begins.
- **FR-009**: Section prose MUST be generated from the approved blueprint rather than independently inventing its own structure.
- **FR-010**: A `concept` section MUST prioritize intuition, clear explanation, relevant terminology, and an evidence-grounded example when one is available.
- **FR-011**: A `procedure` section MUST present supported prerequisites, ordered steps, expected results, and supported common mistakes where available.
- **FR-012**: A `comparison` section MUST make the supported contrast explicit and explain when each compared concept applies when the evidence permits that conclusion.
- **FR-013**: A `worked_example` section MUST distinguish setup, reasoning, and result, with each substantive claim grounded in approved evidence.
- **FR-014**: A `practice` section MUST give the learner a task and may provide a hint, but MUST NOT reveal a full answer immediately unless that disclosure is pedagogically appropriate and evidence-supported.
- **FR-015**: A `misconception` section MUST identify the supported incorrect belief, explain why it is misleading, and give the supported correct mental model.
- **FR-016**: A `summary` or `recap` section MUST synthesize earlier supported content concisely and MUST NOT introduce new concepts or claims.
- **FR-017**: Examples, practice, misconceptions, comparisons, deep dives, and best practices MUST appear only when appropriate to the Lesson and supported by its approved evidence.
- **FR-018**: Lesson title, summary, estimated duration, section headings, and section bodies MUST remain consistent with the approved outline intent and the generated Lesson's actual scope.
- **FR-019**: Every complete candidate Lesson MUST pass a quality review before it can be persisted as a ready draft revision.
- **FR-020**: Quality review MUST detect at minimum: article-like structure without teaching progression, duplicated sections, overlapping concepts, unsupported claims, missing prerequisite explanations, overly broad sections, overly shallow sections, irrelevant sections, weak or missing examples when evidence supports them, citation ownership violations, sections without supporting evidence, excessive repetition, and drift beyond the approved outline intent.
- **FR-021**: When correction is feasible, the process MUST target affected sections and MUST preserve unrelated valid content rather than regenerating the entire Lesson without cause.
- **FR-022**: After any correction, the complete candidate Lesson MUST be rechecked for instructional progression, evidence support, citation ownership, repetition, and scope before persistence.
- **FR-023**: Generation and correction MUST use a bounded workflow and MUST NOT make a separate provider call for every small paragraph.
- **FR-024**: If a compliant Lesson cannot be produced within the bounded workflow, the system MUST persist no invalid draft revision and MUST surface the outcome through the existing Lesson-generation failure and retry behavior.
- **FR-025**: Every final section MUST contain at least one valid citation to a chunk approved for that exact Lesson.
- **FR-026**: Provider-facing source references MUST map back to canonical `documentChunkId` values while preserving source-qualified identities.
- **FR-027**: Missing, foreign, malformed, or ambiguous source references MUST be rejected before persistence; a valid reference MUST NOT make unsupported prose acceptable.
- **FR-028**: Approved evidence MUST remain untrusted external data and MUST NOT be able to override generation rules, access unrelated data, or direct privileged workflow behavior.
- **FR-029**: The final result MUST normalize to the existing `StructuredLessonDraft` shape containing title, summary, estimated minutes, and ordered sections with heading, Markdown body, citation chunk indexes, and optional source references.
- **FR-030**: Evidence synthesis, blueprint, and quality-review artifacts MUST remain transient for this feature; no database migration or persisted workflow-stage model is permitted.
- **FR-031**: The existing Gemini-compatible Lesson provider responsibility MUST remain in place for this feature, while the behavioral boundary MUST not prevent a future provider from participating without changing the pedagogical stages.
- **FR-032**: Multi-provider benchmarking or replacement MUST NOT be required to generate, review, persist, or publish a Lesson in this feature.
- **FR-033**: Existing Lesson-wide generation and regeneration behavior exposed to the Admin MUST remain unchanged even though internal generation becomes multi-stage.
- **FR-034**: Existing immutable Lesson revision persistence, Admin Course review, citation ownership, and atomic publication behavior MUST remain authoritative and unchanged.
- **FR-035**: Publication MUST continue serializing each ordered section as its heading followed by its Markdown body into `lessons.content`.
- **FR-036**: Tavily Search, Tavily Extract, immutable source snapshots, `document_chunks`, Course/source ownership, outline generation and review, Continue semantics, approved outline-to-chunk ownership, learner enrollment and progress, and Exercise generation and review MUST remain unchanged.

### Key Entities

- **Approved Lesson Evidence**: The source-qualified chunks already assigned to one Lesson by the approved outline; this is the exclusive factual and citation boundary for generation.
- **Evidence Synthesis**: A transient, traceable inventory of supported teaching material and coverage gaps derived from approved Lesson evidence before prose is written.
- **Lesson Blueprint**: A transient ordered teaching design that gives every proposed section a purpose, teaching role, and supporting evidence.
- **Generated Section**: One section produced from the blueprint with a heading, Markdown body, instructional purpose during generation, and citations to approved evidence; its purpose need not expand the persisted section contract.
- **Lesson Quality Review**: A pre-persistence assessment of the complete candidate Lesson that records defects requiring targeted correction or determines that the candidate is eligible for final validation.
- **Structured Lesson Draft**: The existing persistence-boundary representation containing title, summary, estimated duration, and ordered cited Markdown sections.
- **Canonical Citation**: The existing source-qualified association between a final section and an approved canonical document chunk.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance tests, 100% of generated Lessons present a reviewer-verifiable learning progression or are rejected before persistence; none persist solely as an unordered linear article.
- **SC-002**: For fixtures supporting multiple teaching roles, 100% of persisted Lessons use distinct section purposes appropriate to the topic and evidence, while sparse fixtures receive no unsupported padding sections.
- **SC-003**: Across evidence-grounding tests, 100% of synthesized items, blueprint sections, final sections, and substantive claims trace to evidence approved for the exact Lesson.
- **SC-004**: Citation validation accepts 100% of valid source-qualified references and rejects 100% of tested missing, foreign, malformed, or ambiguous references before persistence.
- **SC-005**: Every persisted final section has at least one valid canonical citation, and zero sections with unsupported claims are accepted merely because they contain a valid citation identifier.
- **SC-006**: Quality-review fixtures detect every required defect category listed in FR-020, and no candidate with an unresolved required defect reaches ready-draft persistence.
- **SC-007**: In targeted-correction tests, unaffected valid sections remain substantively unchanged while all corrected Lessons are revalidated as a whole before persistence.
- **SC-008**: Across representative concept, procedure, comparison, worked-example, practice, misconception, and summary fixtures, 100% of included section types satisfy their stated instructional expectations.
- **SC-009**: All successful outputs validate against the existing structured Lesson draft contract, and persistence review finds zero new tables, columns, enums, or persisted pedagogical-stage artifacts.
- **SC-010**: Existing Admin acceptance flows for Continue, Lesson-wide regeneration, content editing, Course review, and publication complete without a changed user action or editing capability.
- **SC-011**: Existing publication and learner acceptance tests render pedagogically generated Lessons through the unchanged `lessons.content` Markdown contract, including supported headings, lists, code blocks, and callout-style blockquotes.
- **SC-012**: Regression verification finds zero behavioral changes in Tavily acquisition, source snapshots, Course/source ownership, outline review, Continue, immutable revisions, atomic publication, learner enrollment/progress, or Exercise generation/review.

## Assumptions

- The supplied completed Lesson Generation Audit summary and the repository's current-flow documentation accurately describe the existing generation, persistence, review, and publication boundaries.
- A quality gate is mandatory for every generated candidate, but whether that gate requires a separate model call in every case is a planning decision; observable quality and safety requirements remain the same.
- The maximum number of generation/correction attempts and the exact grouping of bounded stages are planning decisions, provided the workflow remains bounded and does not generate one call per tiny paragraph.
- When evidence is too sparse to produce a compliant Lesson, failing without persistence is preferable to inventing unsupported instructional content.
- Section purposes are generation-time teaching semantics and do not require new persisted fields in the existing section contract.
- Existing Admin failure, retry, progress, and Lesson-wide regeneration behavior can represent a pipeline-stage failure without a new public workflow state.
- Existing Markdown support is sufficient for the initial pedagogical constructs covered by this feature.

## Scope Boundaries

### In Scope

- Evidence synthesis from only the approved chunks for one Lesson.
- An adaptive pedagogical blueprint created before prose.
- Purpose-aware section generation from the blueprint.
- Pre-persistence quality review and bounded targeted correction.
- Strict evidence, scope, and citation validation through the existing canonical ownership boundary.
- Normalization into the existing structured Lesson draft and downstream compatibility contracts.

### Out of Scope

1. Tavily Search or Tavily Extract changes.
2. Source ingestion or immutable snapshot changes.
3. Outline generation, review, or approved outline-to-chunk ownership redesign.
4. Any database migration or new persisted pedagogical workflow stage.
5. Learner UI or Markdown renderer redesign.
6. Admin editor redesign, including add/delete/reorder sections or citation editing.
7. Exercise generation, review, publication, or learner Exercise changes.
8. Course publication or atomicity redesign.
9. Embeddings, vector databases, or retrieval redesign.
10. Replacing the existing Lesson model provider.
11. Gemini, GPT, or DeepSeek benchmarking.
12. Section-level learner interactions.
13. Section-level public regeneration controls.
14. Changes to Course/source ownership, Continue semantics, immutable Lesson revisions, learner enrollment, or progress.
