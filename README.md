# WalkSafe Compliance App

Professional commercial vehicle compliance and walkaround checks.

## Local Development & GitHub Push

1. **Install Dependencies**:
   Before running any commands, you MUST install the project dependencies:
   ```bash
   npm install
   ```

2. **Initialize Git & Link GitHub**:
   If your folder is not already a git repository (the `fatal: not a git repository` error), run these:
   ```bash
   git init
   git remote add origin https://github.com/Michael5565/WalkSafe.git
   ```

3. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Update with latest AI Studio logic"
   git branch -M main
   git push origin main --force
   ```

## Cloudflare Deployment

This app is configured to run on **Cloudflare Pages** with **D1 Database**.

1. **Deploy Frontend & API**:
   ```bash
   npx wrangler pages deploy
   ```

2. **Setup D1 Database**:
   - Create a D1 database in your Cloudflare Dashboard named `walksafe-db`.
   - Update your `wrangler.toml` (or configuration in the Cloudflare dashboard) to bind `DB` to your D1 ID.
   - Run the initial schema setup:
     ```bash
     npx wrangler d1 execute walksafe-db --file=./schema.sql --remote
     ```

## Key Modules
- **Manager Dashboard**: Fleet management, defect tracking, and audits.
- **Driver PWA**: Daily check interface with photo/signature capture.
- **PDF Engine**: Generates DVSA-compliant reports.
