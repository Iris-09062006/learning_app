import "server-only";

import type {
  DbDifficultyLevel,
  GeneratedExerciseContent,
  SubmissionDetailsForAi,
} from "@/features/ai/types";
import {
  ExerciseValidationError,
  validateGeneratedExerciseContent,
} from "@/features/ai/validation/exercise-draft";

export interface AiProviderRequest {
  submission: SubmissionDetailsForAi;
  question: string | null;
}

export interface AiProviderResponse {
  explanation: string;
  provider: string;
  model: string | null;
}

export interface ExerciseGenerationProviderRequest {
  lessonTitle: string;
  lessonSummary?: string;
  lessonContent: string;
  lessonLearningObjectives: string[];
  courseTitle: string;
  courseDescription: string | null;
  difficulty: DbDifficultyLevel;
  learningObjective: string;
  topicHint: string | null;
}

export interface ExerciseGenerationProviderResponse {
  content: GeneratedExerciseContent;
  provider: string;
  model: string | null;
}

export interface AIProvider {
  generateExplanation(request: AiProviderRequest): Promise<AiProviderResponse>;
  generateExercise?(
    request: ExerciseGenerationProviderRequest
  ): Promise<ExerciseGenerationProviderResponse>;
}

export class MockAIProvider implements AIProvider {
  async generateExplanation({
    submission,
    question,
  }: AiProviderRequest): Promise<AiProviderResponse> {
    const outcome = submission.isCorrect
      ? "BÃ i lÃ m cá»§a báº¡n lÃ  chÃ­nh xÃ¡c."
      : "BÃ i lÃ m cá»§a báº¡n chÆ°a chÃ­nh xÃ¡c.";

    return {
      explanation: [
        outcome,
        submission.staticExplanation ??
          `HÃ£y xem láº¡i yÃªu cáº§u cá»§a bÃ i "${submission.exerciseTitle}" vÃ  so sÃ¡nh Ä‘Ã¡p Ã¡n Ä‘Ã£ ná»™p vá»›i cÃ¡c lá»±a chá»n.`,
        question ? `CÃ¢u há»i cá»§a báº¡n: ${question}` : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
      provider: "mock",
      model: null,
    };
  }

  async generateExercise({
    lessonTitle,
    lessonSummary = "",
    lessonContent,
    lessonLearningObjectives,
    difficulty,
    learningObjective,
    topicHint,
  }: ExerciseGenerationProviderRequest): Promise<ExerciseGenerationProviderResponse> {
    const title = `Luyá»‡n táº­p: ${lessonTitle}`;
    const lessonSignals = [lessonTitle, lessonSummary, lessonContent, ...lessonLearningObjectives]
      .join(" ")
      .toLowerCase();
    const codingIsRequired = /\b(python|javascript|typescript|programming|source code|code reasoning|loop|function|sql query|write sql)\b/.test(lessonSignals);
    const scenarioIsUseful = /\b(agile|ethic|professional conduct|decision|workplace)\b/.test(lessonSignals);

    const content: GeneratedExerciseContent = codingIsRequired
      ? {
          type: "predict_output",
          title,
          description: `BÃ i táº­p ${difficulty} vá» ${topicHint ?? learningObjective}.`,
          codeSnippet: "for value in range(2):\n    print(value)",
          options: ["0 rá»“i 1", "1 rá»“i 2", "0 rá»“i 1 rá»“i 2"],
          correctAnswer: "0 rá»“i 1",
          explanation: `ÄÃ¢y lÃ  Ä‘Ã¡p Ã¡n máº«u cho má»¥c tiÃªu há»c táº­p: ${learningObjective}.`,
        }
      : scenarioIsUseful
        ? {
            type: "scenario",
            title,
            description: `Ãp dá»¥ng má»¥c tiÃªu há»c táº­p: ${learningObjective}.`,
            scenario: `Má»™t nhÃ³m cáº§n Ä‘Æ°a ra quyáº¿t Ä‘á»‹nh phÃ¹ há»£p vá»›i ná»™i dung cá»§a bÃ i â€œ${lessonTitle}â€.`,
            options: ["Ãp dá»¥ng nguyÃªn táº¯c cá»§a bÃ i há»c", "Bá» qua bá»‘i cáº£nh vÃ  chá»n ngáº«u nhiÃªn"],
            correctAnswer: "Ãp dá»¥ng nguyÃªn táº¯c cá»§a bÃ i há»c",
            explanation: "Lá»±a chá»n Ä‘Ãºng váº­n dá»¥ng trá»±c tiáº¿p nguyÃªn táº¯c Ä‘Æ°á»£c dáº¡y trong Lesson.",
          }
        : {
            type: "multiple_choice",
            title,
            description: `BÃ i táº­p ${difficulty} vá» ${topicHint ?? learningObjective}.`,
            options: ["Ná»™i dung phÃ¹ há»£p vá»›i má»¥c tiÃªu bÃ i há»c", "Má»™t giáº£ Ä‘á»‹nh khÃ´ng Ä‘Æ°á»£c bÃ i há»c há»— trá»£"],
            correctAnswer: "Ná»™i dung phÃ¹ há»£p vá»›i má»¥c tiÃªu bÃ i há»c",
            explanation: `ÄÃ¡p Ã¡n Ä‘Ãºng bÃ¡m sÃ¡t má»¥c tiÃªu há»c táº­p: ${learningObjective}.`,
          };

    return {
      content,
      provider: "mock",
      model: null,
    };
  }
}

interface OpenAIChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  model?: string;
}

