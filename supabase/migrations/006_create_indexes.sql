create index idx_course_enrollments_user_id on public.course_enrollments(user_id);
create index idx_course_enrollments_course_id on public.course_enrollments(course_id);
create index idx_chapters_course_order on public.chapters(course_id, chapter_order);
create index idx_lessons_chapter_order on public.lessons(chapter_id, lesson_order);
create index idx_exercises_lesson_order on public.exercises(lesson_id, exercise_order);
create index idx_exercise_options_exercise_id on public.exercise_options(exercise_id);
create index idx_user_progress_user_id on public.user_progress(user_id);
create index idx_user_progress_lesson_id on public.user_progress(lesson_id);
create index idx_submissions_user_exercise
  on public.submissions(user_id, exercise_id, submitted_at desc);
create index idx_ai_explanations_submission_id on public.ai_explanations(submission_id);
