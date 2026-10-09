# HUK HIRE: database setup (Supabase)

These files create the HUK HIRE database: every table, the security rules, and the server-side exam functions (start, autosave, submit, grading, publishing).

| File | What it does | When to run |
|---|---|---|
| `01_setup.sql` | Creates everything | Once, on a fresh project |
| `02_make_me_admin.sql` | Makes your own login the first admin | Once, after step 3 below |
| `03_demo_data.sql` | Adds 3 sections and 12 sample questions | Optional, **staging only** |
| `00_reset.sql` | Deletes all HUK HIRE tables so you can start again | Only if something went wrong, **staging only** |
| `tests/` | Automated security and grading checks | For a developer or reviewer |

---

## Step-by-step (about 10 minutes)

### Step 1: open the SQL Editor
1. Go to supabase.com and open your **huk-hire-staging** project.
2. In the left sidebar, click **SQL Editor** (the `>_` icon).
3. Click **+ New query**.

### Step 2: run the setup
1. Open `01_setup.sql` in VS Code, select everything (Ctrl+A), and copy it (Ctrl+C).
2. Paste it into the Supabase query box (Ctrl+V).
3. Click **Run** (or press Ctrl+Enter).
4. You should see **"Success. No rows returned"**.

If Supabase shows a warning about "destructive operations", that's expected; click **Run this query**.

**If you see a red error:** copy the whole error message and send it to me. Then open a new query, run `00_reset.sql`, and try Step 2 again.

### Step 3: create your own login
1. In the left sidebar, click **Authentication → Users**.
2. Click **Add user → Create new user**.
3. Enter your email and a strong password, and tick **Auto Confirm User**.
4. Click **Create user**.

### Step 4: make yourself admin
1. Open `02_make_me_admin.sql` in VS Code.
2. Replace `CHANGE-ME@example.com` with the email from Step 3. Keep the quotes.
3. Copy the whole file into a **new query** in the SQL Editor and click **Run**.
4. You should see one row showing your email with `role = admin`.

### Step 5 (optional): add demo questions
Run `03_demo_data.sql` in a new query. You'll see a small table: Core Java 5, SQL Querying 3, Quantitative Aptitude 4.

### Step 6: check it worked
1. In the left sidebar, click **Table Editor**. You should see 19 tables, including `profiles`, `exams`, `questions` and `results`.
2. Click **profiles**: you'll see your own row.
3. Every table should show a green **RLS enabled** badge. If any shows "RLS disabled", tell me.

---

## What each part does (plain English)

**Tables** are like Excel sheets: `exams`, `questions`, `attempts` (a student sitting an exam), `attempt_answers` (each autosaved answer), `results`, `incidents` and so on.

**The answer key lives in its own table** (`question_keys`) that only admins can read. Students receive questions through a function that never includes answers, so they can't find them even by inspecting the website code.

**Row Level Security** locks every table. Each "policy" says who may see which rows:
- **Students** see only their own profile, exams assigned to them, and their own attempts. They read results through `my_results()`, which hides scores until an admin publishes them and respects each exam's "what candidates can see" settings.
- **Proctors** see only the exams they're assigned to: candidates' names, progress and live events, but **never answers, the answer key or scores**.
- **Admins** see and manage everything.
- **Visitors who aren't signed in** can't read anything.

**Everyone signs up as a student.** Even if someone edits the sign-up form to ask for "admin", the database ignores it. Only an admin can promote a user to proctor or admin: open **Table Editor → profiles** and change their `role`.

**Exam rules are enforced on the server**, not in the browser:
- Exams can only start inside their window, and only by assigned students.
- The timer can't be extended, and answers can't be changed after submitting or after time runs out.
- Grading happens in the database, including negative marking, multi-select, numeric and case-insensitive short answers.
- Long answers are flagged for a human reviewer, and those results aren't auto-published.
- Tab switches are logged and raise the candidate's risk level for the proctor.

**Live updates** are switched on for `session_events`, `incidents`, `attempts` and `notifications`, which is what the proctor console and notification bell will listen to.

---

## Tested

These scripts were run against PostgreSQL 16 (the engine Supabase uses), with an automated test that signs in as each role and tries to cheat. All 30 checks pass:
- A sign-up can't make itself admin; a student can edit their name but not their role.
- A student can't read the answer key or question bank, other students' data, or the results table directly.
- An unassigned student can't see or start an exam.
- `start_attempt` returns questions without answers; starting again resumes the same attempt.
- A student can't create attempts, extend the timer, or change answers after submitting.
- Grading gave exactly 13.25 / 26 on a mixed answer sheet, with the long answer flagged for review.
- Unpublished results hide the score; publishing notifies the student; answer review appears only if the exam allows it.
- A proctor sees progress and live events but never answers, keys or scores, and can warn and flag incidents.
- An admin can't publish an incomplete exam.
- Anonymous visitors are blocked from every table and function.

---

## Not in this step yet (later phases)

- **Connecting the website** to these tables (replacing the mock services). That's the next step.
- **Camera snapshot storage** (a Supabase Storage bucket) for proctoring evidence.
- **Emails** for verification codes, reminders and results.
- **Closing abandoned attempts automatically** when time runs out and the student never returns. For now, an admin can close them.
- **Live video** proctoring.

## Safety reminders

- Never put the **service_role** key in website code. Only the **anon / publishable** key belongs in the browser.
- Never run `00_reset.sql` on the **production** project once real candidates exist.
- Do all of this on **staging** first. Production gets the same `01_setup.sql` later, without the demo data.
