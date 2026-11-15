# Security Policy

The SIH Support Desk project takes the security and integrity of on-ground hackathon operations seriously. This document outlines our vulnerability disclosure process and security recommendations.

---

## 🛡️ Supported Versions

We actively maintain and provide security patches for the latest version on the `main` branch.

| Version / Branch | Supported          | Notes |
| :--- | :---: | :--- |
| `main` | ✅ Yes | Latest production release |
| Older commits/tags | ❌ No | Please upgrade to the latest `main` branch |

---

## 🔒 Reporting a Vulnerability

If you discover a security vulnerability in this project, **please do not disclose it publicly in an open GitHub issue.**

Instead, please report it responsibly:
1. **GitHub Private Security Advisory:** Open a report under [GitHub Security Advisories](https://github.com/DhigveerrajuG/GBlr26sIh/security/advisories) (if enabled).
2. **Direct Maintainer Contact:** Contact the repository maintainer:
   - **Lead Maintainer:** Dhigveerraju Gadde ([@DhigveerrajuG](https://github.com/DhigveerrajuG))

### What to Include in Your Report
Please provide sufficient detail to help us understand, reproduce, and remediate the issue:
- Description of the vulnerability and its potential impact.
- Step-by-step instructions or Proof of Concept (PoC) to reproduce the behavior.
- Affected components (e.g. `index.html`, `admin.html`, `apps-script-backend.gs`).
- Any suggested remediations or mitigations.

### Response Timeline
- **Acknowledgement:** We strive to acknowledge reports within 48 hours.
- **Assessment & Triage:** An initial assessment will be completed within 5 business days.
- **Fix & Disclosure:** Once a fix is validated and deployed, an advisory and release note will be published.

---

## ⚙️ Security Best Practices for Deployers

When deploying this project for your own event or hackathon:

1. **Shared Secret Key:**
   - Always set a strong, unique random key in `SHARED_SECRET` in `apps-script-backend.gs` and match it in `index.html`.
   - Never commit your private production `SHARED_SECRET` to a public repository.

2. **Google Apps Script Access:**
   - When deploying the Web App, choose "Who has access: Anyone" only if intended for open participant submissions.
   - Restrict access to the underlying Google Spreadsheet so only authorized organizers have edit permissions.

3. **Admin Keys:**
   - Issue distinct admin keys for each organizer in the `Admins` sheet.
   - Do not share master owner keys across team members.
   - Revoke inactive keys by toggling the `Active` column in the `Admins` sheet to `No`.

4. **Rate Limiting & Cooldowns:**
   - The backend enforces a submission cooldown per device/fingerprint (`COOLDOWN_SECONDS`) to prevent spamming and ticket flooding. Do not disable this mechanism in production environments.
