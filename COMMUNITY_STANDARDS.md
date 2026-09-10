# 🌐 Community Standards & Repository Profile

## 📌 Repository Description

> **Lightweight, real-time issue reporting portal and organizer dashboard for on-ground hackathons, powered by Google Apps Script and Google Sheets.**

### Short Description (Optimized for GitHub "About" Box)
```text
Lightweight, real-time issue reporting portal and organizer dashboard for on-ground hackathons, powered by Google Apps Script and Google Sheets.
```

### Concise One-Liner
```text
Real-time issue tracking and support portal for hackathons powered by Google Apps Script.
```

### Feature-Focused Description
```text
A fast, zero-dependency SIH hackathon support desk featuring digital ticket passes, real-time organizer dashboard, and concurrency-safe Google Sheets storage.
```

### Suggested Topics & Tags
```text
hackathon, sih, support-desk, issue-tracker, ticketing-system, google-apps-script, google-sheets, vanilla-js
```

---

## 🏆 Community Standards Checklist (100% Complete)

This repository meets all standard GitHub Community Profile criteria:

| Standard | File / Location | Status | Description |
| :--- | :--- | :---: | :--- |
| **Description** | GitHub About Box & `COMMUNITY_STANDARDS.md` | ✅ Complete | Official project summary and metadata |
| **README** | [README.md](README.md) | ✅ Complete | Comprehensive setup, architecture, and feature overview |
| **Code of Conduct** | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | ✅ Complete | Contributor Covenant v2.1 standard |
| **Contributing Guide** | [CONTRIBUTING.md](CONTRIBUTING.md) | ✅ Complete | Local development setup, code quality, and PR workflow |
| **License** | [LICENSE](LICENSE) | ✅ Complete | Official open-source MIT License |
| **Security Policy** | [SECURITY.md](SECURITY.md) | ✅ Complete | Vulnerability disclosure policy & deployment security rules |
| **Support Resources** | [SUPPORT.md](SUPPORT.md) | ✅ Complete | Troubleshooting guides, FAQs, and community channels |
| **Contributor Credits** | [CONTRIBUTORS.md](CONTRIBUTORS.md) & [.all-contributorsrc](.all-contributorsrc) | ✅ Complete | Comprehensive attribution for human and AI contributors |
| **Issue Templates** | [.github/ISSUE_TEMPLATE/](.github/ISSUE_TEMPLATE/) | ✅ Complete | Structured bug reports, feature requests, and chooser |
| **Pull Request Template**| [.github/pull_request_template.md](.github/pull_request_template.md) | ✅ Complete | Pre-flight review checklist for contributions |
| **Repository Rulesets** | [.github/rulesets/](.github/rulesets/) | ✅ Complete | Automated branch protection, naming, and CI rulesets |

---

## 🔒 Active Repository Rulesets

Our repository enforces automated branch, tag, and quality controls through GitHub Rulesets:

1. **[Default Branch Governance Ruleset](.github/rulesets/main-protection-ruleset.json)**:
   - Targets `main` default branch.
   - Prevents branch deletion and force-pushes (`non_fast_forward`).
   - Requires pull request reviews before merging.
   - Requires linear history and conventional commit formatting.

2. **[CI Status Check Ruleset](.github/rulesets/ci-status-check-ruleset.json)**:
   - Requires passing CI checks (`Validate Standards & Code Integrity`) before merging.
   - Requires branches to be up to date with `main` before merging.

3. **[Branch Naming Convention Ruleset](.github/rulesets/branch-naming-ruleset.json)**:
   - Enforces structured branch names: `feat/*`, `fix/*`, `docs/*`, `style/*`, `refactor/*`, `perf/*`, `test/*`, `chore/*`.

4. **[Commit Message Pattern Ruleset](.github/rulesets/commit-message-ruleset.json)**:
   - Enforces Conventional Commits specification on all commit headers.

5. **[Push Protection & Secret Scanning Ruleset](.github/rulesets/push-protection-ruleset.json)**:
   - Enforces secret scanning and prevents accidental pushes of live deployment credentials.

6. **[Release Tag Protection Ruleset](.github/rulesets/release-tags-ruleset.json)**:
   - Protects versioned release tags (`refs/tags/v*`).
   - Prevents accidental tag deletion or overwriting.

---

## 🛠️ How to Import Rulesets on GitHub

1. In your GitHub repository, navigate to **Settings** → **Rules** → **Rulesets**.
2. Click **New ruleset** → **Import a ruleset**.
3. Select any of the ruleset JSON files located in [`.github/rulesets/`](.github/rulesets/).
4. Choose enforcement status (**Active** or **Evaluate**).
5. Click **Create** to activate enforcement.
