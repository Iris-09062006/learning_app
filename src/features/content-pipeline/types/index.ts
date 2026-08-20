export const SUPPORTED_SOURCE_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type SupportedSourceMimeType = (typeof SUPPORTED_SOURCE_MIME_TYPES)[number];
export type SourceDocumentStatus =
  | "uploaded"
  | "extracting"
  | "extracted"
  | "generating"
  | "ready_for_review"
  | "failed"
  | "archived";
export type LessonDraftStatus =
  | "pending_review"
  | "needs_revision"
  | "rejected"
  | "approved"
  | "published";
export type LessonDraftReviewDecision = "approved" | "rejected" | "needs_revision";

export interface DocumentChunkInput {
  chunkIndex: number;
  content: string;
  startOffset: number;
  endOffset: number;
  contentHash: string;
}

export interface LessonDraftSection {
  heading: string;
  bodyMarkdown: string;
  citationChunkIndexes: number[];
  citationSourceRefs?: CourseSourceRef[];
}

export interface StructuredLessonDraft {
  title: string;
  summary: string;
  estimatedMinutes: number;
  sections: LessonDraftSection[];
}

export interface LessonDraftGenerationRequest {
  documentTitle: string;
  lessonTitle: string;
  learningObjectives?: string[];
  chunks: Array<{ chunkIndex: number; content: string }> | ProviderSourceChunk[];
}

export interface ProviderLessonDraftSection {
  heading: string;
  bodyMarkdown: string;
  citationSourceRefs: number[];
  citationChunkIndexes?: never;
}

export interface ProviderStructuredLessonDraft {
  title: string;
  summary: string;
  estimatedMinutes: number;
  sections: ProviderLessonDraftSection[];
}

export interface LessonDraftGenerationResponse {
  draft: StructuredLessonDraft | ProviderStructuredLessonDraft;
  provider: string;
  model: string;
}

export interface StructuredCourseDraft {
  title: string;
  description: string;
  lessons: StructuredLessonDraft[];
}

export type CourseImportStatus =
  | "uploaded"
  | "processing"
  | "outline_review"
  | "generating_content"
  | "content_review"
  | "ready_to_publish"
  | "published"
  | "failed"
  | "rejected";

export interface CourseOutlineLesson {
  clientKey: string;
  title: string;
  summary: string;
  learningObjectives: string[];
  sourceChunkIndexes: number[];
  sourceRefs?: CourseSourceRef[];
}

export interface StructuredCourseOutline {
  title: string;
  description: string;
  learningObjectives: string[];
  lessons: CourseOutlineLesson[];
}

export interface CourseOutlineGenerationRequest {
  documentTitle: string;
  chunks: Array<{ chunkIndex: number; content: string }> | ProviderSourceChunk[];
}

export interface ProviderCourseOutlineLesson {
  clientKey: string;
  title: string;
  summary: string;
  learningObjectives: string[];
  sourceRefs: number[];
  sourceChunkIndexes?: never;
}

export interface ProviderStructuredCourseOutline {
  title: string;
  description: string;
  learningObjectives: string[];
  lessons: ProviderCourseOutlineLesson[];
}

export interface CourseOutlineGenerationResponse {
  outline: StructuredCourseOutline | ProviderStructuredCourseOutline;
  provider: string;
  model: string;
}

export interface CourseImportLessonDraft {
  id: number;
  outlineLessonId: number;
  revision: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
  sections: LessonDraftSection[];
  status: "ready" | "failed";
  provider: string;
  model: string | null;
  citations: Array<{
    sectionIndex: number;
    chunkIndex: number;
    quote: string;
    documentChunkId?: number;
    sourceDocumentId?: number;
    sourceOrder?: number;
    sourceTitle?: string;
    sourceDomain?: string | null;
    sourceUrl?: string | null;
    sourceRef?: CourseSourceRef;
  }>;
}

export interface CourseImportOutlineLesson extends CourseOutlineLesson {
  id: number;
  lessonOrder: number;
  sourceChunks?: Array<{
    documentChunkId: number;
    sourceDocumentId: number;
    sourceOrder: number;
    chunkIndex: number;
  }>;
  contentDraft: CourseImportLessonDraft | null;
}

export type CourseImportSourceType = "file" | "web_page";
export type CourseImportIngestionMethod = "uploaded" | "manual_url" | "discovered";

export interface CourseImportSourceSummary {
  sourceDocumentId: number;
  sourceOrder: number;
  sourceType: CourseImportSourceType;
  ingestionMethod: CourseImportIngestionMethod;
  title: string;
  filename: string;
  sourceUrl: string | null;
  canonicalUrl: string | null;
  domain: string | null;
  authorityScore: number | null;
  relevanceScore: number | null;
  status: SourceDocumentStatus;
  errorCode: string | null;
  chunkCount: number;
}

