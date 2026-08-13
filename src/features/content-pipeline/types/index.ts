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
