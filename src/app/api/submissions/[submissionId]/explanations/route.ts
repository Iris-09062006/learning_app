import { NextResponse } from "next/server";

import {
  AiServiceError,
  getAiExplanationHistory,
} from "@/features/ai/services/ai-service";

interface RouteContext {
  params: Promise<{ submissionId: string }>;
}

export async function GET(
  _request: Request,
  context: RouteContext
): Promise<NextResponse> {
  const { submissionId: submissionIdParam } = await context.params;
  const submissionId = Number(submissionIdParam);

  if (!Number.isInteger(submissionId) || submissionId < 1) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "submissionId must be a positive integer.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const explanations = await getAiExplanationHistory(submissionId);

    return NextResponse.json({
      success: true,
      data: {
        explanations,
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

    console.error("[GET /api/ai/explanations]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to load AI explanation history.",
        },
      },
      { status: 500 }
    );
  }
}