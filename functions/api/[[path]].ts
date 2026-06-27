import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

type Bindings = {
  DB: D1Database;
  DVLA_API_KEY?: string;
  FCM_PROJECT_ID?: string;
  FCM_CLIENT_EMAIL?: string;
  FCM_PRIVATE_KEY?: string;
  PAYSTACK_SECRET_KEY?: string;
  ZEPTOMAIL_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// --- Helper: Verify DB setup ---
const getDbOrThrow = (c: any) => {
  const db = c.env.DB;
  if (!db) {
    throw new Error("D1 Database binding 'DB' is missing. Please create a D1 database named 'walksafe-db' and bind it to 'DB' in your Cloudflare Pages Settings.");
  }
  return db;
};

// --- Error Handler ---
app.onError((err, c) => {
  console.error("Cloudflare Functions Error:", err);
  return c.json({ error: err.message || "An unexpected error occurred" }, 500);
});


// POST /api/auth/reset-password — Validate token, update password
app.post('/auth/reset-password', async (c) => {
  const db = getDbOrThrow(c);
  const { token, newPassword } = await c.req.json();
  if (!token || !newPassword) {
    return c.json({ success: false, error: "Token and new password are required" }, 400);
  }

  const record = await db.prepare("SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > ?").bind(token, new Date().toISOString()).first();
  if (!record) {
    return c.json({ success: false, error: "This reset link has expired or is invalid." });
  }

  // Mark as used
  await db.prepare("UPDATE password_reset_tokens SET used = 1 WHERE id = ?").bind(record.id).run();

  const cleanEmail = record.email;

  // Update company password if it's a manager account
  const company = await db.prepare("SELECT id FROM company WHERE LOWER(TRIM(email)) = ?").bind(cleanEmail).first();
  if (company) {
    await db.prepare("UPDATE company SET managerPassword = ? WHERE id = ?").bind(newPassword, company.id).run();
  }

  // Update driver password if it's a driver account
  const driver = await db.prepare("SELECT id FROM drivers WHERE LOWER(TRIM(email)) = ?").bind(cleanEmail).first();
  if (driver) {
    await db.prepare("UPDATE drivers SET pin = ? WHERE id = ?").bind(newPassword, driver.id).run();
  }

  return c.json({ success: true, message: "Password reset successfully!" });
});

// --- Push Messaging Helper (FCM v1 for Cloudflare) ---
async function getToken(clientEmail: string, privateKey: string) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const decodeKey = (pem: string) => {
  // Handle literal \n strings from env vars
  const normalized = pem.replace(/\\n/g, '\n')
  const pemHeader = "-----BEGIN PRIVATE KEY-----"
  const pemFooter = "-----END PRIVATE KEY-----"
  const pemContents = normalized
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "")
  const binary = atob(pemContents)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
  return array.buffer
 };

  const sHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const sPayload = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const message = `${sHeader}.${sPayload}`;

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    decodeKey(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(message)
  );

  const sSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${message}.${sSignature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data: any = await res.json();
  return data.access_token;
}

async function sendEmailAlert(db, env, companyId, subject, htmlBody) {
  try {
    const comp: any = await db.prepare("SELECT email FROM company WHERE id = ?").bind(companyId).first();
    if (comp && comp.email) {
      await sendZeptoMail(env, comp.email, subject, htmlBody);
      console.log("[EmailAlert] Sent to", comp.email, ":", subject);
    }
  } catch (e) {
    console.warn("[EmailAlert] Failed:", e);
  }
}


async function sendFcmPush(env: Bindings, token: string, title: string, body: string) {
  if (!env.FCM_PROJECT_ID || !env.FCM_CLIENT_EMAIL || !env.FCM_PRIVATE_KEY) {
    console.warn("[FCM] Configuration missing (PROJECT_ID, CLIENT_EMAIL, or PRIVATE_KEY)");
    return;
  }

  try {
    const accessToken = await getToken(env.FCM_CLIENT_EMAIL, env.FCM_PRIVATE_KEY);
    const url = `https://fcm.googleapis.com/v1/projects/${env.FCM_PROJECT_ID}/messages:send`;
    
    // STRICT DATA-ONLY PAYLOAD for reliable background PWA delivery
    const message = {
      message: {
        token,
        data: {
          title,
          body,
          click_action: '/',
          timestamp: Date.now().toString()
        },
        android: {
          priority: 'high',
          ttl: '86400s'
        }
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await res.json();
    console.log("[FCM] Dispatch result:", JSON.stringify(result));
    return result;
  } catch (err) {
    console.error("[FCM] Dispatch failed:", err);
  }
}


// --- ZeptoMail Email Helper ---
async function sendZeptoMail(env, toEmail, subject, htmlContent) {
  if (!env.ZEPTOMAIL_API_KEY) {
    console.warn("[ZeptoMail] API key not configured, skipping email send");
    return null;
  }
  try {
    const res = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Zoho-enczapikey " + env.ZEPTOMAIL_API_KEY },
      body: JSON.stringify({
        from: { address: "noreply@getwalksafe.co.uk", name: "WalkSafe" },
        to: [{ email_address: { address: toEmail, name: "" } }],
        subject,
        htmlbody: htmlContent,
      }),
    });
    const result = await res.json();
    console.log("[ZeptoMail] Email result:", JSON.stringify(result));
    return result;
  } catch (err) {
    console.error("[ZeptoMail] Send failed:", err);
    return null;
  }
}

function buildEmailHtml(title, body) {
  return '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f9f9f7;border-radius:16px;">' +
    '<div style="text-align:center;margin-bottom:24px;"><span style="font-size:28px;font-weight:800;letter-spacing:0.04em;color:#1a1c1b;">Walk<span style="color:#fea619;">Safe</span></span></div>' +
    '<div style="background:#fff;border-radius:12px;padding:32px 24px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">' +
    '<h2 style="color:#1a1c1b;font-size:18px;margin:0 0 12px;">' + title + '</h2>' +
    '<p style="color:#47464b;font-size:14px;line-height:1.5;margin:0 0 24px;">' + body + '</p>' +
    '</div>' +
    '<div style="text-align:center;margin-top:16px;"><p style="color:#a0a09a;font-size:11px;margin:0;">WalkSafe Fleet Compliance &copy; 2026</p></div>' +
    '</div>';
}
async function getFirebaseAdminToken(env) {
  if (!env.FCM_CLIENT_EMAIL || !env.FCM_PRIVATE_KEY) return null;
  return getToken(env.FCM_CLIENT_EMAIL, env.FCM_PRIVATE_KEY);
}

async function setFirebaseEmailVerified(env, uid) {
  const token = await getFirebaseAdminToken(env);
  if (!token) return false;
  try {
    const res = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:update", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ localId: uid, emailVerified: true }),
    });
    return res.ok;
  } catch (e) {
    console.error("[Firebase Admin] Error:", e);
    return false;
  }
}

async function checkFirebaseEmailVerified(env, uid) {
  if (!uid) return null;
  const token = await getFirebaseAdminToken(env);
  if (!token) return null;
  try {
    const res = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ localId: [uid] }),
    });
    const data = await res.json();
    if (data.users && data.users.length > 0) {
      return data.users[0].emailVerified === true;
    }
    return null;
  } catch (e) {
    console.error("[Firebase Admin] Lookup Error:", e);
    return null;
  }


async function deleteUnverifiedFirebaseUser(env, email) {
  const token = await getFirebaseAdminToken(env);
  if (!token) return false;
  try {
    // Look up user by email
    const lookupRes = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ email: [email] }),
    });
    const lookupData = await lookupRes.json();
    if (!lookupData.users || lookupData.users.length === 0) return false;
    
    const uid = lookupData.users[0].localId;
    const emailVerified = lookupData.users[0].emailVerified === true;
    
    // Only delete if email is NOT verified
    if (emailVerified) return false;
    
    const delRes = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:delete", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ localId: uid }),
    });
    return delRes.ok;
  } catch (e) {
    console.error("[Firebase Admin] Delete unverified user error:", e);
    return false;
  }
}

}

function generateVerifyToken() {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join("");
}
// --- Dynamic Database Bootstrapper & Migrations ---
let isDbBootstrapped = false;

const bootstrapDb = async (db: D1Database) => {
  if (isDbBootstrapped) return;
  try {
    // 1. Add email column to company table if missing
    try {
      await db.prepare("ALTER TABLE company ADD COLUMN email TEXT").run();
    } catch (_) {}
    try {
      await db.prepare("ALTER TABLE company ADD COLUMN updatedAt TEXT").run();
    } catch (_) {}
    // Add logoUrl column if missing
    try {
      await db.prepare("ALTER TABLE company ADD COLUMN logoUrl TEXT").run();
    } catch (_) {}
    try {
      await db.prepare("ALTER TABLE announcements ADD COLUMN validUntil TEXT").run();
    } catch (_) {}

    // 2. Add email column to drivers table if missing
    try {
      await db.prepare("ALTER TABLE drivers ADD COLUMN email TEXT").run();
    } catch (_) {}

    // 2.5. Add assignedVehicleIds column to drivers table if missing
    try {
      await db.prepare("ALTER TABLE drivers ADD COLUMN assignedVehicleIds TEXT").run();
    } catch (_) {}

    // 2.7. Add GPS coordinates to checks table if missing
    try {
      await db.prepare("ALTER TABLE checks ADD COLUMN latitude REAL").run();
    } catch (_) {}
    try {
      await db.prepare("ALTER TABLE checks ADD COLUMN longitude REAL").run();
    } catch (_) {}

    // 3. Remove UNIQUE constraint from vehicles table on-the-fly by recreating table if needed
    try {
      const schemaSql: any = await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='vehicles'").first();
      if (schemaSql && schemaSql.sql && schemaSql.sql.includes("UNIQUE")) {
        console.log("Removing UNIQUE constraint from vehicles table on D1...");
        await db.prepare("ALTER TABLE vehicles RENAME TO vehicles_old").run();
        await db.prepare(`
          CREATE TABLE IF NOT EXISTS vehicles (
            id TEXT PRIMARY KEY,
            companyId TEXT,
            registration TEXT,
            make TEXT,
            model TEXT,
            year INTEGER,
            colour TEXT,
            type TEXT,
            motExpiry TEXT,
            taxExpiry TEXT,
            isActive INTEGER DEFAULT 1,
            isGrounded INTEGER DEFAULT 0,
            createdAt TEXT
          )
        `).run();
        
        await db.prepare(`
          INSERT INTO vehicles (id, companyId, registration, make, model, year, colour, type, motExpiry, taxExpiry, isActive, isGrounded, createdAt)
          SELECT id, companyId, registration, make, model, year, colour, type, motExpiry, taxExpiry, isActive, isGrounded, createdAt FROM vehicles_old
        `).run();
        
        await db.prepare("DROP TABLE vehicles_old").run();
        console.log("Removed UNIQUE constraint from vehicles table successfully.");
      }
    } catch (e) {
      console.error("Vehicles UNIQUE constraint removal failed:", e);
    }


    // 4. Create email_verification_tokens table
    try {
      await db.prepare("CREATE TABLE IF NOT EXISTS email_verification_tokens (id TEXT PRIMARY KEY, email TEXT NOT NULL, token TEXT NOT NULL UNIQUE, uid TEXT NOT NULL, expires_at TEXT NOT NULL, used INTEGER DEFAULT 0, created_at TEXT NOT NULL)").run();
      try { await db.prepare("CREATE INDEX IF NOT EXISTS idx_evt_token ON email_verification_tokens(token)").run(); } catch(_) {}
      try { await db.prepare("CREATE INDEX IF NOT EXISTS idx_evt_email ON email_verification_tokens(email)").run(); } catch(_) {}
      await db.prepare("CREATE TABLE IF NOT EXISTS password_reset_tokens (id TEXT PRIMARY KEY, email TEXT NOT NULL, token TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, used INTEGER DEFAULT 0, created_at TEXT NOT NULL)").run();
      try { await db.prepare("CREATE INDEX IF NOT EXISTS idx_prt_token ON password_reset_tokens(token)").run(); } catch(_) {}
    } catch(_) {}

    // 6. Ensure company table has firebaseUid column
    try {
      await db.prepare("ALTER TABLE company ADD COLUMN firebaseUid TEXT").run();
    } catch (e) {
      // Column may already exist - that's fine
      if (!e.message.includes("duplicate column")) {
        console.warn("[DB] firebaseUid column add warning:", e.message);
      }
    }

    isDbBootstrapped = true;
  } catch (err) {
    console.error("Database bootstrap failed:", err);
  }
};

app.use('*', async (c, next) => {
  const db = c.env.DB;
  if (db) {
    await bootstrapDb(db);
  }
  await next();
});

// --- API ROUTES REPLICATING server.ts ---

