# Security Overview

This directory contains the production-safe security baseline for the AKA Digital website.

## Controls
- HTTPS enforcement through Hostinger and Cloudflare
- Secure headers and CSP report-only mode
- Secret redaction and audit logging for CMS operations
- Backup and rollback guidance

## Rollback
1. Restore the previous build from the backups folder.
2. Revert the last Git commit if the issue is code-related.
3. Re-enable the previous CDN or hostinger deployment if needed.
