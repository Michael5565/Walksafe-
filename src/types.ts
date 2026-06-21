export interface Company {
  id: string; // unique workspace slug
  name: string;
  email?: string; // Fleet Manager Email
  oLicence?: string;
  logoUrl?: string; // Company logo (base64 or URL)
  plan: 'starter' | 'growth' | 'owner-driver' | 'enterprise';
  vehicleLimit: number;
  managerPassword?: string;
  createdAt: string;
  updatedAt?: string;
  trialStartedAt?: string;
  trialEndsAt?: string;
  isSubscribed?: boolean;
  isSoloOperator?: boolean;
  minDurationLgv?: number;
  minDurationHgv?: number;
  minDurationHgvTrailer?: number;
}

export interface Vehicle {
  id: string;
  companyId: string;
  registration: string;
  make: string;
  model: string;
  year: number;
  colour: string;
  type: 'lgv' | 'hgv' | 'hgv_trailer';
  motExpiry: string; // YYYY-MM-DD
  taxExpiry: string; // YYYY-MM-DD
  isActive: boolean;
  isGrounded: boolean;
  createdAt: string;
}

export interface Driver {
  id: string;
  companyId: string;
  fullName: string;
  email?: string;
  phone: string;
  pin: string; // 4-digit PIN code
  defaultVehicleId?: string;
  assignedVehicleIds?: string[];
  installToken: string;
  createdAt: string;
}

export type CheckResult = 'nil_defect' | 'defect' | 'incomplete';
export type ItemResult = 'pass' | 'fail' | 'na';
export type DefectSeverity = 'dangerous' | 'major' | 'minor';
export type DefectStatus = 'open' | 'in_repair' | 'closed';

export interface CheckItemResult {
  itemKey: string;
  itemLabel: string;
  result: ItemResult;
  sequenceOrder: number;
}

export interface WalkaroundCheck {
  id: string;
  vehicleId: string;
  driverId: string;
  companyId: string;
  startedAt: string; // ISO string
  completedAt?: string; // ISO string
  durationSeconds?: number;
  result: CheckResult;
  driverSignature: string; // base64 or drawn text SVG path
  pdfUrl?: string;
  checkDate: string; // YYYY-MM-DD
  quickCheckAlert?: boolean;
  items: CheckItemResult[];
  createdAt: string;
  latitude?: number | null;
  longitude?: number | null;
  miscDamageNotes?: string;
  miscDamagePhotoUrl?: string;
  templateName?: string;
}

export interface Defect {
  id: string;
  checkId: string;
  itemKey: string;
  itemLabel: string;
  vehicleId: string;
  companyId: string;
  severity: DefectSeverity;
  description: string;
  reportedTo: string;
  photoUrl?: string; // base64 representation or uploaded
  status: DefectStatus;
  
  // Repair log
  engineerName?: string;
  repairDescription?: string;
  partsUsed?: string;
  repairCompletedAt?: string; // ISO string
  engineerSignature?: string; // base64 representation
  closedBy?: string;
  closedAt?: string; // ISO string
  
  createdAt: string;
}

// Full 27-item checklist structure


export interface ChecklistTemplateItem {
  key: string;
  label: string;
  group: 'interior' | 'exterior' | 'loading' | 'defect';
  guidance: string;
  requiresTrailer?: boolean;
  requiresPhoto?: boolean;
}

