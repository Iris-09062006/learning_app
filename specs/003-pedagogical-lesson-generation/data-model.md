# Data Model: Pedagogical Lesson Generation

**Feature**: `003-pedagogical-lesson-generation`
**Persistence decision**: No database change. All entities below except `StructuredLessonDraft` and canonical citation rows are transient server-memory values.

## Database Gate

**Database migration required: NO.**

The existing `lesson_content_drafts.sections` JSONB already stores the only durable learner-facing values needed by this feature: ordered section heading, Markdown body, and citation fields. `lesson_content_draft_citations` already stores canonical `document_chunk_id` ownership per section, and `persist_lesson_content_draft_for_job` already validates Course-import membership, approved-outline ownership, valid section indexes, and citation completeness.

Evidence synthesis, blueprint purpose, reviewer findings, and correction metadata have no post-generation consumer and MUST NOT be persisted. No table, column, enum, RPC signature, generated database type, or RLS policy changes.

## Transient Entity Relationships

```text
ApprovedLessonEvidence
  └── immutable EvidenceRefMap
        ├── EvidenceSynthesis
        │     └── SynthesizedEvidenceItem[] / CoverageGap[]
        └── LessonBlueprint
              └── BlueprintSection[]
                    └── GeneratedLessonCandidate.sections[]
                          └── LessonQualityReview.findings[]
                                └── optional TargetedCorrection
                                      └── final re-review

GeneratedLessonCandidate
  → StructuredLessonDraft (existing shape)
  → CanonicalCitation[] (existing persistence input)
```

## 1. SectionPurpose

Bounded internal taxonomy:

```text
introduction | objectives | concept | procedure | comparison | example |
worked_example | deep_dive | practice | misconception | best_practice |
recap | summary
```

Validation:

- Value must be exactly one member of the taxonomy.
- A Lesson uses only purposes justified by its objectives and evidence.
- Purpose is transient and is not copied into final section JSON or learner Markdown.

## 2. ApprovedLessonEvidence

Represents the complete evidence boundary loaded for one approved outline Lesson.

| Field | Type | Rules |
| --- | --- | --- |
| `jobId` | positive integer | Existing Course-import identity. |
| `outlineLessonId` | positive integer | Must belong to the approved outline revision. |
| `lessonTitle` | string | Existing approved Lesson title. |
| `learningObjectives` | string[] | Existing non-empty approved objectives. |
| `chunks` | `CourseSourceChunk[]` | Exact canonical chunks approved for this Lesson; no new selection. |

Validation:

- Each `documentChunkId` is unique.
- Every chunk is present in the current job and approved Lesson source set.
- Empty, partial, missing, or foreign evidence fails before provider access.

## 3. EvidenceRefMap

Immutable map created once per Lesson pipeline and reused by every stage.

| Field | Type | Rules |
| --- | --- | --- |
| `sourceRef` | non-negative integer | Contiguous request-local value assigned deterministically in approved source/chunk order. |
| `documentChunkId` | positive integer | Canonical server-owned chunk ID; never accepted from provider output. |
| `sourceDocumentId` | positive integer | Existing source-qualified owner. |
| `chunkIndex` | non-negative integer | Document-local display/persistence compatibility index. |
| `sourceLabel` | escaped string | Existing title/domain/file label, treated as untrusted data. |
| `content` | string | Exact approved chunk content, treated as untrusted data. |

Validation:

- `sourceRef`, `documentChunkId`, and `(sourceDocumentId, chunkIndex)` are each unique within the Lesson map.
- Provider outputs may reference only `sourceRef`; the server performs all reverse mapping.
- The map cannot be extended or reordered after Call 1 starts.

## 4. SynthesizedEvidenceItem

One evidence-supported teaching fact or relationship.

| Field | Type | Rules |
| --- | --- | --- |
| `itemKey` | bounded string | Unique within the synthesis; request-local, not persisted. |
| `kind` | enum | `concept`, `definition`, `prerequisite`, `procedure`, `comparison`, `example`, `misconception`, `best_practice`, or `relationship`. |
| `statement` | non-empty string | Concise synthesis, not Lesson prose. |
| `evidenceRefs` | integer[] | Non-empty, unique, and all present in `EvidenceRefMap`. |

