# 🌐 Community Standards & Repository Profile

## 📌 Repository Description

> **Lightweight, real-time issue reporting portal and organizer dashboard for on-ground hackathons, powered by Google Apps Script and Google Sheets.**

### Short Description (GitHub About Box)
```text
Lightweight, real-time issue reporting portal and organizer dashboard for on-ground hackathons, powered by Google Apps Script and Google Sheets.
```

### Suggested Topics & Tags
```text
hackathon, sih, support-desk, issue-tracker, ticketing-system, google-apps-script, google-sheets, vanilla-js
```

---

## 🏆 Community Standards Checklist (100% Complete)

This repository meets all standard GitHub Community Profile criteria:

| Standard | File / Location | Status |
| :--- | :--- | :---: |
| **Description** | Top of README, meta tags, and GitHub About Box | ✅ Complete |
| **README** | [README.md](README.md) | ✅ Complete |
| **Code of Conduct** | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) (Contributor Covenant v2.1) | ✅ Complete |
| **Contributing Guide** | [CONTRIBUTING.md](CONTRIBUTING.md) (Setup, guidelines, PR flow) | ✅ Complete |
| **License** | [LICENSE](LICENSE) (MIT License) | ✅ Complete |
| **Security Policy** | [SECURITY.md](SECURITY.md) (Vulnerability disclosure & best practices) | ✅ Complete |
| **Support Resources** | [SUPPORT.md](SUPPORT.md) (Troubleshooting & community Q&A) | ✅ Complete |
| **Contributor Credits** | [CONTRIBUTORS.md](CONTRIBUTORS.md) & [.all-contributorsrc](.all-contributorsrc) | ✅ Complete |
| **Issue Templates** | [.github/ISSUE_TEMPLATE/](.github/ISSUE_TEMPLATE/) (Bug report, feature request, config) | ✅ Complete |
| **Pull Request Template**| [.github/pull_request_template.md](.github/pull_request_template.md) | ✅ Complete |
| **Repository Rulesets** | [.github/rulesets/](.github/rulesets/) (Branch governance & tag protection) | ✅ Complete |

---

## 🔒 Active Repository Rulesets

Our repository enforces automated branch and release safety through GitHub Rulesets:

1. **[Default Branch Governance Ruleset](.github/rulesets/main-protection-ruleset.json)**:
   - Targets `main` branch.
   - Prevents branch deletion and force-pushes (`non_fast_forward`).
   - Requires pull request reviews before merging.
   - Requires linear history and conventional commit formatting.

2. **[CI Status Check Ruleset](.github/rulesets/ci-status-check-ruleset.json)**:
   - Requires passing CI checks (`Validate Standards & Code Integrity`) before merging.
   - Requires branches to be up to date with `main`.

3. **[Branch Naming Convention Ruleset](.github/rulesets/branch-naming-ruleset.json)**:
   - Enforces structured branch names: `feat/*`, `fix/*`, `docs/*`, `style/*`, `refactor/*`, `perf/*`, `test/*`, `chore/*`.

4. **[Release Tag Protection Ruleset](.github/rulesets/release-tags-ruleset.json)**:
   - Protects versioned release tags (`refs/tags/v*`).
   - Prevents accidental tag deletion or replacement.

---

## 🛠️ How to Import Rulesets on GitHub

1. In your GitHub repository, navigate to **Settings** → **Rules** → **Rulesets**.
2. Click **New ruleset** → **Import a ruleset**.
3. Select any of the ruleset JSON files in `.github/rulesets/`.
4. Click **Create** to activate enforcement.
