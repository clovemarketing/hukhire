# HUK HIRE: frontend prototype

*Assess. Verify. Hire.*

A fully navigable, responsive HTML/CSS/vanilla-JavaScript prototype of HUK HIRE for three roles: **Admin**, **Online Proctor** and **Student**. Every screen runs on mock data behind a service layer, so the real backend can be connected later without changing page markup.

There are no frameworks, no build step and no backend.

---

## 1. Run it locally

```bash
cd huk-hire
python3 -m http.server 8080      # or: npx serve .
# open http://localhost:8080
```

You can also double-click `index.html`, because every script is a classic `<script>` with no ES modules. A local server is still recommended for two reasons. First, browsers only allow camera and microphone access (system check, proctor device test) on `localhost` or HTTPS. Second, `localStorage` behaves consistently across pages.

### Demo accounts

| Role | Email | Password | Extra step |
|---|---|---|---|
| Student | `student@hukhire.com` | `demo1234` | none |
| Proctor | `proctor@hukhire.com` | `demo1234` | none |
| Admin | `admin@hukhire.com` | `demo1234` | OTP `123456` |

The login page has a role picker that fills these in for you.

### Demo controls

- **Reset data:** go to *Settings → Reset demo data*. The mock database also reseeds itself automatically after 12 hours so that "live" exams stay live.
- **Simulate API states:** add one of these to any page URL:
  - `?simulate=error` shows error states with a working "Try again" button.
  - `?simulate=empty` makes every list return empty.
  - `?simulate=slow` adds 3 seconds of latency so the skeleton loaders are visible.
- **Cross-role demo:** open the student exam in one tab and the proctor console for `JAVA-201` in another, in the same browser. The student's tab switches and answer progress appear live in the proctor's event stream and candidate card.

---

## 2. The three journeys

All three were verified with automated clicks in a real browser (see `tests/journeys.py`).

- **Student:** Login → Dashboard → *Start with system check* → System check → Instructions & consent (+ ID capture) → Take exam (answer, mark for review, palette) → Submit (confirmation) → Submission received → Result with answer review.
- **Proctor:** Login → Live queue (set availability) → Live sessions → Console (live event stream, filters, search, full screen) → Candidate → Flag incident, add note, warn, verify ID, escalate → Back → End session → Session summary → Incidents (resolve).
- **Admin:** Login + OTP → Dashboard → Create exam (8-step wizard: basics, schedule, questions, candidates, proctoring, security, result rules, review) → Save draft / Publish → Exam detail → Add question → Students / Proctors → Results (filter, bulk publish, export) → Reports.

---

## 3. Every page (51)

**Public and authentication**

| Page | File |
|---|---|
| Landing | `index.html` |
| Login (role-aware routing) | `login.html` |
| Student registration | `register.html` |
| OTP / MFA verification | `verify-otp.html` |
| Forgot password | `forgot-password.html` |
| Reset password | `reset-password.html?token=…` |
| Session expired (401) | `session-expired.html` |
| Unauthorized (403) | `unauthorized.html` |
| Not found | `404.html` |

**Shared (any signed-in role)**

| Page | File |
|---|---|
| Notification centre | `shared/notifications.html` |
| Profile (details + password) | `shared/profile.html` |
| Settings (theme, notifications, role-specific device prefs / camera-mic test) | `shared/settings.html` |
| Help & FAQ | `shared/help.html` |

**Student**

| Page | File |
|---|---|
| Dashboard | `student/dashboard.html` |
| Exams: available / upcoming / completed / missed tabs | `student/exams.html?tab=…` |
| My attempts (exam history) | `student/attempts.html` |
| Exam details | `student/exam-details.html?id=` |
| System readiness check | `student/system-check.html?id=` |
| Instructions, consent, ID capture | `student/instructions.html?id=` |
| Exam workspace | `student/take-exam.html?id=` |
| Exam completed / receipt | `student/submitted.html?attempt=` |
| Results | `student/results.html` |
| Detailed result | `student/result-detail.html?id=` |

