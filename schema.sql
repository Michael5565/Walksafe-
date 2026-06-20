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
  templateName TEXT,  
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

-- Performance indexes for company-scoped queries
CREATE INDEX IF NOT EXISTS idx_vehicles_company ON vehicles(companyId);
CREATE INDEX IF NOT EXISTS idx_drivers_company ON drivers(companyId);
CREATE INDEX IF NOT EXISTS idx_checks_company ON checks(companyId);
CREATE INDEX IF NOT EXISTS idx_defects_company ON defects(companyId);
CREATE INDEX IF NOT EXISTS idx_announcements_company ON announcements(companyId);
CREATE INDEX IF NOT EXISTS idx_schedules_company ON schedules(companyId);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(companyId);
CREATE INDEX IF NOT EXISTS idx_templates_company ON templates(companyId);
CREATE INDEX IF NOT EXISTS idx_checks_vehicle ON checks(vehicleId);
CREATE INDEX IF NOT EXISTS idx_defects_check ON defects(checkId);
CREATE INDEX IF NOT EXISTS idx_schedules_vehicle ON schedules(vehicleId);

-- Additional performance indexes for high-read tables
CREATE INDEX IF NOT EXISTS idx_vehicle_positions_company ON vehicle_positions(companyId, recordedAt);
CREATE INDEX IF NOT EXISTS idx_parts_company ON parts(companyId);
CREATE INDEX IF NOT EXISTS idx_maintenance_company ON maintenance(companyId);
CREATE INDEX IF NOT EXISTS idx_fuel_company ON fuel(companyId);
CREATE INDEX IF NOT EXISTS idx_expenses_company ON expenses(companyId);
CREATE INDEX IF NOT EXISTS idx_work_orders_company ON work_orders(companyId);
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(companyId);
CREATE INDEX IF NOT EXISTS idx_driver_scores_company ON driver_scores(companyId);
CREATE INDEX IF NOT EXISTS idx_alert_rules_company ON alert_rules(companyId);
