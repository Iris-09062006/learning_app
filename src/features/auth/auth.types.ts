export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "LESSON_LOCKED"
  | "COURSE_NOT_ENROLLED"
  | "EXERCISE_NOT_AVAILABLE"
  | "INVALID_EXERCISE_ANSWER"
  | "AI_PROVIDER_ERROR"
  | "AI_RESPONSE_INVALID"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export type UserRole = "learner" | "moderator" | "admin";

export interface CurrentUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  isActive: boolean;
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    username: string;
    role: "learner";
  };
  requiresEmailConfirmation: boolean;
}

export interface LoginResponse {
  user: CurrentUser;
}

export interface LogoutResponse {
  loggedOut: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
