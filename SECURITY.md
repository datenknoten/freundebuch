# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Freundebuch, please report it **privately**. Do not open a public issue.

**Email:** [tim@schumacher.im](mailto:tim@schumacher.im)

**GPG Key:** `9F3C 4DD8 D576 6CA0 01DF FED4 59AE BF88 84CA 25D9`

You can encrypt your report using this key. To fetch it from a keyserver:

```bash
gpg --keyserver keys.openpgp.org --recv-keys 9F3C4DD8D5766CA001DFFED459AEBF8884CA25D9
```

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### What to Expect

- Acknowledgment within 48 hours
- Regular updates on the status of the fix
- Credit in the fix commit (unless you prefer to remain anonymous)

## Scope

The following are in scope for security reports:

- Authentication and session handling
- Authorization and access control
- SQL injection, XSS, CSRF, and other injection attacks
- Data exposure or leakage
- CalDAV/CardDAV protocol vulnerabilities
- Dependency vulnerabilities with a demonstrated exploit path

## Dependency Management

Dependencies are pinned to exact versions and monitored by [Renovate](https://docs.renovatebot.com/) with vulnerability alerts enabled. Security-related dependency updates are labeled and prioritized.
