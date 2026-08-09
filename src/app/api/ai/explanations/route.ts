import { NextResponse } from "next/server";

import {
  AiServiceError,
  requestAiExplanation,
} from "@/features/ai/services/ai-service";

interface CreateExplanationBody {
  submissionId?: unknown;
  question?: unknown;
}

function validateBody(body: CreateExplanationBody): {
  submissionId: number;
  question: string | undefined;
} | null {
  if (!Number.isInteger(body.submissionId) || (body.submissionId as number) < 1) {
    return null;
  }

  let question: string | undefined;

  if (body.question !== undefined) {
    if (typeof body.question !== "string" || body.question.trim().length === 0) {
      return null;
    }

    if (body.question.length > 1000) {
      return null;
    }

    question = body.question.trim();
  }

  return {
    submissionId: body.submissionId as number,
    question,
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: CreateExplanationBody;

  try {
    body = (await request.json()) as CreateExplanationBody;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON body.",
        },
      },
      { status: 400 }
    );
  }

  const validated = validateBody(body);

  if (!validated) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message:
            "submissionId must be a positive integer and question must be a string up to 1000 characters.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const explanation = await requestAiExplanation({
      submissionId: validated.submissionId,
      userQuestion: validated.question,
    });

    const { userQuestion, ...rest } = explanation;

    return NextResponse.json({
      success: true,
      data: {
        explanation: {
          ...rest,
          userQuestion,
        },
      },
    });
  } catch (error: unknown) {
    if (error instanceof AiServiceError) {
      const statusCodeMap: Record<string, number> = {
        UNAUTHENTICATED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        AI_PROVIDER_ERROR: 502,
        DATABASE_ERROR: 500,
      };

      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: statusCodeMap[error.code] ?? 500 }
      );
    }

    console.error("[POST /api/ai/explanations]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to create the AI explanation.",
        },
      },
      { status: 500 }
    );
  }
}