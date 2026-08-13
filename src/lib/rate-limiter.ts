interface RateLimitBucket {
  timestamps: number[];
}

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

interface RateLimitRule {
  limit: number;
  windowMs: number;
}

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const rules = new Map<string, RateLimitRule>([
  ["auth:login", { limit: 10, windowMs: 10 * 60 * 1000 }],
  ["auth:register", { limit: 5, windowMs: WINDOW_MS }],
  ["auth:forgot-password", { limit: 5, windowMs: WINDOW_MS }],
  ["admin:password-recovery", { limit: 5, windowMs: WINDOW_MS }],
  ["ai:explanations", { limit: 20, windowMs: WINDOW_MS }],
  ["ai:course-outline", { limit: 20, windowMs: WINDOW_MS }],
  ["ai:lesson-content", { limit: 20, windowMs: WINDOW_MS }],
  ["content-source:url", { limit: 20, windowMs: WINDOW_MS }],
  ["ai:exercise-generation", { limit: 20, windowMs: WINDOW_MS }],
  ["moderation:mutations", { limit: 30, windowMs: WINDOW_MS }],
]);

const buckets = new Map<string, RateLimitBucket>();

function cleanup(key: string, windowMs: number, now: number): void {
  const bucket = buckets.get(key);
  if (!bucket) {
    return;
  }
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);
  if (bucket.timestamps.length === 0) {
    buckets.delete(key);
  }
}

function checkInMemoryRateLimit(
  scope: string,
  identifier: string
): RateLimitResult {
  const rule = rules.get(scope);
  if (!rule) {
    return { allowed: true };
  }

  const now = Date.now();
  const key = `${scope}:${identifier}`;

  cleanup(key, rule.windowMs, now);

  const bucket = buckets.get(key);
  if (!bucket) {
    buckets.set(key, { timestamps: [now] });
    return { allowed: true };
  }

  if (bucket.timestamps.length >= rule.limit) {
    const oldest = bucket.timestamps[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + rule.windowMs - now) / 1000)
    );
    return { allowed: false, retryAfterSeconds };
  }

  bucket.timestamps.push(now);
  return { allowed: true };
}

export function resetRateLimitBuckets(): void {
  buckets.clear();
}

export async function checkRateLimit(
  scope: string,
  identifier: string,
): Promise<RateLimitResult> {
  const rule = rules.get(scope);
  if (!rule) {
    return { allowed: true };
  }

  if (process.env.NODE_ENV !== "production") {
    return checkInMemoryRateLimit(scope, identifier);
  }

  try {
    const identifierHash = createHash("sha256").update(identifier).digest("hex");
    const { data, error } = await createAdminSupabaseClient().rpc(
      "consume_rate_limit",
      {
        p_scope: scope,
        p_identifier_hash: identifierHash,
        p_limit: rule.limit,
        p_window_seconds: Math.ceil(rule.windowMs / 1000),
      },
    );
    const result = data?.[0];
    if (error || !result) {
      return { allowed: false, retryAfterSeconds: 60 };
    }
    return result.allowed
      ? { allowed: true }
      : {
          allowed: false,
          retryAfterSeconds: Math.max(1, result.retry_after_seconds),
        };
  } catch {
    return { allowed: false, retryAfterSeconds: 60 };
  }
}
import { createHash } from "node:crypto";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