Validation:

- Unknown fields/kinds fail parsing.
- An item cannot be used by the blueprint if any ref is invalid.
- Duplicate `itemKey` or duplicate evidence refs fail.

## 5. CoverageGap

Explicitly represents material needed or desirable for an objective but not supported by supplied evidence.

| Field | Type | Rules |
| --- | --- | --- |
| `gapKey` | bounded string | Unique within the synthesis. |
| `description` | non-empty string | States what is absent without inventing the missing content. |
| `affectedObjectiveIndexes` | integer[] | Unique indexes into approved learning objectives. |
| `relatedEvidenceRefs` | integer[] | May be empty; any supplied ref must be valid. |

Validation:

- A coverage gap is not a license to generate a section.
- A blueprint section cannot cite a gap as supporting evidence.

## 6. EvidenceSynthesis

| Field | Type | Rules |
| --- | --- | --- |
| `items` | `SynthesizedEvidenceItem[]` | May omit unsupported kinds; must contain at least one item. |
| `coverageGaps` | `CoverageGap[]` | May be empty. |

Validation:

- All keys are unique across their own collections.
- No direct canonical database IDs appear in provider output.
- Every non-gap teaching item is evidence-supported.

## 7. BlueprintSection

| Field | Type | Rules |
| --- | --- | --- |
| `sectionKey` | bounded string | Unique, stable across generation/review/correction. |
| `order` | integer | Contiguous, zero-based, unique, and matches array order. |
| `purpose` | `SectionPurpose` | Must be a valid taxonomy member. |
| `heading` | non-empty string | Planned learner-facing heading. |
| `teachingObjective` | non-empty string | Explains what this section teaches or enables. |
| `synthesisItemKeys` | string[] | Non-empty, unique, and present in `EvidenceSynthesis.items`. |
| `evidenceRefs` | integer[] | Non-empty union/subset of refs from cited synthesis items; all allowed. |
| `expectedElements` | bounded string[] | Purpose-specific elements such as intuition, ordered steps, setup/reasoning/result, task/hint, or misconception/correct model. |

Validation:

- 1–12 sections.
- Every section has distinct instructional value; duplicate keys/orders fail deterministically.
- Prerequisites precede dependent sections when represented.
- `summary`/`recap` cannot be the source of new synthesis items.
- Practice/examples/misconceptions appear only when evidence supports them.

## 8. LessonBlueprint

| Field | Type | Rules |
| --- | --- | --- |
| `progressionRationale` | non-empty string | Explains the ordered teaching progression. |
| `sections` | `BlueprintSection[]` | 1–12 ordered sections. |

Validation:

- Blueprint is validated before any prose-generation call.
- Every approved objective must be covered by at least one section or explicitly associated with a coverage gap.
- No section may use a nonexistent synthesis item or evidence ref.
- Not every Lesson must use the same purposes or section count.

## 9. GeneratedSection

| Field | Type | Rules |
| --- | --- | --- |
| `sectionKey` | string | Must match exactly one blueprint section. |
| `purpose` | `SectionPurpose` | Must equal the blueprint purpose; transient only. |
| `heading` | non-empty string | Learner-facing, max determined by existing final validation. |
| `bodyMarkdown` | non-empty string | Purpose-aware Markdown; no unsupported content. |
| `citationEvidenceRefs` | integer[] | Non-empty, unique, allowed, and constrained to section blueprint evidence. |

Validation:

- Exactly one generated section per blueprint section, in blueprint order.
- Unknown, missing, duplicate, or reordered section keys fail.
- Every section must satisfy its purpose-specific expected elements.

## 10. GeneratedLessonCandidate

