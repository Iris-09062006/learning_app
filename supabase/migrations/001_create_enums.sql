create type public.user_role as enum ('learner', 'moderator', 'admin');
create type public.enrollment_status as enum ('active', 'completed', 'cancelled');
create type public.exercise_type as enum ('fix_the_bug', 'predict_output');
create type public.difficulty_level as enum ('easy', 'medium', 'hard');
create type public.exercise_source as enum ('manual', 'ai_generated');
create type public.progress_status as enum (
  'locked', 'unlocked', 'in_progress', 'completed'
);
create type public.ai_response_status as enum ('success', 'failed');