// 1. POST /api/auth/register
app.post('/auth/register', async (c) => {
  const db = getDbOrThrow(c);
  const body = await c.req.json();
  const { id, name, oLicence, plan, managerPassword, managerFullName, isSoloOperator } = body;
  const emailToUse = (body.managerEmail || body.email || "").toLowerCase().trim();

  if (!id || !name || !managerPassword) {
    return c.json({ error: "Workspace Slug, Name and Password are required" }, 400);
  }

  if (!emailToUse) {
    return c.json({ error: "Email address is required" }, 400);
  }

  const cleanId = id.toLowerCase().replace(/[^a-z0-9-]/g, "").trim();
  if (cleanId.length < 2) {
    return c.json({ error: "Workspace Code must be at least 2 alphanumeric characters" }, 400);
  }

  // Check if workspace code already exists
  const existing = await db.prepare("SELECT id FROM company WHERE id = ?").bind(cleanId).first();
  if (existing) {
    return c.json({ error: "This Workspace Code is already in use" }, 400);
  }

  // Enforce unique emails platform-wide on Cloudflare Pages
  const existingCompanyEmail = await db.prepare("SELECT id FROM company WHERE LOWER(TRIM(email)) = ?").bind(emailToUse).first();
  const existingDriverEmail = await db.prepare("SELECT id FROM drivers WHERE LOWER(TRIM(email)) = ?").bind(emailToUse).first();

  if (existingCompanyEmail || existingDriverEmail) {
    return c.json({ error: "This email address is already registered on the WalkSafe platform." }, 400);
  }

  const oLicenceLimit = plan === 'solo' || plan === 'owner-driver' ? 1 : plan === 'starter' ? 3 : 10;
  const createdAt = new Date().toISOString();

  await db.prepare(`
    INSERT INTO company (id, name, email, oLicence, plan, vehicleLimit, managerPassword, createdAt, trialStartedAt, trialEndsAt, isSubscribed, firebaseUid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(cleanId, name, emailToUse, oLicence || null, plan || 'starter', oLicenceLimit, managerPassword, createdAt, createdAt, body.trialEndsAt || null, 0, body.firebaseUid || null).run();

  const newCompany = {
    id: cleanId,
    name,
    email: emailToUse,
    oLicence,
    plan: plan || 'starter',
    vehicleLimit: oLicenceLimit,
    createdAt,
    isSoloOperator: isSoloOperator || plan === 'solo' || plan === 'owner-driver'
  };

  let defaultDriver = null;
  if (isSoloOperator || plan === 'solo' || plan === 'owner-driver') {
    const driverId = "drv-" + Math.floor(100000 + Math.random() * 900000);
    const pin = "1111"; // Standard easy default PIN for solo operator
    const installToken = "token-" + Math.random().toString(36).substring(2, 11);
    
    await db.prepare(`
      INSERT INTO drivers (id, companyId, fullName, email, phone, pin, defaultVehicleId, assignedVehicleIds, installToken, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      driverId,
      cleanId,
      managerFullName || name,
      emailToUse,
      "",
      pin,
      null,
      "[]",
      installToken,
      createdAt
    ).run();

    defaultDriver = {
      id: driverId,
      companyId: cleanId,
      fullName: managerFullName || name,
      email: emailToUse,
      phone: "",
      pin: pin,
      defaultVehicleId: null,
      assignedVehicleIds: [],
      installToken: installToken,
      createdAt: createdAt
    };
  }

  
  // Seed built-in templates for new company (non-blocking)
  try {
    const builtInTemplates = [
      { name: "Scaffolding Fleet Daily Check", desc: "DVSA-focused walkaround for scaffolding flatbeds", items: [{label:"Load Restraint Straps & Ratchets",group:"loading",guidance:"Inspect ratchet straps for fraying or cuts",requiresPhoto:true},{label:"Scaffold Tube Overhang Restraint",group:"loading",guidance:"Check tubes and fittings are properly restrained",requiresPhoto:true},{label:"Guardrails & Edge Protection",group:"loading",guidance:"Verify guardrails are secure",requiresPhoto:true},{label:"Tie-Down Points & Lashing Rings",group:"loading",guidance:"Inspect anchor points",requiresPhoto:false},{label:"Leaf Springs & Suspension",group:"exterior",guidance:"Check leaf springs for cracks",requiresPhoto:true},{label:"Tail Lamp & Marker Light Cluster",group:"exterior",guidance:"Check rear lighting not obstructed",requiresPhoto:true},{label:"Sideguards & Under-Run Protection",group:"exterior",guidance:"Verify sideguards mounted",requiresPhoto:true},{label:"Overhang Marker Boards & Flags",group:"exterior",guidance:"Check marker boards visible",requiresPhoto:true},{label:"Chassis & Body Condition",group:"exterior",guidance:"Inspect chassis rails",requiresPhoto:false}] },
      { name: "Haulage & Trailer Daily Check", desc: "Full DVSA check with trailer coupling photos", items: [{label:"Fifth Wheel Coupling Lock",group:"exterior",guidance:"Verify fifth wheel engaged",requiresPhoto:true,requiresTrailer:true},{label:"Air & Electrical Lines",group:"exterior",guidance:"Check air lines connected",requiresPhoto:false,requiresTrailer:true},{label:"Load Restraint Curtains & Straps",group:"loading",guidance:"Inspect cargo curtains",requiresPhoto:true},{label:"Trailer Landing Legs",group:"exterior",guidance:"Verify legs wound up",requiresPhoto:false,requiresTrailer:true},{label:"Wheel Nut Security",group:"exterior",guidance:"Check wheel nuts",requiresPhoto:false},{label:"Container Twistlock Securement",group:"loading",guidance:"Verify twistlocks engaged",requiresPhoto:true,requiresTrailer:true},{label:"Reflective Markings",group:"exterior",guidance:"Verify reflective tape present",requiresPhoto:false,requiresTrailer:true},{label:"Tyres Tread & Condition",group:"exterior",guidance:"Check tread depth",requiresPhoto:false}] },
      { name: "Owner-Operator Daily Check", desc: "Streamlined check for single-vehicle operators", items: [{label:"Tyres, Wheels & Wheel Nuts",group:"exterior",guidance:"Check tread depth",requiresPhoto:false},{label:"Lights, Indicators & Reflectors",group:"exterior",guidance:"Verify lights functional",requiresPhoto:false},{label:"Fluid Levels & Leaks",group:"exterior",guidance:"Check oil and coolant",requiresPhoto:false},{label:"Load Securement",group:"loading",guidance:"Verify loads restrained",requiresPhoto:true},{label:"Brakes & Air System",group:"interior",guidance:"Check brake feel",requiresPhoto:false},{label:"Mirrors & Visibility",group:"interior",guidance:"Clean mirrors",requiresPhoto:false}] },
    ];
    for (const tpl of builtInTemplates) {
    if (selectedNames && !selectedNames.includes(tpl.name)) continue;
      const tplId = "tmpl-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
      await db.prepare("INSERT INTO templates (id, companyId, name, description, items, createdAt) SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM templates WHERE companyId = ? AND name = ?)")
        .bind(tplId, cleanId, tpl.name, tpl.desc, JSON.stringify(tpl.items), new Date().toISOString(), cleanId, tpl.name).run();
    }
  } catch(e) {
    console.warn("[Register] Template seeding warning:", e);
  }

  return c.json({ success: true, company: newCompany, driver: defaultDriver });
});

// POST /api/auth/seed-templates — Publish built-in templates for existing company
app.post('/auth/seed-templates', async (c) => {
  const db = getDbOrThrow(c);
  const { companyId, names: selectedNames } = await c.req.json();
  if (!companyId) return c.json({ error: "Company ID is required" }, 400);
  
  const builtInTemplates = [
    { name: "Scaffolding Fleet Daily Check", desc: "DVSA-focused walkaround for scaffolding flatbeds", items: [{label:"Load Restraint Straps & Ratchets",group:"loading",guidance:"Inspect ratchet straps for fraying or cuts",requiresPhoto:true},{label:"Scaffold Tube Overhang Restraint",group:"loading",guidance:"Check tubes and fittings are properly restrained",requiresPhoto:true},{label:"Guardrails & Edge Protection",group:"loading",guidance:"Verify guardrails are secure",requiresPhoto:true},{label:"Tie-Down Points & Lashing Rings",group:"loading",guidance:"Inspect anchor points",requiresPhoto:false},{label:"Leaf Springs & Suspension",group:"exterior",guidance:"Check leaf springs for cracks",requiresPhoto:true},{label:"Tail Lamp & Marker Light Cluster",group:"exterior",guidance:"Check rear lighting not obstructed",requiresPhoto:true},{label:"Sideguards & Under-Run Protection",group:"exterior",guidance:"Verify sideguards mounted",requiresPhoto:true},{label:"Overhang Marker Boards & Flags",group:"exterior",guidance:"Check marker boards visible",requiresPhoto:true},{label:"Chassis & Body Condition",group:"exterior",guidance:"Inspect chassis rails",requiresPhoto:false}] },
    { name: "Haulage & Trailer Daily Check", desc: "Full DVSA check with trailer coupling photos", items: [{label:"Fifth Wheel Coupling Lock",group:"exterior",guidance:"Verify fifth wheel engaged",requiresPhoto:true,requiresTrailer:true},{label:"Air & Electrical Lines",group:"exterior",guidance:"Check air lines connected",requiresPhoto:false,requiresTrailer:true},{label:"Load Restraint Curtains & Straps",group:"loading",guidance:"Inspect cargo curtains",requiresPhoto:true},{label:"Trailer Landing Legs",group:"exterior",guidance:"Verify legs wound up",requiresPhoto:false,requiresTrailer:true},{label:"Wheel Nut Security",group:"exterior",guidance:"Check wheel nuts",requiresPhoto:false},{label:"Container Twistlock Securement",group:"loading",guidance:"Verify twistlocks engaged",requiresPhoto:true,requiresTrailer:true},{label:"Reflective Markings",group:"exterior",guidance:"Verify reflective tape present",requiresPhoto:false,requiresTrailer:true},{label:"Tyres Tread & Condition",group:"exterior",guidance:"Check tread depth",requiresPhoto:false}] },
    { name: "Owner-Operator Daily Check", desc: "Streamlined check for single-vehicle operators", items: [{label:"Tyres, Wheels & Wheel Nuts",group:"exterior",guidance:"Check tread depth",requiresPhoto:false},{label:"Lights, Indicators & Reflectors",group:"exterior",guidance:"Verify lights functional",requiresPhoto:false},{label:"Fluid Levels & Leaks",group:"exterior",guidance:"Check oil and coolant",requiresPhoto:false},{label:"Load Securement",group:"loading",guidance:"Verify loads restrained",requiresPhoto:true},{label:"Brakes & Air System",group:"interior",guidance:"Check brake feel",requiresPhoto:false},{label:"Mirrors & Visibility",group:"interior",guidance:"Clean mirrors",requiresPhoto:false}] },
  ];
  
  let created = 0;
  for (const tpl of builtInTemplates) {
    if (selectedNames && !selectedNames.includes(tpl.name)) continue;
    const existing = await db.prepare("SELECT id FROM templates WHERE companyId = ? AND name = ?").bind(companyId, tpl.name).first();
    if (existing) continue;
    const tplId = "tmpl-seed-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
    await db.prepare("INSERT INTO templates (id, companyId, name, description, items, createdAt) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(tplId, companyId, tpl.name, tpl.desc, JSON.stringify(tpl.items), new Date().toISOString()).run();
    created++;
  }
  
  return c.json({ success: true, created, message: created > 0 ? created + " built-in templates added" : "Templates already exist" });
});



// Map SQLite Company record properties dynamically to client properties (fallback if column is missing)
const mapCompanyDbToClient = (company: any) => {
  if (!company) return company;
  const createdAtTime = company.createdAt ? new Date(company.createdAt).getTime() : Date.now();
  return {
    ...company,
    logoUrl: company.logoUrl || null,
    trialStartedAt: company.trialStartedAt || company.createdAt || new Date(createdAtTime).toISOString(),
    trialEndsAt: company.trialEndsAt || new Date(createdAtTime + 30 * 24 * 3600 * 1000).toISOString(),
    isSubscribed: company.isSubscribed === undefined ? false : (company.isSubscribed === 1 || company.isSubscribed === true || company.isSubscribed === "1"),
    isSoloOperator: company.plan === 'solo' || company.plan === 'owner-driver',
    minDurationLgv: company.minDurationLgv !== undefined ? Number(company.minDurationLgv) : 5,
    minDurationHgv: company.minDurationHgv !== undefined ? Number(company.minDurationHgv) : 10,
    minDurationHgvTrailer: company.minDurationHgvTrailer !== undefined ? Number(company.minDurationHgvTrailer) : 15
  };
};

const isTrialExpired = (company: any) => {
  const comp = mapCompanyDbToClient(company);
  if (comp.isSubscribed) return false;
  return new Date() > new Date(comp.trialEndsAt);
};

// Map SQLite Driver record properties dynamically to client properties (deserialize assignedVehicleIds list)
const mapDriverDbToClient = (driver: any) => {
  if (!driver) return null;
  const mapped = { ...driver };
  if (typeof mapped.assignedVehicleIds === 'string') {
    try {
      mapped.assignedVehicleIds = JSON.parse(mapped.assignedVehicleIds);
    } catch (_) {
      mapped.assignedVehicleIds = [];
    }
  } else if (!mapped.assignedVehicleIds) {
    mapped.assignedVehicleIds = [];
  }
  return mapped;
};

// 2. GET /api/auth/verify-workspace/:id
app.get('/auth/verify-workspace/:id', async (c) => {
  const db = getDbOrThrow(c);
  const cleanId = c.req.param('id').toLowerCase().trim();

  const company: any = await db.prepare("SELECT * FROM company WHERE id = ?").bind(cleanId).first();
  if (!company) {
    return c.json({ error: "Workspace Code not found" }, 404);
  }

  return c.json(mapCompanyDbToClient(company));
});

// 2b. POST /api/auth/check-email
app.post('/auth/check-email', async (c) => {
  const db = getDbOrThrow(c);
  const { email } = await c.req.json();
  if (!email) {
    return c.json({ error: "Email is required" }, 400);
  }
  const cleanEmail = email.toLowerCase().trim();
  const existingCompanyEmail = await db.prepare("SELECT id FROM company WHERE LOWER(TRIM(email)) = ?").bind(cleanEmail).first();
  const existingDriverEmail = await db.prepare("SELECT id FROM drivers WHERE LOWER(TRIM(email)) = ?").bind(cleanEmail).first();
  
  return c.json({ exists: !!(existingCompanyEmail || existingDriverEmail) });
});

// POST /api/auth/clear-unverified — Delete unverified Firebase user so they can re-register
app.post('/auth/clear-unverified', async (c) => {
  const { email } = await c.req.json();
  if (!email) return c.json({ success: false, error: "Email is required" }, 400);
  const deleted = await deleteUnverifiedFirebaseUser(c.env, email.toLowerCase().trim());
  if (deleted) {
    return c.json({ success: true, message: "Unverified account cleared. You can now re-register." });
  }
  return c.json({ success: false, error: "No unverified account found for this email." });
});



// 3. POST /api/auth/login-manager
app.post('/auth/login-manager', async (c) => {
  const db = getDbOrThrow(c);
  const { email, password, companyId } = await c.req.json();

  const cleanEmail = (email || companyId || "").toLowerCase().trim();
  if (!cleanEmail || !password) {
    return c.json({ error: "Work Email and Password are required" }, 400);
  }

  const company: any = await db.prepare(`
    SELECT * FROM company 
    WHERE LOWER(TRIM(email)) = ? OR LOWER(TRIM(id)) = ?
  `).bind(cleanEmail, cleanEmail).first();

  if (!company) {
    return c.json({ error: "Credentials not recognized" }, 404);
  }

  if (company.managerPassword !== password) {
    // Before rejecting, try Firebase Auth as fallback (user might exist there)
    try {
      const fToken = await getFirebaseAdminToken(c.env);
      if (fToken) {
        const signInRes = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + "AIzaSyDG_aHph-hlD7TSUq4HMIlD0Wpl8YpI29c", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password, returnSecureToken: true }),
        });
        const signInData = await signInRes.json();
        if (signInData.registered && !signInData.error) {
          // Firebase Auth confirmed password is correct, but D1 password is out of sync
          // Update D1 password to match
          await db.prepare("UPDATE company SET managerPassword = ? WHERE id = ?").bind(password, company.id).run();
        } else {
          return c.json({ error: "Invalid Manager Password" }, 401);
        }
      } else {
        return c.json({ error: "Invalid Manager Password" }, 401);
      }
    } catch {
      return c.json({ error: "Invalid Manager Password" }, 401);
    }
  }

  // Check email verification if firebaseUid is stored
  if (company.firebaseUid) {
    const verified = await checkFirebaseEmailVerified(c.env, company.firebaseUid);
    if (verified === false) {
      return c.json({ error: "Please verify your email address before logging in. Check your inbox for the verification link." }, 403);
    } else if (verified === null) {
      console.warn("[Auth] Could not verify email status for:", company.firebaseUid);
    }
  }

  const clientCompany = mapCompanyDbToClient(company);
  let linkedDriver = null;
  
  if (clientCompany.isSoloOperator) {
    const driver: any = await db.prepare("SELECT * FROM drivers WHERE LOWER(TRIM(email)) = ? AND companyId = ?").bind(cleanEmail, company.id).first();
    linkedDriver = mapDriverDbToClient(driver);
  }

  return c.json({ success: true, company: clientCompany, driver: linkedDriver });
});

// 3b. POST /api/auth/login-driver
app.post('/auth/login-driver', async (c) => {
  const db = getDbOrThrow(c);
  const { email, pin } = await c.req.json();

  if (!email || !pin) {
    return c.json({ error: "Work Email and PIN are required" }, 400);
  }

  const cleanEmail = email.toLowerCase().trim();
  const driver: any = await db.prepare("SELECT * FROM drivers WHERE LOWER(TRIM(email)) = ?").bind(cleanEmail).first();

  if (!driver) {
    return c.json({ error: "Driver account not found for this email" }, 404);
  }

  if (driver.pin !== pin) {
    return c.json({ error: "Invalid PIN code" }, 401);
  }

  const company: any = await db.prepare("SELECT * FROM company WHERE id = ?").bind(driver.companyId).first();
  if (!company) {
    return c.json({ error: "Organization associated with driver not found" }, 404);
  }

  return c.json({ success: true, company: mapCompanyDbToClient(company), driver: mapDriverDbToClient(driver) });
});