**Online proctor**

| Page | File |
|---|---|
| Live queue (dashboard + availability) | `proctor/dashboard.html` |
| Assigned exams (live / upcoming / completed) | `proctor/assigned-exams.html` |
| Live sessions | `proctor/live-sessions.html` |
| Candidate monitoring grid / console | `proctor/console.html?session=` |
| Individual candidate monitor | `proctor/candidate.html?session=&candidate=` |
| Incidents & flags | `proctor/incidents.html` |
| Completed sessions | `proctor/session-history.html` |
| Session summary / report | `proctor/session-summary.html?session=` |
| Proctor reports | `proctor/reports.html` |

**Admin**

| Page | File |
|---|---|
| Dashboard (KPIs, live ops, quick actions) | `admin/dashboard.html` |
| Exam management | `admin/exams.html?status=` |
| Create / edit exam wizard | `admin/exam-wizard.html?id=&step=` |
| Exam detail & status | `admin/exam-detail.html?id=` |
| Exam scheduling calendar | `admin/schedule.html` |
| Question bank | `admin/question-bank.html` |
| Add / edit question | `admin/question-editor.html?id=` |
| Import questions (CSV) | `admin/question-import.html` |
| Sections / categories | `admin/sections.html` |
| Student management | `admin/students.html` |
| Student profile | `admin/student-profile.html?id=` |
| Proctor management | `admin/proctors.html` |
| Proctor profile | `admin/proctor-profile.html?id=` |
| Admins & roles (permission matrix) | `admin/admins.html` |
| Results explorer | `admin/results.html?exam=` |
| Result detail | `admin/result-detail.html?id=` |
| Reports & analytics (+ report generator) | `admin/reports.html` |
| Proctoring incidents | `admin/incidents.html` |
| System settings | `admin/settings.html?tab=` |

---

## 4. Folder structure

```text
huk-hire/
├── index.html, login.html, register.html, verify-otp.html,
│   forgot-password.html, reset-password.html,
│   session-expired.html, unauthorized.html, 404.html
├── shared/    notifications · profile · settings · help
├── student/   10 pages
├── proctor/   9 pages
├── admin/     19 pages
├── assets/
│   ├── logo/      huk-hire-logo(.png|-light.png), huk-hire-mark(.png|-light.png)
│   ├── images/    hero-talent-scout.webp, huk-hire-poster.webp
│   └── doodles/   doodle-scout.webp, doodle-candidates.webp
├── css/
│   ├── tokens.css       brand design tokens (colour, type, radius, shadow, motion)
│   ├── themes.css       Black & White overrides
│   ├── base.css         reset, typography, focus, reduced motion
│   ├── layout.css       AppShell, sidebar, topbar, grids, auth layout
│   ├── components.css   buttons, forms, cards, chips, tables, modals, toasts…
│   ├── pages.css        exam workspace, proctor console, calendar, wizard…
│   └── responsive.css   1280 / 1024 / 768 / 480 breakpoints
├── js/
│   ├── core/
│   │   ├── config.js      USE_MOCK switch, API base, page registry
│   │   ├── api-client.js  fetch wrapper: token, JSON, timeout, 401/403, errors
│   │   ├── mock-api.js    localStorage mock DB, latency, ?simulate=
│   │   ├── router.js      HUK.url / HUK.qs / HUK.go
│   │   ├── auth.js        client session + role guard helpers
│   │   ├── theme.js       theme toggle + persistence
│   │   ├── ui.js          component library (see §6)
│   │   ├── charts.js      SVG line / bar / donut / h-bar charts
│   │   └── shell.js       sidebar, topbar, breadcrumbs, drawer, bottom nav
│   ├── data/mock-data.js  fixtures (spec §19 models)
│   ├── services/          the ONLY layer that touches data (see §5)
│   ├── pages/             one module per area; renders pages via services
│   └── app.js             boot: theme → guard → shell → page render
├── tools/build-pages.py   regenerates the 51 thin HTML shells from one manifest
└── tests/                 smoke.py (all pages × roles × 2 viewports), journeys.py
```

