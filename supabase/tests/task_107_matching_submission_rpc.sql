begin;

select plan(8);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '10700000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'matching-rpc@example.test', '', now(),
  '{}'::jsonb, '{"username":"matching-rpc"}'::jsonb, now(), now()
);

insert into public.courses (id, title, slug, is_published)
values (9107, 'Matching RPC Course', 'matching-rpc-course', true);
insert into public.chapters (id, course_id, title, chapter_order, is_published)
values (9107, 9107, 'Matching RPC Chapter', 1, true);
insert into public.lessons (id, chapter_id, title, lesson_order, is_published)
values (9107, 9107, 'Matching RPC Lesson', 1, true);
insert into public.exercises (id, lesson_id, title, exercise_type, exercise_order, is_published)
values
  (91071, 9107, 'Matching RPC Exercise', 'matching', 1, true),
  (91072, 9107, 'Multiple choice RPC Exercise', 'multiple_choice', 2, true),
  (91073, 9107, 'True false RPC Exercise', 'true_false', 3, true);
insert into public.exercise_options (id, exercise_id, content, option_order)
values
  (910711, 91071, 'Left one', 1), (910712, 91071, 'Left two', 2),
  (910721, 91072, 'Correct choice', 1), (910722, 91072, 'Incorrect choice', 2),
  (910731, 91073, 'True', 1), (910732, 91073, 'False', 2);
insert into public.exercise_solutions (exercise_id, solution)
values
  (91071, '{"matches":{"910711":"Right one","910712":"Right two"}}'::jsonb),
  (91072, '{"correctOptionId":910721}'::jsonb),
  (91073, '{"correctOptionId":910731}'::jsonb);
insert into public.course_enrollments (user_id, course_id)
values ('10700000-0000-4000-8000-000000000001', 9107);
insert into public.user_progress (user_id, lesson_id, status)
values ('10700000-0000-4000-8000-000000000001', 9107, 'in_progress');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10700000-0000-4000-8000-000000000001', true);

select is(
  (public.submit_exercise(91071, '{"matches":[{"optionId":910711,"answer":"Right one"},{"optionId":910712,"answer":"Right two"}]}'::jsonb)->>'is_correct')::boolean,
  true,
  'valid matching answer is evaluated as correct by the real RPC'
);
select is(
  (select is_correct from public.submissions where exercise_id = 91071 order by attempt_number desc limit 1),
  true,
  'valid matching answer is persisted by the real RPC'
);
select is(
  (public.submit_exercise(91071, '{"matches":[{"optionId":910711,"answer":"Right two"},{"optionId":910712,"answer":"Right one"}]}'::jsonb)->>'is_correct')::boolean,
  false,
  'incorrect matching answer is evaluated as incorrect by the real RPC'
);
select is(
  (select is_correct from public.submissions where exercise_id = 91071 order by attempt_number desc limit 1),
  false,
  'incorrect matching answer is persisted by the real RPC'
);
select is(
  (public.submit_exercise(91072, '{"selectedOptionId":910721}'::jsonb)->>'is_correct')::boolean,
  true,
  'multiple_choice evaluation remains correct'
);
select is(
  (select is_correct from public.submissions where exercise_id = 91072 order by attempt_number desc limit 1),
  true,
  'multiple_choice submission remains persisted'
);
select is(
  (public.submit_exercise(91073, '{"selectedOptionId":910731}'::jsonb)->>'is_correct')::boolean,
  true,
  'true_false evaluation remains correct'
);
select is(
  (select is_correct from public.submissions where exercise_id = 91073 order by attempt_number desc limit 1),
  true,
  'true_false submission remains persisted'
);

select * from finish();

rollback;