export const CHECKLIST_ITEMS: ChecklistTemplateItem[] = [
  // Group A - Cab Interior
  {
    key: '1',
    label: 'Windscreen & Glass',
    group: 'interior',
    guidance: 'Check windscreen for chips or cracks in driver vision. Ensure side windows are clean and undamaged.'
  },
  {
    key: '2',
    label: 'Mirrors & Cameras',
    group: 'interior',
    guidance: 'Ensure all mirrors and rear-view cameras are clean, correctly adjusted, secure, and functioning.'
  },
  {
    key: '3',
    label: 'Wipers & Washers',
    group: 'interior',
    guidance: 'Check wiper blades are not worn, frayed, or torn. Ensure washers supply fluid to clear the windscreen.'
  },
  {
    key: '28',
    label: 'Dashboard Warning Lights',
    group: 'interior',
    guidance: 'Check Cluster warning lights on startup: Ensure all check engine, ABS, and diagnostic oil lamps turn off cleanly with no red warning indicators remaining active.'
  },
  {
    key: '29',
    label: 'Emergency Buzzer/Alarms',
    group: 'interior',
    guidance: 'Verify that backup warning sirens, passenger or load doors buzzers, low-air pressure whistles, or alternative emergency escape alarms function clearly.'
  },
  {
    key: '4',
    label: 'Warning Lamps & Gauges',
    group: 'interior',
    guidance: 'Check ABS, EBS, engine warning, emissions, and low-air alarms are functioning with no active warning lights.'
  },
  {
    key: '5',
    label: 'Steering Play & Binding',
    group: 'interior',
    guidance: 'Turn steering wheel side to side. Check for excessive play, stiffness, or heavy/tight spots.'
  },
  {
    key: '6',
    label: 'Horn',
    group: 'interior',
    guidance: 'Test the horn to ensure it functions correctly and is clearly audible.'
  },
  {
    key: '7',
    label: 'Brakes & Air Build-Up',
    group: 'interior',
    guidance: 'Verify correct air pressure build-up. Test footbrake and parking brake are functioning and free from leaks.'
  },
  {
    key: '8',
    label: 'Seatbelts Security',
    group: 'interior',
    guidance: 'Inspect seatbelt webbing for cuts, fraying, or stitching damage. Check latching and automatic inertia lock.'
  },
  {
    key: '9',
    label: 'Cab Security & Steps',
    group: 'interior',
    guidance: 'Ensure cab side steps and grab handles are secure. Clear loose items from the dashboard, footwells, and floor.'
  },
  // Group B - Vehicle Exterior
  {
    key: '10',
    label: 'Lights & Indicators',
    group: 'exterior',
    guidance: 'Verify all headlamps, taillamps, brake lights, indicators, hazard alerts, fog lights, and reflectors function correctly.'
  },
  {
    key: '11',
    label: 'Fuel Cap & Fluid Leaks',
    group: 'exterior',
    guidance: 'Check fuel cap is secure and seal is intact. Check underneath the engine bay for dripping oil, fuel, or coolant.'
  },
  {
    key: '12',
    label: 'Chassis & Body Panels',
    group: 'exterior',
    guidance: 'Verify all body panels, doors, and side lockers are secure. Check chassis members for visible deformities/cracks.'
  },
  {
    key: '13',
    label: 'Battery Security',
    group: 'exterior',
    guidance: 'Check battery is clamped tight, secure, not leaking acid, with connections secure and insulated covers on.'
  },
  {
    key: '14',
    label: 'Exhaust & AdBlue Level',
    group: 'exterior',
    guidance: 'Ensure exhaust tailpipe is secure, not blowing excessively, and AdBlue level is sufficient (above reserve).'
  },
  {
    key: '15',
    label: 'EV/Alt Fuel Isolation Switch',
    group: 'exterior',
    guidance: 'Ensure emergency high-voltage isolation or gas emergency shutoff is accessible, secure, and clearly labeled.'
  },
  {
    key: '16',
    label: 'Spray Suppression & Mudguards',
    group: 'exterior',
    guidance: 'Verify mudguards, mudflaps, and spray suppression skirts are securely attached and complete.'
  },
  {
    key: '17',
    label: 'Tyres Tread & Condition',
    group: 'exterior',
    guidance: 'Check tread depth is at least 1mm (HGV) or 1.6mm (LGV) across central 3/4. Inspect sidewalls for bulges, cuts, or cords.'
  },
  {
    key: '18',
    label: 'Wheel Nut Security',
    group: 'exterior',
    guidance: 'Visual check of all wheel nuts. Look for loose indicators (if fitted), rust streaks, or shininess implying movement.'
  },
  {
    key: '19',
    label: 'Registration Plates & Markings',
    group: 'exterior',
    guidance: 'Check both plates are clean, securely fixed, correct yellow/white background, and digits are clearly legible.'
  },
  {
    key: '20',
    label: 'Braking & Trailer Air Lines',
    group: 'exterior',
    guidance: 'Check couplings (red/yellow lines) are secure with no audible air leaks. Suspend line connectors securely.',
    requiresTrailer: true
  },
  {
    key: '21',
    label: 'Coupling Security',
    group: 'exterior',
    guidance: 'Inspect fifth wheel / drawbar coupling lock. Verify secondary locking pin is fully engaged and secure.',
    requiresTrailer: true
  },
  {
    key: '22',
    label: 'Load Security',
    group: 'exterior',
    guidance: 'Ensure ropes, straps, chains, curtains, or doors are tight, locked, and completely securing any potential payload.',
    requiresTrailer: true
  },
  {
    key: '23',
    label: 'Sideguards & Under-Run Guards',
    group: 'exterior',
    guidance: 'Verify safety guards on vehicle sides and rear are complete, securely mounted, and not structurally deformed.',
    requiresTrailer: true
  },
  {
    key: '24',
    label: 'Reflectors & Conspicuity',
    group: 'exterior',
    guidance: 'Verify reflective tape and side marking reflectors are present, visible, clean, and not peeling off.',
    requiresTrailer: true
  },
  {
    key: '25',
    label: 'Cab Tilt Lock',
    group: 'exterior',
    guidance: 'Check cab is fully locked down and tilt hydraulic lever or lock is correctly positioned and secured.'
  },
  {
    key: '26',
    label: 'Landing Legs (trailer)',
    group: 'exterior',
    guidance: 'Verify landing legs are fully wound up, handle stowed neatly, and gear selector in appropriate high gear pin.',
    requiresTrailer: true
  },
  {
    key: '27',
    label: 'Overall Structural Condition',
    group: 'exterior',
    guidance: 'Final walkaround inspect. Check for major tail lift defects, visible loose parts, or overall structural warping.'
  }
];


