"""Generates the thin HTML page shells from one manifest.
Run: python3 tools/build-pages.py   (re-run after adding a page)"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORE = ['js/core/config.js', 'js/data/mock-data.js', 'js/core/mock-api.js', 'js/core/api-client.js', 'js/core/router.js',
        'js/core/ui.js', 'js/core/theme.js', 'js/core/auth.js', 'js/core/charts.js', 'js/core/shell.js'] + \
       ['js/services/%s-service.js' % s for s in ['auth', 'notification', 'exam', 'question', 'student', 'attempt', 'proctor', 'admin', 'result']]
GROUPS = {
    'public': ['js/pages/auth-pages.js'],
    'shared': ['js/pages/shared-pages.js'],
    'student': ['js/pages/student-pages.js', 'js/pages/exam-workspace.js'],
    'proctor': ['js/pages/incidents-view.js', 'js/pages/proctor-pages.js', 'js/pages/proctor-console.js'],
    'admin': ['js/pages/incidents-view.js', 'js/pages/admin-exams.js', 'js/pages/admin-wizard.js', 'js/pages/admin-questions.js', 'js/pages/admin-people.js', 'js/pages/admin-insights.js'],
}
# (file, page id, role, layout, title, group)
PAGES = [
    ('index.html', 'landing', 'any', 'public', 'Assess. Verify. Hire.', 'public'),
    ('login.html', 'login', 'any', 'public', 'Sign in', 'public'),
    ('register.html', 'register', 'any', 'public', 'Create candidate account', 'public'),
    ('verify-otp.html', 'verify-otp', 'any', 'public', 'Verify your sign-in', 'public'),
    ('forgot-password.html', 'forgot-password', 'any', 'public', 'Reset your password', 'public'),
    ('reset-password.html', 'reset-password', 'any', 'public', 'Choose a new password', 'public'),
    ('session-expired.html', 'session-expired', 'any', 'public', 'Session expired', 'public'),
    ('unauthorized.html', 'unauthorized', 'any', 'public', 'No access', 'public'),
    ('404.html', 'not-found', 'any', 'public', 'Page not found', 'public'),
    ('shared/notifications.html', 'notifications', 'any', 'app', 'Notifications', 'shared'),
    ('shared/profile.html', 'profile', 'any', 'app', 'Profile', 'shared'),
    ('shared/settings.html', 'settings', 'any', 'app', 'Settings', 'shared'),
    ('shared/help.html', 'help', 'any', 'app', 'Help', 'shared'),
    ('student/dashboard.html', 'student-dashboard', 'student', 'app', 'Dashboard', 'student'),
    ('student/exams.html', 'student-exams', 'student', 'app', 'Exams', 'student'),
    ('student/attempts.html', 'student-attempts', 'student', 'app', 'My attempts', 'student'),
    ('student/exam-details.html', 'student-exam-detail', 'student', 'app', 'Exam details', 'student'),
    ('student/system-check.html', 'student-system-check', 'student', 'app', 'System check', 'student'),
    ('student/instructions.html', 'student-instructions', 'student', 'app', 'Instructions', 'student'),
    ('student/take-exam.html', 'student-take-exam', 'student', 'focus', 'Exam in progress', 'student'),
    ('student/submitted.html', 'student-submitted', 'student', 'app', 'Exam submitted', 'student'),
    ('student/results.html', 'student-results', 'student', 'app', 'Results', 'student'),
    ('student/result-detail.html', 'student-result-detail', 'student', 'app', 'Result', 'student'),
    ('proctor/dashboard.html', 'proctor-dashboard', 'proctor', 'app', 'Live queue', 'proctor'),
    ('proctor/assigned-exams.html', 'proctor-assigned', 'proctor', 'app', 'Assigned exams', 'proctor'),
    ('proctor/live-sessions.html', 'proctor-live', 'proctor', 'app', 'Live sessions', 'proctor'),
    ('proctor/console.html', 'proctor-console', 'proctor', 'app', 'Live console', 'proctor'),
    ('proctor/candidate.html', 'proctor-candidate', 'proctor', 'app', 'Candidate monitor', 'proctor'),
    ('proctor/incidents.html', 'proctor-incidents', 'proctor', 'app', 'Incidents', 'proctor'),
    ('proctor/session-history.html', 'proctor-history', 'proctor', 'app', 'Session history', 'proctor'),
    ('proctor/session-summary.html', 'proctor-session-summary', 'proctor', 'app', 'Session summary', 'proctor'),
    ('proctor/reports.html', 'proctor-reports', 'proctor', 'app', 'Reports', 'proctor'),
    ('admin/dashboard.html', 'admin-dashboard', 'admin', 'app', 'Dashboard', 'admin'),
    ('admin/exams.html', 'admin-exams', 'admin', 'app', 'Exams', 'admin'),
    ('admin/exam-wizard.html', 'admin-exam-wizard', 'admin', 'app', 'Create exam', 'admin'),
    ('admin/exam-detail.html', 'admin-exam-detail', 'admin', 'app', 'Exam', 'admin'),
    ('admin/schedule.html', 'admin-schedule', 'admin', 'app', 'Exam schedule', 'admin'),
    ('admin/question-bank.html', 'admin-question-bank', 'admin', 'app', 'Question bank', 'admin'),
    ('admin/question-editor.html', 'admin-question-editor', 'admin', 'app', 'Question editor', 'admin'),
    ('admin/question-import.html', 'admin-question-import', 'admin', 'app', 'Import questions', 'admin'),
    ('admin/sections.html', 'admin-sections', 'admin', 'app', 'Sections', 'admin'),
    ('admin/students.html', 'admin-students', 'admin', 'app', 'Students', 'admin'),
    ('admin/student-profile.html', 'admin-student-profile', 'admin', 'app', 'Student profile', 'admin'),
    ('admin/proctors.html', 'admin-proctors', 'admin', 'app', 'Proctors', 'admin'),
    ('admin/proctor-profile.html', 'admin-proctor-profile', 'admin', 'app', 'Proctor profile', 'admin'),
    ('admin/admins.html', 'admin-admins', 'admin', 'app', 'Admins & roles', 'admin'),
    ('admin/results.html', 'admin-results', 'admin', 'app', 'Results', 'admin'),
    ('admin/result-detail.html', 'admin-result-detail', 'admin', 'app', 'Result detail', 'admin'),
    ('admin/reports.html', 'admin-reports', 'admin', 'app', 'Reports', 'admin'),
    ('admin/incidents.html', 'admin-incidents', 'admin', 'app', 'Incidents', 'admin'),
    ('admin/settings.html', 'admin-settings', 'admin', 'app', 'System settings', 'admin'),
]
CSS = ['tokens', 'themes', 'base', 'layout', 'components', 'pages', 'responsive']
TPL = '''<!DOCTYPE html>
<html lang="en" data-theme="brand">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{title} | HUK HIRE</title>
  <meta name="description" content="HUK HIRE: proctored skills assessments. Assess. Verify. Hire.">
  <meta name="theme-color" content="#0B1F33">
  <link rel="icon" type="image/png" href="{b}assets/logo/huk-hire-mark.png">
  <!-- Apply the saved theme before first paint to avoid a flash -->
  <script>try{{document.documentElement.dataset.theme=localStorage.getItem('huk_theme')||'brand'}}catch(e){{}}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap">
{css}
</head>
<body data-page="{pid}" data-role="{role}" data-layout="{layout}" data-base="{b}">
  <div id="app"></div>
  <noscript><p style="padding:24px;font-family:sans-serif">HUK HIRE needs JavaScript. Turn it on in your browser settings and reload.</p></noscript>
{js}
</body>
</html>
'''
for path, pid, role, layout, title, group in PAGES:
    depth = path.count('/')
    b = '../' * depth
    css = '\n'.join('  <link rel="stylesheet" href="%scss/%s.css">' % (b, c) for c in CSS)
    files = CORE + GROUPS[group] + ['js/app.js']
    js = '\n'.join('  <script src="%s%s"></script>' % (b, f) for f in files)
    out = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w').write(TPL.format(title=title.replace('&', '&amp;'), b=b, css=css, js=js, pid=pid, role=role, layout=layout))
print('Generated %d pages' % len(PAGES))