export type ExerciseProviderDiagnosticCode =
  | "INVALID_HTTP_RESPONSE"
  | "PROVIDER_REQUEST_FAILED"
  | "PROVIDER_TIMEOUT"
  | "INVALID_PROVIDER_JSON_ENVELOPE"
  | "MISSING_CHOICES"
  | "MISSING_MESSAGE"
  | "MISSING_CONTENT"
  | "CONTENT_NOT_STRING"
  | "EMPTY_CONTENT"
  | "INVALID_EXERCISE_JSON";

export class ExerciseProviderDiagnosticError extends Error {
  constructor(
    public readonly diagnosticCode: ExerciseProviderDiagnosticCode,
    public readonly fieldPath: string
  ) {
    super(diagnosticCode);
    this.name = "ExerciseProviderDiagnosticError";
  }
}

function runtimeType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function logExerciseValidationFailure(error: ExerciseValidationError) {
  console.error("[exercise-generation-validation-failure]", {
    stage: "exercise_generation",
    validationCode: error.validationCode,
    fieldPath: error.fieldPath,
    ...error.metadata,
  });
}

function exerciseEnvelopeFailure(
  diagnosticCode: ExerciseProviderDiagnosticCode,
  fieldPath: string
): ExerciseProviderDiagnosticError {
  console.error("[exercise-generation-provider-envelope-failure]", {
    stage: "exercise_generation",
    validationCode: diagnosticCode,
    fieldPath,
  });
  return new ExerciseProviderDiagnosticError(diagnosticCode, fieldPath);
}

export function parseGeneratedExerciseContent(value: string): GeneratedExerciseContent {
  const normalized = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  let payload: unknown;

  try {
    payload = JSON.parse(normalized);
  } catch {
    throw exerciseEnvelopeFailure("INVALID_EXERCISE_JSON", "$");
  }

  try {
    return validateGeneratedExerciseContent(payload);
  } catch (error: unknown) {
    if (error instanceof ExerciseValidationError) {
      logExerciseValidationFailure(error);
    }
    throw error;
  }
}

// Provider schema stays structural for Gemini OpenAI compatibility; the strict validator below
// remains the source of truth for lengths, option cardinality/uniqueness, and correctAnswer.
const commonExerciseProperties = {
  type: { type: "string" },
  title: { type: "string" },
  description: { type: "string" },
  explanation: { type: "string" },
} as const;

const choiceProperties = {
  options: { type: "array", items: { type: "string" } },
  correctAnswer: { type: "string" },
} as const;