// Built-in Scaffolding & Haulage templates with mandatory photo requirements
export const BUILT_IN_TEMPLATES: { name: string; description: string; items: Omit<ChecklistTemplateItem, "key">[] }[] = [
  {
    name: "Scaffolding Fleet Daily Check",
    description: "DVSA-focused walkaround for scaffolding flatbeds with mandatory load securement photos",
    items: [
      { label: "Load Restraint Straps & Ratchets", group: "loading", guidance: "Inspect all ratchet straps for fraying, cuts, or damaged tensioning mechanisms. Each strap must be tensioned and the tail secured.", requiresPhoto: true },
      { label: "Scaffold Tube Overhang Restraint", group: "loading", guidance: "Check that scaffold tubes, boards, and fittings are properly restrained. Overhanging loads must be flagged with red/white markers.", requiresPhoto: true },
      { label: "Guardrails & Edge Protection", group: "loading", guidance: "Verify that side guardrails, posts, and edge protection are secure and undamaged. Exposed scaffold tubes in transit create immediate danger.", requiresPhoto: true },
      { label: "Tie-Down Points & Lashing Rings", group: "loading", guidance: "Inspect all tie-down anchor points on the flatbed for deformation, cracks, or corrosion. Ensure lashing rings rotate freely.", requiresPhoto: false },
      { label: "Leaf Springs & Suspension", group: "exterior", guidance: "Check leaf springs for cracks, broken leaves, or displacement. Splayed or collapsed springs indicate overloading.", requiresPhoto: true },
      { label: "Tail Lamp & Marker Light Cluster", group: "exterior", guidance: "Check all rear lighting functions. Scaffolding loads frequently obstruct rear lamps. Verify visibility from 45-degree angles.", requiresPhoto: true },
      { label: "Nearside & Offside Mirrors", group: "exterior", guidance: "Confirm mirrors are intact, clean, and correctly adjusted for the loaded vehicle width. Wide loads may obstruct mirror views.", requiresPhoto: false },
      { label: "Sideguards & Under-Run Protection", group: "exterior", guidance: "Verify sideguards are securely mounted and not deformed by loading/unloading. Minimum ground clearance rules apply.", requiresPhoto: true },
      { label: "Overhang Marker Boards & Flags", group: "exterior", guidance: "Check that red/white striped marker boards and overhang flags are clean, visible, and properly attached to projecting loads.", requiresPhoto: true },
      { label: "Chassis & Body Condition", group: "exterior", guidance: "Inspect chassis rails for cracks or deformation from repeated heavy loading. Check flatbed deck for rot or broken planks.", requiresPhoto: false },
    ]
  },
  {
    name: "Haulage & Trailer Daily Check",
    description: "Full 27-point DVSA check with mandatory trailer coupling and load restraint photos",
    items: [
      { label: "Fifth Wheel Coupling Lock", group: "exterior", guidance: "Verify fifth wheel is fully engaged around kingpin. Check secondary locking pin is fully home and handle is in locked position.", requiresPhoto: true, requiresTrailer: true },
      { label: "Air & Electrical Lines", group: "exterior", guidance: "Check red (emergency) and yellow (service) air lines are securely connected with no audible leaks. Suspend connectors to prevent damage.", requiresPhoto: false, requiresTrailer: true },
      { label: "Load Restraint Curtains & Straps", group: "loading", guidance: "Inspect cargo curtains for rips or worn webbing. Ensure all internal load straps are tensioned and load is immobilized.", requiresPhoto: true },
      { label: "Trailer Landing Legs", group: "exterior", guidance: "Verify landing legs are fully wound up, handle stowed, and gear selector in neutral/high gear position.", requiresPhoto: false, requiresTrailer: true },
      { label: "Wheel Nut Security (All Axles)", group: "exterior", guidance: "Visual check of all wheel nuts across tractor and trailer axles. Look for loose indicators, rust streaks, or shininess.", requiresPhoto: false },
      { label: "Brake Performance & Air Pressure", group: "interior", guidance: "Verify correct air pressure build-up. Test footbrake and trailer brake application. Listen for air leaks.", requiresPhoto: false },
      { label: "Container Twistlock Securement", group: "loading", guidance: "If carrying intermodal containers, verify all 4 twistlocks are engaged and locked. Check ISO corner casting alignment.", requiresPhoto: true, requiresTrailer: true },
      { label: "Reflective Markings & Conspicuity", group: "exterior", guidance: "Verify reflective tape on trailer sides and rear is present, clean, not peeling, and meets DVSA conspicuity requirements.", requiresPhoto: false, requiresTrailer: true },
      { label: "Tyres Tread & Condition (All Wheels)", group: "exterior", guidance: "Check tread depth across all positions. Inspect sidewalls for bulges, cuts, or exposed cords. Check tyre pressures.", requiresPhoto: false },
      { label: "Spray Suppression & Mudguards", group: "exterior", guidance: "Check mudguards and spray suppression skirts are complete, not damaged, and meet DVSA standards for HGV.", requiresPhoto: false },
    ]
  },
  {
    name: "Owner-Operator Daily Check",
    description: "Streamlined check for single-vehicle operators covering core DVSA requirements",
    items: [
      { label: "Tyres, Wheels & Wheel Nuts", group: "exterior", guidance: "Check tread depth, sidewall condition, and wheel nut security on all positions.", requiresPhoto: false },
      { label: "Lights, Indicators & Reflectors", group: "exterior", guidance: "Verify all lights are clean and functional including headlamps, indicators, brake, tail, fog, and hazard lights.", requiresPhoto: false },
      { label: "Fluid Levels & Leaks", group: "exterior", guidance: "Check oil, coolant, screen wash, and AdBlue levels. Inspect underneath for drips or puddles.", requiresPhoto: false },
      { label: "Load Securement", group: "loading", guidance: "Verify all loads are properly restrained. Check straps, ropes, or nets are tight and anchorage points are secure.", requiresPhoto: true },
      { label: "Brakes & Air System", group: "interior", guidance: "Check brake pedal feel, handbrake hold, and listen for air leaks. Verify warning lights clear on startup.", requiresPhoto: false },
      { label: "Mirrors & Visibility", group: "interior", guidance: "Clean and adjust all mirrors. Ensure windscreen is clear of chips or cracks in driver vision area.", requiresPhoto: false },
      { label: "Body & Chassis Condition", group: "exterior", guidance: "Quick visual of body panels, doors, and chassis for any visible damage or corrosion.", requiresPhoto: false },
    ]
  },
];