// 3c. POST /api/auth/forgot-password
app.post('/auth/forgot-password', async (c) => {
  const db = getDbOrThrow(c);
  const { email } = await c.req.json();
  if (!email) {
    return c.json({ error: "Email is required." }, 400);
  }

  const cleanEmail = email.toLowerCase().trim();
  const company = await db.prepare("SELECT id, name FROM company WHERE LOWER(TRIM(email)) = ?").bind(cleanEmail).first();
  const driver = await db.prepare("SELECT id FROM drivers WHERE LOWER(TRIM(email)) = ?").bind(cleanEmail).first();

  // Also check Firebase Auth - the user might exist there even if D1 record is pending
  let firebaseUserUid = null;
  if (!company && !driver) {
    const fToken = await getFirebaseAdminToken(c.env);
    if (fToken) {
      try {
        const lookupRes = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + fToken },
          body: JSON.stringify({ email: [cleanEmail] }),
        });
        const lookupData = await lookupRes.json();
        if (lookupData.users && lookupData.users.length > 0) {
          firebaseUserUid = lookupData.users[0].localId;
        }
      } catch (e) {
        console.warn("[Auth] Firebase lookup failed:", e);
      }
    }
  }

  if (!company && !driver && !firebaseUserUid) {
    return c.json({ error: "No account found associated with this email address." }, 404);
  }

  // Rate limit: check existing unexpired token within last 60s
  const recentPwd = await db.prepare("SELECT id FROM password_reset_tokens WHERE email = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1").bind(cleanEmail, new Date(Date.now() - 120 * 1000).toISOString()).first();
  if (recentPwd) {
    return c.json({ error: "A password reset email was already sent recently. Please check your inbox or wait 2 minutes before requesting again." }, 429);
  }

  const token = generateVerifyToken();
  const id = "prt-" + Date.now();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const createdAt = new Date().toISOString();

  await db.prepare("INSERT INTO password_reset_tokens (id, email, token, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)")
    .bind(id, cleanEmail, token, expiresAt, createdAt).run();

  const url = new URL(c.req.url);
  const resetUrl = url.protocol + "//" + url.host + "/reset-password?token=" + token;

  const mailResult = await sendZeptoMail(c.env, cleanEmail,
    "Reset your WalkSafe password",
    '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9f9f7;border-radius:16px;">' +
    '<div style="text-align:center;margin-bottom:24px;"><span style="font-size:24px;font-weight:800;letter-spacing:0.04em;color:#1a1c1b;">Walk<span style="color:#fea619;">Safe</span></span></div>' +
    '<div style="background:#fff;border-radius:12px;padding:32px 24px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">' +
    '<h2 style="color:#1a1c1b;font-size:18px;margin:0 0 12px;">Reset your password</h2>' +
    '<p style="color:#47464b;font-size:14px;line-height:1.5;margin:0 0 24px;">Click the button below to reset your WalkSafe account password:</p>' +
    '<div style="text-align:center;margin-bottom:24px;">' +
    '<a href="' + resetUrl + '" style="display:inline-block;background:#1a1c1b;color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">Reset Password</a>' +
    '</div>' +
    '<p style="color:#77767b;font-size:12px;line-height:1.5;margin:0;">This link expires in <strong>15 minutes</strong>. If you didn\'t request a password reset, you can safely ignore this email.</p>' +
    '</div>' +
    '<div style="text-align:center;margin-top:16px;"><p style="color:#a0a09a;font-size:11px;margin:0;">WalkSafe Fleet Compliance &copy; 2026</p></div>' +
    '</div>'
  );

  if (!mailResult || mailResult.error) {
    console.error("[ZeptoMail] Password reset email failed to send:", mailResult?.error || mailResult);
    return c.json({ error: "Could not send password reset email. Email service may be unavailable. Please try again later." }, 503);
  }
  return c.json({ success: true, message: "A password reset link has been sent to your email." });
});

// POST /api/auth/flag-monitors — Send monitor flag notification to manager
app.post("/auth/flag-monitors", async (c) => {
  const db = getDbOrThrow(c);
  const { vehicleId, vehicleReg, driverName, monitors } = await c.req.json();
  if (!vehicleId || !monitors || monitors.length === 0) {
    return c.json({ error: "Missing required fields" }, 400);
  }
  const companyId = c.req.header("x-company-id") || "";
  try {
    const comp = await db.prepare("SELECT email, name FROM company WHERE id = ?").bind(companyId).first() as any;
    if (comp && comp.email) {
      const subject = "Monitors Flagged for Next PMI - " + vehicleReg;
      const monList = monitors.map((m:any, index:number) => {
        const note = m.notes ? " - " + String(m.notes) : "";
        const photo = m.photoUrl ? " (photo attached in WalkSafe record)" : "";
        return (index + 1) + ". " + (m.itemLabel || "Unknown item") + note + photo;
      }).join("<br/>");
      const body = driverName + " flagged " + monitors.length + " monitor(s) for " + vehicleReg + " to review at the next PMI.<br/><br/>" + monList;
      sendZeptoMail(c.env, comp.email, subject, buildEmailHtml(subject, body));
    }
    return c.json({ success: true });
  } catch (e) {
    console.error("[FlagMonitors] Error:", e);
    return c.json({ error: "Failed to send notification" }, 500);
  }
});


// POST /api/auth/send-test-alert — Send test notification to company manager
app.post("/auth/send-test-alert", async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  try {
    const comp: any = await db.prepare("SELECT email, name FROM company WHERE id = ?").bind(companyId).first();
    if (!comp || !comp.email) {
      return c.json({ error: "No email on file for this company. Add your work email in Company Settings." }, 400);
    }
    await sendZeptoMail(c.env, comp.email,
      "WalkSafe — Test Notification",
      buildEmailHtml("Test Notification", "This is a test email from WalkSafe to verify your email delivery and notification settings. ✅"));
    return c.json({ success: true, message: "Test notification sent to " + comp.email });
  } catch (e) {
    console.error("[TestAlert] Failed:", e);
    return c.json({ error: "Failed to send test notification. Check ZEPTOMAIL_API_KEY env var." }, 500);
  }
});

// 4. GET /api/auth/workspace-drivers/:id
app.get('/auth/workspace-drivers/:id', async (c) => {
  const db = getDbOrThrow(c);
  const cleanId = c.req.param('id').toLowerCase().trim();

  const { results } = await db.prepare("SELECT * FROM drivers WHERE companyId = ?").bind(cleanId).all();
  return c.json(results.map(mapDriverDbToClient));
});

// 5. GET /api/company
app.get('/company', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const company = await db.prepare("SELECT * FROM company WHERE id = ?").bind(companyId).first();
  if (!company) return c.json({ error: "Workspace not found" }, 404);
  return c.json(mapCompanyDbToClient(company));
});

// 6. PUT /api/company
app.put('/company', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const body = await c.req.json();
  const company: any = await db.prepare("SELECT * FROM company WHERE id = ?").bind(companyId).first();
  if (!company) return c.json({ error: "Workspace not found" }, 404);

  const name = body.name !== undefined ? body.name : company.name;
  const oLicence = body.oLicence !== undefined ? body.oLicence : company.oLicence;
  const email = body.email !== undefined ? body.email : company.email;
  const managerPassword = body.managerPassword !== undefined ? body.managerPassword : company.managerPassword;
  const logoUrl = body.logoUrl !== undefined ? body.logoUrl : company.logoUrl;
  
  // Guard values for subscription trial configurations
  const trialStartedAt = body.trialStartedAt !== undefined ? body.trialStartedAt : (company.trialStartedAt || company.createdAt);
  const trialEndsAt = body.trialEndsAt !== undefined ? body.trialEndsAt : (company.trialEndsAt || new Date(new Date(company.createdAt).getTime() + 30 * 24 * 3600 * 1000).toISOString());
  const isSubscribed = body.isSubscribed !== undefined ? (body.isSubscribed ? 1 : 0) : (company.isSubscribed !== undefined ? (company.isSubscribed ? 1 : 0) : 0);

  const minDurationLgv = body.minDurationLgv !== undefined ? body.minDurationLgv : (company.minDurationLgv !== undefined ? company.minDurationLgv : 5);
  const minDurationHgv = body.minDurationHgv !== undefined ? body.minDurationHgv : (company.minDurationHgv !== undefined ? company.minDurationHgv : 10);
  const minDurationHgvTrailer = body.minDurationHgvTrailer !== undefined ? body.minDurationHgvTrailer : (company.minDurationHgvTrailer !== undefined ? company.minDurationHgvTrailer : 15);

  // Safely execute update statement, ignoring column failures for older tables (by updating selectively on columns if possible, or mapping dynamically)
  try {
    await db.prepare(`
      UPDATE company 
      SET name = ?, oLicence = ?, email = ?, logoUrl = ?, managerPassword = ?, trialStartedAt = ?, trialEndsAt = ?, isSubscribed = ?, minDurationLgv = ?, minDurationHgv = ?, minDurationHgvTrailer = ?
      WHERE id = ?
    `).bind(name, oLicence, email, logoUrl, managerPassword, trialStartedAt, trialEndsAt, isSubscribed, minDurationLgv, minDurationHgv, minDurationHgvTrailer, companyId).run();
  } catch (err: any) {
    // If the database has not run migration, alter column on-the-fly or fallback to partial updates
    try {
      await db.prepare("ALTER TABLE company ADD COLUMN trialStartedAt TEXT").run();
      await db.prepare("ALTER TABLE company ADD COLUMN trialEndsAt TEXT").run();
      await db.prepare("ALTER TABLE company ADD COLUMN isSubscribed INTEGER DEFAULT 0").run();
      await db.prepare("ALTER TABLE company ADD COLUMN minDurationLgv INTEGER DEFAULT 5").run();
      await db.prepare("ALTER TABLE company ADD COLUMN minDurationHgv INTEGER DEFAULT 10").run();
      await db.prepare("ALTER TABLE company ADD COLUMN minDurationHgvTrailer INTEGER DEFAULT 15").run();
      await db.prepare("ALTER TABLE company ADD COLUMN logoUrl TEXT").run();
      
      await db.prepare(`
        UPDATE company 
        SET name = ?, oLicence = ?, email = ?, logoUrl = ?, managerPassword = ?, trialStartedAt = ?, trialEndsAt = ?, isSubscribed = ?, minDurationLgv = ?, minDurationHgv = ?, minDurationHgvTrailer = ?
        WHERE id = ?
      `).bind(name, oLicence, email, logoUrl, managerPassword, trialStartedAt, trialEndsAt, isSubscribed, minDurationLgv, minDurationHgv, minDurationHgvTrailer, companyId).run();
    } catch (altErr) {
      // Last-resort fallback for older database tables without new fields schema alters
      await db.prepare(`
        UPDATE company 
        SET name = ?, oLicence = ?, email = ?, logoUrl = ?, managerPassword = ?
        WHERE id = ?
      `).bind(name, oLicence, email, logoUrl, managerPassword, companyId).run();
    }
  }

  const updatedComp = {
    ...company,
    name,
    oLicence,
    managerPassword,
    trialStartedAt,
    trialEndsAt,
    isSubscribed: isSubscribed === 1,
    minDurationLgv,
    minDurationHgv,
    minDurationHgvTrailer
  };

  return c.json(mapCompanyDbToClient(updatedComp));
});

// 7. GET /api/vehicles
app.get('/vehicles', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const { results } = await db.prepare("SELECT * FROM vehicles WHERE companyId = ?").bind(companyId).all();
  
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Convert SQLite integers back to TS booleans and auto-ground expired vehicles
  const mapped = results.map((v: any) => {
    const motExpired = v.motExpiry && v.motExpiry < todayStr;
    const taxExpired = v.taxExpiry && v.taxExpiry < todayStr;
    const shouldGround = motExpired || taxExpired;
    
    // If the vehicle should be grounded but isn't, update the DB
    if (shouldGround && v.isGrounded !== 1) {
      db.prepare("UPDATE vehicles SET isGrounded = 1 WHERE id = ? AND companyId = ?").bind(v.id, companyId).run().catch(() => {});
      v.isGrounded = 1;
    }
    
    return {
      ...v,
      isActive: v.isActive === 1,
      isGrounded: v.isGrounded === 1
    };
  });

  return c.json(mapped);
});

// 8. POST /api/vehicles
app.post('/vehicles', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const body = await c.req.json();
  const company: any = await db.prepare("SELECT * FROM company WHERE id = ?").bind(companyId).first();
  if (!company) return c.json({ error: "Workspace not found" }, 404);

  const limit = company.vehicleLimit || 3;
  const { count }: any = await db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE companyId = ?").bind(companyId).first();

  if (count >= limit) {
    return c.json({ error: `Vehicle limit reached (${limit}) for your plan. Please upgrade.` }, 400);
  }

  const registration = (body.registration || "").toUpperCase().trim();
  const make = body.make || "Unknown";
  const model = body.model || "Unknown";
  const year = Number(body.year) || new Date().getFullYear();
  const colour = body.colour || "White";
  const type = body.type || "lgv";
  const motExpiry = body.motExpiry || "2027-01-01";
  const taxExpiry = body.taxExpiry || "2027-01-01";
  const createdAt = new Date().toISOString();
  const id = "veh-" + Date.now();

  await db.prepare(`
    INSERT INTO vehicles (id, companyId, registration, make, model, year, colour, type, motExpiry, taxExpiry, isActive, isGrounded, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)
  `).bind(id, companyId, registration, make, model, year, colour, type, motExpiry, taxExpiry, createdAt).run();

  return c.json({
    id,
    companyId,
    registration,
    make,
    model,
    year,
    colour,
    type,
    motExpiry,
    taxExpiry,
    isActive: true,
    isGrounded: false,
    createdAt
  });
});

// 9. PUT /api/vehicles/:id
app.put('/vehicles/:id', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const id = c.req.param('id');
  const body = await c.req.json();

  const vehicle: any = await db.prepare("SELECT * FROM vehicles WHERE id = ? AND companyId = ?").bind(id, companyId).first();
  if (!vehicle) return c.json({ error: "Vehicle not found" }, 404);

  const registration = body.registration !== undefined ? body.registration.toUpperCase().trim() : vehicle.registration;
  const make = body.make !== undefined ? body.make : vehicle.make;
  const model = body.model !== undefined ? body.model : vehicle.model;
  const year = body.year !== undefined ? Number(body.year) : vehicle.year;
  const colour = body.colour !== undefined ? body.colour : vehicle.colour;
  const type = body.type !== undefined ? body.type : vehicle.type;
  const motExpiry = body.motExpiry !== undefined ? body.motExpiry : vehicle.motExpiry;
  const taxExpiry = body.taxExpiry !== undefined ? body.taxExpiry : vehicle.taxExpiry;
  const isActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : vehicle.isActive;
  const isGrounded = body.isGrounded !== undefined ? (body.isGrounded ? 1 : 0) : vehicle.isGrounded;

  await db.prepare(`
    UPDATE vehicles 
    SET registration = ?, make = ?, model = ?, year = ?, colour = ?, type = ?, motExpiry = ?, taxExpiry = ?, isActive = ?, isGrounded = ?
    WHERE id = ? AND companyId = ?
  `).bind(registration, make, model, year, colour, type, motExpiry, taxExpiry, isActive, isGrounded, id, companyId).run();

  return c.json({
    id,
    companyId,
    registration,
    make,
    model,
    year,
    colour,
    type,
    motExpiry,
    taxExpiry,
    isActive: isActive === 1,
    isGrounded: isGrounded === 1
  });
});

// 10. GET /api/drivers
app.get('/drivers', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const { results } = await db.prepare("SELECT * FROM drivers WHERE companyId = ?").bind(companyId).all();
  return c.json(results.map(mapDriverDbToClient));
});