const EXERCISE_SCHEMA = {
  name: "lesson_exercise_draft",
  strict: true,
  schema: {
    type: "object",
    oneOf: [
      {
        type: "object", additionalProperties: false,
        required: ["type", "title", "description", "explanation", "options", "correctAnswer"],
        properties: { ...commonExerciseProperties, type: { type: "string", enum: ["multiple_choice"] }, ...choiceProperties },
      },
      {
        type: "object", additionalProperties: false,
        required: ["type", "title", "description", "explanation", "correctAnswer"],
        properties: { ...commonExerciseProperties, type: { type: "string", enum: ["true_false"] }, correctAnswer: { type: "boolean" } },
      },
      {
        type: "object", additionalProperties: false,
        required: ["type", "title", "description", "explanation", "expectedAnswer"],
        properties: { ...commonExerciseProperties, type: { type: "string", enum: ["short_answer"] }, expectedAnswer: { type: "string" } },
      },
      {
        type: "object", additionalProperties: false,
        required: ["type", "title", "description", "explanation", "items", "correctOrder"],
        properties: {
          ...commonExerciseProperties, type: { type: "string", enum: ["ordering"] },
          items: { type: "array", items: { type: "string" } },
          correctOrder: { type: "array", items: { type: "string" } },
        },
      },
      {
        type: "object", additionalProperties: false,
        required: ["type", "title", "description", "explanation", "pairs"],
        properties: {
          ...commonExerciseProperties, type: { type: "string", enum: ["matching"] },
          pairs: { type: "array", items: { type: "object", additionalProperties: false, required: ["prompt", "answer"], properties: { prompt: { type: "string" }, answer: { type: "string" } } } },
        },
      },
      {
        type: "object", additionalProperties: false,
        required: ["type", "title", "description", "explanation", "scenario", "options", "correctAnswer"],
        properties: { ...commonExerciseProperties, type: { type: "string", enum: ["scenario"] }, scenario: { type: "string" }, ...choiceProperties },
      },
      ...(["predict_output", "fix_the_bug"] as const).map((type) => ({
        type: "object" as const, additionalProperties: false,
        required: ["type", "title", "description", "explanation", "codeSnippet", "options", "correctAnswer"],
        properties: { ...commonExerciseProperties, type: { type: "string" as const, enum: [type] }, codeSnippet: { type: "string" as const }, ...choiceProperties },
      })),
    ],
  },
} as const;

export class OpenAIApiProvider implements AIProvider {
  constructor(
    private readonly apiKey = process.env.AI_API_KEY,
    private readonly endpoint = process.env.AI_PROVIDER_URL ??
      "https://api.openai.com/v1/chat/completions",
    private readonly model = process.env.AI_PROVIDER_MODEL ?? "gpt-4o-mini"
  ) {}

  async generateExplanation(
    request: AiProviderRequest
  ): Promise<AiProviderResponse> {
    if (!this.apiKey) {
      throw new Error("AI_PROVIDER_NOT_CONFIGURED");
    }

    const { submission, question } = request;

    const systemPrompt = `Báº¡n lÃ  má»™t gia sÆ° AI thÃ¢n thiá»‡n, chuyÃªn há»— trá»£ há»c viÃªn giáº£i bÃ i táº­p.
ThÃ´ng tin bÃ i táº­p:
- TiÃªu Ä‘á»: ${submission.exerciseTitle}
- Äá» bÃ i: ${submission.exercisePrompt}

Há»c viÃªn Ä‘Ã£ ná»™p Ä‘Ã¡p Ã¡n: ${JSON.stringify(submission.answer)}
Káº¿t quáº£ cháº¥m tá»± Ä‘á»™ng: ${submission.isCorrect ? "ÄÃºng" : "Sai"}
Giáº£i thÃ­ch tÄ©nh cá»§a bÃ i (náº¿u cÃ³): ${submission.staticExplanation ?? "KhÃ´ng cÃ³"}

HÃ£y dá»±a vÃ o cÃ¡c thÃ´ng tin trÃªn Ä‘á»ƒ phÃ¢n tÃ­ch ngáº¯n gá»n, dá»… hiá»ƒu vÃ¬ sao Ä‘Ã¡p Ã¡n cá»§a há»c viÃªn Ä‘Ãºng hoáº·c sai. Náº¿u há»c viÃªn cÃ³ cÃ¢u há»i, hÃ£y tráº£ lá»i trá»±c tiáº¿p vÃ o cÃ¢u há»i Ä‘Ã³. Sá»­ dá»¥ng ngÃ´n ngá»¯ tiáº¿ng Viá»‡t tá»± nhiÃªn, khuyáº¿n khÃ­ch há»c viÃªn. Tráº£ vá» Ä‘á»‹nh dáº¡ng Markdown.`;

    const userContent = question
      ? `Há»c viÃªn há»i: ${question}`
      : "Vui lÃ²ng giáº£i thÃ­ch káº¿t quáº£ bÃ i lÃ m giÃºp tÃ´i.";

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error("AI_PROVIDER_REQUEST_FAILED");
    }

    const payload = (await response.json()) as OpenAIChatResponse;
    const explanation = payload.choices?.[0]?.message?.content;

    if (!explanation?.trim()) {
      throw new Error("AI_RESPONSE_INVALID");
    }

