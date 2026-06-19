const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "../logs/contacted.json");
const OUTPUT_FILE = path.join(__dirname, "../output/leads.json");

function loadContacted() {
  if (!fs.existsSync(LOG_FILE)) return {};
  return JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
}

function markContacted(email, companyName) {
  const log = loadContacted();
  log[email] = { companyName, contactedAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

function isAlreadyContacted(email) {
  const log = loadContacted();
  return !!log[email];
}

function saveLeads(leads) {
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(leads, null, 2));
}

function loadLeads() {
  if (!fs.existsSync(OUTPUT_FILE)) return [];
  return JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
}

module.exports = { markContacted, isAlreadyContacted, saveLeads, loadLeads };
