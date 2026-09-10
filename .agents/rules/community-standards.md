# Community Standards & Repository Ruleset

This ruleset governs code quality, contribution standards, and security constraints for the **SIH Support Desk** repository.

## 📌 Repository Description
> **Lightweight, real-time issue reporting portal and organizer dashboard for on-ground hackathons, powered by Google Apps Script and Google Sheets.**

## 1. Governance & Standards
- All contributors and AI assistants must uphold the standards set forth in [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md).
- Follow contribution guidelines documented in [CONTRIBUTING.md](../../CONTRIBUTING.md).
- Security concerns must be handled according to [SECURITY.md](../../SECURITY.md).
- Support channels and troubleshooting are outlined in [SUPPORT.md](../../SUPPORT.md).
- Complete standards profile and checklist are tracked in [COMMUNITY_STANDARDS.md](../../COMMUNITY_STANDARDS.md).
- Contributors must be credited in [CONTRIBUTORS.md](../../CONTRIBUTORS.md) and [.all-contributorsrc](../../.all-contributorsrc).

## 2. Code Architecture & Style
- **Zero-Dependency Core:** Keep client-side portals (`index.html`, `admin.html`) pure vanilla HTML5, CSS3, and modern ECMAScript. Do not introduce heavy frontend frameworks.
- **Responsive Design:** Every view must be mobile-first and tested for both desktop viewports and narrow smartphone displays.
- **Accessible & Semantic:** Use proper HTML semantic elements, accessible color contrast ratios, and clear ARIA attributes.
- **SWR & Performance:** Retain instant UI responsiveness using SWR (stale-while-revalidate) and local storage caching where applicable.

## 3. Security & Privacy Guardrails
- **No Production Secrets:** Never commit real Google Sheets document IDs, live private keys, or actual deployed `SCRIPT_URL` endpoints into version control. Keep templates with `YOUR_SHARED_SECRET_HERE` and placeholder URLs.
- **XSS Prevention:** Ensure all participant-submitted data (e.g. issue text, team name) is properly escaped before rendering into the DOM.
- **Concurrency & Locks:** Keep backend mutations lock-safe using `LockService.getScriptLock()` in `apps-script-backend.gs`.

## 4. Git & Release Conventions
- **Conventional Commits:** All commit messages must follow conventional commits formatting (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `chore:`).
- **Co-authorship:** When collaborating with AI pair programmers, include appropriate `Co-authored-by:` trailers in git commits.
- **Branch Protection & Rulesets:** Changes targeting `main` must adhere to rulesets in [`.github/rulesets/`](../../.github/rulesets/) and use the [PR Template](../../.github/pull_request_template.md).
