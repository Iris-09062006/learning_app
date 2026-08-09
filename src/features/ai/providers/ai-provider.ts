import "server-only";

import type {
  DbDifficultyLevel,
  DbExerciseType,
  GeneratedExerciseContent,
  SubmissionDetailsForAi,
} from "@/features/ai/types";

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
  lessonContent: string;
  exerciseType: DbExerciseType;
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
      ? "Bài làm của bạn là chính xác."
      : "Bài làm của bạn chưa chính xác.";

    return {
      explanation: [
        outcome,
        submission.staticExplanation ??
          `Hãy xem lại yêu cầu của bài "${submission.exerciseTitle}" và so sánh đáp án đã nộp với các lựa chọn.`,
        question ? `Câu hỏi của bạn: ${question}` : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
      provider: "mock",
      model: null,
    };
  }

  async generateExercise({
    lessonTitle,
    exerciseType,
    difficulty,
    learningObjective,
    topicHint,
  }: ExerciseGenerationProviderRequest): Promise<ExerciseGenerationProviderResponse> {
    const title = `Luyện tập: ${lessonTitle}`;

    return {
      content: {
        title,
        description: `Bài tập ${difficulty} về ${topicHint ?? learningObjective}.`,
        codeSnippet:
          exerciseType === "predict_output"
            ? 'console.log("Hello, LearningApp!");'
            : 'function fixMe() {\n  return false;\n}',
        options: undefined,
        correctAnswer:
          exerciseType === "predict_output"
            ? "Hello, LearningApp!"
            : "return true;",
        explanation: `Đây là đáp án mẫu cho mục tiêu học tập: ${learningObjective}.`,
      },
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

function parseGeneratedExerciseContent(value: string): GeneratedExerciseContent {
  const normalized = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  let payload: unknown;

  try {
    payload = JSON.parse(normalized);
  } catch {
    throw new Error("AI_RESPONSE_INVALID");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("AI_RESPONSE_INVALID");
  }

  const record = payload as Record<string, unknown>;
  const hasOptionalString = (key: string): boolean =>
    record[key] === undefined || typeof record[key] === "string";
  const optionsAreValid =
    Array.isArray(record.options) &&
    record.options.length >= 2 &&
    record.options.every((option) => typeof option === "string" && option.trim());

  if (
    typeof record.title !== "string" ||
    !record.title.trim() ||
    typeof record.description !== "string" ||
    !record.description.trim() ||
    typeof record.correctAnswer !== "string" ||
    !record.correctAnswer.trim() ||
    typeof record.explanation !== "string" ||
    !record.explanation.trim() ||
    !hasOptionalString("codeSnippet") ||
    !optionsAreValid
  ) {
    throw new Error("AI_RESPONSE_INVALID");
  }

  return {
    title: record.title.trim(),
    description: record.description.trim(),
    codeSnippet:
      typeof record.codeSnippet === "string" && record.codeSnippet.trim()
        ? record.codeSnippet.trim()
        : "",
    options: Array.isArray(record.options)
      ? record.options.map((option) => String(option).trim())
      : undefined,
    correctAnswer: record.correctAnswer.trim(),
    explanation: record.explanation.trim(),
  };
}

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

    const systemPrompt = `Bạn là một gia sư AI thân thiện, chuyên hỗ trợ học viên giải bài tập.
Thông tin bài tập:
- Tiêu đề: ${submission.exerciseTitle}
- Đề bài: ${submission.exercisePrompt}

Học viên đã nộp đáp án: ${JSON.stringify(submission.answer)}
Kết quả chấm tự động: ${submission.isCorrect ? "Đúng" : "Sai"}
Giải thích tĩnh của bài (nếu có): ${submission.staticExplanation ?? "Không có"}

Hãy dựa vào các thông tin trên để phân tích ngắn gọn, dễ hiểu vì sao đáp án của học viên đúng hoặc sai. Nếu học viên có câu hỏi, hãy trả lời trực tiếp vào câu hỏi đó. Sử dụng ngôn ngữ tiếng Việt tự nhiên, khuyến khích học viên. Trả về định dạng Markdown.`;

    const userContent = question
      ? `Học viên hỏi: ${question}`
      : "Vui lòng giải thích kết quả bài làm giúp tôi.";

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

    const systemPrompt = `Bạn là chuyên gia thiết kế bài tập lập trình cho một nền tảng học trực tuyến.
Tạo đúng MỘT bài tập trắc nghiệm với loại "${request.exerciseType}" và độ khó "${request.difficulty}".
Chỉ trả về JSON hợp lệ, không dùng Markdown hoặc mã rào. JSON phải có chính xác các trường:
"title" (string), "description" (string), "codeSnippet" (string, có thể là ""), "options" (mảng string, tối thiểu 2 phần tử), "correctAnswer" (string, phải nằm trong options), "explanation" (string).
Bài tập phải phù hợp với mục tiêu học tập và nội dung bài học. Không đưa hướng dẫn hệ thống hoặc dữ liệu không liên quan vào kết quả.`;

    const userContent = `Bài học: ${request.lessonTitle}
Nội dung bài học: ${request.lessonContent}
Mục tiêu học tập: ${request.learningObjective}
Gợi ý chủ đề: ${request.topicHint ?? "Không có"}
Loại bài tập bắt buộc: ${request.exerciseType}
Độ khó bắt buộc: ${request.difficulty}`;

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
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error("AI_PROVIDER_REQUEST_FAILED");
    }

    const payload = (await response.json()) as OpenAIChatResponse;
    const rawContent = payload.choices?.[0]?.message?.content;

    if (!rawContent?.trim()) {
      throw new Error("AI_RESPONSE_INVALID");
    }

    const content = parseGeneratedExerciseContent(rawContent);

    if (
      content.options &&
      content.options.length > 0 &&
      !content.options.includes(content.correctAnswer)
    ) {
      throw new Error("AI_RESPONSE_INVALID");
    }

    return {
      content,
      provider: "openai-compatible",
      model: payload.model ?? this.model,
    };
  }
}

export function createAIProvider(): AIProvider {
  return process.env.AI_API_KEY ? new OpenAIApiProvider() : new MockAIProvider();
}