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
| **Repository Rulesets** | [GitHub Settings Rulesets](https://github.com/DhigveerrajuG/GBlr26sIh/rules) | ✅ Active (ID: 22814955) | Live automated branch governance, quality gate, and CI ruleset |

---

## 🔒 Active Repository Ruleset (Configured in GitHub Settings)

The repository's default branch (`main`) is actively protected under GitHub Rulesets:

### 🛡️ [Main Production Protection & Quality Gate](https://github.com/DhigveerrajuG/GBlr26sIh/rules/22814955)
- **Status**: 🟢 **Active**
- **Ruleset ID**: `22814955`
- **Target Branch**: Default Branch (`main` / `~DEFAULT_BRANCH`)
- **Direct Link**: [Settings > Rules > Ruleset #22814955](https://github.com/DhigveerrajuG/GBlr26sIh/rules/22814955)
- **Active Enforcements**:
  1. **Deletion Restriction**: Prevents accidental deletion of the `main` branch.
  2. **Force-Push Blocking (`non_fast_forward`)**: Disallows force pushes to preserve irreversible git history.
  3. **Linear History (`required_linear_history`)**: Enforces clean, merge-commit-free git topology.
  4. **Pull Request Quality Gate (`pull_request`)**:
     - Requires review thread resolution before merging.
     - Automatically dismisses stale pull request approvals when new commits are pushed.
  5. **Automated CI Status Checks (`required_status_checks`)**:
     - Requires passing test job: `Validate Standards & Code Integrity` (defined in [`.github/workflows/ci-ruleset-enforcement.yml`](.github/workflows/ci-ruleset-enforcement.yml)).
- **Maintainer Bypass Safeguard**:
  - **Bypass Actor**: Repository Admin (`@DhigveerrajuG`)
  - **Mode**: `Always`
  - *Ensures maintainers have unhindered capability to push urgent hotfixes while automated protections prevent accidental branch deletion and unformatted pushes.*

---

## 🛠️ Managing Rulesets in GitHub Settings

1. Navigate to **[Repository Settings → Rules → Rulesets](https://github.com/DhigveerrajuG/GBlr26sIh/rules)**.
2. View and edit the active ruleset **Main Production Protection & Quality Gate**.
3. Additional modular rulesets (e.g. branch naming, release tag protection, push file filters) can be imported from [`.github/rulesets/`](.github/rulesets/) at any time via **New ruleset** → **Import a ruleset**.