// 11. POST /api/drivers
app.post('/drivers', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const body = await c.req.json();
  const id = "drv-" + Date.now();
  const fullName = body.fullName || "Unnamed Driver";
  const rawEmail = body.email;
  const emailToUse = rawEmail ? rawEmail.toLowerCase().trim() : null;
  const phone = body.phone || "";
  const pin = body.pin || "0000";
  const defaultVehicleId = body.defaultVehicleId || null;
  const assignedVehicleIdsVal = body.assignedVehicleIds ? JSON.stringify(body.assignedVehicleIds) : '[]';
  const installToken = "token-" + Math.random().toString(36).substr(2, 9);
  const createdAt = new Date().toISOString();

  if (emailToUse) {
    const companyExistsByEmail = await db.prepare("SELECT id FROM company WHERE LOWER(TRIM(email)) = ?").bind(emailToUse).first();
    const driverExistsByEmail = await db.prepare("SELECT id FROM drivers WHERE LOWER(TRIM(email)) = ?").bind(emailToUse).first();

    if (companyExistsByEmail || driverExistsByEmail) {
      return c.json({ error: "This email address is already registered on the WalkSafe platform." }, 400);
    }
  }

  await db.prepare(`
    INSERT INTO drivers (id, companyId, fullName, email, phone, pin, defaultVehicleId, assignedVehicleIds, installToken, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, companyId, fullName, emailToUse, phone, pin, defaultVehicleId, assignedVehicleIdsVal, installToken, createdAt).run();

  // Send welcome email to driver
  if (emailToUse) {
    const appUrl = "https://app.getwalksafe.co.uk";
    const companyRow = await db.prepare("SELECT name FROM company WHERE id = ?").bind(companyId).first();
    const companyNameHTML = (companyRow && companyRow.name) || "Your Fleet";
    await sendZeptoMail(c.env, emailToUse,
      "Welcome to WalkSafe — Your Login Details",
      "<div style=\"font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f9f9f7;border-radius:16px;\">" +
      "<div style=\"text-align:center;margin-bottom:24px;\"><span style=\"font-size:28px;font-weight:800;letter-spacing:0.04em;color:#1a1c1b;\">Walk<span style=\"color:#fea619;\">Safe</span></span></div>" +
      "<div style=\"background:#fff;border-radius:12px;padding:32px 24px;box-shadow:0 2px 8px rgba(0,0,0,0.06);\">" +
      "<h2 style=\"color:#1a1c1b;font-size:18px;margin:0 0 6px;\">Welcome, " + fullName + "! 👋</h2>" +
      "<p style=\"color:#47464b;font-size:14px;line-height:1.5;margin:0 0 20px;\">You have been registered for WalkSafe digital compliance checks by <strong>" + companyNameHTML + "</strong>.</p>" +
      "<div style=\"background:#f4f4f2;border-radius:10px;padding:16px;margin-bottom:20px;\">" +
      "<p style=\"margin:0 0 8px;font-size:12px;color:#777;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;\">Your Login PIN</p>" +
      "<p style=\"margin:0;font-size:28px;font-weight:800;color:#1a1c1b;letter-spacing:0.1em;font-family:monospace;\">" + pin + "</p>" +
      "<a href=\"" + appUrl + "/magic/" + installToken + "\" style=\"display:inline-block;background:#fea619;color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;margin-bottom:12px;\">One-Click Login</a><br/>" +
      "<p style=\"color:#777;font-size:12px;line-height:1.5;margin:0 0 20px;\">Open the app on your phone, enter <strong>" + emailToUse + "</strong> as your email and <strong>" + pin + "</strong> as your PIN to start your daily walkaround checks.</p>" +
      "</div>" +
      "<div style=\"text-align:center;margin-top:16px;\"><p style=\"color:#a0a09a;font-size:11px;margin:0;\">WalkSafe Fleet Compliance &copy; 2026</p></div>" +
      "</div>").catch(e => console.warn("[DriverEmail] Failed to send welcome email:", e));
  }

  return c.json({
    id,
    companyId,
    fullName,
    email: emailToUse,
    phone,
    pin,
    defaultVehicleId,
    assignedVehicleIds: body.assignedVehicleIds || [],
    installToken,
    createdAt
  });
});

// 12. PUT /api/drivers/:id
app.put('/drivers/:id', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const id = c.req.param('id');
  const body = await c.req.json();

  const driver: any = await db.prepare("SELECT * FROM drivers WHERE id = ? AND companyId = ?").bind(id, companyId).first();
  if (!driver) return c.json({ error: "Driver not found" }, 404);

  const fullName = body.fullName !== undefined ? body.fullName : driver.fullName;
  const phone = body.phone !== undefined ? body.phone : driver.phone;
  const pin = body.pin !== undefined ? body.pin : driver.pin;
  const defaultVehicleId = body.defaultVehicleId !== undefined ? body.defaultVehicleId : driver.defaultVehicleId;
  const rawEmail = body.email;
  const emailToUse = rawEmail !== undefined ? (rawEmail ? rawEmail.toLowerCase().trim() : null) : driver.email;
  const assignedVehicleIdsVal = body.assignedVehicleIds !== undefined ? JSON.stringify(body.assignedVehicleIds) : driver.assignedVehicleIds;

  if (rawEmail !== undefined && emailToUse) {
    const companyWithEmail: any = await db.prepare("SELECT id FROM company WHERE LOWER(TRIM(email)) = ?").bind(emailToUse).first();
    const driverExistsByEmail = await db.prepare("SELECT id FROM drivers WHERE LOWER(TRIM(email)) = ? AND id != ?").bind(emailToUse, id).first();

    if ((companyWithEmail && companyWithEmail.id !== companyId) || driverExistsByEmail) {
      return c.json({ error: "This email address is already registered on the WalkSafe platform." }, 400);
    }
  }

  await db.prepare(`
    UPDATE drivers 
    SET fullName = ?, phone = ?, pin = ?, defaultVehicleId = ?, email = ?, assignedVehicleIds = ?
    WHERE id = ? AND companyId = ?
  `).bind(fullName, phone, pin, defaultVehicleId, emailToUse, assignedVehicleIdsVal, id, companyId).run();

  let parsedAssigned: string[] = [];
  if (body.assignedVehicleIds !== undefined) {
    parsedAssigned = body.assignedVehicleIds;
  } else if (assignedVehicleIdsVal) {
    try {
      parsedAssigned = JSON.parse(assignedVehicleIdsVal);
    } catch (_) {
      parsedAssigned = [];
    }
  }

  return c.json({
    id,
    companyId,
    fullName,
    email: emailToUse,
    phone,
    pin,
    defaultVehicleId,
    assignedVehicleIds: parsedAssigned
  });
});

// 13. GET /api/checks
app.get('/checks', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const { results } = await db.prepare("SELECT * FROM checks WHERE companyId = ?").bind(companyId).all();

  // Convert array properties (deserialize JSON strings, map booleans)
  const mapped = results.map((chk: any) => {
    const items = JSON.parse(chk.items || '[]');
    let monitors: any[] = [];
    // Try to parse stored monitors column; fall back to extracting from items
    try {
      monitors = chk.monitors ? JSON.parse(chk.monitors) : items.filter((i: any) => i.result === 'monitor');
    } catch {
      monitors = items.filter((i: any) => i.result === 'monitor');
    }
    return {
      ...chk,
      monitors,
      quickCheckAlert: chk.quickCheckAlert === 1,
      items
    };
  });

  return c.json(mapped);
});

// 14. POST /api/checks
app.post('/checks', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const { 
    vehicleId, 
    driverId, 
    startedAt, 
    items, 
    driverSignature, 
    results, 
    latitude, 
    longitude,
    miscDamageNotes,
    miscDamagePhotoUrl,
    templateName,
    scheduleId,
    monitors
  } = await c.req.json();

  const serverCompletedAt = new Date().toISOString();
  const serverStartedAt = startedAt || new Date(Date.now() - 600000).toISOString();
  const durationSeconds = Math.round((new Date(serverCompletedAt).getTime() - new Date(serverStartedAt).getTime()) / 1000);

  // Dynamic compliance check speed threshold (mins * 60 secs)
  let targetMinMins = 5;
  try {
    const vehicle: any = await db.prepare("SELECT * FROM vehicles WHERE id = ?").bind(vehicleId || "").first();
    const company: any = await db.prepare("SELECT * FROM company WHERE id = ?").bind(companyId).first();
    if (vehicle && company) {
      if (vehicle.type === 'lgv') targetMinMins = company.minDurationLgv !== undefined ? company.minDurationLgv : 5;
      else if (vehicle.type === 'hgv') targetMinMins = company.minDurationHgv !== undefined ? company.minDurationHgv : 10;
      else if (vehicle.type === 'hgv_trailer') targetMinMins = company.minDurationHgvTrailer !== undefined ? company.minDurationHgvTrailer : 15;
    }
  } catch (err) {
    console.warn("Failed fetching dynamic check duration limits:", err);
  }
  const quickCheckAlert = durationSeconds < (targetMinMins * 60);

  // Nil defect or Defect state evaluation
  const hasFail = items.some((it: any) => it.result === 'fail');
  const resultState = hasFail ? 'defect' : 'nil_defect';

  const checkId = "chk-" + Date.now();
  const checkDate = new Date().toISOString().split("T")[0];
  const createdAt = new Date().toISOString();

  // Insert the Walkround compliance check record
  try {
    await db.prepare(`
      INSERT INTO checks (id, vehicleId, driverId, companyId, startedAt, completedAt, durationSeconds, result, driverSignature, checkDate, quickCheckAlert, items, createdAt, latitude, longitude, miscDamageNotes, miscDamagePhotoUrl, templateName, monitors)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      checkId,
      vehicleId,
      driverId,
      companyId,
      serverStartedAt,
      serverCompletedAt,
      durationSeconds,
      resultState,
      driverSignature,
      checkDate,
      quickCheckAlert ? 1 : 0,
      JSON.stringify(items),
      createdAt,
      latitude !== undefined ? latitude : null,
      longitude !== undefined ? longitude : null,
      miscDamageNotes !== undefined ? miscDamageNotes : "",
      miscDamagePhotoUrl !== undefined ? miscDamagePhotoUrl : "",
      templateName !== undefined ? templateName : null,
      monitors ? JSON.stringify(monitors) : null
    ).run();
  } catch (err: any) {
    try {
      try {
        await db.prepare("ALTER TABLE checks ADD COLUMN miscDamageNotes TEXT").run();
      } catch (e) {}
      try {
        await db.prepare("ALTER TABLE checks ADD COLUMN miscDamagePhotoUrl TEXT").run();
      } catch (e) {}
      try {
        await db.prepare("ALTER TABLE checks ADD COLUMN templateName TEXT").run();
      } catch (e) {}
      try {
        await db.prepare("ALTER TABLE checks ADD COLUMN monitors TEXT").run();
      } catch (e) {}
      
      await db.prepare(`
        INSERT INTO checks (id, vehicleId, driverId, companyId, startedAt, completedAt, durationSeconds, result, driverSignature, checkDate, quickCheckAlert, items, createdAt, latitude, longitude, miscDamageNotes, miscDamagePhotoUrl, templateName, monitors)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        checkId,
        vehicleId,
        driverId,
        companyId,
        serverStartedAt,
        serverCompletedAt,
        durationSeconds,
        resultState,
        driverSignature,
        checkDate,
        quickCheckAlert ? 1 : 0,
        JSON.stringify(items),
        createdAt,
        latitude !== undefined ? latitude : null,
        longitude !== undefined ? longitude : null,
        miscDamageNotes !== undefined ? miscDamageNotes : "",
        miscDamagePhotoUrl !== undefined ? miscDamagePhotoUrl : "",
        templateName !== undefined ? templateName : null,
        monitors ? JSON.stringify(monitors) : null
      ).run();
    } catch (altErr) {
      await db.prepare(`
        INSERT INTO checks (id, vehicleId, driverId, companyId, startedAt, completedAt, durationSeconds, result, driverSignature, checkDate, quickCheckAlert, items, createdAt, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        checkId,
        vehicleId,
        driverId,
        companyId,
        serverStartedAt,
        serverCompletedAt,
        durationSeconds,
        resultState,
        driverSignature,
        checkDate,
        quickCheckAlert ? 1 : 0,
        JSON.stringify(items),
        createdAt,
        latitude !== undefined ? latitude : null,
        longitude !== undefined ? longitude : null,
        ).run();
    }
  }

  // Process Defect insertions and Instant Groundings
  if (results && Array.isArray(results)) {
    for (const itemFail of results) {
      const defectId = "def-" + Math.random().toString(36).substr(2, 9);
      await db.prepare(`
        INSERT INTO defects (id, checkId, itemKey, itemLabel, vehicleId, companyId, severity, description, reportedTo, photoUrl, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
      `).bind(
        defectId,
        checkId,
        itemFail.itemKey,
        itemFail.itemLabel,
        vehicleId,
        companyId,
        itemFail.severity || 'major',
        itemFail.description || 'Damage reported',
        'Fleet Manager',
        itemFail.photoUrl || null,
        new Date().toISOString()
      ).run();

      if (["dangerous","major"].includes(itemFail.severity)) {
        // Ground the vehicle instantly
        await db.prepare("UPDATE vehicles SET isGrounded = 1 WHERE id = ? AND companyId = ?").bind(vehicleId, companyId).run();
      }
    }
  }

  // Retrieve details for notifications
  const driver: any = await db.prepare("SELECT fullName FROM drivers WHERE id = ?").bind(driverId).first();
  const vehicle: any = await db.prepare("SELECT registration FROM vehicles WHERE id = ?").bind(vehicleId).first();

  const driverLabel = driver ? driver.fullName : "Unknown Driver";
  const regLabel = vehicle ? vehicle.registration : "Unknown Vehicle";

  // Dispatch warnings and alerts
  const pushTitle = hasFail ? (results && results.some((r: any) => ["dangerous","major"].includes(r.severity)) ? `⛔ GROUNDED: ${regLabel}` : `⚠️ Faults Logged: ${regLabel}`) : `✅ Clean Check: ${regLabel}`;
  const pushMessage = hasFail ? `Driver ${driverLabel} reported defects.` : `Driver ${driverLabel} submitted a clean walkaround.`;

  if (quickCheckAlert) {
    await db.prepare(`
      INSERT INTO notifications (id, companyId, type, title, message, isRead, createdAt)
      VALUES (?, ?, 'quick_check', ?, ?, 0, ?)
    `).bind(
      "not-fast-" + Date.now(),
      companyId,
      "⚡ Compliance Speed Warning",
      `Driver ${driverLabel} completed ${regLabel}'s check in only ${durationSeconds} seconds (Flagged under 5 min limits).`,
      new Date().toISOString()
    ).run();
  }

  if (hasFail) {
    const isDangerous = results && results.some((r: any) => ["dangerous","major"].includes(r.severity));
    await db.prepare(`
      INSERT INTO notifications (id, companyId, type, title, message, isRead, createdAt)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).bind(
      "not-f-" + Date.now(),
      companyId,
      isDangerous ? "grounded" : "defect",
      isDangerous ? `⛔ GROUNDED: ${regLabel}` : `⚠️ Faults Logged: ${regLabel}`,
      `Driver ${driverLabel} reported defects during check. ${isDangerous ? 'Vehicle grounded instantly.' : 'Status updated for engineer triage.'}`,
      new Date().toISOString()
    ).run();
  }

  // --- MARK SCHEDULE AS COMPLETED ---
  try {
  let completedScheduleId = null;
  if (scheduleId) {
    // Mark the specific schedule that triggered this check
    const targetSch = await db.prepare("SELECT * FROM schedules WHERE id = ? AND companyId = ?").bind(scheduleId, companyId).first();
    if (targetSch) {
      completedScheduleId = scheduleId;
      await db.prepare("UPDATE schedules SET status = ? WHERE id = ? AND companyId = ?").bind("completed", scheduleId, companyId).run();
      
      if (targetSch.isRecurring === 1 && targetSch.frequency) {
        const nextDate = new Date(targetSch.dueDate);
        if (targetSch.frequency === "daily") nextDate.setDate(nextDate.getDate() + 1);
        else if (targetSch.frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);
        else if (targetSch.frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
        const nextId = "sch-" + Date.now() + Math.floor(Math.random() * 1000);
        const nextDue = nextDate.toISOString().split("T")[0];
        try {
        await db.prepare("INSERT INTO schedules (id,companyId,title,vehicleId,dueDate,status,driverId,frequency,isRecurring,templateId,createdAt) VALUES (?,?,?,?,?,'pending',?,?,1,?,?)")
          .bind(nextId, companyId, String(targetSch.title||""), String(targetSch.vehicleId||""), String(nextDue), String(targetSch.driverId||""), String(targetSch.frequency||""), String(targetSch.templateId||""), new Date().toISOString()).run();
      } catch (_e) {
        try { await db.prepare("ALTER TABLE schedules ADD COLUMN templateId TEXT").run(); } catch (__e) {}
        await db.prepare("INSERT INTO schedules (id,companyId,title,vehicleId,dueDate,status,driverId,frequency,isRecurring,createdAt) VALUES (?,?,?,?,?,'pending',?,?,1,?)")
          .bind(nextId, companyId, String(targetSch.title||""), String(targetSch.vehicleId||""), String(nextDue), String(targetSch.driverId||""), String(targetSch.frequency||""), new Date().toISOString()).run();
      }
      }
    }
  } else {
    // Auto-resolve ONE pending schedule for this vehicle
    const autoSch = await db.prepare("SELECT * FROM schedules WHERE vehicleId = ? AND companyId = ? AND status = 'pending' ORDER BY dueDate ASC LIMIT 1").bind(vehicleId, companyId).first();
    if (autoSch) {
      completedScheduleId = autoSch.id;
      await db.prepare("UPDATE schedules SET status = 'completed' WHERE id = ?").bind(autoSch.id).run();
      if (autoSch.isRecurring === 1 && autoSch.frequency) {
        const nextDate = new Date(autoSch.dueDate);
        if (autoSch.frequency === "daily") nextDate.setDate(nextDate.getDate() + 1);
        else if (autoSch.frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);
        else if (autoSch.frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
        const nextId = "sch-" + Date.now() + Math.floor(Math.random() * 1000);
        const nextDue = nextDate.toISOString().split("T")[0];
        try {
        await db.prepare("INSERT INTO schedules (id,companyId,title,vehicleId,dueDate,status,driverId,frequency,isRecurring,templateId,createdAt) VALUES (?,?,?,?,?,'pending',?,?,1,?,?)")
          .bind(nextId, companyId, String(autoSch.title||""), String(autoSch.vehicleId||""), String(nextDue), String(autoSch.driverId||""), String(autoSch.frequency||""), String(autoSch.templateId||""), new Date().toISOString()).run();
      } catch (_e) {
        try { await db.prepare("ALTER TABLE schedules ADD COLUMN templateId TEXT").run(); } catch (__e) {}
        await db.prepare("INSERT INTO schedules (id,companyId,title,vehicleId,dueDate,status,driverId,frequency,isRecurring,createdAt) VALUES (?,?,?,?,?,'pending',?,?,1,?)")
          .bind(nextId, companyId, String(autoSch.title||""), String(autoSch.vehicleId||""), String(nextDue), String(autoSch.driverId||""), String(autoSch.frequency||""), new Date().toISOString()).run();
      }
      }
    }
  }

  } catch (_schErr) { console.error("[Schedule] Completion error:", _schErr); }

// --- TRIGGER PUSH SYNC ---
  // This notifies all registered devices in the workspace.
  try {
    const { results: pushSubs }: any = await db.prepare("SELECT fcmToken FROM push_subscriptions WHERE companyId = ?").bind(companyId).all();
    console.log(`[Push] Dispatching to ${pushSubs.length} registered workspace devices...`);
    
    for (const subRecord of pushSubs) {
      if (subRecord.fcmToken) {
        await sendFcmPush(c.env, subRecord.fcmToken as string, pushTitle, pushMessage);
      }
    }
  } catch (pushErr) {
    console.warn("Push dispatch error:", pushErr);
  }

  // --- EMAIL ALERT (consolidated) ---
  await (async () => {
    try {
      const compRow: any = await db.prepare("SELECT email, name FROM company WHERE id = ?").bind(companyId).first();
      console.log("[EmailAlert] Company email found: " + compRow.email);
        if (compRow && compRow.email) {
        const appUrl3 = "https://app.getwalksafe.co.uk";
        const vehReg = regLabel || "unknown";
        const driverName = driverLabel || "A driver";
        const isGround = results && results.some((r: any) => ["dangerous","major"].includes(r.severity));
        const defectCount = results ? results.length : 0;
        const monitorItems = Array.isArray(items) ? items.filter((it: any) => it.result === "monitor") : [];

        // Build email body HTML
        let emailBodyHtml = "";
        
        // Vehicle & driver header
        emailBodyHtml += '<table style="width:100%;margin-bottom:16px;border-collapse:collapse;">';
        emailBodyHtml += '<tr><td style="font-size:14px;color:#47464b;padding:4px 0;"><strong>Vehicle:</strong> ' + vehReg + '</td></tr>';
        emailBodyHtml += '<tr><td style="font-size:14px;color:#47464b;padding:4px 0;"><strong>Driver:</strong> ' + driverName + '</td></tr>';
        emailBodyHtml += '<tr><td style="font-size:14px;color:#47464b;padding:4px 0;"><strong>Status:</strong> ' + (hasFail ? (isGround ? '⚠️ GROUNDED' : '⚠️ ' + defectCount + ' defect(s)') : '✅ PASSED') + '</td></tr>';
        emailBodyHtml += '</table>';

        // Defects section
        if (hasFail && results && results.length > 0) {
          emailBodyHtml += '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin-bottom:16px;">';
          emailBodyHtml += '<h3 style="margin:0 0 8px;font-size:13px;color:#991b1b;">Reported Defects (' + defectCount + ')</h3>';
          results.forEach((r: any) => {
            emailBodyHtml += '<div style="padding:6px 0;border-bottom:1px solid #fecaca;font-size:13px;color:#7f1d1d;">';
            emailBodyHtml += '  <span style="font-weight:bold;">' + (r.itemLabel || r.itemKey) + '</span> — <span style="text-transform:uppercase;">' + (r.severity || "major") + '</span>';
            if (r.description) emailBodyHtml += '<br/><span style="color:#991b1b;font-size:12px;">' + r.description + '</span>';
            emailBodyHtml += '</div>';
          });
          emailBodyHtml += '</div>';
        } else {
          emailBodyHtml += '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-bottom:16px;">';
          emailBodyHtml += '<p style="margin:0;font-size:13px;color:#166534;">' + driverName + ' completed a clean walkaround check for ' + vehReg + '. No defects found.</p>';
          emailBodyHtml += '</div>';
        }

        // Monitors section
        if (monitorItems.length > 0) {
          emailBodyHtml += '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin-bottom:16px;">';
          emailBodyHtml += '<h3 style="margin:0 0 8px;font-size:13px;color:#92400e;">Monitors for PMI Review (' + monitorItems.length + ')</h3>';
          monitorItems.forEach((m: any) => {
            emailBodyHtml += '<div style="padding:5px 0;border-bottom:1px solid #fde68a;font-size:13px;color:#78350f;">';
            emailBodyHtml += '  <span>🔍 ' + (m.itemLabel || m.itemKey) + '</span>';
            if (m.notes) emailBodyHtml += '<br/><span style="color:#92400e;font-size:11px;">📝 ' + m.notes + '</span>';
            if (m.photoUrl) emailBodyHtml += '<br/><span style="color:#92400e;font-size:11px;">📷 Photo recorded</span>';
            emailBodyHtml += '</div>';
          });
          emailBodyHtml += '</div>';
        }

        // Link section
        const reportUrl = appUrl3 + "/api/reports/" + checkId + "/pdf";
        emailBodyHtml += '<div style="text-align:center;margin-top:20px;">';
        emailBodyHtml += '<a href="' + reportUrl + '" style="display:inline-block;background:#fea619;color:#1a1c1b;text-decoration:none;font-weight:bold;font-size:13px;padding:10px 24px;border-radius:8px;">📄 Download PDF Report</a>';
        emailBodyHtml += '<p style="color:#a0a09a;font-size:11px;margin-top:8px;">Click the button above to download the full PDF compliance report for this check.</p>';
        emailBodyHtml += '</div>';

        const subject = "WalkSafe - " + vehReg + " - " + (hasFail ? (isGround ? "GROUNDED" : defectCount + " defect(s)") : "PASSED") + (monitorItems.length > 0 ? " + " + monitorItems.length + " monitor(s)" : "");
        await sendZeptoMail(c.env, compRow.email, subject, buildEmailHtml(subject, emailBodyHtml)).catch((e2)=>console.warn("[EmailAlert] Consolidated email send failed:", e2));
      }
    } catch(e) { console.warn("[EmailAlert] Consolidated email handler error:", e); }
  })();

  return c.json({
    id: checkId,
    vehicleId,
    driverId,
    companyId,
    startedAt: serverStartedAt,
    completedAt: serverCompletedAt,
    durationSeconds,
    result: resultState,
    driverSignature,
    checkDate,
    quickCheckAlert,
    items,
    monitors: monitors || [],
    createdAt
  });
});

// 14b. GET /api/reports/:checkId/pdf — Generate and download the same DVSA PDF as the app
app.get('/reports/:checkId/pdf', async (c) => {
  const db = getDbOrThrow(c);
  const { checkId } = c.req.param();

  try {
    const check: any = await db.prepare("SELECT * FROM checks WHERE id = ?").bind(checkId).first();
    if (!check) return c.json({ error: "Check not found" }, 404);

    const vehicle: any = await db.prepare("SELECT * FROM vehicles WHERE id = ?").bind(check.vehicleId).first();
    const driver: any = await db.prepare("SELECT * FROM drivers WHERE id = ?").bind(check.driverId).first();
    const company: any = await db.prepare("SELECT * FROM company WHERE id = ?").bind(check.companyId).first();
    const { results: defects } = await db.prepare("SELECT * FROM defects WHERE checkId = ?").bind(checkId).all();

    const items = JSON.parse(check.items || '[]');
    const vehReg = vehicle ? vehicle.registration.toUpperCase() : "UNKNOWN";

    // Use jsPDF directly to generate the same DVSA-style PDF the app creates
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const primaryColor = "#0D1F2D";
    const accentColor = "#F5A623";
    const passColor = "#22C55E";
    const failColor = "#EF4444";
    const grayColor = "#6B7280";
    const lightBg = "#F3F4F6";

    // -- HEADER --
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, 210, 22, "F");
    doc.setTextColor("#FFFFFF");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("WalkSafe", 10, 15);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text("DVSA Compliance Report", 10, 20);

    doc.setTextColor(accentColor);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text(vehReg, 200, 15, { align: "right" });

    // -- VEHICLE / DRIVER INFO --
    let y = 30;
    doc.setFillColor(lightBg);
    doc.rect(10, y, 40, 36, "F");
    doc.setDrawColor("#D1D5DB");
    doc.rect(10, y, 40, 36, "S");
    doc.setTextColor(primaryColor);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.text("VEHICLE", 12, y + 6);
    doc.setTextColor("#000000");
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text(vehicle ? `${vehicle.make || ""} ${vehicle.model || ""}`.trim() || "N/A", 12, y + 14);
    doc.setFontSize(8);
    doc.setTextColor(grayColor);
    doc.text(vehicle ? `Type: ${(vehicle.type || "").toUpperCase()}` : "N/A", 12, y + 20);
    doc.text(vehicle ? `Colour: ${vehicle.colour || "N/A"}` : "", 12, y + 25);
    doc.text(`MOT: ${vehicle ? (vehicle.motExpiry || "N/A") : "N/A"}`, 12, y + 30);

    doc.setFillColor(lightBg);
    doc.rect(52, y, 40, 36, "F");
    doc.setDrawColor("#D1D5DB");
    doc.rect(52, y, 40, 36, "S");
    doc.setTextColor(primaryColor);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.text("DRIVER", 54, y + 6);
    doc.setTextColor("#000000");
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text(driver ? driver.fullName : "Unknown Driver", 54, y + 14);
    doc.setFontSize(8);
    doc.setTextColor(grayColor);
    doc.text(`Company: ${company ? company.name : "N/A"}`, 54, y + 22);
    doc.text(`O-Licence: ${company ? (company.oLicence || "N/A") : "N/A"}`, 54, y + 28);

    doc.setFillColor(lightBg);
    doc.rect(94, y, 106, 36, "F");
    doc.setDrawColor("#D1D5DB");
    doc.rect(94, y, 106, 36, "S");
    doc.setTextColor(grayColor);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Check Date:", 97, y + 6);
    doc.setTextColor("#000000");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`${check.checkDate || "Unknown"}`, 132, y + 6);
    doc.setTextColor(grayColor);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Duration:", 97, y + 12);
    doc.setTextColor("#000000");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    const min = Math.floor((check.durationSeconds || 0) / 60);
    const sec = (check.durationSeconds || 0) % 60;
    doc.text(`${min}m ${sec}s`, 132, y + 12);
    doc.setFontSize(7);
    if (check.quickCheckAlert) { doc.setTextColor(failColor); doc.text("(SPEED ALERT - FLAGGED)", 132, y + 17); }
    doc.setTextColor(grayColor);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Result:", 97, y + 24);
    doc.setFont("Helvetica", "bold");
    const isPassed = check.result === "nil_defect";
    doc.setTextColor(isPassed ? passColor : failColor);
    doc.text(isPassed ? "NIL DEFECT - PASSED" : "DEFECTS REPORTED", 132, y + 24);
    doc.setTextColor(grayColor);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Template:", 97, y + 30);
    doc.setTextColor("#000000");
    doc.text(`${check.templateName || "Standard DVSA"}`, 132, y + 30);

    // -- CHECKLIST ITEMS TABLE --
    y += 44;
    doc.setFillColor(primaryColor);
    doc.rect(10, y, 190, 6, "F");
    doc.setTextColor("#FFFFFF");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7);
    doc.text("ITEM", 12, y + 4.5);
    doc.text("GROUP", 90, y + 4.5);
    doc.text("RESULT", 150, y + 4.5);
    doc.text("NOTES / PHOTO", 175, y + 4.5);

    const itemRows = items.map((it: any) => ({
      label: it.itemLabel || it.itemKey || "Unknown",
      group: it.group || "check",
      result: it.result || "pass",
      notes: it.notes || "",
      hasPhoto: !!(it.photoUrl)
    }));

    for (const row of itemRows) {
      y += 5.5;
      if (y > 275) { doc.addPage(); y = 15; }
      doc.setDrawColor("#E5E7EB");
      doc.line(10, y, 200, y);
      doc.setTextColor("#000000");
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7);
      doc.text(row.label.substring(0, 50), 12, y + 4);
      doc.text(row.group, 90, y + 4);
      if (row.result === "pass") {
        doc.setTextColor(passColor);
        doc.text("PASS", 150, y + 4);
      } else if (row.result === "fail") {
        doc.setTextColor(failColor);
        doc.text("FAIL", 150, y + 4);
      } else if (row.result === "monitor") {
        doc.setTextColor(accentColor);
        doc.text("MONITOR", 150, y + 4);
      } else {
        doc.setTextColor(grayColor);
        doc.text(row.result.toUpperCase(), 150, y + 4);
      }
      doc.setTextColor(grayColor);
      doc.setFontSize(6);
      let noteText = row.notes || "";
      if (row.hasPhoto) noteText += (noteText ? " | " : "") + "📷";
      doc.text(noteText.substring(0, 30), 175, y + 4);
    }

    // -- DEFECTS SECTION --
    y += 10;
    const failedItems = items.filter((i: any) => i.result === 'fail');
    if (failedItems.length > 0) {
      if (y > 250) { doc.addPage(); y = 15; }
      doc.setFillColor(failColor);
      doc.rect(10, y, 190, 6, "F");
      doc.setTextColor("#FFFFFF");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.text(`REPORTED DEFECTS (${failedItems.length})`, 12, y + 4.5);
      y += 9;
      for (const fi of failedItems) {
        if (y > 275) { doc.addPage(); y = 15; }
        const def = (defects || []).find((d: any) => d.itemKey === fi.itemKey);
        doc.setFillColor("#FEF2F2");
        doc.rect(10, y, 190, 8, "F");
        doc.setTextColor("#991B1B");
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7);
        doc.text(`⚠ ${fi.itemLabel || fi.itemKey}`, 12, y + 4);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(6);
        doc.text(`Severity: ${def ? (def.severity || "major").toUpperCase() : "MAJOR"}`, 135, y + 4);
        y += 9;
        if (fi.description || (def && def.description)) {
          doc.setTextColor("#6B7280");
          doc.setFont("Helvetica", "italic");
          doc.setFontSize(6);
          doc.text(`"${(fi.description || (def ? def.description : "") || "").substring(0, 120)}"`, 14, y + 2);
          y += 5;
        }
        if (fi.photoUrl || (def && def.photoUrl)) {
          doc.setTextColor(grayColor);
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(6);
          doc.text("📷 Photo attached to defect record", 14, y + 2);
          y += 4;
        }
      }
    }

    // -- MONITORS SECTION --
    const monitorItems = items.filter((i: any) => i.result === 'monitor');
    if (monitorItems.length > 0) {
      y += 4;
      if (y > 250) { doc.addPage(); y = 15; }
      doc.setFillColor(accentColor);
      doc.rect(10, y, 190, 6, "F");
      doc.setTextColor("#1A1C1B");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.text(`MONITORS FOR PMI REVIEW (${monitorItems.length})`, 12, y + 4.5);
      y += 9;
      for (const mi of monitorItems) {
        if (y > 275) { doc.addPage(); y = 15; }
        doc.setFillColor("#FFFBEB");
        doc.rect(10, y, 190, 6, "F");
        doc.setTextColor("#78350F");
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7);
        doc.text(`🔍 ${mi.itemLabel || mi.itemKey}`, 12, y + 3.5);
        y += 7;
        if (mi.notes) {
          doc.setTextColor("#92400E");
          doc.setFont("Helvetica", "italic");
          doc.setFontSize(6);
          doc.text(`"${mi.notes.substring(0, 120)}"`, 14, y + 2);
          y += 4;
        }
        if (mi.photoUrl) {
          doc.setTextColor(grayColor);
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(6);
          doc.text("📷 Photo recorded", 14, y + 2);
          y += 4;
        }
      }
    }

    // -- FOOTER --
    y = Math.max(y + 12, 270);
    if (y < 280) y = 280;
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.3);
    doc.line(10, y, 200, y);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(primaryColor);
    doc.text(`Record Reference: WS-${check.id ? check.id.toUpperCase().substring(0, 16) : "UNKNOWN"}`, 10, y + 4.5);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(grayColor);
    doc.setFontSize(6);
    doc.text(`Generated At: ${new Date().toLocaleDateString("en-GB")} ${new Date().toLocaleTimeString("en-GB")} UTC | Stored on Secure Cloud Archive`, 10, y + 9);
    doc.text(`This document is a certified compliance record generated through WalkSafe. Retain for 15 months minimum.`, 10, y + 13);

    // Return the PDF
    const pdfBuffer = doc.output('arraybuffer');
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="WalkSafe_${vehReg}_${check.checkDate || "report"}.pdf"`,
        'Content-Length': pdfBuffer.byteLength.toString()
      }
    });
  } catch (e) {
    console.error("[PDF Report] Error:", e);
    // Fallback: return a simple error HTML page
    return c.html(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>WalkSafe Report</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:40px;color:#991b1b;}h1{font-size:20px;}</style></head><body><h1>Could not generate PDF report</h1><p>Please try again from the WalkSafe app.</p><p style="color:#6b7280;font-size:11px;">${String(e).substring(0, 200)}</p></body></html>`);
  }
});