| Field | Type | Rules |
| --- | --- | --- |
| `title` | string | Non-empty, max 150, within approved Lesson intent. |
| `summary` | string | Non-empty; no new unsupported concept. |
| `estimatedMinutes` | integer | 1–180 and consistent with generated scope. |
| `sections` | `GeneratedSection[]` | 1–12, exactly matching blueprint order/keys. |

This candidate is not persistence-ready until it passes deterministic validation and independent quality review.

## 11. QualityFinding

| Field | Type | Rules |
| --- | --- | --- |
| `findingKey` | bounded string | Unique within one review. |
| `code` | enum | One of the required review categories below. |
| `disposition` | enum | `correctable` or `reject`. |
| `sectionKeys` | string[] | Existing affected sections; may be empty only for Lesson-level findings. |
| `message` | non-empty string | Concise diagnostic, no source content dump. |
| `evidenceRefs` | integer[] | Optional supporting refs; every supplied value must be allowed. |

Required finding codes:

```text
ARTICLE_LIKE_PROGRESSION | DUPLICATED_SECTION | OVERLAPPING_CONCEPT |
UNSUPPORTED_CLAIM | MISSING_PREREQUISITE | SECTION_TOO_BROAD |
SECTION_TOO_SHALLOW | IRRELEVANT_SECTION | WEAK_OR_MISSING_EXAMPLE |
CITATION_OWNERSHIP | SECTION_WITHOUT_EVIDENCE | EXCESSIVE_REPETITION |
OUTLINE_SCOPE_DRIFT
```

## 12. LessonQualityReview

| Field | Type | Rules |
| --- | --- | --- |
| `verdict` | enum | `pass`, `correctable`, or `reject`. |
| `findings` | `QualityFinding[]` | Empty only for `pass`; non-empty otherwise. |
| `reviewedSectionKeys` | string[] | Must equal all candidate section keys exactly once. |

Validation:

- `pass` plus findings is invalid.
- `correctable` requires every blocking finding to have `disposition = correctable` and valid target sections/metadata.
- `reject` prevents persistence immediately.
- A review cannot introduce evidence identities.

## 13. TargetedCorrection

| Field | Type | Rules |
| --- | --- | --- |
| `addressedFindingKeys` | string[] | Must match all correctable findings requested for this one pass. |
| `sections` | `GeneratedSection[]` | Contains only targeted section keys; all other returned keys are rejected. |
| `title` / `summary` / `estimatedMinutes` | optional | Allowed only when a Lesson-level finding explicitly targets that field. |

Merge rules:

- Server merges corrected targets into the prior candidate; provider cannot delete, add, or reorder sections.
- Full deterministic validation and one full independent re-review follow the merge.
- No second correction is permitted.

## 14. Final StructuredLessonDraft

Existing durable contract, unchanged:

```ts
interface StructuredLessonDraft {
  title: string;
  summary: string;
  estimatedMinutes: number;
  sections: Array<{
    heading: string;
    bodyMarkdown: string;
    citationChunkIndexes: number[];
    citationSourceRefs?: Array<{
      sourceDocumentId: number;
      chunkIndex: number;
    }>;
  }>;
}
```

Normalization:

- Remove `sectionKey`, `purpose`, `teachingObjective`, expected elements, synthesis keys, and review metadata.
- Resolve each `citationEvidenceRefs` entry through `EvidenceRefMap`.
- Populate existing `citationChunkIndexes`; include existing source-qualified refs when required by current multi-source behavior.
- Build existing canonical citation rows `{ sectionIndex, documentChunkId }` for the unchanged persistence call.
- Reject before persistence if any final section has no citation or resolution is missing/ambiguous/foreign.

## Transient State Transitions

```text
evidence_validated
  → synthesized_and_blueprinted
  → sections_generated
  → review_passed
      → normalized_and_persisted
  → review_correctable
      → corrected_once
      → re_review_passed
          → normalized_and_persisted
      → re_review_failed
          → recoverable_failure
  → review_rejected
      → recoverable_failure

any transport/schema/ref/deadline failure before persistence
  → recoverable_failure
```

These states are conceptual in-memory states only. Existing durable Course-import statuses remain unchanged.
