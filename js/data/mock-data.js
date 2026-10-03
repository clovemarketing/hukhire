/* =========================================================
   HUK HIRE: mock fixtures
   Shapes follow spec §19 so the same objects can come from the
   real API later. Times are relative to "now" so live/upcoming
   states always make sense during a demo.
   ========================================================= */
(function () {
  const NOW = Date.now();
  const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
  const at = (ms) => new Date(NOW + ms).toISOString();

  // Small seeded RNG so generated data is stable between reloads
  let s = 20260214;
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const between = (a, b) => Math.round(a + rnd() * (b - a));

  /* ---------------- Users ---------------- */
  const admins = [
    { id: 'adm_001', role: 'admin', roleId: 'super_admin', name: 'Ananya Rao', email: 'admin@hukhire.com', phone: '+91 98480 11223', title: 'Head of Assessments', status: 'active', lastActiveAt: at(-4 * MIN), createdAt: at(-400 * DAY) },
    { id: 'adm_002', role: 'admin', roleId: 'exam_manager', name: 'Vikram Shah', email: 'vikram.shah@hukhire.com', phone: '+91 98220 45110', title: 'Exam Operations Lead', status: 'active', lastActiveAt: at(-2 * HOUR), createdAt: at(-210 * DAY) },
    { id: 'adm_003', role: 'admin', roleId: 'reviewer', name: 'Meera Iyer', email: 'meera.iyer@hukhire.com', phone: '', title: 'Results Reviewer', status: 'invited', lastActiveAt: null, createdAt: at(-2 * DAY) }
  ];
  const proctors = [
    { id: 'prc_001', role: 'proctor', name: 'Daniel Fernandes', email: 'proctor@hukhire.com', phone: '+91 99000 22118', availability: 'online', status: 'active', device: { camera: 'ready', mic: 'ready', bandwidth: '48 Mbps' }, sessionsCompleted: 142, rating: 4.8, timezone: 'Asia/Kolkata', createdAt: at(-300 * DAY) },
    { id: 'prc_002', role: 'proctor', name: 'Kavya Menon', email: 'kavya.menon@hukhire.com', phone: '+91 99001 77001', availability: 'busy', status: 'active', device: { camera: 'ready', mic: 'ready', bandwidth: '32 Mbps' }, sessionsCompleted: 96, rating: 4.7, timezone: 'Asia/Kolkata', createdAt: at(-260 * DAY) },
    { id: 'prc_003', role: 'proctor', name: 'Rahul Verma', email: 'rahul.verma@hukhire.com', phone: '+91 98110 30442', availability: 'away', status: 'active', device: { camera: 'ready', mic: 'check', bandwidth: '18 Mbps' }, sessionsCompleted: 58, rating: 4.5, timezone: 'Asia/Kolkata', createdAt: at(-150 * DAY) },
    { id: 'prc_004', role: 'proctor', name: 'Sara Thomas', email: 'sara.thomas@hukhire.com', phone: '+91 97400 66520', availability: 'online', status: 'active', device: { camera: 'ready', mic: 'ready', bandwidth: '64 Mbps' }, sessionsCompleted: 77, rating: 4.9, timezone: 'Asia/Kolkata', createdAt: at(-120 * DAY) },
    { id: 'prc_005', role: 'proctor', name: 'Arjun Pillai', email: 'arjun.pillai@hukhire.com', phone: '+91 96860 10293', availability: 'offline', status: 'deactivated', device: { camera: 'failed', mic: 'ready', bandwidth: '—' }, sessionsCompleted: 21, rating: 4.1, timezone: 'Asia/Kolkata', createdAt: at(-90 * DAY) }
  ];
  const studentNames = [
    ['Priya Sharma', 'student@hukhire.com', 'Andhra University', 'B.Tech CSE'],
    ['Aditya Kumar', 'aditya.kumar@mail.com', 'GITAM University', 'B.Tech IT'],
    ['Neha Reddy', 'neha.reddy@mail.com', 'JNTU Kakinada', 'MCA'],
    ['Rohan Gupta', 'rohan.gupta@mail.com', 'VIT Vellore', 'B.Tech CSE'],
    ['Sneha Patel', 'sneha.patel@mail.com', 'NIT Warangal', 'M.Tech'],
    ['Karthik Nair', 'karthik.nair@mail.com', 'Anna University', 'B.E. ECE'],
    ['Fatima Sheikh', 'fatima.sheikh@mail.com', 'Osmania University', 'B.Sc CS'],
    ['Varun Joshi', 'varun.joshi@mail.com', 'IIIT Hyderabad', 'B.Tech CSE'],
    ['Ishita Bose', 'ishita.bose@mail.com', 'Jadavpur University', 'B.E. IT'],
    ['Manoj Das', 'manoj.das@mail.com', 'KIIT Bhubaneswar', 'B.Tech CSE'],
    ['Divya Krishnan', 'divya.k@mail.com', 'Amrita University', 'B.Tech AI'],
    ['Sameer Khan', 'sameer.khan@mail.com', 'Andhra University', 'MBA'],
    ['Lakshmi Prasad', 'lakshmi.p@mail.com', 'GVP College', 'B.Tech CSE'],
    ['Tanvi Mehta', 'tanvi.mehta@mail.com', 'Pune University', 'BCA'],
    ['Harsha Vardhan', 'harsha.v@mail.com', 'Vignan Institute', 'B.Tech IT'],
    ['Ayesha Begum', 'ayesha.b@mail.com', 'Raghu Engineering College', 'B.Tech CSE']
  ];
  const students = studentNames.map(([name, email, institution, program], i) => ({
    id: 'stu_' + String(i + 1).padStart(3, '0'),
    role: 'student', name, email, institution, program,
    phone: '+91 9' + String(800000000 + i * 7919).slice(0, 9),
    status: i === 12 ? 'deactivated' : (i === 15 ? 'pending' : 'active'),
    group: i < 8 ? 'Campus Drive 2026, Batch A' : 'Campus Drive 2026, Batch B',
    createdAt: at(-(60 - i) * DAY),
    lastActiveAt: at(-between(1, 72) * HOUR)
  }));
  students[0].lastActiveAt = at(-10 * MIN);

  /* ---------------- Sections / categories ---------------- */
  const sections = [
    { id: 'sec_java_core', name: 'Core Java', subject: 'Java', description: 'Language fundamentals, types, collections and memory.' },
    { id: 'sec_oop', name: 'OOP & Design', subject: 'Java', description: 'Object-oriented principles and common design patterns.' },
    { id: 'sec_problem', name: 'Problem Solving', subject: 'Algorithms', description: 'Complexity, data structures and reasoning.' },
    { id: 'sec_sql', name: 'SQL Querying', subject: 'Databases', description: 'Joins, aggregation, indexing and normalisation.' },
    { id: 'sec_apt', name: 'Quantitative Aptitude', subject: 'Aptitude', description: 'Arithmetic, percentages, ratios and data interpretation.' },
    { id: 'sec_python', name: 'Python Backend', subject: 'Python', description: 'Python language, APIs and async patterns.' },
    { id: 'sec_comm', name: 'Business Communication', subject: 'Communication', description: 'Written clarity, tone and comprehension.' }
  ];

  /* ---------------- Question bank ---------------- */
  const o = (...texts) => texts.map((t, i) => ({ id: 'abcdefgh'[i], text: t }));
  const questions = [
    { id: 'q_001', type: 'single', sectionId: 'sec_java_core', difficulty: 'easy', tags: ['types'], marks: 2, negativeMarks: 0.5,
      prompt: 'Which of the following is not a primitive type in Java?', options: o('int', 'boolean', 'String', 'char'), answer: ['c'],
      explanation: 'String is a class in java.lang; the eight primitives are byte, short, int, long, float, double, boolean and char.' },
    { id: 'q_002', type: 'single', sectionId: 'sec_java_core', difficulty: 'medium', tags: ['strings', 'memory'], marks: 2, negativeMarks: 0.5,
      prompt: 'What does this program print?', code: 'String a = "hire";\nString b = "hi" + "re";\nSystem.out.println(a == b);',
      options: o('true', 'false', 'It does not compile', 'It throws a runtime exception'), answer: ['a'],
      explanation: '"hi" + "re" is a compile-time constant, so both references point to the same interned literal.' },
    { id: 'q_003', type: 'multi', sectionId: 'sec_java_core', difficulty: 'medium', tags: ['collections'], marks: 3, negativeMarks: 0,
      prompt: 'Which of these collections preserve insertion order when iterated? Select all that apply.', options: o('ArrayList', 'HashSet', 'LinkedHashMap', 'TreeSet', 'LinkedList'), answer: ['a', 'c', 'e'],
      explanation: 'HashSet has no ordering guarantee and TreeSet sorts by natural or comparator order.' },
    { id: 'q_004', type: 'truefalse', sectionId: 'sec_java_core', difficulty: 'easy', tags: ['inheritance'], marks: 1, negativeMarks: 0.25,
      prompt: 'A method declared final can be overridden in a subclass.', options: o('True', 'False'), answer: ['b'],
      explanation: 'final methods cannot be overridden.' },
    { id: 'q_005', type: 'single', sectionId: 'sec_java_core', difficulty: 'easy', tags: ['types'], marks: 1, negativeMarks: 0.25,
      prompt: 'What is the default value of an uninitialised int instance field?', options: o('0', 'null', '-1', 'It has no default; compilation fails'), answer: ['a'] },
    { id: 'q_006', type: 'numeric', sectionId: 'sec_java_core', difficulty: 'easy', tags: ['types'], marks: 2, negativeMarks: 0,
      prompt: 'How many bytes does a Java long occupy?', options: [], answer: '8' },
    { id: 'q_007', type: 'single', sectionId: 'sec_oop', difficulty: 'medium', tags: ['solid'], marks: 2, negativeMarks: 0.5,
      prompt: 'Objects of a superclass should be replaceable with objects of its subclasses without breaking the program. Which principle is this?',
      options: o('Single Responsibility', 'Open/Closed', 'Liskov Substitution', 'Dependency Inversion'), answer: ['c'] },
    { id: 'q_008', type: 'single', sectionId: 'sec_oop', difficulty: 'easy', tags: ['inheritance'], marks: 1, negativeMarks: 0.25,
      prompt: 'Which keyword lets a class inherit from another class?', options: o('implements', 'extends', 'inherits', 'super'), answer: ['b'] },
    { id: 'q_009', type: 'multi', sectionId: 'sec_oop', difficulty: 'medium', tags: ['abstraction'], marks: 3, negativeMarks: 0,
      prompt: 'Which of these are ways to achieve abstraction in Java? Select all that apply.', options: o('Abstract classes', 'Interfaces', 'Final classes', 'Static nested classes'), answer: ['a', 'b'] },
    { id: 'q_010', type: 'truefalse', sectionId: 'sec_oop', difficulty: 'easy', tags: ['interfaces'], marks: 1, negativeMarks: 0.25,
      prompt: 'Since Java 8, an interface can contain default methods with an implementation.', options: o('True', 'False'), answer: ['a'] },
    { id: 'q_011', type: 'short', sectionId: 'sec_oop', difficulty: 'easy', tags: ['patterns'], marks: 2, negativeMarks: 0,
      prompt: 'Name the design pattern that ensures a class has exactly one instance and provides a global access point to it.', options: [], answer: 'Singleton' },
    { id: 'q_012', type: 'single', sectionId: 'sec_problem', difficulty: 'easy', tags: ['complexity'], marks: 2, negativeMarks: 0.5,
      prompt: 'What is the worst-case time complexity of binary search on a sorted array of n elements?', options: o('O(1)', 'O(log n)', 'O(n)', 'O(n log n)'), answer: ['b'] },
    { id: 'q_013', type: 'numeric', sectionId: 'sec_problem', difficulty: 'medium', tags: ['number-systems'], marks: 2, negativeMarks: 0,
      prompt: 'What value does Integer.parseInt("1010", 2) return?', options: [], answer: '10' },
    { id: 'q_014', type: 'long', sectionId: 'sec_problem', difficulty: 'hard', tags: ['linked-list'], marks: 6, negativeMarks: 0,
      prompt: 'Explain how you would detect a cycle in a singly linked list. State the time and space complexity of your approach.', options: [], answer: null },
    { id: 'q_015', type: 'single', sectionId: 'sec_problem', difficulty: 'hard', tags: ['caching', 'design'], marks: 3, negativeMarks: 0.5,
      prompt: 'Which combination of data structures gives O(1) get and put for an LRU cache?', options: o('Array and binary search', 'HashMap and doubly linked list', 'Two stacks', 'Min-heap and HashSet'), answer: ['b'] },
    { id: 'q_016', type: 'single', sectionId: 'sec_sql', difficulty: 'easy', tags: ['joins'], marks: 2, negativeMarks: 0.5,
      prompt: 'Which join returns all rows from the left table and matching rows from the right table?', options: o('INNER JOIN', 'LEFT JOIN', 'CROSS JOIN', 'SELF JOIN'), answer: ['b'] },
    { id: 'q_017', type: 'single', sectionId: 'sec_sql', difficulty: 'medium', tags: ['aggregation'], marks: 2, negativeMarks: 0.5,
      prompt: 'Which clause filters groups after aggregation?', options: o('WHERE', 'HAVING', 'GROUP BY', 'ORDER BY'), answer: ['b'] },
    { id: 'q_018', type: 'truefalse', sectionId: 'sec_sql', difficulty: 'medium', tags: ['indexing'], marks: 1, negativeMarks: 0.25,
      prompt: 'Adding an index always makes INSERT statements faster.', options: o('True', 'False'), answer: ['b'] },
    { id: 'q_019', type: 'short', sectionId: 'sec_sql', difficulty: 'medium', tags: ['normalisation'], marks: 2, negativeMarks: 0,
      prompt: 'Which normal form removes transitive dependencies?', options: [], answer: '3NF' },
    { id: 'q_020', type: 'numeric', sectionId: 'sec_apt', difficulty: 'easy', tags: ['percentages'], marks: 2, negativeMarks: 0,
      prompt: 'A price rises from ₹800 to ₹1,000. What is the percentage increase?', options: [], answer: '25' },
    { id: 'q_021', type: 'single', sectionId: 'sec_apt', difficulty: 'medium', tags: ['ratios'], marks: 2, negativeMarks: 0.5,
      prompt: 'Two numbers are in the ratio 3 : 5 and their sum is 64. What is the larger number?', options: o('24', '36', '40', '44'), answer: ['c'] },
    { id: 'q_022', type: 'single', sectionId: 'sec_apt', difficulty: 'medium', tags: ['time-work'], marks: 2, negativeMarks: 0.5,
      prompt: 'A can finish a task in 6 days and B in 12 days. Working together, how many days do they need?', options: o('3', '4', '6', '9'), answer: ['b'] },
    { id: 'q_023', type: 'single', sectionId: 'sec_python', difficulty: 'medium', tags: ['async'], marks: 2, negativeMarks: 0.5,
      prompt: 'Which keyword pauses a coroutine until an awaitable completes?', options: o('yield', 'await', 'async', 'defer'), answer: ['b'] },
    { id: 'q_024', type: 'long', sectionId: 'sec_comm', difficulty: 'medium', tags: ['writing'], marks: 5, negativeMarks: 0,
      prompt: 'A client’s release has slipped by one week. Write a short email informing them, explaining the reason and the new date.', options: [], answer: null }
  ].map((q) => ({ ...q, status: 'active', createdAt: at(-between(20, 200) * DAY), updatedAt: at(-between(1, 19) * DAY), usedIn: 0 }));

  const javaQs = questions.filter((q) => ['sec_java_core', 'sec_oop', 'sec_problem'].includes(q.sectionId)).map((q) => q.id);
  const sqlQs = questions.filter((q) => q.sectionId === 'sec_sql').map((q) => q.id);
  const aptQs = questions.filter((q) => q.sectionId === 'sec_apt').map((q) => q.id);

  /* ---------------- Exams ---------------- */
  const defaultInstructions = [
    'Keep your face clearly visible to the camera for the whole exam.',
    'Do not switch tabs, open other applications or use a second screen. Each tab switch is recorded and shared with your proctor.',
    'Answers save automatically. You can move between questions and change answers until you submit.',
    'Use “Mark for review” to flag questions you want to revisit before submitting.',
    'The exam submits automatically when the timer reaches zero.'
  ];
  const baseSecurity = { tabPolicy: 'warn', maxTabSwitches: 3, copyPaste: false, fullscreen: true, browserLock: false, ipRestriction: '', deviceLimit: 1 };
  const baseRules = { passingScore: 60, release: 'manual', showScore: true, showSectionBreakdown: true, showAnswers: false, feedback: true };
  const exam = (o2) => ({
    description: '', category: 'Technical', timezone: 'Asia/Kolkata', graceMinutes: 5, attemptsAllowed: 1,
    instructions: defaultInstructions, proctoringMode: 'live', proctoring: { camera: true, mic: true, screen: true, idCheck: true },
    security: { ...baseSecurity }, resultRules: { ...baseRules }, negativeMarking: true,
    createdBy: 'adm_001', updatedAt: at(-2 * DAY), groups: [], ...o2
  });
  const ids = (from, to) => students.slice(from, to).map((x) => x.id);
  const exams = [
    exam({ id: 'exam_001', code: 'JAVA-201', title: 'Java Developer Assessment', status: 'live',
      description: 'A 60-minute screening for backend Java roles covering core language features, object-oriented design and problem solving.',
      startAt: at(-30 * MIN), endAt: at(5 * HOUR), durationMinutes: 60, questionIds: javaQs,
      sections: [{ id: 'sec_java_core', title: 'Core Java' }, { id: 'sec_oop', title: 'OOP & Design' }, { id: 'sec_problem', title: 'Problem Solving' }],
      candidateIds: ['stu_001', 'stu_003', 'stu_005', 'stu_007', 'stu_009', 'stu_011', 'stu_014', 'stu_015'], candidateCount: 48, proctorIds: ['prc_001', 'prc_004'],
      resultRules: { ...baseRules, release: 'immediate', showAnswers: true } }),
    exam({ id: 'exam_002', code: 'APT-110', title: 'General Aptitude Screening', status: 'live', category: 'Aptitude',
      description: 'Quantitative and logical aptitude for all graduate applicants.',
      startAt: at(-45 * MIN), endAt: at(2 * HOUR), durationMinutes: 45, questionIds: aptQs,
      sections: [{ id: 'sec_apt', title: 'Quantitative Aptitude' }],
      candidateIds: ids(1, 13), candidateCount: 126, proctorIds: ['prc_001', 'prc_002'] }),
    exam({ id: 'exam_003', code: 'FE-305', title: 'Frontend Engineering (React)', status: 'scheduled',
      description: 'Component design, state management, accessibility and performance in React applications.',
      startAt: at(2 * DAY + 3 * HOUR), endAt: at(2 * DAY + 6 * HOUR), durationMinutes: 75, questionIds: javaQs.slice(0, 8),
      sections: [{ id: 'sec_java_core', title: 'Fundamentals' }], candidateIds: ['stu_001', 'stu_002', 'stu_004', 'stu_008'], candidateCount: 64, proctorIds: ['prc_004'] }),
    exam({ id: 'exam_004', code: 'DA-220', title: 'Data Analyst Fundamentals', status: 'scheduled', category: 'Analytics',
      description: 'SQL querying, spreadsheet logic and interpreting charts.',
      startAt: at(5 * DAY + 2 * HOUR), endAt: at(5 * DAY + 5 * HOUR), durationMinutes: 60, questionIds: sqlQs.concat(aptQs),
      sections: [{ id: 'sec_sql', title: 'SQL Querying' }, { id: 'sec_apt', title: 'Quantitative Aptitude' }], candidateIds: ['stu_001', 'stu_006', 'stu_010'], candidateCount: 52, proctorIds: ['prc_002'] }),
    exam({ id: 'exam_005', code: 'SQL-150', title: 'SQL Proficiency Test', status: 'completed', category: 'Databases',
      description: 'Practical SQL for application developers.', startAt: at(-10 * DAY), endAt: at(-10 * DAY + 3 * HOUR), durationMinutes: 40, questionIds: sqlQs,
      sections: [{ id: 'sec_sql', title: 'SQL Querying' }], candidateIds: ids(0, 12), candidateCount: 88, proctorIds: ['prc_001'] }),
    exam({ id: 'exam_006', code: 'COM-101', title: 'Business Communication', status: 'completed', category: 'Communication', proctoringMode: 'recorded',
      description: 'Written communication and comprehension.', startAt: at(-20 * DAY), endAt: at(-20 * DAY + 4 * HOUR), durationMinutes: 30, questionIds: ['q_024'],
      sections: [{ id: 'sec_comm', title: 'Business Communication' }], candidateIds: ids(0, 10), candidateCount: 140, proctorIds: ['prc_003'],
      resultRules: { ...baseRules, showAnswers: false, showSectionBreakdown: true } }),
    exam({ id: 'exam_007', code: 'PY-210', title: 'Python Backend Assessment', status: 'completed', category: 'Technical',
      description: 'APIs, async I/O and testing in Python.', startAt: at(-3 * DAY), endAt: at(-3 * DAY + 3 * HOUR), durationMinutes: 60, questionIds: ['q_023', 'q_012', 'q_015'],
      sections: [{ id: 'sec_python', title: 'Python Backend' }, { id: 'sec_problem', title: 'Problem Solving' }], candidateIds: ids(0, 9), candidateCount: 71, proctorIds: ['prc_002'] }),
    exam({ id: 'exam_008', code: 'CLD-300', title: 'Cloud Fundamentals (AWS)', status: 'draft', category: 'Technical',
      description: 'Compute, storage, networking and IAM basics.', startAt: null, endAt: null, durationMinutes: 50, questionIds: [],
      sections: [], candidateIds: [], candidateCount: 0, proctorIds: [], draftStep: 3 }),
    exam({ id: 'exam_009', code: 'QA-120', title: 'QA Automation Basics', status: 'archived', category: 'Technical',
      description: 'Test design and Selenium basics (retired).', startAt: at(-90 * DAY), endAt: at(-90 * DAY + 3 * HOUR), durationMinutes: 45, questionIds: [],
      sections: [], candidateIds: [], candidateCount: 36, proctorIds: ['prc_003'] }),
    exam({ id: 'exam_010', code: 'LR-140', title: 'Logical Reasoning Sprint', status: 'completed', category: 'Aptitude',
      description: 'A short reasoning sprint.', startAt: at(-6 * DAY), endAt: at(-6 * DAY + 2 * HOUR), durationMinutes: 25, questionIds: aptQs,
      sections: [{ id: 'sec_apt', title: 'Quantitative Aptitude' }], candidateIds: ids(0, 8), candidateCount: 95, proctorIds: ['prc_004'] })
  ];
  exams.forEach((e) => { e.totalMarks = e.questionIds.reduce((t, id) => t + (questions.find((q) => q.id === id) || { marks: 0 }).marks, 0); });
  questions.forEach((q) => { q.usedIn = exams.filter((e) => e.questionIds.includes(q.id)).length; });

  /* ---------------- Attempts & results ---------------- */
  const attempts = [];
  const results = [];
  const sectionScores = (e, pct) => e.sections.map((sec) => {
    const max = e.questionIds.map((id) => questions.find((q) => q.id === id)).filter((q) => q && q.sectionId === sec.id).reduce((t, q) => t + q.marks, 0) || 10;
    const p = Math.max(0.1, Math.min(1, pct / 100 + (rnd() - 0.5) * 0.3));
    return { sectionId: sec.id, title: sec.title, score: Math.round(max * p * 2) / 2, maxScore: max };
  });
  [['exam_005', 0, 12], ['exam_006', 0, 10], ['exam_007', 0, 9], ['exam_010', 1, 8]].forEach(([examId, from, to]) => {
    const e = exams.find((x) => x.id === examId);
    students.slice(from, to).forEach((st, i) => {
      if (examId === 'exam_005' && i === 9) return; // one no-show
      const attemptId = 'att_' + examId.slice(5) + '_' + st.id.slice(4);
      let pct = between(38, 96);
      if (st.id === 'stu_001') pct = { exam_005: 78, exam_006: 64, exam_007: 81 }[examId] || pct;
      const submittedAt = new Date(new Date(e.startAt).getTime() + between(18, e.durationMinutes) * MIN).toISOString();
      attempts.push({ id: attemptId, examId, studentId: st.id, status: 'submitted', startedAt: e.startAt, submittedAt, answers: {}, remainingSeconds: 0, saveState: 'saved', tabSwitches: between(0, 4) });
      const published = examId !== 'exam_007';
      const secs = sectionScores(e, pct);
      const maxScore = e.totalMarks || 100;
      results.push({
        id: 'res_' + examId.slice(5) + '_' + st.id.slice(4), examId, studentId: st.id, attemptId,
        score: Math.round(maxScore * pct) / 100, maxScore, percentage: pct,
        status: published ? (pct >= e.resultRules.passingScore ? 'pass' : 'fail') : 'under_review',
        published, publishedAt: published ? new Date(new Date(e.endAt).getTime() + DAY).toISOString() : null,
        sections: secs, incidentLevel: pick(['none', 'none', 'none', 'low', 'low', 'medium', 'high']),
        submittedAt, durationSeconds: between(15, e.durationMinutes) * 60, rank: null,
        feedback: pct >= 75 ? 'Strong, consistent performance. Recommended for the technical interview round.' : pct >= 60 ? 'Meets the bar. Review the weaker section before the next round.' : 'Below the passing score. Focus on fundamentals and retake when eligible.'
      });
    });
  });
  // rank within exam
  ['exam_005', 'exam_006', 'exam_007', 'exam_010'].forEach((eid) => {
    results.filter((r) => r.examId === eid).sort((a, b) => b.percentage - a.percentage).forEach((r, i) => { r.rank = i + 1; });
  });
  // Priya missed the reasoning sprint: remove her result to demonstrate "missed"
  for (let i = results.length - 1; i >= 0; i--) if (results[i].examId === 'exam_010' && results[i].studentId === 'stu_001') results.splice(i, 1);
  for (let i = attempts.length - 1; i >= 0; i--) if (attempts[i].examId === 'exam_010' && attempts[i].studentId === 'stu_001') attempts.splice(i, 1);

  /* ---------------- Proctor sessions ---------------- */
  const statuses = ['active', 'active', 'active', 'active', 'idle', 'active', 'disconnected', 'active', 'active', 'submitted', 'active', 'active'];
  const mkCandidates = (examId, studentIds, total) => studentIds.map((sid, i) => {
    const st = students.find((x) => x.id === sid);
    const status = sid === 'stu_001' ? 'not_started' : statuses[i % statuses.length];
    const tabSwitches = status === 'not_started' ? 0 : pick([0, 0, 0, 1, 1, 2, 4]);
    const faceStatus = i === 3 ? 'missing' : i === 7 ? 'multiple' : 'ok';
    const warnings = tabSwitches > 2 ? 2 : faceStatus !== 'ok' ? 1 : 0;
    const risk = (tabSwitches > 2 || faceStatus === 'multiple') ? 'high' : (tabSwitches > 0 || faceStatus === 'missing' || status === 'disconnected') ? 'medium' : 'low';
    return {
      id: 'cand_' + examId.slice(5) + '_' + sid.slice(4), studentId: sid, name: st.name, email: st.email,
      status, risk, warnings, tabSwitches, faceStatus,
      network: status === 'disconnected' ? 0 : pick([3, 3, 3, 2, 2, 1]), camera: !(i === 5), mic: !(i === 10),
      answered: status === 'not_started' ? 0 : status === 'submitted' ? total : between(2, total - 1), total,
      identity: i === 7 ? 'mismatch' : i % 4 === 2 ? 'pending' : 'verified', flagged: i === 7,
      joinedAt: at(-between(10, 40) * MIN), lastEventAt: at(-between(1, 9) * MIN), notes: []
    };
  });
  const sessions = [
    { id: 'sess_001', examId: 'exam_002', proctorId: 'prc_001', status: 'live', startedAt: at(-45 * MIN), endedAt: null, candidates: mkCandidates('exam_002', ids(1, 13), aptQs.length), notes: '' },
    { id: 'sess_002', examId: 'exam_001', proctorId: 'prc_001', status: 'live', startedAt: at(-30 * MIN), endedAt: null, candidates: mkCandidates('exam_001', exams[0].candidateIds, javaQs.length), notes: '' },
    { id: 'sess_003', examId: 'exam_005', proctorId: 'prc_001', status: 'completed', startedAt: at(-10 * DAY), endedAt: at(-10 * DAY + 3 * HOUR), candidates: mkCandidates('exam_005', ids(0, 12), sqlQs.length).map((c) => ({ ...c, status: 'submitted', answered: c.total })), notes: 'Smooth session. One candidate reconnected twice; no evidence of misconduct.', summary: { submitted: 11, flagged: 1, warnings: 4 } },
    { id: 'sess_004', examId: 'exam_010', proctorId: 'prc_001', status: 'completed', startedAt: at(-6 * DAY), endedAt: at(-6 * DAY + 2 * HOUR), candidates: mkCandidates('exam_010', ids(1, 8), aptQs.length).map((c) => ({ ...c, status: 'submitted', answered: c.total })), notes: 'Two tab-switch warnings issued. Escalated one identity mismatch to admin.', summary: { submitted: 7, flagged: 1, warnings: 2 } },
    { id: 'sess_005', examId: 'exam_003', proctorId: 'prc_001', status: 'scheduled', startedAt: exams[2].startAt, endedAt: null, candidates: [], notes: '' },
    { id: 'sess_006', examId: 'exam_004', proctorId: 'prc_002', status: 'scheduled', startedAt: exams[3].startAt, endedAt: null, candidates: [], notes: '' }
  ];

  /* ---------------- Session events (timeline) ---------------- */
  const eventTypes = {
    joined: ['Joined the session', 'low'], tab_switch: ['Switched away from the exam tab', 'medium'], face_missing: ['Face not detected for 8s', 'medium'],
    multiple_faces: ['More than one face detected', 'high'], noise: ['Background voices detected', 'low'], disconnect: ['Connection lost', 'medium'], reconnect: ['Reconnected', 'low']
  };
  const events = [];
  sessions.filter((x) => x.status === 'live').forEach((sess) => {
    sess.candidates.forEach((c, i) => {
      if (c.status === 'not_started') return;
      events.push({ id: 'ev_' + sess.id.slice(5) + '_' + i + 'j', sessionId: sess.id, candidateId: c.id, type: 'joined', severity: 'low', message: eventTypes.joined[0], at: c.joinedAt });
      if (c.tabSwitches) events.push({ id: 'ev_' + sess.id.slice(5) + '_' + i + 't', sessionId: sess.id, candidateId: c.id, type: 'tab_switch', severity: 'medium', message: 'Switched tabs (' + c.tabSwitches + ' total)', at: at(-between(2, 20) * MIN) });
      if (c.faceStatus === 'missing') events.push({ id: 'ev_' + sess.id.slice(5) + '_' + i + 'f', sessionId: sess.id, candidateId: c.id, type: 'face_missing', severity: 'medium', message: eventTypes.face_missing[0], at: at(-between(1, 10) * MIN) });
      if (c.faceStatus === 'multiple') events.push({ id: 'ev_' + sess.id.slice(5) + '_' + i + 'm', sessionId: sess.id, candidateId: c.id, type: 'multiple_faces', severity: 'high', message: eventTypes.multiple_faces[0], at: at(-between(1, 6) * MIN) });
      if (c.status === 'disconnected') events.push({ id: 'ev_' + sess.id.slice(5) + '_' + i + 'd', sessionId: sess.id, candidateId: c.id, type: 'disconnect', severity: 'medium', message: eventTypes.disconnect[0], at: at(-3 * MIN) });
    });
  });

  /* ---------------- Incidents ---------------- */
  const incTypes = ['tab_switch', 'face_missing', 'multiple_faces', 'noise', 'disconnect', 'identity_mismatch', 'phone_detected'];
  const incidents = [];
  const liveC = sessions[0].candidates.concat(sessions[1].candidates).filter((c) => c.risk !== 'low');
  liveC.forEach((c, i) => {
    const sess = sessions.find((x) => x.candidates.includes(c));
    const type = c.faceStatus === 'multiple' ? 'multiple_faces' : c.identity === 'mismatch' ? 'identity_mismatch' : c.tabSwitches > 2 ? 'tab_switch' : c.faceStatus === 'missing' ? 'face_missing' : c.status === 'disconnected' ? 'disconnect' : 'tab_switch';
    incidents.push({
      id: 'inc_' + String(i + 1).padStart(3, '0'), sessionId: sess.id, examId: sess.examId, candidateId: c.id, studentId: c.studentId, studentName: c.name,
      type, severity: c.risk === 'high' ? 'high' : 'medium', status: i % 3 === 0 ? 'reviewing' : 'open', timestamp: at(-between(2, 25) * MIN),
      description: { multiple_faces: 'A second person appeared in frame for roughly 20 seconds.', identity_mismatch: 'Face on camera does not match the ID photo captured at check-in.', tab_switch: 'Repeated tab switching after a warning was issued.', face_missing: 'Candidate left the camera frame during the aptitude section.', disconnect: 'Connection dropped mid-exam; candidate rejoined after 2 minutes.' }[type],
      reportedBy: 'prc_001', evidence: [{ id: 'evd_1', label: 'Snapshot 1' }, { id: 'evd_2', label: 'Snapshot 2' }, { id: 'evd_3', label: 'Event log' }], resolution: ''
    });
  });
  [['exam_005', 'sess_003', 'stu_004', 'Rohan Gupta', 'phone_detected', 'high', 'resolved', 'Candidate confirmed the phone was face-down and unused. Warning issued; no score impact.'],
   ['exam_010', 'sess_004', 'stu_006', 'Karthik Nair', 'identity_mismatch', 'high', 'escalated', 'Escalated to admin for manual identity review.'],
   ['exam_010', 'sess_004', 'stu_003', 'Neha Reddy', 'tab_switch', 'low', 'resolved', 'Single accidental tab switch; dismissed.'],
   ['exam_005', 'sess_003', 'stu_008', 'Varun Joshi', 'noise', 'low', 'resolved', 'Construction noise outside; no misconduct.']].forEach(([examId, sessionId, studentId, studentName, type, severity, status, resolution], i) => {
    incidents.push({ id: 'inc_1' + String(i).padStart(2, '0'), sessionId, examId, candidateId: 'cand_' + examId.slice(5) + '_' + studentId.slice(4), studentId, studentName, type, severity, status, timestamp: at(-(examId === 'exam_005' ? 10 : 6) * DAY + between(10, 90) * MIN), description: 'Flagged during the session by the proctor.', reportedBy: 'prc_001', evidence: [{ id: 'evd_1', label: 'Snapshot' }], resolution });
  });

  /* ---------------- Notifications ---------------- */
  const n = (id, userId, type, title, message, mins, read, actionLabel, actionUrl) => ({ id, userId, type, title, message, createdAt: at(-mins * MIN), read, actionLabel, actionUrl });
  const notifications = [
    n('ntf_001', 'stu_001', 'exam', 'Java Developer Assessment is open', 'The exam window closes in about 5 hours. Run the system check before you start.', 25, false, 'View exam', 'student/exam-details.html?id=exam_001'),
    n('ntf_002', 'stu_001', 'result', 'Your SQL Proficiency Test result is out', 'You scored 78% and passed.', 60 * 24 * 9, false, 'View result', 'student/result-detail.html?id=res_005_001'),
    n('ntf_003', 'stu_001', 'reminder', 'Frontend Engineering (React) in 2 days', 'Make sure your camera and microphone work on the device you will use.', 60 * 6, true, 'Run system check', 'student/system-check.html?id=exam_003'),
    n('ntf_004', 'stu_001', 'system', 'Scheduled maintenance', 'HUK HIRE will be unavailable on Sunday 02:00–03:00 IST.', 60 * 30, true, null, null),
    n('ntf_101', 'prc_001', 'alert', 'High-risk candidate in APT-110', 'Multiple faces detected for Varun Joshi.', 4, false, 'Open console', 'proctor/console.html?session=sess_001'),
    n('ntf_102', 'prc_001', 'assignment', 'New assignment: FE-305', 'You are the lead proctor for Frontend Engineering (React).', 60 * 5, false, 'View assignment', 'proctor/assigned-exams.html'),
    n('ntf_103', 'prc_001', 'session', 'JAVA-201 session started', '8 candidates are in the waiting room.', 30, true, 'Open console', 'proctor/console.html?session=sess_002'),
    n('ntf_201', 'adm_001', 'incident', '3 open incidents need review', 'Two high-severity incidents in General Aptitude Screening.', 6, false, 'Review incidents', 'admin/incidents.html'),
    n('ntf_202', 'adm_001', 'result', 'Python Backend Assessment awaiting publication', '9 results are ready for review.', 60 * 20, false, 'Review results', 'admin/results.html?exam=exam_007'),
    n('ntf_203', 'adm_001', 'user', 'Meera Iyer has not accepted her invite', 'The invitation was sent 2 days ago.', 60 * 48, true, 'Manage admins', 'admin/admins.html'),
    n('ntf_204', 'adm_001', 'system', 'Proctor device check failed', 'Arjun Pillai’s camera failed the readiness test.', 60 * 26, true, 'View proctor', 'admin/proctor-profile.html?id=prc_005')
  ];

  /* ---------------- Activity, analytics, settings ---------------- */
  const activity = [
    { id: 'act_1', at: at(-4 * MIN), actor: 'Daniel Fernandes', text: 'flagged Varun Joshi in APT-110 for multiple faces', icon: 'flag', tone: 'bad' },
    { id: 'act_2', at: at(-18 * MIN), actor: 'System', text: 'opened JAVA-201 to 48 candidates', icon: 'play', tone: 'accent' },
    { id: 'act_3', at: at(-52 * MIN), actor: 'Vikram Shah', text: 'published Frontend Engineering (React)', icon: 'send', tone: 'ok' },
    { id: 'act_4', at: at(-3 * HOUR), actor: 'Ananya Rao', text: 'imported 64 students into Campus Drive 2026 Batch B', icon: 'upload', tone: '' },
    { id: 'act_5', at: at(-20 * HOUR), actor: 'System', text: 'closed Python Backend Assessment; 9 results awaiting review', icon: 'check', tone: '' },
    { id: 'act_6', at: at(-26 * HOUR), actor: 'Ananya Rao', text: 'invited Meera Iyer as Results Reviewer', icon: 'user', tone: '' }
  ];
  const analytics = {
    months: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'],
    attempts: [420, 610, 580, 390, 720, 860],
    passRate: [58, 61, 63, 60, 66, 68],
    avgScore: [61, 63, 64, 62, 67, 69],
    incidentsByType: { tab_switch: 42, face_missing: 23, multiple_faces: 9, noise: 14, disconnect: 18, identity_mismatch: 4, phone_detected: 6 },
    weeklySessions: [6, 9, 7, 11, 8, 12, 10]
  };
  const roles = [
    { id: 'super_admin', name: 'Super admin', description: 'Full access including admin management and system settings.', permissions: ['exams.manage', 'questions.manage', 'users.manage', 'proctoring.view', 'results.publish', 'reports.view', 'settings.manage', 'admins.manage'] },
    { id: 'exam_manager', name: 'Exam manager', description: 'Creates and schedules exams, manages candidates and proctors.', permissions: ['exams.manage', 'questions.manage', 'users.manage', 'proctoring.view', 'reports.view'] },
    { id: 'reviewer', name: 'Results reviewer', description: 'Reviews incidents and publishes results.', permissions: ['proctoring.view', 'results.publish', 'reports.view'] }
  ];
  const permissions = [
    ['exams.manage', 'Create, edit and publish exams'], ['questions.manage', 'Manage the question bank'], ['users.manage', 'Manage students and proctors'],
    ['proctoring.view', 'View live sessions and incidents'], ['results.publish', 'Publish and withhold results'], ['reports.view', 'View reports and analytics'],
    ['settings.manage', 'Change system settings'], ['admins.manage', 'Invite admins and assign roles']
  ].map(([id, label]) => ({ id, label }));
  const settings = {
    organization: { name: 'HUK HIRE Assessments', legalName: 'HUK HIRE Technologies Pvt. Ltd.', domain: 'hukhire.com', timezone: 'Asia/Kolkata', supportEmail: 'support@hukhire.com', locale: 'en-IN' },
    examDefaults: { durationMinutes: 60, graceMinutes: 5, attemptsAllowed: 1, passingScore: 60, negativeMarking: true, proctoringMode: 'live', release: 'manual' },
    security: { mfaForAdmins: true, sessionTimeoutMinutes: 30, passwordMinLength: 10, tabPolicy: 'warn', maxTabSwitches: 3, ipAllowlist: '', dataRetentionDays: 180 },
    notifications: { emailCandidates: true, smsReminders: false, proctorAlerts: true, dailyDigest: true }
  };
  const userSettings = {};
  admins.concat(proctors, students).forEach((u) => {
    userSettings[u.id] = { theme: 'brand', notifications: { email: true, inApp: true, sms: false, reminders: true }, device: { preferredCamera: 'Default camera', autoSystemCheck: true } };
  });

  HUK.fixtures = {
    meta: { seededAt: NOW, version: 1 },
    users: admins.concat(proctors, students),
    passwords: { default: 'demo1234' },
    sections, questions, exams, attempts, results, sessions, events, incidents,
    notifications, activity, analytics, roles, permissions, settings, userSettings,
    drafts: {}
  };
})();