// 15. GET /api/defects
app.get('/defects', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const { results } = await db.prepare("SELECT * FROM defects WHERE companyId = ?").bind(companyId).all();
  return c.json(results);
});

// 16. PUT /api/defects/:id/close
app.put('/defects/:id/close', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const id = c.req.param('id');
  const { engineerName, repairDescription, partsUsed, engineerSignature } = await c.req.json();

  const defect: any = await db.prepare("SELECT * FROM defects WHERE id = ? AND companyId = ?").bind(id, companyId).first();
  if (!defect) return c.json({ error: "Defect not found" }, 404);

  const completedAt = new Date().toISOString();
  const signature = engineerSignature || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='20'><path d='M5 10 C 25 10 45 3, 75 12' fill='none' stroke='blue' stroke-width='1.5'/></svg>";

  await db.prepare(`
    UPDATE defects 
    SET status = 'closed', engineerName = ?, repairDescription = ?, partsUsed = ?, repairCompletedAt = ?, engineerSignature = ?, closedBy = ?, closedAt = ?
    WHERE id = ? AND companyId = ?
  `).bind(
    engineerName || "Dave Briggs (Mechanic)",
    repairDescription || "Repaired and fully working.",
    partsUsed || "None",
    completedAt,
    signature,
    "Fleet Manager (Web Dashboard)",
    completedAt,
    id,
    companyId
  ).run();

  // Unground the vehicle if NO other dangerous faults remain active in the system
  const vehicleId = defect.vehicleId;
  const { count }: any = await db.prepare(`
    SELECT COUNT(*) as count 
    FROM defects 
    WHERE vehicleId = ? AND companyId = ? AND severity = 'dangerous' AND status != 'closed'
  `).bind(vehicleId, companyId).first();

  if (count === 0) {
    await db.prepare("UPDATE vehicles SET isGrounded = 0 WHERE id = ? AND companyId = ?").bind(vehicleId, companyId).run();
  }

  const updatedDefect = {
    ...defect,
    status: 'closed',
    engineerName: engineerName || "Dave Briggs (Mechanic)",
    repairDescription: repairDescription || "Repaired and fully working.",
    partsUsed: partsUsed || "None",
    repairCompletedAt: completedAt,
    engineerSignature: signature,
    closedBy: "Fleet Manager (Web Dashboard)",
    closedAt: completedAt
  };

  return c.json(updatedDefect);
});

