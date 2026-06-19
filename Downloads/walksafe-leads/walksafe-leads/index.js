require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { fetchTransportCompanies } = require("./src/companiesHouse");
const { findWebsite, scrapeEmailFromWebsite } = require("./src/emailFinder");
const { generateColdEmail, generateSubjectLine } = require("./src/emailWriter");
const { sendEmail } = require("./src/sender");
const { markContacted, isAlreadyContacted, saveLeads, loadLeads } = require("./src/tracker");

const DRY_RUN = process.argv.includes("--dry-run");
const FETCH_ONLY = process.argv.includes("--fetch-only");
const SEND_ONLY = process.argv.includes("--send-only");
const RESET = process.argv.includes("--reset"); // force re-fetch from Companies House
const TARGET = parseInt(process.argv.find(a => a.startsWith("--target="))?.split("=")[1] || "50");

const COMPANIES_CACHE = path.join(__dirname, "output/companies-cache.json");
const PROGRESS_FILE = path.join(__dirname, "output/progress.json");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function saveCompaniesCache(companies) {
  fs.mkdirSync(path.dirname(COMPANIES_CACHE), { recursive: true });
  fs.writeFileSync(COMPANIES_CACHE, JSON.stringify(companies, null, 2));
}

function loadCompaniesCache() {
  if (!fs.existsSync(COMPANIES_CACHE)) return null;
  return JSON.parse(fs.readFileSync(COMPANIES_CACHE, "utf8"));
}

// Track which companies have already been processed (website searched)
function loadProgress() {
  if (!fs.existsSync(PROGRESS_FILE)) return { processed: [] };
  return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
}

function saveProgress(processed) {
  fs.mkdirSync(path.dirname(PROGRESS_FILE), { recursive: true });
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ processed }, null, 2));
}

async function buildLeadList() {
  // Step 1: Get companies — from cache or Companies House API
  let companies = null;

  if (!RESET) {
    companies = loadCompaniesCache();
    if (companies) {
      console.log(`\nLoaded ${companies.length} companies from cache (use --reset to re-fetch).\n`);
    }
  }

  if (!companies) {
    console.log(`\nFetching up to ${TARGET} UK transport companies from Companies House...\n`);
    companies = await fetchTransportCompanies(TARGET);
    saveCompaniesCache(companies);
    console.log(`Fetched and cached ${companies.length} companies.\n`);
  }

  // Step 2: Find emails — resume from where we left off
  const progress = loadProgress();
  const alreadyProcessed = new Set(progress.processed);
  const existingLeads = loadLeads();
  const leads = [...existingLeads];

  const remaining = companies.filter(c => !alreadyProcessed.has(c.companyNumber));
  console.log(`${remaining.length} companies left to process (${alreadyProcessed.size} already done).\n`);

  for (const company of remaining) {
    const location = company.address?.locality || company.address?.region || "";
    console.log(`Processing: ${company.companyName} (${location || "UK"})`);

    const website = await findWebsite(company.companyName, location);

    if (!website) {
      console.log(`  No website found, skipping.\n`);
    } else {
      console.log(`  Website: ${website}`);
      const email = await scrapeEmailFromWebsite(website);

      if (!email) {
        console.log(`  No business email found, skipping.\n`);
      } else {
        console.log(`  Email: ${email}`);
        leads.push({
          companyName: company.companyName,
          companyNumber: company.companyNumber,
          address: company.address,
          website,
          email,
        });
      }
    }

    // Mark as processed regardless of outcome so we don't retry on restart
    alreadyProcessed.add(company.companyNumber);
    saveProgress([...alreadyProcessed]);
    saveLeads(leads); // save leads incrementally too

    await sleep(1500);
  }

  console.log(`\nDone. ${leads.length} leads with business emails found.\n`);
  return leads;
}

async function sendCampaign(leads) {
  console.log(`\nStarting email campaign for ${leads.length} leads...\n`);
  let sent = 0;
  let skipped = 0;

  for (const lead of leads) {
    if (isAlreadyContacted(lead.email)) {
      console.log(`Skipping ${lead.email} (already contacted)`);
      skipped++;
      continue;
    }

    console.log(`\nWriting email for ${lead.companyName}...`);
    const [body, subject] = await Promise.all([
      generateColdEmail(lead),
      generateSubjectLine(lead.companyName),
    ]);

    if (!body) {
      console.log(`  Gemini failed, skipping.`);
      continue;
    }

    console.log(`  Subject: ${subject}`);
    console.log(`  Body preview: ${body.substring(0, 100)}...`);

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would send to ${lead.email}`);
    } else {
      const result = await sendEmail({ to: lead.email, subject, body });
      if (result.success) {
        markContacted(lead.email, lead.companyName);
        sent++;
      }
    }

    await sleep(30000);
  }

  console.log(`\nDone. Sent: ${sent}, Skipped: ${skipped}`);
}

async function main() {
  let leads;

  if (SEND_ONLY) {
    leads = loadLeads();
    if (leads.length === 0) {
      console.log("No saved leads found. Run without --send-only first.");
      return;
    }
    console.log(`Loaded ${leads.length} saved leads.`);
  } else {
    leads = await buildLeadList();
    if (FETCH_ONLY) {
      console.log("Lead list built. Run with --send-only to send emails.");
      return;
    }
  }

  await sendCampaign(leads);
}

main().catch(console.error);