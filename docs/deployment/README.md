# Deployment Guide

## Staging
- Run `npm run build` and `node editor-server.js`.
- Verify the site locally before uploading to Hostinger.

## Production
- Build the site and publish the contents of dist/.
- Keep backups in the backups/ folder before each deployment.
- Use the rollback procedure in docs/security/README.md if any issue is found.