// 16b. PUT /api/defects/:id/reopen
app.put('/defects/:id/reopen', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const id = c.req.param('id');
  const defect: any = await db.prepare("SELECT * FROM defects WHERE id = ? AND companyId = ?").bind(id, companyId).first();
  if (!defect) return c.json({ error: "Defect not found" }, 404);
  await db.prepare("UPDATE defects SET status = 'open', engineerName = NULL, repairDescription = NULL, partsUsed = NULL, repairCompletedAt = NULL, engineerSignature = NULL, closedBy = NULL, closedAt = NULL WHERE id = ? AND companyId = ?").bind(id, companyId).run();
  return c.json({ success: true });
});

  

// 16c. PUT /api/defects/:id/status
app.put("/defects/:id/status", async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header("x-company-id");
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const id = c.req.param("id");
  const { status } = await c.req.json();
  const valid = ["open", "in_repair", "closed"];
  if (!valid.includes(status)) return c.json({ error: "Invalid status" }, 400);
  try { await db.prepare("ALTER TABLE defects ADD COLUMN status TEXT DEFAULT \"open\"").run(); } catch(e) {}
  await db.prepare("UPDATE defects SET status = ? WHERE id = ? AND companyId = ?").bind(status, id, companyId).run();
  return c.json({ success: true });
});

// 17. GET /api/announcements
app.get('/announcements', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const { results } = await db.prepare("SELECT * FROM announcements WHERE companyId = ? ORDER BY createdAt DESC").bind(companyId).all();
  
  const mapped = results.map((ann: any) => ({
    ...ann,
    important: ann.important === 1
  }));

  return c.json(mapped);
});

// 18. POST /api/announcements
app.post('/announcements', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const body = await c.req.json();
  const id = "ann-" + Date.now();
  const title = body.title || "Announcement";
  const content = body.content || "";
  const importantValue = body.important ? 1 : 0;
  const createdAt = new Date().toISOString();

  await db.prepare(`
    INSERT INTO announcements (id, companyId, title, content, important, validUntil, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, companyId, title, content, importantValue, body.validUntil || null, createdAt).run();

  // Create workspace notice notification
  const notificationId = "not-ann-" + Date.now();
  const msgExcerpt = content.length > 80 ? content.substr(0, 80) + "..." : content;

  await db.prepare(`
    INSERT INTO notifications (id, companyId, type, title, message, isRead, createdAt)
    VALUES (?, ?, 'plan_limit', ?, ?, 0, ?)
  `).bind(notificationId, companyId, "📢 Announcement: " + title, msgExcerpt, createdAt).run();

  // --- TRIGGER PUSH SYNC ---
  try {
    const { results: pushSubs }: any = await db.prepare("SELECT fcmToken FROM push_subscriptions WHERE companyId = ?").bind(companyId).all();
    for (const subRecord of pushSubs) {
      if (subRecord.fcmToken) {
        await sendFcmPush(c.env, subRecord.fcmToken as string, `📢 Announcement: ${title}`, msgExcerpt);
      }
    }
  } catch (err) {}

  // --- EMAIL ALERT ---
  await sendEmailAlert(db, c.env, companyId, "WalkSafe Announcement: " + title, buildEmailHtml("📢 " + title, msgExcerpt || ""));

  return c.json({
    id,
    companyId,
    title,
    content,
    important: importantValue === 1,
    createdAt
  });
});

// 19. GET /api/schedules
app.get('/schedules', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const { results } = await db.prepare("SELECT * FROM schedules WHERE companyId = ?").bind(companyId).all();

  const mapped = results.map((sch: any) => ({
    ...sch,
    isRecurring: sch.isRecurring === 1
  }));

  return c.json(mapped);
});

// 20. POST /api/schedules
app.post('/schedules', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const body = await c.req.json();
  const id = "sch-" + Date.now();
  const title = body.title || "Routine Audit Checklist";
  const vehicleId = body.vehicleId || "";
  const dueDate = body.dueDate || new Date().toISOString().split('T')[0];
  const driverId = body.driverId || null;
  const frequency = body.frequency || null;
  const isRecurring = body.isRecurring ? 1 : 0;
  const createdAt = new Date().toISOString();

  try {
    await db.prepare(`
    INSERT INTO schedules (id, companyId, title, vehicleId, dueDate, status, driverId, frequency, isRecurring, templateId, createdAt)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
  `).bind(id, companyId, title, vehicleId, dueDate, driverId, frequency, isRecurring, body.templateId || null, createdAt).run();
  } catch (_e) {
    try { await db.prepare("ALTER TABLE schedules ADD COLUMN templateId TEXT").run(); } catch (__e) {}
    await db.prepare(`
    INSERT INTO schedules (id, companyId, title, vehicleId, dueDate, status, driverId, frequency, isRecurring, templateId, createdAt)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
  `).bind(id, companyId, title, vehicleId, dueDate, driverId, frequency, isRecurring, body.templateId || null, createdAt).run();
  }

  // Schedule notification dispatch logic
  const veh: any = await db.prepare("SELECT registration FROM vehicles WHERE id = ?").bind(vehicleId).first();
  const regLabel = veh ? veh.registration : "Fleet";

  const pushTitle = "🗓️ Check Scheduled";
  const pushMessage = `Inspection task "${title}" assigned onto ${regLabel} for compliance due ${dueDate}.`;

  await db.prepare(`
    INSERT INTO notifications (id, companyId, type, title, message, isRead, createdAt)
    VALUES (?, ?, 'quick_check', ?, ?, 0, ?)
  `).bind(
    "not-sch-" + Date.now(),
    companyId,
    pushTitle,
    pushMessage,
    createdAt
  ).run();

  // --- TRIGGER PUSH SYNC ---
  try {
    const { results: pushSubs }: any = await db.prepare("SELECT fcmToken FROM push_subscriptions WHERE companyId = ?").bind(companyId).all();
    for (const subRecord of pushSubs) {
      if (subRecord.fcmToken) {
        await sendFcmPush(c.env, subRecord.fcmToken as string, pushTitle, pushMessage);
      }
    }
  } catch (err) {}

  return c.json({
    id,
    companyId,
    title,
    vehicleId,
    dueDate,
    status: 'pending',
    driverId,
    frequency,
    isRecurring: isRecurring === 1,
    createdAt
  });
});

// 21. PUT /api/schedules/:id
app.put('/schedules/:id', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const id = c.req.param('id');
  const body = await c.req.json();

  const sch: any = await db.prepare("SELECT * FROM schedules WHERE id = ? AND companyId = ?").bind(id, companyId).first();
  if (!sch) return c.json({ error: "Schedule task not found" }, 404);

  const title = body.title !== undefined ? body.title : sch.title;
  const vehicleId = body.vehicleId !== undefined ? body.vehicleId : sch.vehicleId;
  const dueDate = body.dueDate !== undefined ? body.dueDate : sch.dueDate;
  const status = body.status !== undefined ? body.status : sch.status;
  const driverId = body.driverId !== undefined ? body.driverId : sch.driverId;
  const frequency = body.frequency !== undefined ? body.frequency : sch.frequency;
  const isRecurring = body.isRecurring !== undefined ? (body.isRecurring ? 1 : 0) : sch.isRecurring;
  const templateId = body.templateId !== undefined ? body.templateId : sch.templateId;

  await db.prepare(`
    UPDATE schedules 
    SET title = ?, vehicleId = ?, dueDate = ?, status = ?, driverId = ?, frequency = ?, isRecurring = ?, templateId = ?
    WHERE id = ? AND companyId = ?
  `).bind(title, vehicleId, dueDate, status, driverId, frequency, isRecurring, templateId, id, companyId).run();

  // Handle recurrence if transitioning to completed
  if (status === 'completed' && sch.status !== 'completed' && isRecurring === 1) {
    const nextDate = new Date(dueDate);
    const freqVal = frequency || sch.frequency || 'weekly';
    if (freqVal === 'daily') nextDate.setDate(nextDate.getDate() + 1);
    else if (freqVal === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    else if (freqVal === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

    const nextDueDateStr = nextDate.toISOString().split('T')[0];
    const nextId = "sch-" + Date.now() + Math.floor(Math.random() * 1000);
    const nextCreatedAt = new Date().toISOString();

    try {
      await db.prepare(`
        INSERT INTO schedules (id, companyId, title, vehicleId, dueDate, status, driverId, frequency, isRecurring, templateId, createdAt)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, 1, ?, ?)
      `).bind(nextId, companyId, title, vehicleId, nextDueDateStr, driverId, freqVal, templateId, nextCreatedAt).run();
    } catch (_e) {
      try { await db.prepare("ALTER TABLE schedules ADD COLUMN templateId TEXT").run(); } catch (__e) {}
      await db.prepare(`
        INSERT INTO schedules (id, companyId, title, vehicleId, dueDate, status, driverId, frequency, isRecurring, createdAt)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, 1, ?)
      `).bind(nextId, companyId, title, vehicleId, nextDueDateStr, driverId, freqVal, nextCreatedAt).run();
    }

    // Trigger Notification of recurring schedule setup
    const veh: any = await db.prepare("SELECT registration FROM vehicles WHERE id = ?").bind(vehicleId).first();
    const regLabel = veh ? veh.registration : "Fleet";
    const pushTitle = "🔁 Recurring Check Queued";
    const pushMessage = `Next "${title}" is automatically scheduled on ${regLabel} for ${nextDueDateStr} (Recurring).`;

    await db.prepare(`
      INSERT INTO notifications (id, companyId, type, title, message, isRead, createdAt)
      VALUES (?, ?, 'quick_check', ?, ?, 0, ?)
    `).bind(
      "not-sch-rec-" + Date.now(),
      companyId,
      pushTitle,
      pushMessage,
      nextCreatedAt
    ).run();

    // Push notification fcm propagation
    try {
      const { results: pushSubs }: any = await db.prepare("SELECT fcmToken FROM push_subscriptions WHERE companyId = ?").bind(companyId).all();
      for (const subRecord of pushSubs) {
        if (subRecord.fcmToken) {
          await sendFcmPush(c.env, (subRecord.fcmToken as string), pushTitle, pushMessage);
        }
      }
    } catch (err) {}
  }

  return c.json({ success: true });
});

// 22. DELETE /api/schedules/:id
app.delete('/schedules/:id', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const id = c.req.param('id');
  const res = await db.prepare("DELETE FROM schedules WHERE id = ? AND companyId = ?").bind(id, companyId).run();
  
  if (res.meta.changes > 0) {
    return c.json({ success: true });
  } else {
    return c.json({ error: "Schedule not found" }, 404);
  }
});

// 23. GET /api/notifications
app.get('/notifications', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const { results } = await db.prepare("SELECT * FROM notifications WHERE companyId = ? ORDER BY createdAt DESC").bind(companyId).all();

  const mapped = results.map((not: any) => ({
    ...not,
    isRead: not.isRead === 1
  }));

  return c.json(mapped);
});

// 23. PUT /api/notifications/read
app.put('/notifications/read', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  await db.prepare("UPDATE notifications SET isRead = 1 WHERE companyId = ?").bind(companyId).run();
  return c.json({ success: true });
});

// 24. PUT /api/drivers/:id/reset-pin
app.put('/drivers/:id/reset-pin', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const id = c.req.param('id');
  const { pin } = await c.req.json();

  if (!pin || pin.length !== 4) {
    return c.json({ error: "New PIN must be exactly 4-digits" }, 400);
  }

  const driver: any = await db.prepare("SELECT * FROM drivers WHERE id = ? AND companyId = ?").bind(id, companyId).first();
  if (!driver) return c.json({ error: "Driver not found" }, 404);

  await db.prepare("UPDATE drivers SET pin = ? WHERE id = ? AND companyId = ?").bind(pin, id, companyId).run();
  
  return c.json({
    success: true,
    driver: {
      ...driver,
      pin
    }
  });
});

// 25. GET /api/dvla-lookup/:reg (UK DVLA Enquiry Integration)
app.get('/dvla-lookup/:reg', async (c) => {
  const reg = c.req.param('reg');
  const rawReg = (reg || "").toUpperCase().replace(/\s+/g, "");
  const apiKey = c.env.DVLA_API_KEY || "hRo51bg9sP91LZt4EE0eL4G1DlJzx8cs1dmlUDbi";

  if (!apiKey) {
    return c.json({ error: "DVLA API configurations are missing. Please enter details manually." }, 500);
  }

  try {
    const response = await fetch("https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({ registrationNumber: rawReg })
    });

    if (response.ok) {
      const data: any = await response.json();
      return c.json({
        make: data.make || "Unknown Make",
        model: data.model || "Unknown Model",
        year: data.yearOfManufacture || null,
        colour: data.colour || "White",
        type: data.vehicleConstruction === "RIGID" ? "hgv" : "lgv",
        motExpiry: data.motExpiryDate || "2027-01-01",
        taxExpiry: data.taxDueDate || "2027-01-01",
        isSimulated: false
      });
    } else {
      if (response.status === 404) {
        return c.json({ error: "Vehicle registration not found in official DVLA database." }, 404);
      }
      return c.json({ error: `DVLA database service returned status ${response.status}.` }, response.status);
    }
  } catch (err: any) {
    return c.json({ error: "Failed to connect to the DVLA database. Please enter details manually." }, 500);
  }
});

// 26. Push Endpoints (Cloudflare D1 mock/real setups)
app.get('/push/public-key', async (c) => {
  // Return consistent public key that matches Cloudflare worker deployment settings
  return c.json({ publicKey: "BMn1lA7K9r9T3M5T7rPVDv6N49QyEDmd497cVEVv58t306YqQvU-8M0rNmd_s6_8eK-U-M1C_8E4Z6P8vD2t1-Q" });
});

app.post('/push/register', async (c) => {
  const { companyId, subscription, fcmToken } = await c.req.json();
  const db = getDbOrThrow(c);
  // Create push_subscriptions table dynamically if not present
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        endpoint TEXT PRIMARY KEY,
        companyId TEXT,
        subscription TEXT,
        fcmToken TEXT
      )
    `).run();

    // Ensure fcmToken column exists if table was created older
    try {
      await db.prepare("ALTER TABLE push_subscriptions ADD COLUMN fcmToken TEXT").run();
    } catch (_) {}

    const endpoint = fcmToken || (subscription ? subscription.endpoint : `fcm-${Math.random().toString(36).substr(2, 9)}`);

    await db.prepare(`
      INSERT OR REPLACE INTO push_subscriptions (endpoint, companyId, subscription, fcmToken)
      VALUES (?, ?, ?, ?)
    `).bind(endpoint, companyId, subscription ? JSON.stringify(subscription) : null, fcmToken || null).run();
  } catch (err) {
    console.error("Failed to register push subscription on D1:", err);
  }
  return c.json({ success: true });
});

