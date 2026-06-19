const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI;

function getClient() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

async function generateColdEmail(company) {
  const model = getClient().getGenerativeModel({ model: "gemini-1.5-flash" });

  const location = company.address?.locality || company.address?.region || "the UK";

  const prompt = `You are writing a cold email on behalf of WalkSafe (getwalksafe.co.uk), a DVSA-compliant fleet management PWA built for UK operators.

Write a short cold email to ${company.companyName}, a transport/logistics company based in ${location}.

Rules:
- 3 to 4 sentences max
- Plain text only, no markdown, no bullet points
- No em dashes
- Mention DVSA walkaround check compliance naturally
- Mention the free 30-day trial
- Soft CTA: ask if they have 10 minutes to take a look
- Sign off as: Michael, WalkSafe (getwalksafe.co.uk)
- Do not use the words "game-changing", "revolutionary", or "industry-leading"
- Sound human, not like a marketing email

Return only the email body. No subject line. No preamble.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return text;
  } catch (err) {
    console.error("Gemini error:", err.message);
    return null;
  }
}

async function generateSubjectLine(companyName) {
  const model = getClient().getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Write a single cold email subject line for a fleet management tool called WalkSafe targeting ${companyName}, a UK transport company. 
  
Rules:
- Under 8 words
- Mention DVSA compliance or walkaround checks
- No clickbait, no exclamation marks
- Plain text only

Return only the subject line, nothing else.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    return "DVSA-compliant walkaround checks for your fleet";
  }
}

module.exports = { generateColdEmail, generateSubjectLine };