Every HTML file is a thin shell like this:

```html
<body data-page="student-dashboard" data-role="student" data-layout="app" data-base="../">
```

To add a page:
1. Register it in a `js/pages/*.js` module with `HUK.page('id', { title, crumbs, render })`.
2. Add a line to `tools/build-pages.py`.
3. Run `python3 tools/build-pages.py`.

---

## 5. Services → future backend APIs

Pages never call `fetch`. They call services. Each service function checks `HUK.config.USE_MOCK`: when it is true the function uses `mockApi`, and when it is false it calls `apiClient` with the endpoint shown in its comment.

| Service file | Covers | Future endpoints |
|---|---|---|
| `auth-service.js` | login, OTP, register, forgot/reset, profile, password, user settings | `POST /auth/login`, `/auth/verify-otp`, `/auth/register/student`, `/auth/forgot-password`, `/auth/reset-password`, `GET\|PATCH /me`, `POST /me/password`, `GET\|PATCH /me/settings` |
| `notification-service.js` | inbox, unread badge, read/unread, delete | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id`, `POST /notifications/read-all` |
| `exam-service.js` | admin exam CRUD, draft, publish, duplicate, archive, validation | `GET\|POST /admin/exams`, `GET\|PUT /admin/exams/:id`, `POST /admin/exams/:id/publish\|duplicate\|archive\|restore` |
| `question-service.js` | question bank, CSV import, sections | `GET\|POST /admin/questions`, `GET\|PUT\|DELETE /admin/questions/:id`, `POST /admin/questions/import`, `/admin/sections` |
| `student-service.js` | student dashboard, exams, attempts, results (visibility rules), system check | `GET /student/dashboard`, `/student/exams(/:id)`, `/student/attempts`, `/student/results(/:id)`, `POST /student/system-checks` |
| `attempt-service.js` | start/resume, **autosave answers**, integrity events, submit, receipt | `POST /student/exams/:id/start`, `PATCH /attempts/:attemptId/answers/:questionId`, `POST /attempts/:id/events`, `POST /attempts/:id/submit` |
| `proctor-service.js` | dashboard, availability, sessions, **live stream**, warn/message/flag/identity/note/escalate/terminate, end session, incidents, reports | `GET /proctor/dashboard`, `PATCH /proctor/me/availability`, `GET /proctor/sessions(/:id)`, `WS /ws/proctor/sessions/:id`, `POST /proctor/sessions/:id/incidents`, `POST /proctor/sessions/:id/end`, `PATCH /incidents/:id` |
| `admin-service.js` | admin dashboard, students, proctors, admins & roles, incidents, analytics, system settings | `GET /admin/dashboard`, `/admin/students(/:id)`, `/admin/students/import`, `/admin/proctors(/:id)`, `/admin/admins`, `/admin/roles/:id`, `/admin/analytics`, `/admin/settings/:section` |
| `result-service.js` | results explorer, detail, publish/withhold, CSV export | `GET /admin/results(/:id)`, `POST /admin/results/publish`, `POST /admin/results/:id/withhold`, `GET /admin/results/export` |

### Going live

1. Set `USE_MOCK: false` and `API_BASE` in `js/core/config.js`.
2. Make the backend return the shapes in `js/data/mock-data.js`. These are the spec §19 models: User, Exam, Question, Attempt, ProctorSession, Incident, Result, Notification.
3. Replace the mock body of `proctorService.subscribe()` with the WebSocket stub that is already written there.
4. Remove `mock-data.js` and `mock-api.js` from `tools/build-pages.py`.

`apiClient` already handles bearer tokens, JSON, timeouts, network errors and 401/403 redirects. All errors are normalised to `{ status, code, message }`, which every page displays.

---

## 6. Design system

- **Brand theme:**
  - HUK Ink `#0B1F33` for primary actions and headings.
  - Signal Orange `#FF7A1A`, used only for accents: the active-nav dot, which echoes the logo's dots, plus progress bars and highlights.
  - Action Orange `#C2410C` for accessible links and the primary exam calls to action.
  - Cloud surfaces with soft glass (blur 22px, 78–92% opacity), degrading to solid colour when blur isn't supported.