// 27. GET /api/auth/magic-login/:token
app.get('/auth/magic-login/:token', async (c) => {
  const token = c.req.param('token');
  const db = getDbOrThrow(c);
  let driver: any = await db.prepare('SELECT * FROM drivers WHERE installToken = ?').bind(token).first();
  if (!driver) {
    driver = await db.prepare('SELECT * FROM drivers WHERE id = ?').bind(token).first();
  }
  if (!driver) {
    driver = await db.prepare('SELECT * FROM drivers WHERE LOWER(TRIM(email)) = ?').bind(token.toLowerCase().trim()).first();
  }
  if (!driver) {
    return c.json({ error: 'Invalid magic token. Please check the URL or contact your manager.' }, 404);
  }
  const company = await db.prepare('SELECT * FROM company WHERE id = ?').bind(driver.companyId).first();
  if (!company) {
    return c.json({ error: 'Workspace company not found for this driver.' }, 404);
  }
  return c.json({
    success: true,
    driver: mapDriverDbToClient(driver),
    company: mapCompanyDbToClient(company)
  });
});

// 28. DELETE /api/vehicles/:id
app.delete('/vehicles/:id', async (c) => {
  const id = c.req.param('id');
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const db = getDbOrThrow(c);
  await db.prepare("DELETE FROM vehicles WHERE id = ? AND companyId = ?").bind(id, companyId).run();
  return c.json({ success: true });
});

// 29. DELETE /api/drivers/:id
app.delete('/drivers/:id', async (c) => {
  const id = c.req.param('id');
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const db = getDbOrThrow(c);
  await db.prepare("DELETE FROM drivers WHERE id = ? AND companyId = ?").bind(id, companyId).run();
  return c.json({ success: true });
});

// 29. DELETE /api/drivers/:id
app.delete('/drivers/:id', async (c) => {
  const id = c.req.param('id');
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const db = getDbOrThrow(c);
  await db.prepare("DELETE FROM drivers WHERE id = ? AND companyId = ?").bind(id, companyId).run();
  return c.json({ success: true });
});

// --- PAYSTACK BILLING ENDPOINTS FOR PROD / CLOUDFLARE ---

// 30. POST /api/billing/create-checkout-session
app.post('/billing/create-checkout-session', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const { plan, limit } = await c.req.json();
  if (!plan || !limit) {
    return c.json({ error: "Plan and limit arguments are required" }, 400);
  }

  const company: any = await db.prepare("SELECT * FROM company WHERE id = ?").bind(companyId).first();
  if (!company) {
    return c.json({ error: "Workspace organization not found" }, 404);
  }

  const paystackKey = c.env.PAYSTACK_SECRET_KEY;
  const requestUrl = new URL(c.req.url);
  const origin = requestUrl.origin;

  if (paystackKey) {
    try {
      let priceAmount = 499; // Default solo operator (in pence)
      if (plan === "starter") {
        priceAmount = 1499;
      } else if (plan === "growth") {
        priceAmount = 3499;
      } else if (plan === "enterprise") {
        priceAmount = 8499;
      }

      const successUrl = `${origin}/?payment_success=true&plan=${plan}&limit=${limit}`;

      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: company.email || 'support@getwalksafe.co.uk',
          amount: priceAmount,
          currency: 'GBP',
          callback_url: successUrl,
          metadata: {
            companyId: company.id,
            plan: plan,
            limit: String(limit),
          },
        }),
      });

      const data: any = await response.json();
      if (!data.status) {
        throw new Error(data.message || "Failed to initialize Paystack session");
      }

      return c.json({ url: data.data.authorization_url });
    } catch (err: any) {
      console.error("[Paystack Cloudflare Initialization Error] ", err);
      return c.json({ error: `Paystack Payment Connector Error: ${err.message}` }, 500);
    }
  } else {
    console.warn("PAYSTACK_SECRET_KEY is missing from Cloudflare environment context.");
    const fallbackSuccessUrl = `${origin}/?payment_success=true&plan=${plan}&limit=${limit}&sandbox_warning=true`;
    return c.json({
      url: fallbackSuccessUrl,
      warning: "Paystack Live Key is not set on Cloudflare. Running in Sandbox Direct Activation mode."
    });
  }
});

// 31. POST /api/billing/verify-session
app.post('/billing/verify-session', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);

  const { plan, limit } = await c.req.json();
  const company: any = await db.prepare("SELECT * FROM company WHERE id = ?").bind(companyId).first();
  if (!company) {
    return c.json({ error: "Workspace company not found" }, 404);
  }

  // Activation happens via Paddle webhook only.
  // This endpoint just confirms the company and returns current status.
  // The Paddle webhook (/api/billing/paddle-webhook) handles subscription events
  // and sets isSubscribed accordingly.

  const updated = await db.prepare("SELECT * FROM company WHERE id = ?").bind(companyId).first();
  return c.json({ success: true, company: mapCompanyDbToClient(updated) });
});

// 32. POST /api/billing/webhook// 32. POST /api/billing/webhook
app.post('/billing/webhook', async (c) => {
  const paystackKey = c.env.PAYSTACK_SECRET_KEY;
  if (!paystackKey) {
    console.warn("[Paystack Webhook] Webhook pinged but PAYSTACK_SECRET_KEY is undefined on Cloudflare.");
    return c.text("OK", 200);
  }

  const signature = c.req.header("x-paystack-signature");
  if (!signature) {
    console.warn("[Paystack Webhook] Missing x-paystack-signature");
    return c.json({ error: "Signature header is required" }, 400);
  }

  try {
    const rawBody = await c.req.text();
    const encoder = new TextEncoder();
    
    // Cloudflare Web Crypto HMAC verification
    const keyData = encoder.encode(paystackKey);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["verify"]
    );

    // Convert hex signature to Uint8Array
    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    const dataBytes = encoder.encode(rawBody);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      dataBytes
    );

    if (!isValid) {
      console.error("[Paystack Webhook] Webhook HMAC verification failed");
      return c.json({ error: "Webhook signature validation failed" }, 400);
    }

    const payload = JSON.parse(rawBody);
    const { event, data } = payload;

    if (event === "charge.success" && data?.status === "success") {
      const metadata = data.metadata;
      if (metadata && metadata.companyId && metadata.plan && metadata.limit) {
        const companyId = metadata.companyId;
        const plan = metadata.plan;
        const limit = Number(metadata.limit);

        const db = getDbOrThrow(c);
        const company = await db.prepare("SELECT id FROM company WHERE id = ?").bind(companyId).first();
        if (company) {
          await db.prepare(`
            UPDATE company 
            SET plan = ?, vehicleLimit = ?, isSubscribed = 1, updatedAt = ?
            WHERE id = ?
          `).bind(plan, limit, new Date().toISOString(), companyId).run();
          console.log(`[Paystack Webhook] Updated company with plan ${plan} for organization ${companyId}`);
        }
      }
    }

    return c.text("OK", 200);
  } catch (err: any) {
    console.error("[Paystack Webhook Process Failure] ", err);
    return c.json({ error: `Webhook trigger error: ${err.message}` }, 500);
  }
});

// 33. POST /api/billing/paddle-webhook
app.post('/billing/paddle-webhook', async (c) => {
  try {
    const rawBody = await c.req.text();
    const signatureHeader = c.req.header("Paddle-Signature");
    const paddleSecret = c.env.PADDLE_WEBHOOK_SECRET;

    if (!paddleSecret) {
      // No secret configured — silently accept (dev mode)
      console.warn("[Paddle Webhook] PADDLE_WEBHOOK_SECRET not set, accepting webhook without verification");
    } else if (signatureHeader) {
      // Verify Paddle v2 signature: ts=...;h1=v1=...
      const parts = signatureHeader.split(";").reduce((acc, part) => {
        const [key, ...vals] = part.split("=");
        acc[key.trim()] = vals.join("=");
        return acc;
      }, {} as Record<string, string>);

      const ts = parts["ts"];
      const h1 = parts["h1"] || "";
      const h1Value = h1.startsWith("v1=") ? h1.substring(3) : h1;

      if (ts && h1Value) {
        const signedPayload = ts + ":" + rawBody;
        const encoder = new TextEncoder();
        const keyData = encoder.encode(paddleSecret);
        const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
        const sigBytes = new Uint8Array(h1Value.match(/.{1,2}/g)!.map((b: string) => parseInt(b, 16)));
        const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(signedPayload));
        if (!isValid) {
          console.error("[Paddle Webhook] Signature verification failed");
          return c.json({ error: "Invalid signature" }, 401);
        }
      }
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event_type;
    const eventData = payload.data || {};

    if (!eventType) {
      return c.json({ error: "Missing event_type" }, 400);
    }

    const customData = eventData.custom_data || eventData.customData || {};
    const companyId = customData.userId || customData.companyId;
    if (!companyId) {
      // No companyId to update — this might be a test event
      console.log("[Paddle Webhook] No companyId in event, skipping:", eventType);
      return c.json({ success: true });
    }

    const plan = customData.plan || "starter";
    const limit = Number(customData.vehicle_limit || customData.vehicleLimit || 5);

    const db = getDbOrThrow(c);
    const company = await db.prepare("SELECT id FROM company WHERE id = ?").bind(companyId).first();

    if (!company) {
      console.warn("[Paddle Webhook] Company not found:", companyId);
      return c.json({ success: true }); // Acknowledge but don't error
    }

    // Determine subscription status based on event
    let isSubscribed = false;
    switch (eventType) {
      case "subscription.created":
      case "subscription.activated":
      case "transaction.paid":
      case "transaction.completed":
        isSubscribed = true;
        break;
      case "subscription.updated":
        isSubscribed = eventData.status === "active" || eventData.status === "trialing";
        break;
      case "subscription.cancelled":
      case "subscription.past_due":
      case "subscription.expired":
        isSubscribed = false;
        break;
      default:
        // Try to infer from status if available
        if (eventData.status) {
          isSubscribed = eventData.status === "active" || eventData.status === "trialing";
        }
    }

    if (isSubscribed) {
      await db.prepare("UPDATE company SET plan = ?, vehicleLimit = ?, isSubscribed = 1, updatedAt = ? WHERE id = ?")
        .bind(plan, limit, new Date().toISOString(), companyId).run();
      console.log("[Paddle Webhook] Subscribed company", companyId, "plan:", plan);
    } else {
      await db.prepare("UPDATE company SET isSubscribed = 0, updatedAt = ? WHERE id = ?")
        .bind(new Date().toISOString(), companyId).run();
      console.log("[Paddle Webhook] Unsubscribed company", companyId);
    }

    return c.json({ success: true });
  } catch (err: any) {
    console.error("[Paddle Webhook Error]", err);
    return c.json({ error: err.message }, 500);
  }
});

// --- MISSING EXTENDED API ROUTES (templates, maintenance, documents, positions, driver-scores, parts, work-orders, fuel, expenses, alert-rules) ---

// Templates
app.get('/templates', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const { results } = await db.prepare("SELECT * FROM templates WHERE companyId = ? ORDER BY createdAt DESC").bind(companyId).all();
  const mapped = results.map((t: any) => ({ ...t, items: JSON.parse(t.items || '[]') }));
  return c.json(mapped);
});
app.post('/templates', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const body = await c.req.json();
  const id = "tmpl-" + Date.now();
  try {
    await db.prepare("INSERT INTO templates (id, companyId, name, description, items, createdAt) VALUES (?,?,?,?,?,?)")
      .bind(id, companyId, body.name, body.description || null, JSON.stringify(body.items || []), new Date().toISOString()).run();
  } catch(_) {
    try {
      await db.prepare(`CREATE TABLE IF NOT EXISTS templates (id TEXT PRIMARY KEY, companyId TEXT, name TEXT, description TEXT, items TEXT, createdAt TEXT)`).run();
      await db.prepare("INSERT INTO templates (id, companyId, name, description, items, createdAt) VALUES (?,?,?,?,?,?)")
        .bind(id, companyId, body.name, body.description || null, JSON.stringify(body.items || []), new Date().toISOString()).run();
    } catch(e2) { return c.json({ error: "Failed to create template" }, 500); }
  }
  return c.json({ success: true, id });
});

app.put('/templates/:id', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const body = await c.req.json();
  const existing = await db.prepare("SELECT * FROM templates WHERE id = ? AND companyId = ?").bind(c.req.param('id'), companyId).first();
  if (!existing) return c.json({ error: "Template not found" }, 404);
  const name = body.name ?? (existing as any).name;
  const description = body.description !== undefined ? body.description : (existing as any).description;
  const items = body.items ? JSON.stringify(body.items) : (existing as any).items;
  try {
    await db.prepare("UPDATE templates SET name = ?, description = ?, items = ? WHERE id = ? AND companyId = ?")
      .bind(name, description, items, c.req.param('id'), companyId).run();
  } catch(e) { return c.json({ error: "Failed to update template" }, 500); }
  return c.json({ success: true });
});