export interface ChecklistTemplate {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  items: ChecklistTemplateItem[];
  createdAt: string;
  updatedAt?: string;
}
export interface MaintenanceRecord {
  id: string;
  companyId: string;
  vehicleId: string;
  type: 'service' | 'repair' | 'mot' | 'inspection' | 'tire' | 'other';
  title: string;
  description: string;
  odometer?: number;
  cost?: number;
  workshop?: string;
  dueDate: string;
  completedAt?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue';
  createdAt: string;
}

export interface Document {
  id: string;
  companyId: string;
  vehicleId?: string;
  driverId?: string;
  type: 'mot' | 'insurance' | 'license' | 'tax' | 'other';
  fileName: string;
  fileUrl?: string;
  expiryDate?: string;
  uploadedAt: string;
}
export interface VehiclePosition {
  id: string; vehicleId: string; companyId: string;
  latitude: number; longitude: number; speed?: number; heading?: number;
  recordedAt: string;
}
export interface DriverScore {
  id: string; driverId: string; companyId: string;
  weekStart: string; overallScore: number;
  breakdown: { completeness: number; speed: number; defects: number; harshEvents: number };
  createdAt: string;
}
export interface Part {
  id: string; companyId: string; name: string;
  category: 'filter' | 'brake' | 'tire' | 'electrical' | 'engine' | 'body' | 'other';
  quantity: number; minStock: number; unitCost: number; supplier?: string; createdAt: string;
}
export interface WorkOrder {
  id: string; companyId: string; vehicleId: string; title: string;
  status: 'open' | 'in_progress' | 'awaiting_parts' | 'completed';
  defectId?: string; assignedMechanic?: string; laborHours?: number;
  partsUsed: { partId: string; partName: string; quantity: number }[];
  notes?: string; totalCost?: number; createdAt: string; completedAt?: string;
}
export interface FuelRecord {
  id: string;
  companyId: string;
  vehicleId: string;
  date: string;
  liters: number;
  costPerLiter: number;
  totalCost: number;
  odometer: number;
  fuelType: 'diesel' | 'petrol' | 'electric' | 'adblue';
  station: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  companyId: string;
  vehicleId: string;
  category: 'maintenance' | 'repair' | 'insurance' | 'tax' | 'toll' | 'parking' | 'fine' | 'other';
  amount: number;
  date: string;
  description: string;
  receiptUrl?: string;
  createdAt: string;
}
export interface AlertRule {
  id: string;
  companyId: string;
  trigger: 'defect_logged' | 'mot_expiring' | 'schedule_due' | 'vehicle_grounded';
  channel: 'email' | 'sms' | 'push';
  recipients: string[];
  enabled: boolean;
  createdAt: string;
}
export interface Announcement {
  id: string;
  companyId: string;
  title: string;
  content: string;
  important: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface ScheduledChecklist {
  id: string;
  companyId: string;
  title: string; // e.g., "Weekly Brake Audit" or "MOT Preparedness Check"
  vehicleId: string;
  dueDate: string; // YYYY-MM-DD
  status: 'pending' | 'completed' | 'overdue';
  driverId?: string;
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
  isRecurring?: boolean;
  dayOfWeek?: number; // 0-6 (Sun-Sat) for weekly
  dayOfMonth?: number; // 1-31 for monthly
  templateId?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  companyId: string;
  type: 'defect' | 'grounded' | 'quick_check' | 'mot_expiry' | 'plan_limit';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}