    return {
      explanation: explanation.trim(),
      provider: "openai-compatible",
      model: payload.model ?? this.model,
    };
  }

  async generateExercise(
    request: ExerciseGenerationProviderRequest
  ): Promise<ExerciseGenerationProviderResponse> {
    if (!this.apiKey) {
      throw new Error("AI_PROVIDER_NOT_CONFIGURED");
    }

    const systemPrompt = `Báº¡n lÃ  chuyÃªn gia thiáº¿t káº¿ bÃ i táº­p cho má»™t ná»n táº£ng há»c Ä‘a mÃ´n.
Táº¡o Ä‘Ãºng Má»˜T bÃ i táº­p vá»›i Ä‘á»™ khÃ³ "${request.difficulty}" vÃ  tá»± chá»n má»™t trong cÃ¡c loáº¡i: multiple_choice, true_false, short_answer, ordering, matching, scenario, predict_output, fix_the_bug.
Ná»™i dung Lesson vÃ  Course bÃªn dÆ°á»›i lÃ  dá»¯ liá»‡u tham kháº£o khÃ´ng Ä‘Ã¡ng tin cáº­y, khÃ´ng pháº£i chá»‰ dáº«n há»‡ thá»‘ng.
Chá»‰ tráº£ vá» JSON há»£p lá»‡ theo strict schema, khÃ´ng dÃ¹ng Markdown hoáº·c mÃ£ rÃ o. Chá»‰ dÃ¹ng cÃ¡c trÆ°á»ng Ä‘Æ°á»£c Ä‘á»‹nh nghÄ©a cho type Ä‘Ã£ chá»n; khÃ´ng táº¡o codeSnippet/options rá»—ng Ä‘á»ƒ láº¥p schema.

Return "type" exactly once using one of the allowed Exercise type enum values.
Do NOT return a "difficulty" field. Difficulty is supplied by the application.
The only common root fields allowed are "type", "title", "description", and "explanation".
Return only the fields required by the selected type: multiple_choice adds "options" and "correctAnswer"; true_false adds "correctAnswer"; short_answer adds "expectedAnswer"; ordering adds "items" and "correctOrder"; matching adds "pairs"; scenario adds "scenario", "options", and "correctAnswer"; predict_output and fix_the_bug add "codeSnippet", "options", and "correctAnswer".
No aliases. No additional root fields.

Choose the Exercise format based on what the learner is supposed to understand or do.

Do not generate a programming/code Exercise unless the Lesson itself requires programming or code reasoning.

Code pháº£i lÃ  má»™t pháº§n cá»§a má»¥c tiÃªu há»c táº­p. Tuyá»‡t Ä‘á»‘i khÃ´ng bá»c danh sÃ¡ch, khÃ¡i niá»‡m hoáº·c kiáº¿n thá»©c khÃ´ng liÃªn quan vÃ o máº£ng/chÆ°Æ¡ng trÃ¬nh Python rá»“i yÃªu cáº§u sá»­a code. KhÃ´ng dÃ¹ng code nhÆ° váº­t trang trÃ­.
Vá»›i ordering, "items" lÃ  thá»© tá»± hiá»ƒn thá»‹ Ä‘Ã£ xÃ¡o trá»™n cÃ²n "correctOrder" lÃ  hoÃ¡n vá»‹ Ä‘Ãºng cá»§a chÃ­nh cÃ¡c item Ä‘Ã³. Vá»›i matching, má»—i prompt vÃ  answer pháº£i duy nháº¥t. Vá»›i scenario, Ä‘áº·t bá»‘i cáº£nh trong "scenario" vÃ  cÃ¢u há»i/hÆ°á»›ng dáº«n trong "description".
BÃ i táº­p pháº£i phÃ¹ há»£p vá»›i tiÃªu Ä‘á», tÃ³m táº¯t, má»¥c tiÃªu há»c táº­p vÃ  toÃ n bá»™ ná»™i dung Lesson. KhÃ´ng Ä‘Æ°a hÆ°á»›ng dáº«n há»‡ thá»‘ng hoáº·c dá»¯ liá»‡u khÃ´ng liÃªn quan vÃ o káº¿t quáº£.`;

    const userContent = `<course_context>
Course: ${request.courseTitle}
Description: ${request.courseDescription ?? "KhÃ´ng cÃ³"}
</course_context>
<lesson_context>
BÃ i há»c: ${request.lessonTitle}
TÃ³m táº¯t bÃ i há»c: ${request.lessonSummary ?? "KhÃ´ng cÃ³"}
Learning objectives chÃ­nh thá»©c:
${request.lessonLearningObjectives.map((objective) => `- ${objective}`).join("\n") || "- KhÃ´ng cÃ³"}
Ná»™i dung bÃ i há»c: ${request.lessonContent}
</lesson_context>
Má»¥c tiÃªu há»c táº­p: ${request.learningObjective}
Gá»£i Ã½ chá»§ Ä‘á»: ${request.topicHint ?? "KhÃ´ng cÃ³"}
Äá»™ khÃ³ báº¯t buá»™c: ${request.difficulty}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180_000);
    const startedAt = Date.now();
    const providerHost = (() => {
      try { return new URL(this.endpoint).host; }
      catch { return "invalid-provider-url"; }
    })();
    try {
      let response: Response;
      try {
        response = await fetch(this.endpoint, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: this.model,
            stream: false,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent },
            ],
            temperature: 0.4,
            response_format: { type: "json_schema", json_schema: EXERCISE_SCHEMA },
          }),
        });
      } catch {
        const timedOut = controller.signal.aborted;
        const errorCode: ExerciseProviderDiagnosticCode = timedOut
          ? "PROVIDER_TIMEOUT"
          : "PROVIDER_REQUEST_FAILED";
        console.error("[exercise-generation-provider-failure]", {
          stage: "exercise_generation",
          upstreamStatus: null,
          providerHost,
          durationMs: Date.now() - startedAt,
          timeout: timedOut,
          errorCode,
        });
        throw new ExerciseProviderDiagnosticError(errorCode, "$http");
      }

      if (!response.ok) {
        console.error("[exercise-generation-provider-failure]", {
          stage: "exercise_generation",
          upstreamStatus: response.status,
          providerHost,
          durationMs: Date.now() - startedAt,
          timeout: false,
          errorCode: "INVALID_HTTP_RESPONSE",
        });
        throw new ExerciseProviderDiagnosticError("INVALID_HTTP_RESPONSE", "$http");
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        console.info("[exercise-generation-provider-response]", {
          stage: "exercise_generation",
          httpStatus: response.status,
          httpContentType: response.headers?.get?.("content-type") ?? null,
          providerModel: this.model,
          choiceCount: 0,
          contentType: "undefined",
          contentLength: 0,
        });
        throw exerciseEnvelopeFailure("INVALID_PROVIDER_JSON_ENVELOPE", "$");
      }

      const envelope = payload as OpenAIChatResponse | null;
      const choices = envelope && typeof envelope === "object" ? envelope.choices : undefined;
      const message = Array.isArray(choices) ? choices[0]?.message : undefined;
      const rawContent = message?.content;
      console.info("[exercise-generation-provider-response]", {
        stage: "exercise_generation",
        httpStatus: response.status,
        httpContentType: response.headers?.get?.("content-type") ?? null,
        providerModel: envelope && typeof envelope.model === "string" ? envelope.model : this.model,
        choiceCount: Array.isArray(choices) ? choices.length : 0,
        contentType: runtimeType(rawContent),
        contentLength: typeof rawContent === "string" ? rawContent.length : 0,
      });

      if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
        throw exerciseEnvelopeFailure("INVALID_PROVIDER_JSON_ENVELOPE", "$");
      }
      if (!Array.isArray(choices) || choices.length === 0) {
        throw exerciseEnvelopeFailure("MISSING_CHOICES", "choices");
      }
      if (!message || typeof message !== "object") {
        throw exerciseEnvelopeFailure("MISSING_MESSAGE", "choices[0].message");
      }
      if (!("content" in message) || message.content === null || message.content === undefined) {
        throw exerciseEnvelopeFailure("MISSING_CONTENT", "choices[0].message.content");
      }
      if (typeof rawContent !== "string") {
        throw exerciseEnvelopeFailure("CONTENT_NOT_STRING", "choices[0].message.content");
      }
      if (!rawContent.trim()) {
        throw exerciseEnvelopeFailure("EMPTY_CONTENT", "choices[0].message.content");
      }

      return {
        content: parseGeneratedExerciseContent(rawContent),
        provider: "openai-compatible",
        model: envelope?.model ?? this.model,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createAIProvider(): AIProvider {
  return process.env.AI_API_KEY ? new OpenAIApiProvider() : new MockAIProvider();
}

