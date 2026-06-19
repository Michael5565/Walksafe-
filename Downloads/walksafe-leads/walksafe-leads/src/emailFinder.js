const axios = require("axios");
const cheerio = require("cheerio");

const PERSONAL_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
  "icloud.com", "live.com", "msn.com", "aol.com", "yahoo.co.uk",
  "btinternet.com", "sky.com", "virginmedia.com",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Extract emails from HTML, filtering out personal domains
function extractEmails(html) {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const found = html.match(emailRegex) || [];

  return found.filter((email) => {
    const domain = email.split("@")[1].toLowerCase();
    if (PERSONAL_DOMAINS.includes(domain)) return false;
    if (domain.match(/\.(png|jpg|gif|svg|css|js|woff|ttf)$/)) return false;
    if (email.includes("example.") || email.includes("test@")) return false;
    return true;
  });
}

// DuckDuckGo HTML search - no API key, more tolerant than Google
async function findWebsite(companyName, location = "") {
  try {
    const query = `${companyName} ${location} UK`;
    const encoded = encodeURIComponent(query);

    const res = await axios.get(`https://html.duckduckgo.com/html/?q=${encoded}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.5",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(res.data);
    const links = [];

    // DuckDuckGo HTML results use .result__url
    $(".result__url").each((_, el) => {
      const href = $(el).text().trim();
      if (href) {
        let url = href.startsWith("http") ? href : "https://" + href;
        // Filter out irrelevant domains
        if (
          !url.includes("facebook.com") &&
          !url.includes("linkedin.com") &&
          !url.includes("yell.com") &&
          !url.includes("companies") &&
          !url.includes("checkatrade") &&
          !url.includes("trustpilot") &&
          !url.includes("192.com")
        ) {
          links.push(url);
        }
      }
    });

    // Also check result links
    $(".result__a").each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.startsWith("http") && !href.includes("duckduckgo")) {
        if (
          !href.includes("facebook.com") &&
          !href.includes("linkedin.com") &&
          !href.includes("yell.com") &&
          !href.includes("companies") &&
          !href.includes("checkatrade")
        ) {
          links.push(href);
        }
      }
    });

    return links[0] || null;
  } catch (err) {
    console.error(`  Website search failed for ${companyName}: ${err.message}`);
    return null;
  }
}

// Scrape a website's contact/about pages for a business email
async function scrapeEmailFromWebsite(websiteUrl) {
  // Normalise URL
  let baseUrl = websiteUrl;
  if (!baseUrl.startsWith("http")) baseUrl = "https://" + baseUrl;
  baseUrl = baseUrl.replace(/\/$/, "");

  const pagesToTry = [
    baseUrl,
    `${baseUrl}/contact`,
    `${baseUrl}/contact-us`,
    `${baseUrl}/about`,
    `${baseUrl}/about-us`,
  ];

  for (const url of pagesToTry) {
    try {
      const res = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        },
        timeout: 8000,
        maxRedirects: 5,
      });

      const emails = extractEmails(res.data);
      if (emails.length > 0) return emails[0];

      await sleep(500);
    } catch {
      // Page not found or timeout, try next
    }
  }

  return null;
}

module.exports = { findWebsite, scrapeEmailFromWebsite };