- **Black & White theme:** a full token override. Status is never shown by colour alone: chips differ by solid, outline, dashed or dotted borders and always carry text. Imagery is greyscaled. The theme toggle is on the landing page, the login page and every app top bar, and in Settings. It persists in `localStorage` and syncs to `/me/settings`.
- **Components** (`js/core/ui.js` plus the CSS):
  - App structure: AppShell, PageHeader.
  - Surfaces and data: GlassCard (`.card`), MetricCard, DataTable (turns into cards on mobile), StatusChip, Tabs (arrow-key navigation), Stepper, Pagination, Breadcrumbs.
  - Buttons: primary, secondary, ghost, accent, danger, icon.
  - Forms: FormField with validation and announced errors, Switch, Segmented control, Search.
  - Overlays and feedback: Modal (focus trap, Escape, becomes a bottom sheet on mobile), Drawer, Toast, Inline alert, Banner (offline), Tooltip, Dropdown menu.
  - States: EmptyState, Skeleton, Error state with retry.
  - Display: Progress, Score ring, signal-strength indicator, SVG charts.
- **Responsive:**
  - ≥1280px: full sidebar.
  - 1024–1279px: narrow sidebar.
  - 768–1023px: icon rail with hover labels.
  - Below 768px: app bar, drawer and student bottom nav; tables become cards; modals become bottom sheets; the exam palette becomes a bottom sheet with sticky Prev/Next actions; the timer stays visible.
  - Below 480px: compact type and spacing.
  - Tested at 1440px and 390px with no horizontal overflow on any page.
- **Accessibility:**
  - Semantic landmarks and a skip link on every page.
  - Labelled form controls with `aria-invalid` and live error messages.
  - Visible 2-ring focus style in both themes.
  - 44px touch targets.
  - Keyboard-operable tabs, menus, modals and the exam palette. Alt+←/→ moves between questions.
  - `aria-live` for autosave, timer warnings and proctor events.
  - Text summaries on every chart.
  - `prefers-reduced-motion` respected.

---

## 7. Assumptions & limitations

- **Authentication is mocked.** Any of the demo emails with `demo1234` signs in. Role guards are client-side for routing only; the backend must enforce authorisation.
- **Admin MFA:** admins always get an OTP step, and the demo code is `123456`.
- **Results:** `JAVA-201` releases results immediately so the student journey ends on a result. Other exams use manual release, and admins publish them from Results.
- **Long answers** get a provisional mock score. In production they would be marked by a reviewer.
- **Video and screen feeds** are labelled placeholders, ready for WebRTC. The live event stream is simulated, but student tab switches and progress are real when both tabs run in the same browser.
- **Camera/mic tests** use the real `getUserMedia` API. "Continue in demo mode" is offered when permission is blocked.
- **Report generator:** CSV export works client-side. Excel and PDF are marked as server-generated.
- **Inter** loads from Google Fonts, falling back to the system UI font when offline.
- **Brand assets** were extracted from the specification document. The logo dots were normalised to the spec's Signal Orange `#FF7A1A`. The doodles are crops of the supplied illustration.
- **Locale:** dates use `en-IN` formatting and the IST time zone by default; this can be changed in System settings.

---

## 8. QA

```bash
pip install playwright && playwright install chromium
python3 -m http.server 8765 &
python3 tests/smoke.py       # 51 pages × roles × 1440px & 390px: JS errors, overflow, broken links
python3 tests/journeys.py    # the three end-to-end journeys in §2
```