export type CourseImportSource = CourseImportSourceSummary;

export interface WebSearchResult {
  url: string;
  title: string;
  snippet: string;
  language: string | null;
  providerRank: number;
}

export interface WebSearchPage {
  results: WebSearchResult[];
  cursor: string | null;
  hasMore: boolean;
}

export interface ResearchQuery {
  query: string;
  searchLanguage: string;
  country: string;
}

export interface ResearchCandidate {
  candidateKey: string;
  url: string;
  canonicalUrl: string;
  title: string;
  domain: string;
  snippet: string;
  language: string | null;
  discovery: "discovered";
  authorityScore: number;
  relevanceScore: number;
}

export interface CourseResearchResult {
  topic: string;
  queries: string[];
  results: ResearchCandidate[];
  cursor: string | null;
  hasMore: boolean;
}

export interface CourseSourceRef {
  sourceDocumentId: number;
  chunkIndex: number;
}

export interface CourseSourceChunk extends CourseSourceRef {
  documentChunkId: number;
  sourceOrder: number;
  sourceTitle: string;
  sourceUrl: string | null;
  sourceDomain: string | null;
  content: string;
}

export interface ProviderSourceChunk {
  sourceRef: number;
  sourceLabel: string;
  content: string;
}

export const SECTION_PURPOSES = [
  "introduction",
  "objectives",
  "concept",
  "procedure",
  "comparison",
  "example",
  "worked_example",
  "deep_dive",
  "practice",
  "misconception",
  "best_practice",
  "recap",
  "summary",
] as const;

export type SectionPurpose = (typeof SECTION_PURPOSES)[number];

export interface ApprovedLessonEvidence {
  readonly jobId: number;
  readonly outlineLessonId: number;
  readonly lessonTitle: string;
  readonly learningObjectives: readonly string[];
  readonly chunks: readonly CourseSourceChunk[];
}

export interface EvidenceRefMapEntry {
  readonly sourceRef: number;
  readonly documentChunkId: number;
  readonly sourceDocumentId: number;
  readonly chunkIndex: number;
  readonly sourceLabel: string;
  readonly content: string;
}

export type EvidenceRefMap = readonly EvidenceRefMapEntry[];

export type SynthesizedEvidenceKind =
  | "concept"
  | "definition"
  | "prerequisite"
  | "procedure"
  | "comparison"
  | "example"
  | "misconception"
  | "best_practice"
  | "relationship";

export interface SynthesizedEvidenceItem {
  itemKey: string;
  kind: SynthesizedEvidenceKind;
  statement: string;
  evidenceRefs: number[];
}

export interface CoverageGap {
  gapKey: string;
  description: string;
  affectedObjectiveIndexes: number[];
  relatedEvidenceRefs: number[];
}

export interface EvidenceSynthesis {
  items: SynthesizedEvidenceItem[];
  coverageGaps: CoverageGap[];
}

export interface BlueprintSection {
  sectionKey: string;
  order: number;
  purpose: SectionPurpose;
  heading: string;
  teachingObjective: string;
  synthesisItemKeys: string[];
  evidenceRefs: number[];
  expectedElements: string[];
}

export interface LessonBlueprint {
  progressionRationale: string;
  sections: BlueprintSection[];
}

export interface SynthesisBlueprintGenerationRequest {
  lessonTitle: string;
  learningObjectives: readonly string[];
  evidenceRefMap: EvidenceRefMap;
}

export interface SynthesisBlueprintGenerationResponse {
  synthesis: EvidenceSynthesis;
  blueprint: LessonBlueprint;
  provider: string;
  model: string;
}

export interface PedagogicalProviderResult<T> {
  result: T;
  provider: string;
  model: string;
}

export interface GeneratedSection {
  sectionKey: string;
  purpose: SectionPurpose;
  heading: string;
  bodyMarkdown: string;
  citationEvidenceRefs: number[];
}

export interface GeneratedLessonCandidate {
  title: string;
  summary: string;
  estimatedMinutes: number;
  sections: GeneratedSection[];
}

export const QUALITY_FINDING_CODES = [
  "ARTICLE_LIKE_PROGRESSION",
  "DUPLICATED_SECTION",
  "OVERLAPPING_CONCEPT",
  "UNSUPPORTED_CLAIM",
  "MISSING_PREREQUISITE",
  "SECTION_TOO_BROAD",
  "SECTION_TOO_SHALLOW",
  "IRRELEVANT_SECTION",
  "WEAK_OR_MISSING_EXAMPLE",
  "CITATION_OWNERSHIP",
  "SECTION_WITHOUT_EVIDENCE",
  "EXCESSIVE_REPETITION",
  "OUTLINE_SCOPE_DRIFT",
] as const;

