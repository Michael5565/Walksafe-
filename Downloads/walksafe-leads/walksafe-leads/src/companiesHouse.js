const axios = require("axios");

const API_KEY = process.env.COMPANIES_HOUSE_API_KEY;
const BASE_URL = "https://api.company-information.service.gov.uk";

const client = axios.create({
  baseURL: BASE_URL,
  auth: { username: API_KEY, password: "" },
});

// The advanced search API needs at least one text filter alongside sic_codes
// Using company_name_includes with keywords to find transport companies
async function searchBySicCode(sicCode, keyword, startIndex = 0, itemsPerPage = 20) {
  try {
    const res = await client.get("/advanced-search/companies", {
      params: {
        sic_codes: sicCode,
        company_name_includes: keyword,
        company_status: "active",
        start_index: startIndex,
        size: itemsPerPage,
      },
    });
    return res.data;
  } catch (err) {
    if (err.response?.status === 404) {
      return { items: [] }; // no results, not an error
    }
    console.error(`Error fetching SIC ${sicCode} + "${keyword}":`, err.message);
    return null;
  }
}

async function getCompanyProfile(companyNumber) {
  try {
    const res = await client.get(`/company/${companyNumber}`);
    return res.data;
  } catch (err) {
    console.error(`Error fetching company ${companyNumber}:`, err.message);
    return null;
  }
}

async function fetchTransportCompanies(totalTarget = 100) {
  const sicCodes = (process.env.SIC_CODES || "4941,4942,5229").split(",");

  // Keywords to cast a wide net - combined with SIC codes gives good precision
  const keywords = [
    "transport", "logistics", "haulage", "courier", "delivery",
    "freight", "distribution", "van", "fleet", "removals"
  ];

  const companies = [];
  const seen = new Set();

  outer:
  for (const sic of sicCodes) {
    for (const keyword of keywords) {
      if (companies.length >= totalTarget) break outer;

      console.log(`Fetching SIC ${sic} + "${keyword}"...`);
      let startIndex = 0;

      while (companies.length < totalTarget) {
        const data = await searchBySicCode(sic, keyword, startIndex, 20);
        if (!data || !data.items || data.items.length === 0) break;

        for (const item of data.items) {
          if (!seen.has(item.company_number)) {
            seen.add(item.company_number);
            companies.push({
              companyNumber: item.company_number,
              companyName: item.company_name,
              companyStatus: item.company_status,
              address: item.registered_office_address,
              sicCodes: item.sic_codes,
            });
          }
        }

        if (data.items.length < 20) break; // no more pages
        startIndex += 20;
        await sleep(600);
      }

      await sleep(600);
    }
  }

  return companies;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { fetchTransportCompanies, getCompanyProfile };