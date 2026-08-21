export type ProviderRequestStage =
  | "synthesis"
  | "sections"
  | "review"
  | "correction"
  | "lesson_draft"
  | "course_draft"
  | "course_outline";

interface BaseContentPipelineOperationalSignal {
  outcome: "success" | "failure" | "retry" | "rejected";
  stage: string;
  code: string;
  actorId?: string;
  jobId?: number;
  sourceDocumentId?: number;
  durationMs?: number;
  byteCount?: number;
  redirectCount?: number;
  sourceCount?: number;
}

interface ProviderFailureOperationalSignal extends BaseContentPipelineOperationalSignal {
  event: "provider_request";
  outcome: "failure";
  stage: ProviderRequestStage;
  upstreamStatus: number;
  providerHost: string;
  durationMs: number;
  contentType: string | null;
  retryAfterPresent: boolean;
  retryAfter: string | null;
  providerRequestIdHeader: "x-goog-request-id" | "x-request-id" | null;
  providerRequestId: string | null;
  providerErrorCode: string | null;
  providerErrorType: string | null;
  providerErrorCategory: string;
}

interface GeneralContentPipelineOperationalSignal extends BaseContentPipelineOperationalSignal {
  event: "research" | "fetch" | "source_mutation" | "source_reference" | "outline_generation"
    | "stale_outline" | "lesson_generation" | "publication";
}

export type ContentPipelineOperationalSignal =
  | GeneralContentPipelineOperationalSignal
  | ProviderFailureOperationalSignal;

export function emitContentPipelineSignal(signal: ContentPipelineOperationalSignal): void {
  // This closed signal type is the privacy boundary. Never add provider bodies, prompts,
  // credentials, tokens, arbitrary headers, private URLs, or user/source content.
  console.info("[content-pipeline] operational", signal);
}