export type QualityFindingCode = (typeof QUALITY_FINDING_CODES)[number];

export interface QualityFinding {
  findingKey: string;
  code: QualityFindingCode;
  disposition: "correctable" | "reject";
  sectionKeys: string[];
  message: string;
  evidenceRefs?: number[];
}

export interface LessonQualityReview {
  verdict: "pass" | "correctable" | "reject";
  findings: QualityFinding[];
  reviewedSectionKeys: string[];
}

export interface TargetedCorrection {
  addressedFindingKeys: string[];
  sections: GeneratedSection[];
  title?: string;
  summary?: string;
  estimatedMinutes?: number;
}

export interface GenerateLessonSectionsRequest extends SynthesisBlueprintGenerationRequest {
  synthesis: EvidenceSynthesis;
  blueprint: LessonBlueprint;
}

export interface ReviewLessonCandidateRequest extends GenerateLessonSectionsRequest {
  candidate: GeneratedLessonCandidate;
}

export interface CorrectLessonCandidateRequest extends ReviewLessonCandidateRequest {
  review: LessonQualityReview;
}

export interface CourseImportDraft {
  jobId: number;
  sourceDocumentId: number;
  sourceFilename: string;
  sources: CourseImportSourceSummary[];
  outlineStale: boolean;
  status: CourseImportStatus;
  errorCode: string | null;
  outlineRevision: number;
  approvedOutlineRevision: number | null;
  title: string;
  description: string;
  learningObjectives: string[];
  lessons: CourseImportOutlineLesson[];
  publishedCourseId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersistCourseOutlineResult {
  jobId: number;
  sourceDocumentId: number;
  outlineRevision: number;
  status: "outline_review";
  sourceDocumentIds?: number[];
}

export interface CourseImportMutationResult {
  jobId?: number | null;
  sourceDocumentId: number;
  sourceDocumentIds?: number[];
  sourceOrder?: number;
  anchorSourceDocumentId?: number;
  status?: CourseImportStatus | SourceDocumentStatus;
  attached?: boolean;
  removed?: boolean;
  outlineStale?: boolean;
  storageBucket?: string;
  storagePath?: string;
}

export interface PublishCourseImportResult {
  jobId: number;
  sourceDocumentId: number;
  sourceDocumentIds: number[];
  courseId: number;
  status: "published";
  lessonIds: number[];
}

export interface CourseDraftGenerationRequest {
  documentTitle: string;
  chunks: Array<{ chunkIndex: number; content: string }>;
}

export interface CourseDraftGenerationResponse {
  draft: StructuredCourseDraft;
  provider: string;
  model: string;
}

export interface CourseDraftBatch {
  sourceDocumentId: number;
  sourceFilename: string;
  courseId: number;
  courseTitle: string;
  courseDescription: string | null;
  status: "pending_review" | "needs_revision";
  createdAt: string;
  lessons: LessonDraftRecord[];
}

export interface CreateCourseDraftBatchResult {
  sourceDocumentId: number;
  courseId: number;
  chapterId: number;
  lessonDraftIds: number[];
  status: "pending_review";
}

export interface ReviewCourseDraftBatchResult {
  sourceDocumentId: number;
  courseId: number;
  status: "published" | "rejected" | "needs_revision";
  lessonIds: number[];
}

export interface SourceDocumentRecord {
  id: number;
  originalFilename: string;
  mimeType: SupportedSourceMimeType;
  sizeBytes: number;
  status: SourceDocumentStatus;
  errorCode: string | null;
  createdAt: string;
}

export interface LessonDraftRecord {
  id: number;
  sourceDocumentId: number;
  courseId: number;
  chapterId: number;
  targetLessonId: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
  sections: LessonDraftSection[];
  status: LessonDraftStatus;
  revision: number;
  approvedRevision: number | null;
  provider: string;
  model: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  citations?: Array<{
    sectionIndex: number;
    chunkIndex: number;
    quote: string;
  }>;
}

export interface PublishLessonDraftResult {
  lessonDraftId: number;
  lessonId: number;
  courseId: number;
  status: "published";
  coursePublished: boolean;
  publishedAt: string;
}

export interface ContentTarget {
  lessonId: number;
  lessonTitle: string;
  chapterId: number;
  chapterTitle: string;
  courseId: number;
  courseTitle: string;
  isPublished?: boolean;
}

export interface ContentChapterTarget {
  chapterId: number;
  chapterTitle: string;
  courseId: number;
  courseTitle: string;
}

export interface ContentCourseTarget {
  courseId: number;
  courseTitle: string;
}

export type ContentCurriculum = ContentTarget;
