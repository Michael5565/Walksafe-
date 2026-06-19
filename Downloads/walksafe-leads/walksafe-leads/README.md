# WalkSafe Lead Gen Tool

Automated pipeline: Companies House -> website finder -> email scraper -> Gemini personalizer -> Zoho sender.

## Setup

1. Fill in `.env`:
   - `COMPANIES_HOUSE_API_KEY` - already set
   - `GEMINI_API_KEY` - get from aistudio.google.com (free)
   - `ZOHO_EMAIL` - operations@getwalksafe.co.uk
   - `ZOHO_PASSWORD` - your Zoho app-specific password (not your login password)

2. For Zoho app password: Zoho Mail -> Settings -> Security -> App Passwords -> Generate

## Usage

```bash
# Step 1: Build lead list only (no emails sent)
node index.js --fetch-only --target=50

# Step 2: Preview emails without sending
node index.js --send-only --dry-run

# Step 3: Send for real
node index.js --send-only

# Or do everything in one go
node index.js --target=50
```

## Output

- `output/leads.json` - all leads found with emails
- `logs/contacted.json` - who has been emailed (prevents duplicates)

## SIC Codes targeted

- 4941: Freight transport by road
- 4942: Removal services  
- 5229: Other transportation support activities