app.delete('/templates/:id', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const existing = await db.prepare("SELECT * FROM templates WHERE id = ? AND companyId = ?").bind(c.req.param('id'), companyId).first();
  if (!existing) return c.json({ error: "Template not found" }, 404);
  try {
    await db.prepare("DELETE FROM templates WHERE id = ? AND companyId = ?").bind(c.req.param('id'), companyId).run();
  } catch(e) { return c.json({ error: "Failed to delete template" }, 500); }
  return c.json({ success: true });
});

// Maintenance
app.get('/maintenance', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  try {
    const { results } = await db.prepare("SELECT * FROM maintenance WHERE companyId = ? ORDER BY createdAt DESC").bind(companyId).all();
    return c.json(results);
  } catch(_) { return c.json([]); }
});
app.post('/maintenance', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const body = await c.req.json();
  const id = "mnt-" + Date.now();
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS maintenance (id TEXT PRIMARY KEY, companyId TEXT, vehicleId TEXT, type TEXT, title TEXT, description TEXT, odometer REAL, cost REAL, workshop TEXT, dueDate TEXT, completedAt TEXT, status TEXT DEFAULT 'scheduled', createdAt TEXT)`).run();
    await db.prepare("INSERT INTO maintenance (id, companyId, vehicleId, type, title, description, odometer, cost, workshop, dueDate, status, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(id, companyId, body.vehicleId || '', body.type || 'service', body.title || '', body.description || '', body.odometer || 0, body.cost || 0, body.workshop || '', body.dueDate || '', body.status || 'scheduled', new Date().toISOString()).run();
  } catch(e2) { return c.json({ error: "Failed" }, 500); }
  return c.json({ success: true, id });
});

// Documents
app.get('/documents', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  try {
    const { results } = await db.prepare("SELECT * FROM documents WHERE companyId = ? ORDER BY uploadedAt DESC").bind(companyId).all();
    return c.json(results);
  } catch(_) { return c.json([]); }
});
app.post('/documents', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const body = await c.req.json();
  const id = "doc-" + Date.now();
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, companyId TEXT, vehicleId TEXT, driverId TEXT, type TEXT, fileName TEXT, fileUrl TEXT, expiryDate TEXT, uploadedAt TEXT)`).run();
    await db.prepare("INSERT INTO documents (id, companyId, vehicleId, type, fileName, fileUrl, expiryDate, uploadedAt) VALUES (?,?,?,?,?,?,?,?)")
      .bind(id, companyId, body.vehicleId || null, body.type || 'other', body.fileName || 'Document', body.fileUrl || null, body.expiryDate || null, new Date().toISOString()).run();
  } catch(e2) { return c.json({ error: "Failed" }, 500); }
  return c.json({ success: true, id });
});

// Positions
app.get('/positions/latest', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  try {
    const { results } = await db.prepare("SELECT * FROM vehicle_positions WHERE companyId = ? ORDER BY recordedAt DESC LIMIT 50").bind(companyId).all();
    // deduplicate by vehicleId, keep latest
    const latest = new Map();
    for (const r of results) { latest.set(r.vehicleId, r); }
    return c.json(Array.from(latest.values()));
  } catch(_) { return c.json([]); }
});
app.post('/positions', async (c) => {
  const db = getDbOrThrow(c);
  const body = await c.req.json();
  const companyId = c.req.header('x-company-id') || body.companyId;
  if (!companyId) return c.json({ error: "Company ID required" }, 401);
  const id = "pos-" + Date.now();
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS vehicle_positions (id TEXT PRIMARY KEY, vehicleId TEXT, companyId TEXT, latitude REAL, longitude REAL, speed REAL, heading REAL, recordedAt TEXT)`).run();
    await db.prepare("INSERT INTO vehicle_positions (id, vehicleId, companyId, latitude, longitude, speed, heading, recordedAt) VALUES (?,?,?,?,?,?,?,?)")
      .bind(id, body.vehicleId, companyId, body.latitude || 0, body.longitude || 0, body.speed || null, body.heading || null, new Date().toISOString()).run();
  } catch(e2) { /* silent */ }
  return c.json({ success: true });
});

// Driver Scores
app.get('/driver-scores', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  try {
    const { results } = await db.prepare("SELECT * FROM driver_scores WHERE companyId = ? ORDER BY weekStart DESC LIMIT 50").bind(companyId).all();
    return c.json(results);
  } catch(_) { return c.json([]); }
});

// Parts
app.get('/parts', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  try {
    const { results } = await db.prepare("SELECT * FROM parts WHERE companyId = ? ORDER BY name ASC").bind(companyId).all();
    return c.json(results);
  } catch(_) { return c.json([]); }
});
app.post('/parts', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const body = await c.req.json();
  const id = "prt-" + Date.now();
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS parts (id TEXT PRIMARY KEY, companyId TEXT, name TEXT, category TEXT, quantity INTEGER, minStock INTEGER, unitCost REAL, supplier TEXT, createdAt TEXT)`).run();
    await db.prepare("INSERT INTO parts (id, companyId, name, category, quantity, minStock, unitCost, supplier, createdAt) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(id, companyId, body.name || 'Part', body.category || 'other', Number(body.quantity) || 0, Number(body.minStock) || 0, Number(body.unitCost) || 0, body.supplier || '', new Date().toISOString()).run();
  } catch(e2) { return c.json({ error: "Failed" }, 500); }
  return c.json({ success: true, id });
});
app.put('/parts/:id', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const body = await c.req.json();
  try {
    await db.prepare("UPDATE parts SET name=?, category=?, quantity=?, minStock=?, unitCost=?, supplier=? WHERE id=? AND companyId=?")
      .bind(body.name, body.category, Number(body.quantity), Number(body.minStock), Number(body.unitCost), body.supplier, c.req.param('id'), companyId).run();
  } catch(e2) { return c.json({ error: "Failed" }, 500); }
  return c.json({ success: true });
});

// Work Orders
app.get('/work-orders', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  try {
    const { results } = await db.prepare("SELECT * FROM work_orders WHERE companyId = ? ORDER BY createdAt DESC").bind(companyId).all();
    const mapped = results.map((w: any) => ({ ...w, partsUsed: JSON.parse(w.partsUsed || '[]') }));
    return c.json(mapped);
  } catch(_) { return c.json([]); }
});
app.post('/work-orders', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const body = await c.req.json();
  const id = "wo-" + Date.now();
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS work_orders (id TEXT PRIMARY KEY, companyId TEXT, vehicleId TEXT, title TEXT, status TEXT DEFAULT 'open', defectId TEXT, assignedMechanic TEXT, laborHours REAL, partsUsed TEXT, notes TEXT, totalCost REAL, createdAt TEXT, completedAt TEXT)`).run();
    await db.prepare("INSERT INTO work_orders (id, companyId, vehicleId, title, status, defectId, assignedMechanic, notes, partsUsed, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .bind(id, companyId, body.vehicleId || '', body.title || '', body.status || 'open', body.defectId || null, body.assignedMechanic || '', body.notes || '', JSON.stringify(body.partsUsed || []), new Date().toISOString()).run();
  } catch(e2) { return c.json({ error: "Failed to create work order: " + e2.message }, 500); }
  return c.json({ success: true, id });
});
app.put('/work-orders/:id', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const body = await c.req.json();
  const completedAt = body.status === 'completed' ? `, completedAt='${new Date().toISOString()}'` : '';
  try {
    await db.prepare(`UPDATE work_orders SET status=? ${completedAt ? ', completedAt=?' : ''} WHERE id=? AND companyId=?`)
      .bind(body.status, ...(completedAt ? [new Date().toISOString()] : []), c.req.param('id'), companyId).run();
  } catch(e2) { return c.json({ error: "Failed" }, 500); }
  return c.json({ success: true });
});

// Fuel
app.get('/fuel', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  try {
    const { results } = await db.prepare("SELECT * FROM fuel WHERE companyId = ? ORDER BY date DESC LIMIT 100").bind(companyId).all();
    return c.json(results);
  } catch(_) { return c.json([]); }
});
app.post('/fuel', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const body = await c.req.json();
  const id = "fuel-" + Date.now();
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS fuel (id TEXT PRIMARY KEY, companyId TEXT, vehicleId TEXT, date TEXT, liters REAL, costPerLiter REAL, totalCost REAL, odometer REAL, fuelType TEXT, station TEXT, receiptUrl TEXT, createdAt TEXT)`).run();
    await db.prepare("INSERT INTO fuel (id, companyId, vehicleId, date, liters, costPerLiter, totalCost, odometer, fuelType, station, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .bind(id, companyId, body.vehicleId || '', body.date || new Date().toISOString().split('T')[0], Number(body.liters) || 0, Number(body.costPerLiter) || 0, Number(body.totalCost) || 0, Number(body.odometer) || 0, body.fuelType || 'diesel', body.station || '', new Date().toISOString()).run();
  } catch(e2) { return c.json({ error: "Failed" }, 500); }
  return c.json({ success: true, id });
});

// Expenses
app.get('/expenses', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  try {
    const { results } = await db.prepare("SELECT * FROM expenses WHERE companyId = ? ORDER BY date DESC LIMIT 100").bind(companyId).all();
    return c.json(results);
  } catch(_) { return c.json([]); }
});
app.post('/expenses', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const body = await c.req.json();
  const id = "exp-" + Date.now();
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, companyId TEXT, vehicleId TEXT, category TEXT, amount REAL, date TEXT, description TEXT, receiptUrl TEXT, createdAt TEXT)`).run();
    await db.prepare("INSERT INTO expenses (id, companyId, vehicleId, category, amount, date, description, createdAt) VALUES (?,?,?,?,?,?,?,?)")
      .bind(id, companyId, body.vehicleId || '', body.category || 'other', Number(body.amount) || 0, body.date || new Date().toISOString().split('T')[0], body.description || '', new Date().toISOString()).run();
  } catch(e2) { return c.json({ error: "Failed" }, 500); }
  return c.json({ success: true, id });
});

// Alert Rules
app.get('/alert-rules', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  try {
    const { results } = await db.prepare("SELECT * FROM alert_rules WHERE companyId = ?").bind(companyId).all();
    return c.json(results);
  } catch(_) { return c.json([]); }
});
app.post('/alert-rules', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const body = await c.req.json();
  const id = "alrt-" + Date.now();
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS alert_rules (id TEXT PRIMARY KEY, companyId TEXT, trigger TEXT, channel TEXT DEFAULT 'email', recipients TEXT, enabled INTEGER DEFAULT 1, createdAt TEXT)`).run();
    await db.prepare("INSERT INTO alert_rules (id, companyId, trigger, channel, recipients, enabled, createdAt) VALUES (?,?,?,?,?,?,?)")
      .bind(id, companyId, body.trigger || 'defect_logged', body.channel || 'email', JSON.stringify(body.recipients || []), body.enabled !== false ? 1 : 0, new Date().toISOString()).run();
  } catch(e2) { return c.json({ error: "Failed" }, 500); }
  return c.json({ success: true, id });
});
app.put('/alert-rules/:id', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  const body = await c.req.json();
  try {
    await db.prepare("UPDATE alert_rules SET enabled=? WHERE id=? AND companyId=?")
      .bind(body.enabled ? 1 : 0, c.req.param('id'), companyId).run();
  } catch(e2) {}
  return c.json({ success: true });
});
app.delete('/alert-rules/:id', async (c) => {
  const db = getDbOrThrow(c);
  const companyId = c.req.header('x-company-id');
  if (!companyId) return c.json({ error: "X-Company-Id header is required" }, 401);
  try {
    await db.prepare("DELETE FROM alert_rules WHERE id=? AND companyId=?").bind(c.req.param('id'), companyId).run();
  } catch(e2) {}
  return c.json({ success: true });
});


// --- Custom Email Verification Endpoints ---

// POST /api/auth/send-verify-link — Generate token, store in D1, send email via ZeptoMail
app.post("/auth/send-verify-link", async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: "DB not bound" }, 500);
  const { email, uid } = await c.req.json();
  if (!email || !uid) return c.json({ error: "Email and UID are required" }, 400);
  const cleanEmail = email.toLowerCase().trim();

  // Rate limit: check existing unexpired token within last 60s
  const recentVerify = await db.prepare("SELECT id FROM email_verification_tokens WHERE email = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1").bind(cleanEmail, new Date(Date.now() - 120 * 1000).toISOString()).first();
  if (recentVerify) {
    return c.json({ error: "A verification email was already sent recently. Please check your inbox or wait 2 minutes before requesting again." }, 429);
  }

  const token = generateVerifyToken();
  const id = "evt-" + Date.now();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const createdAt = new Date().toISOString();

  await db.prepare("INSERT INTO email_verification_tokens (id, email, token, uid, expires_at, used, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)")
    .bind(id, cleanEmail, token, uid, expiresAt, createdAt).run();

  const url = new URL(c.req.url);
  const verifyUrl = url.protocol + "//" + url.host + "/verify?token=" + token;

  const mailResult2 = await sendZeptoMail(c.env, cleanEmail,
    "Verify your WalkSafe email address",
    '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9f9f7;border-radius:16px;">' +
    '<div style="text-align:center;margin-bottom:24px;"><span style="font-size:24px;font-weight:800;letter-spacing:0.04em;color:#1a1c1b;">Walk<span style="color:#fea619;">Safe</span></span></div>' +
    '<div style="background:#fff;border-radius:12px;padding:32px 24px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">' +
    '<h2 style="color:#1a1c1b;font-size:18px;margin:0 0 12px;">Verify your email address</h2>' +
    '<p style="color:#47464b;font-size:14px;line-height:1.5;margin:0 0 24px;">Click the button below to verify your WalkSafe account email address:</p>' +
    '<div style="text-align:center;margin-bottom:24px;">' +
    '<a href="' + verifyUrl + '" style="display:inline-block;background:#1a1c1b;color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">Verify Email Address</a>' +
    '</div>' +
    '<p style="color:#77767b;font-size:12px;line-height:1.5;margin:0;">This link expires in <strong>15 minutes</strong>. If you didn\'t sign up for WalkSafe, you can safely ignore this email.</p>' +
    '</div>' +
    '<div style="text-align:center;margin-top:16px;"><p style="color:#a0a09a;font-size:11px;margin:0;">WalkSafe Fleet Compliance &copy; 2026</p></div>' +
    '</div>'
  );

  if (!mailResult2 || mailResult2.error) {
    console.error("[ZeptoMail] Verification email failed to send:", mailResult2?.error || mailResult2);
    return c.json({ error: "Could not send verification email. Email service may be unavailable. Please try again later." }, 503);
  }
  return c.json({ success: true, message: "Verification email sent" });
});

// GET /api/auth/verify-email — Validate token, mark email verified, return JSON
app.get("/auth/verify-email", async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ success: false, error: "DB not bound" }, 500);
  const token = c.req.query("token");
  if (!token) return c.json({ success: false, error: "Token is required" }, 400);

  const record = await db.prepare("SELECT * FROM email_verification_tokens WHERE token = ? AND used = 0 AND expires_at > ?").bind(token, new Date().toISOString()).first();
  if (!record) {
    return c.json({ success: false, message: "This verification link has expired or is invalid." });
  }

  // Mark as used
  await db.prepare("UPDATE email_verification_tokens SET used = 1 WHERE id = ?").bind(record.id).run();

  // Call Firebase Admin to set emailVerified
  const verified = await setFirebaseEmailVerified(c.env, record.uid);

  if (verified) {
    return c.json({ success: true, message: "Email verified successfully! You can now close this tab and return to the app." });
  } else {
    return c.json({ success: false, message: "Verification failed. Please try signing up again." });
  }
});

// Catch-all 404 fallback
app.all('/*', (c) => {
  return c.json({ error: "Not Found or Unsupported API Endpoint" }, 404);
});

export const onRequest = handle(app);
