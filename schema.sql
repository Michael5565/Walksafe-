-- WalkSafe Cloudflare D1 (SQLite) Schema

CREATE TABLE IF NOT EXISTS company (
  id TEXT PRIMARY KEY,
  name TEXT,
  oLicence TEXT,
  logoUrl TEXT,
  plan TEXT,
  vehicleLimit INTEGER,
  managerPassword TEXT,
  createdAt TEXT,
  trialStartedAt TEXT,
  trialEndsAt TEXT,
  isSubscribed INTEGER DEFAULT 0
);

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
  isActive INTEGER DEFAULT 1, -- 1 = true, 0 = false
  isGrounded INTEGER DEFAULT 0, -- 1 = true, 0 = false
  createdAt TEXT
);

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  companyId TEXT,
  fullName TEXT,
  phone TEXT,
  pin TEXT,
  defaultVehicleId TEXT,
  installToken TEXT,
  createdAt TEXT
);

CREATE TABLE IF NOT EXISTS checks (
  id TEXT PRIMARY KEY,
  vehicleId TEXT,
  driverId TEXT,
  companyId TEXT,
  startedAt TEXT,
  completedAt TEXT,
  durationSeconds INTEGER,
  result TEXT,
  driverSignature TEXT,
  pdfUrl TEXT,
  checkDate TEXT,
  quickCheckAlert INTEGER, -- 1 = true, 0 = false
  items TEXT, -- JSON array of check items
  createdAt TEXT,
  miscDamageNotes TEXT,
  miscDamagePhotoUrl TEXT
);

CREATE TABLE IF NOT EXISTS defects (
  id TEXT PRIMARY KEY,
  checkId TEXT,
  itemKey TEXT,
  itemLabel TEXT,
  vehicleId TEXT,
  companyId TEXT,
  severity TEXT,
  description TEXT,
  reportedTo TEXT,
  photoUrl TEXT,
  status TEXT DEFAULT 'open',
  
  -- Repair details
  engineerName TEXT,
  repairDescription TEXT,
  partsUsed TEXT,
  repairCompletedAt TEXT,
  engineerSignature TEXT,
  closedBy TEXT,
  closedAt TEXT,
  
  createdAt TEXT
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  companyId TEXT,
  title TEXT,
  content TEXT,
  important INTEGER DEFAULT 0, -- 1 = true, 0 = false
  createdAt TEXT
);

CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  companyId TEXT,
  title TEXT,
  vehicleId TEXT,
  dueDate TEXT,
  status TEXT DEFAULT 'pending',
  driverId TEXT,
  frequency TEXT,
  isRecurring INTEGER DEFAULT 0, -- 1 = true, 0 = false
  templateId TEXT,
  createdAt TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  companyId TEXT,
  type TEXT,
  title TEXT,
  message TEXT,
  isRead INTEGER DEFAULT 0, -- 1 = true, 0 = false
  createdAt TEXT
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  companyId TEXT,
  subscription TEXT,
  createdAt TEXT
);
