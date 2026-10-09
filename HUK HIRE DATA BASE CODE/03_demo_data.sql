-- =====================================================================
--  HUK HIRE: demo question bank (optional, STAGING only)
--  Adds 3 sections and 12 questions with answer keys so you can build
--  and test an exam straight away. Safe to skip on production.
-- =====================================================================
do $$
declare s_java uuid; s_sql uuid; s_apt uuid; q uuid;
begin
  insert into public.sections (name, subject, description) values ('Core Java', 'Java', 'Language fundamentals, types and collections.') returning id into s_java;
  insert into public.sections (name, subject, description) values ('SQL Querying', 'Databases', 'Joins, aggregation and indexing.') returning id into s_sql;
  insert into public.sections (name, subject, description) values ('Quantitative Aptitude', 'Aptitude', 'Percentages, ratios and time-work.') returning id into s_apt;

  -- helper pattern: insert question, then its key
  insert into public.questions (section_id, type, prompt, options, marks, negative_marks, difficulty, tags)
  values (s_java, 'single', 'Which of the following is not a primitive type in Java?',
          '[{"id":"a","text":"int"},{"id":"b","text":"boolean"},{"id":"c","text":"String"},{"id":"d","text":"char"}]', 2, 0.5, 'easy', '{types}') returning id into q;
  insert into public.question_keys values (q, '["c"]', 'String is a class; the eight primitives are byte, short, int, long, float, double, boolean and char.');

  insert into public.questions (section_id, type, prompt, options, marks, negative_marks, difficulty, tags)
  values (s_java, 'multi', 'Which of these collections preserve insertion order when iterated? Select all that apply.',
          '[{"id":"a","text":"ArrayList"},{"id":"b","text":"HashSet"},{"id":"c","text":"LinkedHashMap"},{"id":"d","text":"TreeSet"}]', 3, 0, 'medium', '{collections}') returning id into q;
  insert into public.question_keys values (q, '["a","c"]', 'HashSet has no ordering guarantee; TreeSet sorts.');

  insert into public.questions (section_id, type, prompt, options, marks, negative_marks, difficulty, tags)
  values (s_java, 'truefalse', 'A method declared final can be overridden in a subclass.',
          '[{"id":"a","text":"True"},{"id":"b","text":"False"}]', 1, 0.25, 'easy', '{inheritance}') returning id into q;
  insert into public.question_keys values (q, '["b"]', 'final methods cannot be overridden.');

  insert into public.questions (section_id, type, prompt, marks, difficulty, tags)
  values (s_java, 'numeric', 'How many bytes does a Java long occupy?', 2, 'easy', '{types}') returning id into q;
  insert into public.question_keys values (q, '"8"', null);

  insert into public.questions (section_id, type, prompt, marks, difficulty, tags)
  values (s_java, 'short', 'Name the design pattern that ensures a class has exactly one instance.', 2, 'easy', '{patterns}') returning id into q;
  insert into public.question_keys values (q, '"Singleton"', null);

  insert into public.questions (section_id, type, prompt, options, marks, negative_marks, difficulty, tags)
  values (s_sql, 'single', 'Which join returns all rows from the left table and matching rows from the right table?',
          '[{"id":"a","text":"INNER JOIN"},{"id":"b","text":"LEFT JOIN"},{"id":"c","text":"CROSS JOIN"},{"id":"d","text":"SELF JOIN"}]', 2, 0.5, 'easy', '{joins}') returning id into q;
  insert into public.question_keys values (q, '["b"]', null);

  insert into public.questions (section_id, type, prompt, options, marks, negative_marks, difficulty, tags)
  values (s_sql, 'single', 'Which clause filters groups after aggregation?',
          '[{"id":"a","text":"WHERE"},{"id":"b","text":"HAVING"},{"id":"c","text":"GROUP BY"},{"id":"d","text":"ORDER BY"}]', 2, 0.5, 'medium', '{aggregation}') returning id into q;
  insert into public.question_keys values (q, '["b"]', null);

  insert into public.questions (section_id, type, prompt, marks, difficulty, tags)
  values (s_sql, 'short', 'Which normal form removes transitive dependencies?', 2, 'medium', '{normalisation}') returning id into q;
  insert into public.question_keys values (q, '"3NF"', null);

  insert into public.questions (section_id, type, prompt, marks, difficulty, tags)
  values (s_apt, 'numeric', 'A price rises from ₹800 to ₹1,000. What is the percentage increase?', 2, 'easy', '{percentages}') returning id into q;
  insert into public.question_keys values (q, '"25"', null);

  insert into public.questions (section_id, type, prompt, options, marks, negative_marks, difficulty, tags)
  values (s_apt, 'single', 'Two numbers are in the ratio 3 : 5 and their sum is 64. What is the larger number?',
          '[{"id":"a","text":"24"},{"id":"b","text":"36"},{"id":"c","text":"40"},{"id":"d","text":"44"}]', 2, 0.5, 'medium', '{ratios}') returning id into q;
  insert into public.question_keys values (q, '["c"]', null);

  insert into public.questions (section_id, type, prompt, options, marks, negative_marks, difficulty, tags)
  values (s_apt, 'single', 'A can finish a task in 6 days and B in 12 days. Together, how many days do they need?',
          '[{"id":"a","text":"3"},{"id":"b","text":"4"},{"id":"c","text":"6"},{"id":"d","text":"9"}]', 2, 0.5, 'medium', '{time-work}') returning id into q;
  insert into public.question_keys values (q, '["b"]', null);

  insert into public.questions (section_id, type, prompt, marks, difficulty, tags)
  values (s_apt, 'long', 'Explain how you would check whether a 10% discount followed by a 10% markup returns the original price.', 4, 'medium', '{reasoning}') returning id into q;
  insert into public.question_keys values (q, null, 'Full marks: shows 0.9 × 1.1 = 0.99, so the price ends 1% lower.');
end $$;

select s.name as section, count(q.id) as questions from public.sections s left join public.questions q on q.section_id = s.id group by s.name;
