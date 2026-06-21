import React, { useState, useRef, useEffect } from "react";
import { 
  Shield, Truck, AlertTriangle, CheckCircle, RefreshCw, X, Plus, 
  Search, Download, Users, Wrench, FileText, Check, Settings, 
  MapPin, Calendar, Clock, Lock, Trash2, Edit, AlertOctagon, Menu, ChevronDown, LogOut, ShieldCheck, ArrowRight, CreditCard, Eye, Filter
} from "lucide-react";
import { Vehicle, Driver, WalkaroundCheck, Defect, Company, Announcement, ScheduledChecklist, Notification as WalkSafeNotification, ChecklistTemplate, MaintenanceRecord, Document, AlertRule, FuelRecord, ExpenseRecord, Part, WorkOrder, VehiclePosition, DriverScore } from "../types";
import { generateDVSA_PDF } from "../utils/pdfGenerator";
import { isScheduleDueToday } from "../utils/scheduleUtils";
import SignaturePad from "./SignaturePad";

/* =========================================================
   Design: Institutional Minimalism
   Colors: surface #f9f9f7, card #FFFFFF, primary #000000,
           secondary-container #fea619, danger-red #DC2626,
           compliance-green #16A34A, plate-yellow #FFDE00,
           plate-blue #003399, border-subtle #E5E5E0
   Fonts: Inter (body), JetBrains Mono (data/plates)
   Sidebar: 240px fixed, dark bg, amber active indicator
   ========================================================= */

// ---- UK Number Plate Component ----
function UkPlate({ registration, size = "sm" }: { registration: string; size?: "sm" | "md" | "lg" }) {
  const textSize = size === "lg" ? "text-plate-text" : size === "md" ? "text-[16px]" : "text-[12px]";
  const plateH = size === "lg" ? "h-10" : size === "md" ? "h-8" : "h-6";
  const blueW = size === "lg" ? "w-3" : "w-2";
  return (
    <div className={`inline-flex items-center bg-plate-yellow rounded-sm border border-black/10 overflow-hidden uk-plate-shadow ${plateH}`}>
      <div className={`${blueW} bg-plate-blue flex flex-col items-center justify-center h-full shrink-0`}>
        <span className="text-[6px] text-white font-bold leading-none">GB</span>
      </div>
      <span className={`${textSize} font-plate-text text-black tracking-widest uppercase px-2 leading-none`}>
        {registration}
      </span>
    </div>
  );
}

// ---- Status Pill ----
function StatusPill({ label, color }: { label: string; color: "green" | "red" | "orange" | "amber" | "slate" }) {
  const styles = {
    green: "bg-compliance-green/10 text-compliance-green border border-compliance-green/20",
    red: "bg-danger-red/10 text-danger-red border border-danger-red/20",
    orange: "bg-major-defect-orange/10 text-major-defect-orange border border-major-defect-orange/20",
    amber: "bg-secondary-container/10 text-secondary border border-secondary-container/20",
    slate: "bg-surface-container text-on-surface-variant border border-border-subtle",
  };
  return (
    <span className={`px-2 py-1 rounded-full font-label-caps text-[10px] uppercase ${styles[color]}`}>
      {label}
    </span>
  );
}

// ---- Custom Select (Institutional Style) ----
function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select option..."
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOpt = options.find(o => o.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-white border border-border-subtle rounded px-3 py-2.5 text-body-md text-on-surface flex justify-between items-center hover:border-primary transition-all outline-hidden cursor-pointer"
      >
        <span className="truncate">{selectedOpt ? selectedOpt.label : placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-on-surface-variant shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      
      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-border-subtle shadow-lg z-[60] max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-body-md transition-colors hover:bg-surface-container flex items-center justify-between ${
                value === opt.value ? 'bg-secondary-container/10 text-primary font-bold' : 'text-on-surface-variant'
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {value === opt.value && <Check className="w-3.5 h-3.5 text-secondary-container shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Driver PIN Resetter ----
function DriverPinResetter({ driverId, onReset }: { driverId: string, onReset: (id: string, pin: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      alert("PIN must be exactly 4 digits.");
      return;
    }
    setSaving(true);
    const ok = await onReset(driverId, newPin);
    setSaving(false);
    if (ok) {
      setSuccess(true);
      setNewPin("");
      setTimeout(() => { setSuccess(false); setEditing(false); }, 1500);
    } else {
      alert("Could not update secure PIN. Please retry.");
    }
  };

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        className="w-full mt-3 py-1.5 px-3 border border-dashed border-border-subtle text-on-surface-variant hover:border-secondary-container hover:text-secondary-container rounded text-xs font-data-mono font-bold flex items-center justify-center gap-1.5 transition-all outline-hidden cursor-pointer">
        <Lock className="w-3 h-3 text-secondary-container" /> RESET DRIVER PIN
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-2.5 bg-surface-container-low border border-border-subtle rounded flex flex-col gap-1.5">
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[10px] uppercase font-bold text-on-surface-variant font-data-mono">Pin Configuration</span>
        <button type="button" onClick={() => setEditing(false)} className="text-on-surface-variant hover:text-danger-red text-[10px] font-bold font-data-mono px-1 cursor-pointer">Cancel</button>
      </div>
      <div className="flex gap-1.5">
        <input type="text" maxLength={4} required value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} placeholder="New PIN"
          className="flex-1 bg-white border border-border-subtle rounded px-2 py-1 text-on-surface text-xs font-data-mono font-bold tracking-wider text-center focus:outline-hidden focus:border-primary" />
        <button type="submit" disabled={saving}
          className="bg-secondary-container text-on-secondary-container font-bold text-[10px] px-2.5 py-1 rounded cursor-pointer font-data-mono tracking-wide hover:opacity-90 transition-opacity">
          {saving ? '...' : success ? 'UPDATED ✓' : 'SAVE'}
        </button>
      </div>
    </form>
  );
}

// ---- Announcement Publisher Form ----
function AnnouncementPublisherForm({ onSubmit }: { onSubmit: (data: any) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [important, setImportant] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !expiresAt) return;
    setSubmitting(true);
    try {
      await onSubmit({ title, content, important, expiresAt });
      setTitle(""); setContent(""); setImportant(false); setExpiresAt(""); setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (err) {}
    setSubmitting(false);
  };

  return (
    <form onSubmit={handlePublish} className="flex flex-col gap-3">
      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Create Broadcast Notice</span>
      <input type="text" required placeholder="Announcement Heading (e.g., M25 Delays)" value={title} onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-surface border border-border-subtle p-2.5 text-on-surface placeholder:text-outline/50 focus:outline-hidden focus:border-primary text-body-md rounded" />
      <textarea required rows={2} placeholder="Detail text to highlight on mobile devices..." value={content} onChange={(e) => setContent(e.target.value)}
        className="w-full bg-surface border border-border-subtle p-2.5 text-on-surface placeholder:text-outline/50 focus:outline-hidden focus:border-primary text-body-md rounded" />
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-on-surface-variant text-body-sm whitespace-nowrap">
            <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} className="rounded text-major-defect-orange accent-secondary-container" />
            High Importance
          </label>
          <button type="submit" disabled={submitting}
            className="bg-secondary-container text-on-secondary-container font-bold text-label-caps py-2 px-4 rounded hover:bg-secondary-fixed-dim transition-colors cursor-pointer disabled:opacity-50">
            {submitting ? 'Publishing...' : done ? 'Published ✓' : 'Publish Notice'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-on-surface-variant text-body-sm whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5" />
            <span>Expiry Date</span>
          </label>
          <input type="date" required value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
            className="bg-surface border border-border-subtle p-1.5 text-data-mono text-[11px] text-on-surface rounded focus:outline-hidden focus:border-primary" />
        </div>
      </div>
    </form>
  );
}

// ---- Checklist Scheduler Form ----
function ChecklistSchedulerForm({ vehicles, drivers, templates, onSubmit }: { vehicles: Vehicle[]; drivers: Driver[]; templates?: ChecklistTemplate[]; onSubmit: (data: any) => Promise<void> }) {
  const [title, setTitle] = useState("Mandated Weekly Compliance Audit");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [dueDate, setDueDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !vehicleId) { alert("Please choose a target vehicle and checklist title."); return; }
    setSubmitting(true);
    try {
      await onSubmit({ title, vehicleId, dueDate, driverId: driverId || undefined, frequency: isRecurring ? frequency : "once", isRecurring, templateId: templateId || undefined,
        dayOfWeek: isRecurring && frequency === 'weekly' ? new Date(dueDate).getDay() : undefined, dayOfMonth: isRecurring && frequency === 'monthly' ? new Date(dueDate).getDate() : undefined });
      setTitle("Mandated Weekly Compliance Audit"); setVehicleId(""); setDriverId(""); setIsRecurring(false); setFrequency("once"); setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (err) {}
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Plan & Schedule Checklist Tasks</span>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Checklist Audit Title</label>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekly Brake Audit"
            className="w-full bg-surface border border-border-subtle p-2.5 text-on-surface placeholder:text-outline/50 focus:outline-hidden focus:border-primary text-body-md rounded" />
        </div>
        <div>
          <label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Target Vehicle</label>
          <CustomSelect value={vehicleId} onChange={(val) => setVehicleId(val)} placeholder="-- Choose a vehicle --" options={vehicles.map(v => ({ value: v.id, label: `${v.registration} (${v.make})` }))} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Assigned Driver</label>
          <CustomSelect value={driverId} onChange={(val) => setDriverId(val)} placeholder="-- Any Driver --" options={drivers.map(d => ({ value: d.id, label: d.fullName }))} />
        </div>
        <div>
          <label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Initial Due Date</label>
          <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="w-full bg-surface border border-border-subtle p-2.5 rounded text-data-mono text-on-surface focus:outline-hidden" />
        </div>
      </div>
      <div>
        <label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Checklist Template</label>
        <CustomSelect value={templateId} onChange={(val) => setTemplateId(val)} placeholder="-- DVSA 27-Point Standard (Default) --" options={[
          { value: '', label: 'DVSA 27-Point Walkaround' },
          ...templates.filter(t => t.id !== 'tpl-dvsa-default').map(t => ({ value: t.id, label: t.name }))
        ]} />
      </div>
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-3 bg-surface-container-low border border-border-subtle rounded">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={isRecurring} onChange={(e) => { setIsRecurring(e.target.checked); if (e.target.checked && frequency === 'once') setFrequency('weekly'); }}
            className="w-4 h-4 rounded text-secondary-container accent-secondary-container border-border-subtle" />
          <div>
            <span className="font-bold text-on-surface text-body-sm block text-left">Create Recurring Schedule</span>
            <span className="text-[11px] text-on-surface-variant text-left block">Re-queue automatically</span>
          </div>
        </label>
        {isRecurring && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-on-surface-variant font-data-mono">Frequency:</span>
            <div className="w-32">
              <CustomSelect value={frequency} onChange={(val) => setFrequency(val as any)} options={[{ value: 'daily', label: 'Every Day' }, { value: 'weekly', label: 'Every Week' }, { value: 'monthly', label: 'Every Month' }]} />
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end mt-1">
        <button type="submit" disabled={submitting}
          className="bg-primary text-on-primary font-label-caps text-label-caps py-2 px-5 hover:opacity-90 disabled:opacity-50 font-bold cursor-pointer transition-all">
          {submitting ? 'Scheduling...' : done ? 'Scheduled ✓' : 'Create Compliance Schedule'}
        </button>
      </div>
    </form>
  );
}

/* =========================================================
   MAIN MANAGER DASHBOARD COMPONENT
   ========================================================= */

interface ManagerDashboardProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  company: Company;
  checks: WalkaroundCheck[];
  defects: Defect[];
  announcements: Announcement[];
  schedules: ScheduledChecklist[];
  notifications: WalkSafeNotification[];
  templates?: ChecklistTemplate[];
  onAddVehicle: (veh: any) => Promise<void>;
  onAddDriver: (drv: any) => Promise<void>;
  onUpdateDriver?: (driverId: string, drvPayload: Partial<Driver>) => Promise<void>;
  onDeleteDriver?: (driverId: string) => Promise<void>;
  onUpdateVehicle?: (vehicleId: string, vehPayload: Partial<Vehicle>) => Promise<void>;
  onDeleteVehicle?: (vehicleId: string) => Promise<void>;
  onCloseDefect: (defectId: string, repairLog: any) => Promise<void>;
  onUpdateCompany: (compData: any) => Promise<void>;
  onAddAnnouncement: (ann: any) => Promise<void>;
  onAddSchedule: (sch: any) => Promise<void>;
  onSaveTemplate?: (id: string | null, tpl: any) => Promise<boolean>;
  onDeleteTemplate?: (id: string) => Promise<boolean>;
  onResetDriverPin: (driverId: string, pin: string) => Promise<boolean>;
  onMarkNotificationsAsRead: () => Promise<void>;
  onTriggerRefresh: () => void;
  onLogOutWorkspace?: () => void;


      
}

export default function ManagerDashboard({
  vehicles, drivers, company, checks, defects, announcements, schedules, notifications, templates = [],
  onAddVehicle, onAddDriver, onUpdateDriver, onDeleteDriver, onUpdateVehicle, onDeleteVehicle,
  onCloseDefect, onUpdateCompany, onAddAnnouncement, onAddSchedule, onSaveTemplate, onDeleteTemplate, onResetDriverPin,
  onMarkNotificationsAsRead, onTriggerRefresh, onLogOutWorkspace
}: ManagerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'vehicles' | 'drivers' | 'defects' | 'records' | 'settings' | 'schedules' | 'billing' | 'templates'>('overview');
  
  // Plan-based feature gating
  const planTier = company.plan || 'starter';
  const allowedTabs: Record<string, string[]> = {
    'solo': ['overview', 'defects', 'vehicles', 'drivers', 'templates', 'billing', 'settings'],
    'owner-driver': ['overview', 'vehicles', 'drivers', 'defects', 'records', 'templates', 'settings', 'billing'],
    'starter': ['overview', 'vehicles', 'drivers', 'defects', 'records', 'operations', 'schedules', 'templates', 'settings', 'billing'],
    'growth': ['overview', 'analytics', 'fleetmap', 'vehicles', 'maintenance', 'fuel', 'parts', 'workorders', 'schedules', 'defects', 'records', 'operations', 'drivers', 'templates', 'billing', 'settings'],
    'enterprise': ['overview', 'analytics', 'fleetmap', 'vehicles', 'maintenance', 'fuel', 'parts', 'workorders', 'schedules', 'defects', 'records', 'operations', 'drivers', 'templates', 'billing', 'settings'],
  };
  const myTabs = allowedTabs[planTier] || allowedTabs['starter'];
  const guardedSetTab = (tab: string) => {
    if (myTabs.includes(tab)) {
      setActiveTab(tab as any);
    } else {
      alert(`This feature requires the Growth plan or higher. Please upgrade from Billing & Plans.`);
    }
  };
  const isTabAllowed = (tabId: string) => myTabs.includes(tabId);
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [publishTemplates, setPublishTemplates] = useState<{name:string;desc:string;selected:boolean}[]>([]);
  const [showTour, setShowTour] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  useEffect(() => { const id = setInterval(() => { try { setCurrentTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })); } catch(e) {} }, 1000); return () => clearInterval(id); }, []);
  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })), 1000); return () => clearInterval(t); }, []);
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Add Vehicle modal state
  const [showVehModal, setShowVehModal] = useState(false);
  const [showSchModal, setShowSchModal] = useState(false);
  const [vehReg, setVehReg] = useState("");
  const [vehMake, setVehMake] = useState("");
  const [vehModel, setVehModel] = useState("");
  const [vehYear, setVehYear] = useState(2021);
  const [vehColour, setVehColour] = useState("White");
  const [vehType, setVehType] = useState<'lgv' | 'hgv' | 'hgv_trailer'>('lgv');
  const [vehMot, setVehMot] = useState("");
  const [vehTax, setVehTax] = useState("");
  const [assignedDriverId, setAssignedDriverId] = useState("");
  const [dvlaLoading, setDvlaLoading] = useState(false);
  const [dvlaSuccess, setDvlaSuccess] = useState(false);
  const [dvlaError, setDvlaError] = useState("");

  // Add Driver modal state
  const [showDrvModal, setShowDrvModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isSavingDriver, setIsSavingDriver] = useState(false);
  const [drvInviteToken, setDrvInviteToken] = useState("");
  const [drvName, setDrvName] = useState("");
  const [drvEmail, setDrvEmail] = useState("");
  const [drvPhone, setDrvPhone] = useState("");
  const [drvPin, setDrvPin] = useState("");
  const [drvStep, setDrvStep] = useState(1);
  const [drvDefaultVeh, setDrvDefaultVeh] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");

  // Edit states
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);

  // QR Code Modal
  const [qrCodeModalLink, setQrCodeModalLink] = useState<string | null>(null);
  const [qrCodeModalDriverName, setQrCodeModalDriverName] = useState<string | null>(null);

  // Engineer repair modal
  const [repairingDefectId, setRepairingDefectId] = useState<string | null>(null);
  const [repairNotes, setRepairNotes] = useState("");
  const [repairParts, setRepairParts] = useState("");
  const [engineerName, setEngineerName] = useState("Dave Briggs (Mechanic)");
  const [engineerSignature, setEngineerSignature] = useState("");

  // Defect gallery filters
  const [defectViewMode, setDefectViewMode] = useState<'list' | 'gallery' | 'kanban'>('gallery');
  const [gallerySeverityFilter, setGallerySeverityFilter] = useState<'all' | 'dangerous' | 'major' | 'minor'>('all');
  const [galleryStatusFilter, setGalleryStatusFilter] = useState<'all' | 'open' | 'in_repair' | 'closed'>('all');
  const [selectedGalleryDefect, setSelectedGalleryDefect] = useState<Defect | null>(null);

  // Date range filter for compliance log
  const [reportDateFrom, setReportDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [reportDateTo, setReportDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Company settings
  const [compName, setCompName] = useState(company.name);
  const [compEmail, setCompEmail] = useState(company.email || "");
  const [compPassword, setCompPassword] = useState(company.managerPassword || "");
  const [compLicence, setCompLicence] = useState(company.oLicence || "");
  const [compLogo, setCompLogo] = useState<string>(company.logoUrl || "");
  const [compLogoSaving, setCompLogoSaving] = useState(false);
  const [minLgv, setMinLgv] = useState<number>(company.minDurationLgv !== undefined ? company.minDurationLgv : 5);
  const [minHgv, setMinHgv] = useState<number>(company.minDurationHgv !== undefined ? company.minDurationHgv : 10);
  const [minHgvTrailer, setMinHgvTrailer] = useState<number>(company.minDurationHgvTrailer !== undefined ? company.minDurationHgvTrailer : 15);
  const [compSavedMsg, setCompSavedMsg] = useState(false);
  const [compErrorMsg, setCompErrorMsg] = useState("");

  // Push Notification
  const hasSupport = typeof window !== 'undefined' && 'Notification' in window;
  const [notifPermission, setNotifPermission] = useState<string>(hasSupport ? Notification.permission : 'denied');

  const requestPermission = async () => {
    if (!hasSupport) { alert("Browser does not support desktop notifications."); return; }
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    if (result === 'granted') {
      alert("System notifications allowed!");
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(async (reg) => {
          try {
            const keyRes = await fetch("/api/push/public-key");
            if (keyRes.ok) {
              const { publicKey } = await keyRes.json();
              if (publicKey) {
                const urlBase64ToUint8Array = (base64String: string) => {
                  const padding = '='.repeat((4 - base64String.length % 4) % 4);
                  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
                  const rawData = window.atob(base64);
                  const outputArray = new Uint8Array(rawData.length);
                  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
                  return outputArray;
                };
                const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
                await fetch("/api/push/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: company.id, subscription: sub }) });
                alert("Device registered to receive system-wide alerts!");
              }
            }
          } catch (e) { console.error("SW subscribe error:", e); }
        });
      }
    }
  };

  const [viewingCheck, setViewingCheck] = useState<WalkaroundCheck | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    DASHBOARD: true, FLEET: true, COMPLIANCE: true, CONFIG: true
  });
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSyncData = () => {
    setSyncing(true);
    setTimeout(() => { onTriggerRefresh(); setSyncing(false); }, 600);
  };

  // Billing states
  const [planSwitching, setPlanSwitching] = useState(false);

  // Maintenance state
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [maintVeh, setMaintVeh] = useState('');
  const [maintType, setMaintType] = useState('service');
  const [maintTitle, setMaintTitle] = useState('');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintDue, setMaintDue] = useState('');
  const [maintOdo, setMaintOdo] = useState(0);
  const [maintCost, setMaintCost] = useState(0);
  const [maintWorkshop, setMaintWorkshop] = useState('');
  const [docVeh, setDocVeh] = useState('');
  const [docType, setDocType] = useState('other');
  const [docName, setDocName] = useState('');
  const [docExpiry, setDocExpiry] = useState('');

  const loadMaint = async () => {
    try {
      const [mRes, dRes] = await Promise.all([
        fetch('/api/maintenance', { headers: { 'X-Company-Id': company.id } }),
        fetch('/api/documents', { headers: { 'X-Company-Id': company.id } })
      ]);
      if (mRes.ok) setMaintenanceRecords(await mRes.json());
      if (dRes.ok) setDocs(await dRes.json());
    } catch (e) { console.warn('Failed to load maintenance/docs', e); }
  };

  useEffect(() => { loadMaint(); }, [company.id, onTriggerRefresh]);

  const handleSaveMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintVeh || !maintTitle) { alert('Vehicle and title required.'); return; }
    const res = await fetch('/api/maintenance', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Company-Id': company.id },
      body: JSON.stringify({ vehicleId: maintVeh, type: maintType, title: maintTitle, description: maintDesc, dueDate: maintDue, odometer: maintOdo, cost: maintCost, workshop: maintWorkshop, status: 'scheduled' })
    });
    if (res.ok) { setShowMaintModal(false); loadMaint(); }
    else alert('Failed to save');
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName) { alert('Document name required.'); return; }
    const res = await fetch('/api/documents', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Company-Id': company.id },
      body: JSON.stringify({ vehicleId: docVeh || undefined, type: docType, fileName: docName, expiryDate: docExpiry || undefined })
    });
    if (res.ok) { setShowDocModal(false); loadDocs(); }
    else alert('Failed to save');
  };

  const loadDocs = async () => {
    try {
      const res = await fetch('/api/documents', { headers: { 'X-Company-Id': company.id } }); 
      if (res.ok) setDocs(await res.json());
    } catch (e) {}
  };

  // Fleet Map & Driver Scores state
  const [vehiclePositions, setVehiclePositions] = useState<VehiclePosition[]>([]);
  const [driverScores, setDriverScores] = useState<any[]>([]);

  const loadPositions = async () => {
    try { const res = await fetch('/api/positions/latest', { headers: { 'X-Company-Id': company.id } }); if (res.ok) setVehiclePositions(await res.json()); } catch (e) {}
  };
  const loadDriverScores = async () => {
    try { const res = await fetch('/api/driver-scores', { headers: { 'X-Company-Id': company.id } }); if (res.ok) setDriverScores(await res.json()); } catch (e) {}
  };
  useEffect(() => { loadPositions(); loadDriverScores(); }, [company.id, onTriggerRefresh]);

  // Parts & Work Orders state
  const [parts, setParts] = useState<Part[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showWOModal, setShowWOModal] = useState(false);
  const [partName, setPartName] = useState('');
  const [partCat, setPartCat] = useState('other');
  const [partQty, setPartQty] = useState(0);
  const [partMin, setPartMin] = useState(0);
  const [partCost, setPartCost] = useState(0);
  const [partSupplier, setPartSupplier] = useState('');
  const [woVeh, setWoVeh] = useState('');
  const [woTitle, setWotitle] = useState('');
  const [woMech, setWoMech] = useState('');
  const [woNotes, setWonotes] = useState('');
  const [woDefect, setWoDefect] = useState('');

  const loadPartsAndWOs = async () => {
    try {
      const [pRes, wRes] = await Promise.all([
        fetch('/api/parts', { headers: { 'X-Company-Id': company.id } }),
        fetch('/api/work-orders', { headers: { 'X-Company-Id': company.id } })
      ]);
      if (pRes.ok) setParts(await pRes.json());
      if (wRes.ok) setWorkOrders(await wRes.json());
    } catch (e) { console.warn('Parts/WO load failed', e); }
  };
  useEffect(() => { loadPartsAndWOs(); }, [company.id, onTriggerRefresh]);

  const handleSavePart = async (e: React.FormEvent) => {
    e.preventDefault(); if (!partName) { alert('Part name required.'); return; }
    const res = await fetch('/api/parts', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Company-Id': company.id }, body: JSON.stringify({ name: partName, category: partCat, quantity: partQty, minStock: partMin, unitCost: partCost, supplier: partSupplier }) });
    if (res.ok) { setShowPartModal(false); loadPartsAndWOs(); }
  };

  const handleSaveWO = async (e: React.FormEvent) => {
    e.preventDefault(); if (!woVeh || !woTitle) { alert('Vehicle and title required.'); return; }
    const res = await fetch('/api/work-orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Company-Id': company.id }, body: JSON.stringify({ vehicleId: woVeh, title: woTitle, assignedMechanic: woMech, notes: woNotes, defectId: woDefect || undefined }) });
    if (res.ok) { setShowWOModal(false); loadPartsAndWOs(); }
  };

  const handleWOStatus = async (woId: string, status: string) => {
    const res = await fetch(`/api/work-orders/${woId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Company-Id': company.id }, body: JSON.stringify({ status }) });
    if (res.ok) loadPartsAndWOs();
  };
  // Fuel & Expenses state
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [fuelVeh, setFuelVeh] = useState('');
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelLiters, setFuelLiters] = useState(0);
  const [fuelCostL, setFuelCostL] = useState(0);
  const [fuelTotal, setFuelTotal] = useState(0);
  const [fuelOdo, setFuelOdo] = useState(0);
  const [fuelType, setFuelType] = useState('diesel');
  const [fuelStation, setFuelStation] = useState('');
  const [showExpModal, setShowExpModal] = useState(false);
  const [expVeh, setExpVeh] = useState('');
  const [expCat, setExpCat] = useState('other');
  const [expAmt, setExpAmt] = useState(0);
  const [expDesc, setExpDesc] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);

  const loadFuelData = async () => {
    try {
      const [fRes, eRes] = await Promise.all([
        fetch('/api/fuel', { headers: { 'X-Company-Id': company.id } }),
        fetch('/api/expenses', { headers: { 'X-Company-Id': company.id } })
      ]);
      if (fRes.ok) setFuelRecords(await fRes.json());
      if (eRes.ok) setExpenses(await eRes.json());
    } catch (e) { console.warn('Fuel data load failed', e); }
  };
  useEffect(() => { loadFuelData(); }, [company.id, onTriggerRefresh]);

  const handleSaveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelVeh || !fuelLiters) { alert('Vehicle and liters required.'); return; }
    const res = await fetch('/api/fuel', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Company-Id': company.id },
      body: JSON.stringify({ vehicleId: fuelVeh, date: fuelDate, liters: fuelLiters, costPerLiter: fuelCostL, totalCost: fuelTotal, odometer: fuelOdo, fuelType, station: fuelStation })
    });
    if (res.ok) { setShowFuelModal(false); loadFuelData(); }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expVeh || !expAmt) { alert('Vehicle and amount required.'); return; }
    const res = await fetch('/api/expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Company-Id': company.id },
      body: JSON.stringify({ vehicleId: expVeh, date: expDate, category: expCat, amount: expAmt, description: expDesc })
    });
    if (res.ok) { setShowExpModal(false); loadFuelData(); }
  };

  // Alert rules state
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const loadAlertRules = async () => {
    try { const res = await fetch('/api/alert-rules', { headers: { 'X-Company-Id': company.id } }); if (res.ok) setAlertRules(await res.json()); } catch (e) {}
  };
  useEffect(() => { loadAlertRules(); }, [company.id, onTriggerRefresh]);

  const handleToggleAlertRule = async (ruleId: string, enabled: boolean) => {
    await fetch(`/api/alert-rules/${ruleId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Company-Id': company.id }, body: JSON.stringify({ enabled: !enabled }) });
    loadAlertRules();
  };

  const handleAddAlertRule = async (trigger: string) => {
    await fetch('/api/alert-rules', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Company-Id': company.id }, body: JSON.stringify({ trigger, recipients: [compEmail || 'admin@example.com'] }) });
    loadAlertRules();
  };

  const handleDeleteAlertRule = async (ruleId: string) => {
    await fetch(`/api/alert-rules/${ruleId}`, { method: 'DELETE', headers: { 'X-Company-Id': company.id } });
    loadAlertRules();
  };

  // Template builder state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateItems, setTemplateItems] = useState<{ key: string; label: string; group: string; guidance: string; requiresTrailer: boolean }[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName || templateItems.length === 0) {
      alert("Template Name and at least one inspection item are required.");
      return;
    }
    setSavingTemplate(true);
    const payload = {
      name: templateName,
      description: templateDesc,
      items: templateItems
    };

    if (onSaveTemplate) {
      const success = await onSaveTemplate(editingTemplate ? editingTemplate.id : null, payload);
      if (success) {
        setShowTemplateModal(false);
        setEditingTemplate(null);
        setTemplateName('');
        setTemplateDesc('');
        setTemplateItems([]);
      } else {
        alert("Compliance error: Could not save the custom checklist template. Please verify your connection.");
      }
    } else {
      // Fallback for direct API use if prop is missing
      try {
        const method = editingTemplate ? 'PUT' : 'POST';
        const url = editingTemplate ? `/api/templates/${editingTemplate.id}` : '/api/templates';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', 'X-Company-Id': company.id },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setShowTemplateModal(false);
          onTriggerRefresh();
        } else {
          alert("Failed to save template.");
        }
      } catch (err) {
        alert("Failed to save template.");
      }
    }
    setSavingTemplate(false);
  };


  const mockInvoices = [
    { invoiceId: "INV-2026-004", issueDate: "01/06/2026", amount: company.plan === "owner-driver" ? "£4.99" : company.plan === "starter" ? "£14.99" : company.plan === "growth" ? "£34.99" : "POA", planName: company.plan === "owner-driver" ? "SOLO" : company.plan === "starter" ? "STARTER" : company.plan === "growth" ? "GROWTH PRO" : "ENTERPRISE", paymentMethod: "4242", status: "PAID" },
    { invoiceId: "INV-2026-003", issueDate: "01/05/2026", amount: company.plan === "owner-driver" ? "£4.99" : "£14.99", planName: company.plan === "owner-driver" ? "SOLO" : "STARTER", paymentMethod: "4242", status: "PAID" },
    { invoiceId: "INV-2026-002", issueDate: "01/04/2026", amount: company.plan === "owner-driver" ? "£4.99" : "£14.99", planName: company.plan === "owner-driver" ? "SOLO" : "STARTER", paymentMethod: "4242", status: "PAID" },
    { invoiceId: "INV-2026-001", issueDate: "01/03/2026", amount: company.plan === "owner-driver" ? "£4.99" : "£14.99", planName: company.plan === "owner-driver" ? "SOLO" : "STARTER (TRIAL)", paymentMethod: "4242", status: "PAID" }
  ];

  const handlePlanUpgrade = async (newPlan: string, maxVehicles: number) => {
    if (newPlan === "enterprise") { window.location.href = "mailto:support@getwalksafe.co.uk?subject=WalkSafe%20Enterprise%20Fleet%20Inquiry"; return; }
    setPlanSwitching(true);
    try {
      const planMap: Record<string, { priceId: string; name: string }> = {
        'owner-driver': { priceId: 'pri_01kv3ad64hkb1f6gpjxa5av4mx', name: 'Solo Operator' },
        'starter': { priceId: 'pri_01kv3bhykfmhk0m61g7r2tv1vt', name: 'Starter Fleet' },
        'growth': { priceId: 'pri_01kv3ap1zk2vszmaj822vppyj2', name: 'Growth Fleet' },
      };
      const planInfo = planMap[newPlan];
      if (!planInfo) { alert('Invalid plan'); setPlanSwitching(false); return; }
      const P = (window as any).Paddle;
      if (P && P.Checkout) {
        P.Checkout.open({
          items: [{ priceId: planInfo.priceId, quantity: 1 }],
          customer: { email: company.email || '' },
          customData: { userId: company.id, plan: newPlan, vehicle_limit: String(maxVehicles) },
          settings: { 
            successUrl: window.location.origin + '/?payment_success=true&plan=' + newPlan + '&limit=' + maxVehicles,
            theme: 'light'
          }
        });
      } else {
        alert('Payment system loading. Please try again.');
      }
    } catch (err: any) { alert(`Payment failed: ${err.message}`); }
    finally { setPlanSwitching(false); }
  };

  const triggerDownloadInvoice = async (inv: any) => {
    try {
      const { generateInvoicePDF } = await import("../utils/invoiceGenerator");
      const doc = generateInvoicePDF(company, inv);
      doc.save(`WalkSafe_Invoice_${inv.invoiceId}.pdf`);
    } catch (e) { alert("Error building client invoice statement."); }
  };

  // DVLA Lookup
  const handleDvlaLookup = async () => {
    if (!vehReg) { setDvlaError("Please enter a valid UK registration number."); return; }
    setDvlaLoading(true); setDvlaError(""); setDvlaSuccess(false);
    try {
      const response = await fetch(`/api/dvla-lookup/${vehReg.trim().toUpperCase()}`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || "Could not locate vehicle details."); }
      const data = await response.json();
      setVehMake(data.make); setVehModel(data.model); setVehYear(data.year); setVehColour(data.colour);
      setVehType(data.type); setVehMot(data.motExpiry); setVehTax(data.taxExpiry);
      setDvlaSuccess(true);
    } catch (err: any) { setDvlaError(err.message || "DVLA lookup failed."); }
    finally { setDvlaLoading(false); }
  };

  // Save Vehicle
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingVehicle) return;
    setIsSavingVehicle(true);
    try {
      const payload = { registration: vehReg, make: vehMake, model: vehModel, year: vehYear, colour: vehColour, type: vehType, motExpiry: vehMot, taxExpiry: vehTax };
      if (editingVehicle) { if (onUpdateVehicle) await onUpdateVehicle(editingVehicle.id, payload); }
      else {
        if (vehicles.length >= company.vehicleLimit) { alert(`Active Plan Limit Reached! Maximum ${company.vehicleLimit} vehicles.`); setIsSavingVehicle(false); return; }
        await onAddVehicle(payload);
      }
      setShowVehModal(false); resetVehForm();
    } catch (err) { alert("Failed to save. Duplicate registration detected."); }
    finally { setIsSavingVehicle(false); }
  };

  const resetVehForm = () => {
    setVehReg(""); setVehMake(""); setVehModel(""); setVehYear(2021); setVehColour("White");
    setVehType("lgv"); setVehMot(""); setVehTax(""); setDvlaSuccess(false); setDvlaError(""); setEditingVehicle(null);
  };

  // Save Driver
  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (drvPin.length !== 4) { alert("Driver login PIN must be exactly 4-digits."); return; }
    if (isSavingDriver) return;
    setIsSavingDriver(true);
    try {
      const payload = { fullName: drvName, email: drvEmail, phone: drvPhone, pin: drvPin, defaultVehicleId: drvDefaultVeh || undefined, installToken: drvInviteToken || undefined };
      if (editingDriver) { if (onUpdateDriver) await onUpdateDriver(editingDriver.id, payload); }
      else await onAddDriver(payload);
      setShowDrvModal(false); resetDrvForm();
    } catch (err: any) { console.error(err); alert(err.message || "Failed to save driver."); }
    finally { setIsSavingDriver(false); }
  };

  const generateDriverLinkPlaceholder = () => {
    const token = Math.random().toString(36).substr(2, 9);
    setDrvInviteToken(token); setGeneratedLink(`https://app.getwalksafe.co.uk/join/${token}`);
  };

  const resetDrvForm = () => {
    setDrvName(""); setDrvEmail(""); setDrvPhone(""); setDrvPin(""); setDrvDefaultVeh("");
    setDrvInviteToken(""); setGeneratedLink(""); setEditingDriver(null);
  };

  // Commit Repair
  const handleRepairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repairingDefectId || !engineerSignature) { alert("Engineer compliance signature is required."); return; }
    try {
      await onCloseDefect(repairingDefectId, { engineerName, repairDescription: repairNotes, partsUsed: repairParts, engineerSignature });
      // Auto-create work order from repair
      try {
        const vehId = defects.find(d => d.id === repairingDefectId)?.vehicleId;
        if (vehId) {
          await fetch('/api/work-orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Company-Id': company.id }, body: JSON.stringify({ vehicleId: vehId, title: repairNotes?.substring(0, 50) || 'Repair: ' + repairParts, assignedMechanic: engineerName, notes: repairNotes, status: 'completed', partsUsed: repairParts ? [{ partId: '', partName: repairParts, quantity: 1 }] : [] }) });
        }
      } catch (e) { console.warn('Auto WO creation failed', e); }
      loadPartsAndWOs();
      setRepairingDefectId(null); setRepairNotes(""); setRepairParts(""); setEngineerSignature("");
    } catch (err) { console.error(err); }
  };

  // Save Company
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault(); setCompErrorMsg("");
    try {
      await onUpdateCompany({ name: compName, email: compEmail, managerPassword: compPassword, oLicence: compLicence, logoUrl: compLogo, minDurationLgv: Number(minLgv), minDurationHgv: Number(minHgv), minDurationHgvTrailer: Number(minHgvTrailer) });
      setCompSavedMsg(true); setTimeout(() => setCompSavedMsg(false), 2000);
    } catch (err: any) { setCompErrorMsg(err.message || "Failed to save settings."); }
  };

  // PDF Download
  const triggerPdfDownload = (check: WalkaroundCheck) => {
    const veh = (vehicles && vehicles.length > 0) ? (vehicles.find(v => v.id === check.vehicleId) || vehicles[0]) : null;
    const drv = (drivers && drivers.length > 0) ? (drivers.find(d => d.id === check.driverId) || drivers[0]) : null;
    const relatedDefs = defects ? defects.filter(df => df.checkId === check.id) : [];
    const doc = generateDVSA_PDF(check, veh!, drv!, company, relatedDefs);
    const regLabel = veh ? veh.registration : "UNKNOWN";
    const dateLabel = check ? check.checkDate : new Date().toISOString().split('T')[0];
    doc.save(`WalkSafe_Compliance_${regLabel}_${dateLabel}.pdf`);
  };

        // Consolidated multi-day PDF download - stacks each check's full DVSA report natively in one document
  const triggerConsolidatedPdfDownload = async () => {
    const filtered = checks.filter(c => {
      const d = c.checkDate || c.startedAt?.split('T')[0] || '';
      return d >= reportDateFrom && d <= reportDateTo;
    }).sort((a, b) => ((a.checkDate || a.createdAt) > (b.checkDate || b.createdAt) ? 1 : -1));

    if (filtered.length === 0) {
      alert('No compliance records found in the selected date range.');
      return;
    }

    // Generate each check's report stacked into one document using native page appending
    let consolidatedDoc: any = null;
    for (let i = 0; i < filtered.length; i++) {
      const check = filtered[i];
      const veh = vehicles.find(v => v.id === check.vehicleId);
      const drv = drivers.find(d => d.id === check.driverId);
      const relatedDefs = defects ? defects.filter(df => df.checkId === check.id) : [];
      try {
        if (i === 0) {
          // First check creates the base document
          consolidatedDoc = generateDVSA_PDF(check, veh!, drv!, company, relatedDefs);
        } else {
          // Subsequent checks append pages to the same document
          generateDVSA_PDF(check, veh!, drv!, company, relatedDefs, consolidatedDoc);
        }
      } catch(e) {
        console.warn('Could not generate PDF for check', check.id, e);
      }
    }
    if (consolidatedDoc) {
      consolidatedDoc.save('WalkSafe_Consolidated_' + reportDateFrom + '_to_' + reportDateTo + '.pdf');
    }
  };

  // Core Metrics
  const completedToday = checks.filter(c => c.checkDate === new Date().toISOString().split('T')[0]).length;
  const groundedCount = vehicles.filter(v => v.isActive && v.isGrounded).length;
  const activeDefectsCount = defects.filter(d => d.status !== 'closed').length;
  const outstandingChecks = Math.max(0, vehicles.length - completedToday);

  const calcComplianceScore = () => {
    let safetyRating = 100;
    const openDefs = defects.filter(d => d.status !== 'closed');
    openDefs.forEach(d => { if (d.severity === 'dangerous') safetyRating -= 25; else if (d.severity === 'major') safetyRating -= 10; else if (d.severity === 'minor') safetyRating -= 5; });
    const quickAlerts = checks.filter(c => c.quickCheckAlert).length;
    safetyRating -= (quickAlerts * 8);
    const todayStr = new Date().toISOString().split('T')[0];
    vehicles.forEach(v => { if (v.motExpiry < todayStr) safetyRating -= 15; if (v.taxExpiry < todayStr) safetyRating -= 15; });
    return Math.max(5, Math.min(100, safetyRating));
  };

  const complianceScore = calcComplianceScore();

  const filteredSchedules = (schedules || []).filter(s => {
    if (scheduleFilter === 'all') return true;
    return s.status === scheduleFilter;
  });


  return (
    <div className="flex-1 flex flex-col bg-background h-screen font-body-md text-on-surface relative md:pl-sidebar-width">
      
      {/* ===== SIDEBAR ===== */}
      <aside className={`fixed inset-y-0 left-0 w-sidebar-width bg-[#0f172a] flex flex-col border-r border-[#2a2a30] z-50 transition-transform duration-300 md:translate-x-0 ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        {/* Logo Section */}
        <div className="px-6 py-8 flex flex-col gap-1">
          <div className="flex items-center gap-3">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt={company.name} className="h-10 w-auto max-w-[120px] object-contain" />
            ) : (
              <>
                <div className="w-8 h-8 bg-secondary-container flex items-center justify-center rounded-sm">
                  <Shield className="w-5 h-5 text-primary font-bold" />
                </div>
                <div>
                  <h1 className="font-headline-md text-headline-md font-bold text-white leading-tight">WalkSafe</h1>
                  <p className="font-label-caps text-label-caps text-zinc-400">Fleet Management</p>
                </div>
              </>
            )}
            <button onClick={() => setMobileMenuOpen(false)} className="md:hidden ml-auto p-1 text-zinc-400 hover:text-on-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-6">
            <span className="px-3 py-1 bg-secondary-container/15 border border-secondary-container/25 text-secondary-container font-label-caps text-[10px] rounded">
              DVSA Mode Active
            </span>
          </div>
        </div>

        {/* Navigation */}
                <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {(() => {
            const sections = [
              { name: 'DASHBOARD', icon: 'dashboard', items: [
                { id: 'overview', label: "Today's Overview" },
                { id: 'analytics', label: 'Analytics' },
                { id: 'fleetmap', label: 'Fleet Map' },
              ]},
              { name: 'FLEET', icon: 'local_shipping', items: [
                { id: 'vehicles', label: 'Vehicle Fleet' },
                { id: 'maintenance', label: 'Maintenance' },
                { id: 'fuel', label: 'Fuel & Costs' },
                { id: 'parts', label: 'Parts' },
                { id: 'workorders', label: 'Work Orders' },
              ]},
              { name: 'COMPLIANCE', icon: 'verified', items: [
                { id: 'schedules', label: 'Compliance Schedules' },
                { id: 'defects', label: 'Defect Triage' },
                { id: 'records', label: 'Compliance Log' },
                { id: 'operations', label: 'Operations & Comms' },
                { id: 'drivers', label: 'Drivers & PINs' },
              ]},
              { name: 'CONFIG', icon: 'settings', items: [
                { id: 'templates', label: 'Templates' },
                { id: 'billing', label: 'Billing & Plans' },
                { id: 'settings', label: 'Settings' },
              ]},
            ];
            return sections.map(section => {
              const allowedItems = section.items.filter(it => isTabAllowed(it.id));
              if (allowedItems.length === 0) return null;
              return (
              <div key={section.name} className="mb-1">
                <button
                  onClick={() => toggleSection(section.name)}
                  className="w-full flex items-center justify-between px-4 py-2 text-left transition-colors text-zinc-400 hover:text-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[18px]">{section.icon}</span>
                    <span className="font-label-caps text-[9px] tracking-[0.15em] uppercase">{section.name}</span>
                  </div>
                  <span className="material-symbols-outlined text-[16px] transition-transform duration-200" style={{ transform: expandedSections[section.name] ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                </button>
                {expandedSections[section.name] && allowedItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { guardedSetTab(item.id); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200 text-left ${
                      activeTab === item.id
                        ? 'text-white bg-white/10 border-l-2 border-secondary-container'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="font-body-md text-body-md pl-9">{item.label}</span>
                  </button>
                ))}
              </div>
              );
            });
          })()}
        </nav>

        {/* Company Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 text-zinc-400">
            <span className="material-symbols-outlined text-[20px]">business</span>
            <span className="font-body-md text-body-md">{company.name}</span>
          </div>
          <div className="px-4 text-[10px] text-zinc-400/60 font-label-caps">
            {company.plan === 'owner-driver' ? 'SOLO' : company.plan === 'starter' ? 'STARTER' : company.plan === 'growth' ? 'GROWTH PRO' : 'ENTERPRISE'}
          </div>
          {onLogOutWorkspace && (
            <button onClick={onLogOutWorkspace} className="mt-2 w-full py-1.5 px-3 border border-danger-red/20 text-danger-red hover:bg-danger-red/10 rounded text-label-caps text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer">
              <LogOut className="w-3 h-3" /> LOG OUT
            </button>
          )}
          <div className="mt-auto px-3 py-2 text-center">
            <span className="text-[8px] text-zinc-600 font-mono">v1.0.4</span>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-200" />
      )}

      {/* ===== TOP HEADER ===== */}
      <header className="fixed top-0 right-0 h-16 z-40 bg-surface border-b border-border-subtle flex items-center justify-between px-margin-page w-[calc(100%-240px)] ml-sidebar-width">
        <div className="flex items-center gap-4">
          <h2 className="font-headline-md text-headline-md text-primary font-bold">
            {activeTab === 'overview' && "Today's Overview"}
            {activeTab === 'operations' && "Operations & Comms"}
            {activeTab === 'schedules' && "Compliance Schedules"}
            {activeTab === 'vehicles' && "Vehicle Fleet"}
            {activeTab === 'drivers' && "Drivers & PINs"}
            {activeTab === 'defects' && "Defect Verification System"}
            {activeTab === 'records' && "Master Compliance Log"}
            {activeTab === 'settings' && "Company Profile"}
            {activeTab === 'billing' && "Billing & Plans"}
            {activeTab === 'templates' && "Checklist Templates"}
          </h2>
          <span className="h-4 w-px bg-border-subtle"></span>
          <span className="font-data-mono text-data-mono text-on-surface-variant">
            UTC {currentTime}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-label-caps text-on-surface-variant">Auth Status</span>
            <span className="font-data-mono text-data-mono text-primary font-bold">DVSA REF: 8820-X</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowTour(true)}
              className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container transition-colors p-2 rounded cursor-pointer">
              help
            </button>
            <button onClick={handleSyncData} disabled={syncing}
              className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container transition-colors p-2 rounded cursor-pointer">
              sync
            </button>
            <div className="relative">
              <button onClick={() => guardedSetTab("schedules")} className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container transition-colors p-2 rounded cursor-pointer">
                notifications
              </button>
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-danger-red rounded-full border-2 border-surface"></span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Top Bar */}
      <div className="md:hidden bg-surface text-primary py-3 px-4 flex items-center justify-between border-b border-border-subtle sticky top-0 z-30">
        <div className="flex items-center gap-2">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt={company.name} className="h-8 w-auto max-w-[100px] object-contain" />
          ) : (
            <>
              <div className="p-1 bg-secondary-container rounded text-primary">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-headline-md text-sm font-bold">WalkSafe</span>
            </>
          )}
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 hover:bg-surface-container rounded transition-all cursor-pointer">
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main className="ml-0 md:ml-0 pt-16 flex-1 overflow-y-auto pb-12">
        <div className="max-w-[1600px] mx-auto p-margin-page space-y-gutter">
          
          {/* Grounded Alert — prominent with vehicle details */}
          {groundedCount > 0 && (
            <div className="bg-surface-card border border-border-subtle border-l-4 border-l-danger-red p-card-padding flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-danger-red text-[32px]">report</span>
                  <div>
                    <h3 className="font-title-sm text-title-sm text-primary">{groundedCount} Vehicle{groundedCount > 1 ? 's' : ''} Grounded — Action Required</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">These vehicles are grounded and must not be operated until cleared.</p>
                  </div>
                </div>
                <button onClick={() => setActiveTab('defects')} className="font-body-md text-body-md text-danger-red font-bold flex items-center gap-1 hover:underline cursor-pointer">
                  View Defects <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
              {/* List grounded vehicles with registration and expiry info */}
              <div className="flex flex-wrap gap-2">
                {vehicles.filter(v => v.isActive && v.isGrounded).map(v => {
                  const today = new Date().toISOString().split('T')[0];
                  const reasons: string[] = [];
                  if (v.motExpiry && v.motExpiry < today) reasons.push(`MOT expired ${v.motExpiry}`);
                  if (v.taxExpiry && v.taxExpiry < today) reasons.push(`Tax expired ${v.taxExpiry}`);
                  return (
                    <div key={v.id} className="flex items-center gap-3 bg-danger-red/5 border border-danger-red/20 rounded px-3 py-2 text-sm">
                      <span className="w-2 h-2 bg-danger-red rounded-full shrink-0"></span>
                      <span className="font-bold text-primary font-data-mono">{v.registration}</span>
                      <span className="text-on-surface-variant">{v.make} {v.model}</span>
                      {reasons.length > 0 && (
                        <span className="text-danger-red font-semibold text-xs">{reasons.join(' · ')}</span>
                      )}
                      {reasons.length === 0 && (
                        <span className="text-danger-red font-semibold text-xs">Grounded — Dangerous defect</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== TAB: OVERVIEW ===== */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-gutter">
              
              {/* Solo Account Notice */}
              {company.plan === 'owner-driver' && (
                <div className="bg-surface-card border border-border-subtle p-card-padding flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary-container text-2xl">info</span>
                    <div>
                      <h3 className="font-title-sm text-title-sm text-primary">Solo Profile Activated</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">Single-asset license. Upgrade for multi-driver features.</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveTab('billing')} className="bg-secondary-container text-on-secondary-container font-label-caps text-label-caps px-4 py-2 rounded font-bold hover:opacity-90 transition-opacity cursor-pointer">
                    Upgrade Fleet License
                  </button>
                </div>
              )}

              {/* Metric Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-gutter">
                
                {/* Fleet Integrity */}
                <div className="bg-surface-card border border-border-subtle p-card-padding cursor-pointer hover:border-primary transition-all" onClick={() => guardedSetTab("analytics")}>
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-4">FLEET INTEGRITY</p>
                  <div className="flex items-center justify-between">
                    <span className="font-headline-md text-headline-md font-data-mono">{complianceScore}%</span>
                    <div className="relative w-12 h-12">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="24" cy="24" fill="transparent" r="20" stroke="#eeeeec" strokeWidth="4"></circle>
                        <circle cx="24" cy="24" fill="transparent" r="20" stroke="#fea619" strokeWidth="4"
                          strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * complianceScore) / 100}></circle>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Reports Logged */}
                <div className="bg-surface-card border border-border-subtle p-card-padding cursor-pointer hover:border-primary transition-all" onClick={() => guardedSetTab("records")}>
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-4">REPORTS LOGGED</p>
                  <div className="space-y-1">
                    <span className="font-headline-md text-headline-md font-data-mono">{completedToday}/{vehicles.length}</span>
                    <p className="font-body-sm text-body-sm text-secondary">{outstandingChecks} Outstanding</p>
                  </div>
                </div>

                {/* Open Defects */}
                <div className="bg-surface-card border border-border-subtle p-card-padding cursor-pointer hover:border-primary transition-all" onClick={() => guardedSetTab("defects")}>
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-4">OPEN DEFECTS</p>
                  <div className="flex items-center gap-3">
                    <span className="font-headline-md text-headline-md font-data-mono">{activeDefectsCount}</span>
                    {activeDefectsCount > 0 && (
                      <span className="w-2.5 h-2.5 bg-major-defect-orange rounded-full animate-pulse-orange"></span>
                    )}
                  </div>
                </div>

                {/* Fleet Suspension */}
                <div className={`p-card-padding border ${groundedCount > 0 ? 'bg-[#FEF2F2] border-danger-red/20' : 'bg-surface-card border-border-subtle'}`} style={{cursor: 'pointer'}} onClick={() => setActiveTab('vehicles')}>
                  <p className={`font-label-caps text-label-caps mb-4 ${groundedCount > 0 ? 'text-danger-red' : 'text-on-surface-variant'}`}>FLEET SUSPENSION</p>
                  <span className={`font-headline-md text-headline-md font-data-mono ${groundedCount > 0 ? 'text-danger-red' : ''}`}>{groundedCount}</span>
                </div>

                {/* Audit Scheduler */}
                <div className="bg-primary border border-primary p-card-padding flex flex-col justify-between">
                  <div>
                    <p className="font-label-caps text-label-caps text-zinc-400 mb-2">AUDIT SCHEDULER</p>
                    <span className="font-headline-md text-headline-md font-data-mono text-on-primary">{schedules.filter(s => s.status === 'pending').length}</span>
                  </div>
                  <button onClick={() => setActiveTab('schedules')} className="mt-4 flex items-center justify-between text-secondary-container font-label-caps text-label-caps font-bold hover:text-white transition-colors cursor-pointer">
                    PLAN AUDITS
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* Detailed Grid Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
                
                {/* Outstanding Assets Table */}
                <div className="lg:col-span-8 bg-surface-card border border-border-subtle overflow-hidden">
                  <div className="p-card-padding border-b border-border-subtle flex items-center justify-between">
                    <h3 className="font-title-sm text-title-sm">Outstanding Assets Today</h3>
                    <button className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                      <span className="material-symbols-outlined">filter_list</span>
                    </button>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-border-subtle">
                        <th className="px-6 py-3 font-label-caps text-label-caps text-on-surface-variant">Asset Identifier</th>
                        <th className="px-6 py-3 font-label-caps text-label-caps text-on-surface-variant">Driver Assigned</th>
                        <th className="px-6 py-3 font-label-caps text-label-caps text-on-surface-variant">Last Check</th>
                        <th className="px-6 py-3 font-label-caps text-label-caps text-on-surface-variant">Compliance</th>
                        <th className="px-6 py-3 font-label-caps text-label-caps text-on-surface-variant text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {vehicles.slice(0, 5).map(v => {
                        const lastCheck = [...checks].reverse().find(c => c.vehicleId === v.id);
                        const hasOpenDefect = defects.some(d => d.vehicleId === v.id && d.status === "open");
                        return (
                          <tr key={v.id} className="hover:bg-surface-container-low transition-colors group cursor-pointer" onClick={() => setActiveTab("vehicles")}>
                            <td className="px-6 py-4"><span className="font-data-mono text-data-mono font-bold">{v.registration}</span><span className="block text-[11px] text-on-surface-variant">{v.make} {v.model}</span></td>
                            <td className="px-6 py-4 font-body-sm text-body-sm text-on-surface-variant">{schedules.find(s => s.vehicleId === v.id && s.status === "pending")?.driverId ? drivers.find(d => d.id === schedules.find(s => s.vehicleId === v.id && s.status === "pending")?.driverId)?.fullName || "—" : "—"}</td>
                            <td className="px-6 py-4 font-body-sm text-body-sm">{lastCheck ? new Date(lastCheck.startedAt).toLocaleDateString("en-GB") : "Never"}</td>
                            <td className="px-6 py-4"><span className={`px-2 py-0.5 font-label-caps text-label-caps rounded ${hasOpenDefect ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{hasOpenDefect ? "Open Defect" : "Compliant"}</span></td>
                            <td className="px-6 py-4 text-right"><span className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span></td>
                          </tr>
                        );
                      })}
                      {vehicles.length === 0 && (
                        <tr><td colSpan={5} className="py-8 text-center font-body-sm text-body-sm text-on-surface-variant">No vehicles registered yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                  <div className="p-4 bg-surface-container-lowest text-center border-t border-border-subtle">
                    <button onClick={() => setActiveTab('vehicles')} className="font-body-md text-primary font-bold hover:underline cursor-pointer">View All Active Assets</button>
                  </div>
                </div>

                {/* Compliance Health Breakdown */}
                <div className="lg:col-span-4 space-y-gutter">
                  <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                    <h3 className="font-title-sm text-title-sm mb-6">Compliance Health Breakdown</h3>
                    <div className="space-y-6">
                      {/* Fleet Coverage */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="font-label-caps text-label-caps text-on-surface-variant">FLEET COVERAGE</span>
                          <span className="font-data-mono text-data-mono font-bold">{completedToday > 0 ? Math.round((completedToday / Math.max(1, vehicles.length)) * 100) : 0}%</span>
                        </div>
                        <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden flex">
                          <div className="h-full bg-compliance-green" style={{ width: `${Math.min(100, (completedToday / Math.max(1, vehicles.length)) * 75)}%` }}></div>
                          <div className="h-full bg-secondary-container" style={{ width: `${Math.min(100, (outstandingChecks / Math.max(1, vehicles.length)) * 17.4)}%` }}></div>
                        </div>
                        <div className="flex gap-4 pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-compliance-green"></span>
                            <span className="font-label-caps text-[10px]">Secure</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
                            <span className="font-label-caps text-[10px]">Warning</span>
                          </div>
                        </div>
                      </div>
                      <hr className="border-border-subtle" />
                      {/* Operational Insights */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary-container">timelapse</span>
                            <span className="font-body-md">Expiring MOTs (30d)</span>
                          </div>
                          <span className="font-data-mono text-data-mono font-bold">{vehicles.filter(v => v.motExpiry && v.motExpiry < new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]).length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-compliance-green">task_alt</span>
                            <span className="font-body-md">Daily Checks Clear</span>
                          </div>
                          <span className="font-data-mono text-data-mono font-bold">{completedToday}/{vehicles.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-danger-red">warning</span>
                            <span className="font-body-md">Late Inspections</span>
                          </div>
                          <span className="font-data-mono text-data-mono font-bold text-danger-red">{outstandingChecks}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { const veh = vehicles[0]; if (veh) triggerPdfDownload(checks[0] || { id: 'mock', vehicleId: veh.id, driverId: '', checkDate: new Date().toISOString().split('T')[0], startedAt: new Date().toISOString(), isGrounded: false, quickCheckAlert: false, photos: [], signatures: [], vehicleMileage: 0, vehicleCondition: 'Good', notes: '', defects: [] } as any); }}
                      className="w-full mt-8 py-3 bg-primary text-white font-label-caps text-label-caps font-bold hover:bg-neutral-800 transition-colors cursor-pointer active:scale-[0.98]">
                      DOWNLOAD COMPLIANCE SUMMARY
                    </button>
                  </div>
                  {/* Financial Liability Card */}
                  <div className="bg-surface-card border border-border-subtle p-card-padding flex items-center gap-4">
                    <div className="p-3 bg-surface-container rounded-sm">
                      <span className="material-symbols-outlined text-primary">account_balance</span>
                    </div>
                    <div>
                      <p className="font-label-caps text-label-caps text-on-surface-variant">FINANCIAL LIABILITY</p>
                      <p className="font-headline-md text-headline-md font-data-mono">£{((activeDefectsCount * 120) + (groundedCount * 500)).toFixed(2)}</p>
                      <p className="font-body-sm text-body-sm text-secondary-container">Est. Fines Avoided</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB: OPERATIONS ===== */}
          {activeTab === 'operations' && (
            <div className="flex flex-col gap-6">
              <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                <h3 className="font-title-sm text-title-sm text-primary">Operations &amp; Comms</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Manage fleet-wide broadcasts and monitor daily compliance health.</p>
              </div>
              
              {company.plan === 'owner-driver' ? (
                <div className="bg-surface-card border border-border-subtle p-card-padding text-center max-w-lg mx-auto my-8">
                  <span className="material-symbols-outlined text-4xl text-secondary-container mb-4 block">lock</span>
                  <h4 className="font-title-sm text-title-sm text-primary mb-2">Broadcasting Locked on Owner-Driver Plan</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Real-time dispatcher notices and broadcast features require multi-driver tier.</p>
                  <button onClick={() => setActiveTab('billing')} className="bg-secondary-container text-on-secondary-container font-label-caps text-label-caps px-5 py-2.5 rounded font-bold cursor-pointer">
                    Upgrade Active Plan
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
                  {/* Left: Broadcast Notice */}
                  <div className="lg:col-span-4 space-y-gutter">
                    <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2 mb-6">
                        <span className="material-symbols-outlined text-secondary">campaign</span>
                        <h3 className="font-title-sm text-title-sm text-primary">Publish Notice</h3>
                      </div>
                      <AnnouncementPublisherForm onSubmit={onAddAnnouncement} />
                    </div>
                    {/* Broadcast History */}
                    <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-title-sm text-title-sm text-primary">Broadcast History</h3>
                        <button className="text-secondary font-label-caps text-label-caps hover:underline cursor-pointer">VIEW ALL</button>
                      </div>
                      <div className="space-y-4">
                        {announcements.length === 0 ? (
                          <div className="text-center py-8 text-on-surface-variant font-body-sm italic">Historical ledger empty.</div>
                        ) : (
                          announcements.slice(0, 5).map(ann => (
                            <div key={ann.id} className="border-b border-border-subtle pb-4 last:border-0 last:pb-0">
                              <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-0.5 font-label-caps text-label-caps ${ann.important ? 'bg-error/10 text-error' : 'bg-surface-container-high text-on-surface-variant'}`}>
                                  {ann.important ? 'HIGH PRIORITY' : 'STANDARD'}
                                </span>
                                <span className="font-data-mono text-xs text-on-surface-variant">{new Date(ann.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                              </div>
                              <h4 className="font-body-md font-bold text-primary">{ann.title}</h4>
                              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{ann.content}</p>
                              {ann.expiresAt && <p className="font-data-mono text-[10px] text-on-surface-variant mt-1">Expires: {new Date(ann.expiresAt).toLocaleDateString('en-GB')}</p>}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Compliance Heat Calendar placeholders */}
                  <div className="lg:col-span-8 space-y-gutter">
                    <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                      <h3 className="font-title-sm text-title-sm text-primary mb-4">Fleet Health at a Glance</h3>
                      <div className="grid grid-cols-2 gap-gutter">
                        <div className="bg-surface-container-low p-card-padding">
                          <p className="font-label-caps text-label-caps text-on-surface-variant">CHECKS COMPLETED</p>
                          <p className="font-headline-md text-headline-md font-bold text-primary">{completedToday}/{vehicles.length}</p>
                          <p className="font-body-sm text-body-sm text-compliance-green">{vehicles.length > 0 ? Math.round((completedToday/vehicles.length)*100) : 0}% Fleet Efficiency</p>
                        </div>
                        <div className="bg-surface-container-low p-card-padding">
                          <p className="font-label-caps text-label-caps text-on-surface-variant">CRITICAL DEFECTS</p>
                          <p className="font-headline-md text-headline-md font-bold text-danger-red">{defects.filter(d => d.severity === 'dangerous' && d.status !== 'closed').length}</p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">Immediate Action Required</p>
                        </div>
                      </div>
                    </div>
                    {/* Operational Insights */}
                    <div className="grid grid-cols-2 gap-gutter">
                      <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                        <h4 className="font-title-sm text-[14px] text-primary mb-3">Top Fleet Risk</h4>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-major-defect-orange/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-major-defect-orange">warning</span>
                          </div>
                          <div>
                            <p className="font-body-md font-bold text-primary">Active Defects: {activeDefectsCount}</p>
                            <p className="font-body-sm text-body-sm text-on-surface-variant">Requires maintenance attention.</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                        <h4 className="font-title-sm text-[14px] text-primary mb-3">Comms Engagement</h4>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-secondary-container/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-secondary-container">group</span>
                          </div>
                          <div>
                            <p className="font-body-md font-bold text-primary">{announcements.length > 0 ? 'Active Broadcasts' : 'No Active Broadcasts'}</p>
                            <p className="font-body-sm text-body-sm text-on-surface-variant">{announcements.length} notice{announcements.length !== 1 ? 's' : ''} published.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Compliance Heat Calendar */}
                    <div className="bg-surface-card border border-border-subtle p-card-padding mt-gutter">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-title-sm text-title-sm text-primary flex items-center gap-2">
                          <span className="material-symbols-outlined text-compliance-green">calendar_month</span>
                          Compliance Heat Calendar
                        </h3>
                      </div>
                      {/* Legend */}
                      <div className="flex flex-wrap gap-3 sm:gap-6 mb-6 border-b border-border-subtle pb-4">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-compliance-green"></div><span className="font-label-caps text-label-caps text-on-surface-variant">PASSED</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-secondary-container"></div><span className="font-label-caps text-label-caps text-on-surface-variant">MINOR DEFECT</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-danger-red"></div><span className="font-label-caps text-label-caps text-on-surface-variant">GROUNDED/MISSED</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-outline/20"></div><span className="font-label-caps text-label-caps text-on-surface-variant">NO OPS</span></div>
                      </div>
                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                        {['MON','TUE','WED','THU','FRI','SAT','SUN'].map(d => (
                          <div key={d} className="text-center py-2 font-label-caps text-label-caps text-outline">{d}</div>
                        ))}
                        {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() === 0 ? 6 : new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() - 1 }, (_, i) => (
                          <div key={`e${i}`} className="bg-outline/5 border border-border-subtle opacity-30" style={{aspectRatio:'1'}}></div>
                        ))}
                        {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                          const today = new Date();
                          const isToday = day === today.getDate() && new Date().getMonth() === today.getMonth();
                          const dayChecks = checks.filter(c => { const d = new Date(c.checkDate); return d.getDate() === day && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(); });
                          const hasGrounded = dayChecks.some(c => defects.some(d => d.checkId === c.id && d.severity === 'dangerous'));
                          const hasDefect = dayChecks.some(c => defects.some(d => d.checkId === c.id && d.status !== 'closed'));
                          const hasMinor = dayChecks.some(c => defects.some(d => d.checkId === c.id && d.severity === 'minor'));
                          const hasCheck = dayChecks.length > 0;
                          let bg = 'bg-outline/10'; let txtColor = 'text-on-surface-variant';
                          if (hasGrounded) { bg = 'bg-danger-red'; txtColor = 'text-white'; }
                          else if (hasDefect) { bg = 'bg-compliance-green'; txtColor = 'text-white'; }
                          else if (hasCheck) { bg = 'bg-compliance-green'; txtColor = 'text-white'; }
                          return (
                            <div key={day} className={`${bg} border ${isToday ? 'ring-2 ring-primary' : 'border-border-subtle'} flex items-start justify-end p-1 relative`} style={{aspectRatio:'1'}}>
                              <span className={`font-data-mono text-[11px] ${txtColor} ${isToday ? 'font-bold underline' : ''}`}>{day}</span>
                              {!hasGrounded && hasCheck && hasMinor && <div className="absolute bottom-1 left-1 w-1.5 h-1.5 bg-secondary-container rounded-full"></div>}
                            </div>
                          );
                        })}
                      </div>
                      {/* Summary */}
                      <div className="mt-6 grid grid-cols-3 gap-gutter p-4 bg-surface-container-low border border-border-subtle">
                        <div><h4 className="font-label-caps text-label-caps text-on-surface-variant mb-1">CHECKS COMPLETED</h4><p className="font-headline-md text-headline-md font-bold text-primary">{completedToday}/{vehicles.length}</p><p className="font-body-sm text-body-sm text-compliance-green">{vehicles.length > 0 ? Math.round((completedToday/vehicles.length)*100) : 0}% Fleet Eff.</p></div>
                        <div><h4 className="font-label-caps text-label-caps text-on-surface-variant mb-1">CRITICAL DEFECTS</h4><p className="font-headline-md text-headline-md font-bold text-danger-red">{defects.filter(d => d.severity === 'dangerous').length}</p><p className="font-body-sm text-body-sm text-on-surface-variant">Immediate</p></div>
                        <div><h4 className="font-label-caps text-label-caps text-on-surface-variant mb-1">PENDING REVIEWS</h4><p className="font-headline-md text-headline-md font-bold text-secondary-container">{defects.filter(d => d.status === 'open').length}</p><p className="font-body-sm text-body-sm text-on-surface-variant">Needed</p></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== TAB: SCHEDULES ===== */}
          {activeTab === 'schedules' && (
            <div className="flex flex-col gap-6">
              <div className="bg-surface-card border border-border-subtle p-card-padding flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="font-title-sm text-title-sm text-primary">Compliance Schedules</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Plan and manage regulatory vehicle inspections for your fleet.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="flex bg-surface-container rounded-sm p-1 border border-border-subtle">
                    {(['all', 'pending', 'completed', 'overdue'] as const).map(f => (
                      <button key={f} onClick={() => setScheduleFilter(f)}
                        className={`px-3 py-1 text-label-caps font-label-caps transition-all cursor-pointer ${
                          scheduleFilter === f ? 'bg-white text-primary border border-border-subtle shadow-sm' : 'text-on-surface-variant hover:text-primary'
                        }`}>
                        {f.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowSchModal(true)}
                    className="bg-secondary-container text-on-secondary-container px-4 py-2 font-label-caps text-label-caps font-bold hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer">
                    <Plus className="w-4 h-4" /> CREATE SCHEDULE
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {filteredSchedules.length === 0 ? (
                  <div className="bg-surface-card border border-border-subtle p-card-padding text-center py-16 text-on-surface-variant font-body-sm italic">
                    No audit schedules found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSchedules.map(sch => {
                      const veh = vehicles.find(v => v.id === sch.vehicleId);
                      return (
                        <div key={sch.id} className="bg-surface-card border border-border-subtle p-card-padding hover:border-primary transition-colors flex flex-col">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-title-sm text-title-sm text-primary">{sch.title}</h4>
                            <StatusPill label={sch.status} color={sch.status === 'completed' ? 'green' : sch.status === 'overdue' ? 'red' : 'amber'} />
                          </div>
                          <div className="space-y-2 mb-4 font-body-sm">
                            <div className="flex items-center gap-2">
                              {veh && <UkPlate registration={veh.registration} size="sm" />}
                              <span className="text-on-surface-variant">{veh?.make || 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-secondary-container" />
                              <span className="font-bold">Due: {sch.dueDate}</span>
                            </div>
                          </div>
                          <div className="mt-auto pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-on-surface-variant">
                            <div className="flex gap-1.5 items-center">
                              {sch.isRecurring && <span className="px-2 py-0.5 bg-surface-container text-secondary-container font-label-caps text-[10px] rounded">Recurring</span>}
                            </div>
                            <button onClick={async () => {
                              const res = await fetch(`/api/schedules/${sch.id}`, { method: "DELETE", headers: { "x-company-id": company.id } });
                              if (res.ok) onTriggerRefresh();
                            }} className="p-1 text-on-surface-variant hover:text-danger-red transition-colors cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2 border-b border-border-subtle pb-3 mb-4">
                  <h3 className="font-title-sm text-title-sm text-primary">Compliance Signal Stream</h3>
                </div>
                <div className="space-y-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-on-surface-variant font-body-sm italic">No signals recorded.</div>
                  ) : (
                    notifications.slice(0, 5).map(not => (
                      <div key={not.id} className={`p-3 border ${!not.isRead ? 'bg-secondary-container/5 border-secondary-container/20' : 'bg-surface-container-low border-border-subtle'}`}>
                        <div className="flex justify-between gap-1">
                          <span className="font-bold text-body-sm">{not.title}</span>
                          <span className="text-[10px] text-on-surface-variant">{new Date(not.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-body-sm text-on-surface-variant mt-1">{not.message}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-border-subtle text-right">
                  <button onClick={onMarkNotificationsAsRead} className="px-4 py-2 bg-primary text-on-primary font-label-caps text-label-caps font-bold hover:opacity-90 transition-colors cursor-pointer">
                    Acknowledge All
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB: VEHICLES ===== */}
          {activeTab === 'vehicles' && (
            <div className="flex flex-col gap-6">
              <div className="bg-surface-card border border-border-subtle p-card-padding flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-title-sm text-title-sm text-primary">Fleet Vehicle Registers</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Manage roadworthiness, MOT schedules, and driver assignments.</p>
                </div>
                <button onClick={() => { resetVehForm(); setShowVehModal(true); }}
                  className="flex items-center gap-2 bg-primary text-secondary-container px-6 py-3 font-bold font-label-caps text-label-caps hover:opacity-90 transition-all cursor-pointer active:scale-[0.98]">
                  <Plus className="w-4 h-4" /> Add Vehicle
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {vehicles.map(v => {
                  const today = new Date().toISOString().split('T')[0];
                  const isMOTExpired = v.motExpiry && v.motExpiry < today;
                  const isTaxExpired = v.taxExpiry && v.taxExpiry < today;
                  const assignedDrivers = drivers.filter(d => d.assignedVehicleIds?.includes(v.id) || d.defaultVehicleId === v.id);
                  return (
                    <div key={v.id} className={`bg-surface-card flex flex-col group transition-all duration-300 ${
                      v.isGrounded 
                        ? 'border-2 border-danger-red ring-1 ring-danger-red/30 bg-danger-red/[0.02]' 
                        : 'border border-border-subtle hover:border-primary hover:shadow-sm'
                    }`}>
                      {/* UK Plate Header */}
                      <div className="bg-plate-yellow p-4 border-b border-border-subtle flex items-center justify-center uk-plate-shadow relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-3 bg-plate-blue flex flex-col items-center justify-center">
                          <span className="text-[6px] text-white font-bold leading-none mb-1">GB</span>
                        </div>
                        <span className="font-plate-text text-plate-text text-black tracking-widest uppercase">{v.registration}</span>
                      </div>
                      <div className="p-card-padding flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-title-sm text-title-sm text-primary">{v.make} {v.model}</h4>
                            <p className="font-body-sm text-body-sm text-on-surface-variant">{v.year} ”¢ {v.colour}</p>
                          </div>
                          {v.isGrounded ? (
                            <div className="flex items-center gap-2 px-3 py-1 bg-danger-red/10 text-danger-red rounded-full border border-danger-red/20">
                              <span className="w-2 h-2 bg-danger-red rounded-full animate-pulse"></span>
                              <span className="font-label-caps text-label-caps">GROUNDED</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-1 bg-compliance-green/10 text-compliance-green rounded-full border border-compliance-green/20">
                              <span className="material-symbols-outlined !text-[14px]">check_circle</span>
                              <span className="font-label-caps text-label-caps">Roadworthy</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between items-center pb-2 border-b border-surface-container">
                            <span className="font-label-caps text-label-caps text-on-surface-variant">MOT (Coming Soon)</span>
                            <span className={`font-data-mono text-data-mono ${v.isGrounded && v.motExpiry && v.motExpiry < new Date().toISOString().split('T')[0] ? 'text-danger-red font-bold' : 'text-primary'}`}>{v.motExpiry || '—'}</span>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b border-surface-container">
                            <span className="font-label-caps text-label-caps text-on-surface-variant">Tax Status</span>
                            <span className={`font-data-mono text-data-mono ${v.isGrounded && v.taxExpiry && v.taxExpiry < new Date().toISOString().split('T')[0] ? 'text-danger-red font-bold' : 'text-primary'}`}>{v.taxExpiry || '—'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-label-caps text-label-caps text-on-surface-variant">Type</span>
                            <span className="font-data-mono text-data-mono text-primary">{v.type === 'lgv' ? 'LGV' : v.type === 'hgv' ? 'HGV' : 'HGV+Trailer'}</span>
                          </div>
                        </div>
                        {assignedDrivers.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {assignedDrivers.map(d => (
                              <span key={d.id} className="px-2 py-1 bg-surface-container text-on-surface-variant text-[10px] font-bold rounded uppercase">{d.fullName.split(' ').map(n => n[0]).join('. ')}</span>
                            ))}
                          </div>
                        )}
                        {v.isGrounded && (
                          <div className="px-4 py-2 bg-danger-red/5 border-t border-danger-red/10 text-danger-red text-xs font-bold flex flex-wrap gap-x-3 gap-y-1">
                            {isMOTExpired && <span>⚠ MOT expired {v.motExpiry}</span>}
                            {isTaxExpired && <span>⚠ Tax expired {v.taxExpiry}</span>}
                            {!isMOTExpired && !isTaxExpired && <span>⚠ Dangerous defect reported</span>}
                          </div>
                        )}
                      </div>
                      <div className="p-4 border-t border-border-subtle bg-surface-container-lowest">
                        {v.isGrounded ? (
                          <button onClick={() => guardedSetTab("defects")} className="w-full py-2 border-2 border-danger-red text-danger-red font-bold text-label-caps hover:bg-danger-red hover:text-white transition-colors cursor-pointer">
                            ⚠ GROUNDED — Review Now
                          </button>
                        ) : (
                          <button onClick={() => {
                            setEditingVehicle(v); setVehReg(v.registration); setVehMake(v.make); setVehModel(v.model);
                            setVehYear(v.year); setVehColour(v.colour); setVehType(v.type); setVehMot(v.motExpiry || "");
                            setVehTax(v.taxExpiry || ""); setShowVehModal(true);
                          }} className="w-full py-2 border border-primary text-primary font-bold text-label-caps hover:bg-primary hover:text-on-primary transition-colors cursor-pointer">
                            Edit Vehicle
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add New Vehicle Placeholder */}
                <div onClick={() => { resetVehForm(); setShowVehModal(true); }}
                  className="bg-surface-container/30 border-2 border-dashed border-border-subtle flex items-center justify-center p-card-padding group cursor-pointer hover:bg-surface-container-high transition-all">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-surface-card border border-border-subtle flex items-center justify-center rounded-full mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined !text-3xl text-on-surface-variant">add_circle</span>
                    </div>
                    <span className="font-title-sm text-title-sm text-on-surface-variant">Register New Asset</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 max-w-[200px]">Initialise compliance monitoring for a new fleet vehicle.</p>
                  </div>
                </div>
              </div>

              {/* Footer Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter border-t border-border-subtle pt-8">
                <div className="bg-surface-card p-4 border border-border-subtle">
                  <span className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Total Fleet</span>
                  <span className="font-headline-md text-headline-md font-bold text-primary">{vehicles.length}</span>
                </div>
                <div className="bg-surface-card p-4 border border-border-subtle">
                  <span className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Roadworthy</span>
                  <span className="font-headline-md text-headline-md font-bold text-compliance-green">{vehicles.filter(v => !v.isGrounded).length}</span>
                </div>
                <div className="bg-surface-card p-4 border border-border-subtle">
                  <span className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Grounded</span>
                  <span className="font-headline-md text-headline-md font-bold text-danger-red">{groundedCount}</span>
                </div>
                <div className="bg-surface-card p-4 border border-border-subtle">
                  <span className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Active Defects</span>
                  <span className="font-headline-md text-headline-md font-bold text-major-defect-orange">{activeDefectsCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB: DRIVERS ===== */}
          {activeTab === 'drivers' && (
            <div className="flex flex-col gap-6">
              {company.plan === 'owner-driver' ? (
                <div className="bg-surface-card border border-border-subtle p-card-padding text-center max-w-lg mx-auto my-8">
                  <span className="material-symbols-outlined text-4xl text-secondary-container mb-4 block">lock</span>
                  <h4 className="font-title-sm text-title-sm text-primary mb-2">Multi-Driver Accounts Locked</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Your current plan supports single-operator only.</p>
                  <button onClick={() => setActiveTab('billing')} className="bg-secondary-container text-on-secondary-container px-5 py-2.5 font-label-caps font-bold cursor-pointer">
                    Upgrade Active Plan
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-surface-card border border-border-subtle p-card-padding flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-title-sm text-title-sm text-primary">Drivers &amp; PINs Management</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">Manage authentication protocols and access PINs for active fleet operators.</p>
                    </div>
                    <button onClick={() => { resetDrvForm(); setShowDrvModal(true); }}
                      className="flex items-center gap-2 bg-primary text-secondary-container px-6 py-3 font-bold font-label-caps text-label-caps hover:opacity-90 transition-all cursor-pointer active:scale-[0.98]">
                      <Plus className="w-4 h-4" /> Add Driver
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
                    {drivers.map(d => {
                      const dVeh = vehicles.find(v => v.id === d.defaultVehicleId);
                      const driverChecksCount = checks.filter(c => c.driverId === d.id).length;
                      return (
                        <div key={d.id} className="bg-surface-card border border-border-subtle p-card-padding flex flex-col gap-4 group hover:border-secondary-container transition-all">
                          <div className="flex justify-between items-start">
                            <div className="w-14 h-14 rounded-lg bg-surface-container flex items-center justify-center border border-border-subtle">
                              <Users className="w-6 h-6 text-on-surface-variant" />
                            </div>
                            <StatusPill label="Active" color="green" />
                          </div>
                          <div>
                            <h4 className="font-title-sm text-title-sm font-semibold text-primary">{d.fullName}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-on-surface-variant text-label-caps uppercase">Emp ID:</span>
                              <span className="font-data-mono text-data-mono text-primary">{d.id.slice(0, 7)}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 py-3 border-y border-border-subtle border-dashed">
                            <div>
                              <span className="text-on-surface-variant text-label-caps block mb-1">PIN</span>
                              <span className="font-data-mono text-data-mono tracking-widest">{d.pin}</span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant text-label-caps block mb-1">Vehicle</span>
                              <span className="font-data-mono text-data-mono text-[12px]">{dVeh?.registration || '—'}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={async () => {
                              const token = d.installToken || "token-" + Math.random().toString(36).substr(2, 9);
                              // If driver lacks an installToken, save it via the API so the magic link works
                              if (!d.installToken && onUpdateDriver) {
                                try { await onUpdateDriver(d.id, { installToken: token }); } catch (e) {}
                              }
                              const host = window.location.origin;
                              setQrCodeModalLink(`${host}/?join=${token}`); setQrCodeModalDriverName(d.fullName);
                            }} className="flex-1 py-2.5 bg-secondary-container text-on-secondary-container font-label-caps text-label-caps font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-all cursor-pointer">
                              <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                              QR Login
                            </button>
                            <button onClick={() => {
                              setEditingDriver(d); setDrvName(d.fullName); setDrvEmail(d.email || ""); setDrvPhone(d.phone || "");
                              setDrvPin(d.pin); setDrvDefaultVeh(d.defaultVehicleId || ""); setDrvInviteToken(d.installToken || "");
                              setShowDrvModal(true);
                            }} className="px-3 py-2.5 border border-border-subtle text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">
                              <Edit className="w-4 h-4" />
                            </button>
                            {onDeleteDriver && (
                              <button onClick={() => onDeleteDriver(d.id)} className="px-3 py-2.5 border border-danger-red/20 text-danger-red hover:bg-danger-red/5 transition-colors cursor-pointer">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <DriverPinResetter driverId={d.id} onReset={onResetDriverPin} />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ===== TAB: DEFECTS ===== */}
          {activeTab === 'defects' && (
            <div className="flex flex-col gap-6">
              <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                <h3 className="font-title-sm text-title-sm text-primary">Defect Verification System</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Review driver-captured damage photographs & sign-off repair certs.</p>
              </div>

              {/* Filters */}
              <div className="bg-surface-card border border-border-subtle p-card-padding flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex gap-2">
                  <button onClick={() => setDefectViewMode('gallery')}
                    className={`px-4 py-2 font-label-caps text-label-caps flex items-center gap-2 cursor-pointer ${defectViewMode === 'gallery' ? 'bg-primary text-on-primary' : 'border border-border-subtle text-on-surface-variant hover:bg-surface-container transition-colors'}`}>
                    <span className="material-symbols-outlined text-[18px]">grid_view</span>
                    GALLERY
                  </button>
                  <button onClick={() => setDefectViewMode('list')}
                    className={`px-4 py-2 font-label-caps text-label-caps flex items-center gap-2 cursor-pointer ${defectViewMode === 'list' ? 'bg-primary text-on-primary' : 'border border-border-subtle text-on-surface-variant hover:bg-surface-container transition-colors'}`}>
                    <span className="material-symbols-outlined text-[18px]">list</span>
                    LIST VIEW
                  </button>
                  <button onClick={() => setDefectViewMode('kanban')}
                    className={`px-4 py-2 font-label-caps text-label-caps flex items-center gap-2 cursor-pointer ${defectViewMode === 'kanban' ? 'bg-primary text-on-primary' : 'border border-border-subtle text-on-surface-variant hover:bg-surface-container transition-colors'}`}>
                    <span className="material-symbols-outlined text-[18px]">view_column</span>
                    KANBAN
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex bg-surface-container rounded-sm p-1 border border-border-subtle">
                    {(['all', 'dangerous', 'major', 'minor'] as const).map(f => (
                      <button key={f} onClick={() => setGallerySeverityFilter(f)}
                        className={`px-3 py-1 text-label-caps font-label-caps transition-all cursor-pointer ${
                          gallerySeverityFilter === f ? 'bg-white text-primary border border-border-subtle shadow-sm' : 'text-on-surface-variant hover:text-primary'
                        }`}>
                        {f.toUpperCase()}{f !== 'all' ? ` (${defects.filter(d => d.severity === f).length})` : ''}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-surface-container rounded-sm border border-border-subtle cursor-pointer hover:bg-surface-container-high transition-colors">
                    <span className="material-symbols-outlined text-[18px]">filter_list</span>
                    <span className="text-label-caps font-label-caps">FILTERS</span>
                  </div>
                </div>
              </div>

              {/* Gallery View */}
              {defectViewMode === 'gallery' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                  {defects.filter(def => {
                    const severityMatches = gallerySeverityFilter === 'all' || def.severity === gallerySeverityFilter;
                    const statusMatches = galleryStatusFilter === 'all' || def.status === galleryStatusFilter;
                    return severityMatches && statusMatches;
                  }).length === 0 ? (
                    <div className="col-span-full bg-surface-card border border-border-subtle p-card-padding text-center text-on-surface-variant font-body-sm">
                      No defects match the selected filters.
                    </div>
                  ) : (
                    defects.filter(def => {
                      const severityMatches = gallerySeverityFilter === 'all' || def.severity === gallerySeverityFilter;
                      const statusMatches = galleryStatusFilter === 'all' || def.status === galleryStatusFilter;
                      return severityMatches && statusMatches;
                    }).map(def => {
                      const v = vehicles.find(vh => vh.id === def.vehicleId);
                      const isDangerous = def.severity === 'dangerous';
                      const isMajor = def.severity === 'major';
                      return (
                        <div key={def.id} className="bg-surface-card border border-border-subtle group hover:border-primary transition-colors flex flex-col">
                          <div className="relative aspect-video bg-surface-container overflow-hidden">
                            {def.photoUrl ? (
                              <img src={def.photoUrl} alt={def.itemLabel} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300 cursor-pointer"
                                onClick={() => setSelectedGalleryDefect(def)} referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-surface-container">
                                <svg className="w-full h-full p-8 opacity-20" fill="none" stroke="currentColor" strokeWidth="0.5" viewBox="0 0 100 60">
                                  <path d="M10,45 L15,45 L15,42 C15,38 18,35 22,35 C26,35 29,38 29,42 L29,45 L70,45 L70,42 C70,38 73,35 77,35 C81,35 84,38 84,42 L84,45 L90,45 L90,30 L85,15 L30,15 L10,30 Z"></path>
                                  <circle cx="22" cy="42" r="4"></circle><circle cx="77" cy="42" r="4"></circle>
                                </svg>
                              </div>
                            )}
                            <div className="absolute top-3 left-3">
                              <span className={`px-2 py-1 text-white font-label-caps font-bold ${isDangerous ? 'bg-danger-red' : isMajor ? 'bg-major-defect-orange' : 'bg-secondary-container text-primary'}`}>
                                {def.severity.toUpperCase()}
                              </span>
                            </div>
                            <div className="absolute top-3 right-3">
                              <span className={`px-2 py-1 bg-white/90 border font-label-caps font-bold ${def.status === 'open' ? 'border-danger-red text-danger-red' : def.status === 'in_repair' ? 'border-major-defect-orange text-major-defect-orange' : 'border-compliance-green text-compliance-green'}`}>
                                {def.status === 'open' ? 'OPEN' : def.status === 'in_repair' ? 'IN PROGRESS' : 'CLOSED'}
                              </span>
                            </div>
                          </div>
                          <div className="p-6 flex flex-col flex-1">
                            <span className="font-data-mono text-data-mono text-on-surface-variant mb-1">LOGGED: {new Date(def.createdAt).toLocaleDateString('en-GB')}</span>
                            <h3 className="font-title-sm text-title-sm mb-2 text-primary">{def.itemLabel}</h3>
                            <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{def.description}</p>
                            <div className="mt-auto pt-6 flex items-center justify-between border-t border-border-subtle/50">
                              {v && <UkPlate registration={v.registration} size="sm" />}
                              {repairingDefectId === def.id ? (
                                <button onClick={() => setRepairingDefectId(null)} className="text-danger-red font-label-caps text-[10px] font-bold cursor-pointer">CANCEL</button>
                              ) : def.status !== 'closed' ? (
                                <button onClick={() => { setRepairingDefectId(def.id); setRepairNotes(""); setRepairParts(""); setEngineerSignature(""); }}
                                  className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary text-label-caps font-bold hover:bg-primary-container transition-colors cursor-pointer">
                                  INSPECT &amp; REPAIR <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Repair Panel — shown for the selected defect in either view */}
              {repairingDefectId && (() => {
                const def = defects.find(d => d.id === repairingDefectId);
                if (!def) return null;
                return (
                  <div className="bg-surface-card border-2 border-secondary-container p-card-padding mt-4">
                    <form onSubmit={handleRepairSubmit} className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-title-sm text-title-sm text-primary">Repair Sign-off: {def.itemLabel}</h3>
                        <button type="button" onClick={() => setRepairingDefectId(null)} className="text-danger-red font-label-caps text-[10px] font-bold cursor-pointer">Cancel</button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Engineer Name</label>
                          <input type="text" required value={engineerName} onChange={(e) => setEngineerName(e.target.value)} className="w-full bg-surface border border-border-subtle p-2 text-body-md focus:outline-hidden focus:border-primary" />
                        </div>
                        <div>
                          <label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Parts Used</label>
                          <input type="text" required value={repairParts} onChange={(e) => setRepairParts(e.target.value)} placeholder="e.g. Replacement mirror assembly" className="w-full bg-surface border border-border-subtle p-2 text-body-md focus:outline-hidden focus:border-primary" />
                        </div>
                      </div>
                      <div>
                        <label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Repair Notes</label>
                        <textarea required value={repairNotes} onChange={(e) => setRepairNotes(e.target.value)} rows={2} className="w-full bg-surface border border-border-subtle p-2 text-body-md focus:outline-hidden focus:border-primary" />
                      </div>
                      <div>
                        <label className="font-label-caps text-[10px] text-on-surface-variant block mb-2">Engineer Signature</label>
                        <div className="signature-pad w-full h-32 border border-border-subtle bg-white relative">
                          {engineerSignature ? (
                            <div className="p-2"><img src={engineerSignature} alt="Signature" className="h-full w-full object-contain" />
                              <button type="button" onClick={() => setEngineerSignature("")} className="absolute bottom-1 right-1 text-[10px] text-on-surface-variant hover:text-primary cursor-pointer">CLEAR</button>
                            </div>
                          ) : (
                            <SignaturePad onSave={(sig: string) => setEngineerSignature(sig)} />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-surface-container border border-border-subtle">
                        <input type="checkbox" className="w-4 h-4 text-primary accent-primary" id="vosa-ready-gallery" />
                        <label htmlFor="vosa-ready-gallery" className="text-body-sm">I confirm vehicle is now DVSA compliant</label>
                      </div>
                      <button type="submit" className="w-full py-3 bg-compliance-green text-white font-bold font-label-caps text-label-caps hover:opacity-90 transition-all cursor-pointer">
                        SUBMIT REPAIR SIGN-OFF
                      </button>
                    </form>
                  </div>
                );
              })()}

              {/* List View */}
              {defectViewMode === 'kanban' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[400px]">
                {(['open', 'in_repair', 'closed'] as const).map(columnStatus => {
                  const columnDefs = defects.filter(d => d.status === columnStatus);
                  const columnLabel = columnStatus === 'open' ? 'OPEN' : columnStatus === 'in_repair' ? 'IN PROGRESS' : 'CLOSED';
                  const columnColor = columnStatus === 'open' ? 'border-danger-red/30 bg-danger-red/5' : columnStatus === 'in_repair' ? 'border-major-defect-orange/30 bg-major-defect-orange/5' : 'border-compliance-green/30 bg-compliance-green/5';
                  return (
                    <div key={columnStatus}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async (e) => {
                        e.preventDefault();
                        const defectId = e.dataTransfer.getData("text/defect-id");
                        if (defectId && columnStatus !== defects.find(d => d.id === defectId)?.status) {
                          const targetStatus = columnStatus;
                          if (targetStatus === "closed") {
                            try { await fetch("/api/defects/" + defectId + "/close", { method: "PUT", headers: { "Content-Type": "application/json", "X-Company-Id": company.id }, body: JSON.stringify({ closedBy: "Fleet Manager" }) }); } catch (e) {}
                          } else if (targetStatus === "open") {
                            try { await fetch("/api/defects/" + defectId + "/reopen", { method: "PUT", headers: { "Content-Type": "application/json", "X-Company-Id": company.id } }); } catch (e) {}
                          }
                          onTriggerRefresh();
                        }
                      }}
                      className={`border-2 border-dashed ${columnColor} rounded-xl p-4 flex flex-col gap-3 min-h-[300px]`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest font-bold">{columnLabel}</h3>
                        <span className="font-data-mono text-data-mono text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded">{columnDefs.length}</span>
                      </div>
                      {columnDefs.length === 0 && (
                        <div className="flex-1 flex items-center justify-center text-on-surface-variant/50 font-body-sm text-sm">Drop defects here</div>
                      )}
                      {columnDefs.map(def => {
                        const veh = vehicles.find(v => v.id === def.vehicleId);
                        const isDangerous = def.severity === 'dangerous';
                        return (
                          <div key={def.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/defect-id", def.id)}
                            className="bg-surface-card border border-border-subtle rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isDangerous ? 'bg-danger-red text-white' : def.severity === 'major' ? 'bg-major-defect-orange text-white' : 'bg-secondary-container text-primary'}`}>{def.severity.toUpperCase()}</span>
                              {veh && <UkPlate registration={veh.registration} size="sm" />}
                            </div>
                            <p className="font-body-sm text-body-sm font-bold text-primary mb-1">{def.itemLabel}</p>
                            <p className="text-[11px] text-on-surface-variant line-clamp-2">{def.description}</p>
                            <p className="text-[10px] text-on-surface-variant/60 mt-2">{new Date(def.createdAt).toLocaleDateString("en-GB")}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
            
            {defectViewMode === 'list' && (
                <div className="flex flex-col gap-3">
                  {defects.filter(def => {
                    const severityMatches = gallerySeverityFilter === 'all' || def.severity === gallerySeverityFilter;
                    const statusMatches = galleryStatusFilter === 'all' || def.status === galleryStatusFilter;
                    return severityMatches && statusMatches;
                  }).map(def => {
                    const v = vehicles.find(vh => vh.id === def.vehicleId);
                    const isRepairing = repairingDefectId === def.id;
                    return (
                      <div key={def.id} className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {v && <UkPlate registration={v.registration} size="sm" />}
                            <div>
                              <h4 className="font-title-sm text-title-sm text-primary">{def.itemLabel}</h4>
                              <span className="font-data-mono text-data-mono text-on-surface-variant">{new Date(def.createdAt).toLocaleDateString('en-GB')}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <StatusPill label={def.severity} color={def.severity === 'dangerous' ? 'red' : def.severity === 'major' ? 'orange' : 'amber'} />
                            <StatusPill label={def.status === 'open' ? 'Open' : def.status === 'in_repair' ? 'In Repair' : 'Closed'} color={def.status === 'closed' ? 'green' : def.status === 'in_repair' ? 'amber' : 'red'} />
                          </div>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">{def.description}</p>
                        {!isRepairing && def.status !== 'closed' && (
                          <button onClick={() => { setRepairingDefectId(def.id); setRepairNotes(""); setRepairParts(""); setEngineerSignature(""); }}
                            className="px-4 py-2 bg-primary text-on-primary text-label-caps font-bold hover:opacity-90 transition-all cursor-pointer">
                            MARK AS REPAIRED (SIGN-OFF)
                          </button>
                        )}
                        {!isRepairing && def.status === 'closed' && (
                          <button onClick={async () => {
                            if (confirm("Reopen this defect? It will require a new repair sign-off.")) {
                              const res = await fetch(`/api/defects/${def.id}/reopen`, { method: "PUT", headers: { "x-company-id": company.id } });
                              if (res.ok) onTriggerRefresh(); else alert("Failed to reopen.");
                            }
                          }}
                            className="px-4 py-2 border border-major-defect-orange text-major-defect-orange text-label-caps font-bold hover:bg-major-defect-orange/5 transition-all cursor-pointer">
                            REOPEN
                          </button>
                        )}
                        {isRepairing && (
                          <form onSubmit={handleRepairSubmit} className="mt-4 pt-4 border-t border-border-subtle space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="font-label-caps text-label-caps text-primary">Engineer Sign-off</span>
                              <button type="button" onClick={() => setRepairingDefectId(null)} className="text-danger-red font-label-caps text-[10px] font-bold cursor-pointer">Cancel</button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Engineer Name</label>
                                <input type="text" required value={engineerName} onChange={(e) => setEngineerName(e.target.value)} className="w-full bg-surface border border-border-subtle p-2 text-body-md focus:outline-hidden focus:border-primary" />
                              </div>
                              <div>
                                <label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Parts Used</label>
                                <input type="text" required value={repairParts} onChange={(e) => setRepairParts(e.target.value)} placeholder="e.g. Replacement mirror assembly" className="w-full bg-surface border border-border-subtle p-2 text-body-md focus:outline-hidden focus:border-primary" />
                              </div>
                            </div>
                            <div>
                              <label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Repair Notes</label>
                              <textarea required value={repairNotes} onChange={(e) => setRepairNotes(e.target.value)} rows={2} className="w-full bg-surface border border-border-subtle p-2 text-body-md focus:outline-hidden focus:border-primary" />
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-surface-container border border-border-subtle">
                              <input type="checkbox" className="w-4 h-4 text-primary accent-primary" id="vosa-ready" />
                              <label htmlFor="vosa-ready" className="text-body-sm">I confirm vehicle is now DVSA compliant</label>
                            </div>
                            <div>
                              <label className="font-label-caps text-[10px] text-on-surface-variant block mb-2">Engineer Signature</label>
                              <div className="signature-pad w-full h-32 border border-border-subtle bg-white relative">
                                {engineerSignature ? (
                                  <div className="p-2">
                                    <img src={engineerSignature} alt="Signature" className="h-full w-full object-contain" />
                                    <button type="button" onClick={() => setEngineerSignature("")} className="absolute bottom-1 right-1 text-[10px] text-on-surface-variant hover:text-primary cursor-pointer">CLEAR</button>
                                  </div>
                                ) : (
                                  <SignaturePad onSave={(sig: string) => setEngineerSignature(sig)} />
                                )}
                              </div>
                            </div>
                            <button type="submit" className="w-full py-3 bg-primary text-on-primary font-label-caps text-label-caps font-bold hover:opacity-90 transition-all cursor-pointer">
                              COMMIT REPAIR &amp; AUTO-CREATE WORK ORDER
                            </button>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== TAB: RECORDS (Compliance Log) ===== */}
          {activeTab === 'records' && (
            <div className="flex flex-col gap-6">
              <div className="bg-surface-card border border-border-subtle p-card-padding flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-title-sm text-title-sm text-primary">Master Compliance Log</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Tamper-proof audit trail of all walkaround checks.</p>
                </div>
                <button onClick={() => {
                  if (checks.length > 0) triggerPdfDownload(checks[0]);
                }} className="flex items-center gap-2 bg-primary text-secondary-container px-4 py-2 font-label-caps text-label-caps font-bold hover:opacity-90 transition-all cursor-pointer">
                  <Download className="w-4 h-4" /> Export for DVSA Audit
                </button>
              </div>

              {/* Filters */}
              <div className="bg-surface-card border border-border-subtle p-4 flex flex-wrap items-end gap-4">
                <div className="min-w-[150px]">
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">FROM DATE</label>
                  <input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)}
                    className="w-full bg-surface border border-border-subtle p-2 focus:outline-hidden focus:border-primary text-body-md font-data-mono" />
                </div>
                <div className="min-w-[150px]">
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">TO DATE</label>
                  <input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)}
                    className="w-full bg-surface border border-border-subtle p-2 focus:outline-hidden focus:border-primary text-body-md font-data-mono" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">VEHICLE SEARCH</label>
                  <input type="text" placeholder="Enter Registration..." className="w-full bg-surface border border-border-subtle p-2 focus:outline-hidden focus:border-primary text-body-md" />
                </div>
                <div className="flex items-end gap-2">
                  <button onClick={() => {
                    const d = new Date(); d.setDate(d.getDate() - 30);
                    setReportDateFrom(d.toISOString().split('T')[0]);
                    setReportDateTo(new Date().toISOString().split('T')[0]);
                  }} className="px-4 py-2 border border-primary text-primary font-body-md text-body-sm hover:bg-surface-container-low transition-colors cursor-pointer">
                    Clear Filters
                  </button>
                  <button onClick={triggerConsolidatedPdfDownload}
                    className="px-4 py-2 bg-primary text-secondary-container font-label-caps text-label-caps font-bold hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5">
                    <Download className="w-4 h-4" /> Consolidated Report
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-surface-card border border-border-subtle overflow-hidden">
                <div className="p-card-padding border-b border-border-subtle flex justify-between items-center">
                  <div>
                    <h3 className="font-title-sm text-title-sm">Audit History</h3>
                    <p className="text-body-sm text-on-surface-variant">Showing {checks.length} completed walkaround records</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low">
                        <th className="p-4 font-label-caps text-label-caps text-on-surface-variant border-b border-border-subtle">DATE/TIME</th>
                        <th className="p-4 font-label-caps text-label-caps text-on-surface-variant border-b border-border-subtle">VEHICLE PLATE</th>
                        <th className="p-4 font-label-caps text-label-caps text-on-surface-variant border-b border-border-subtle">DRIVER</th>
                        <th className="p-4 font-label-caps text-label-caps text-on-surface-variant border-b border-border-subtle">STATUS</th>
                        <th className="p-4 font-label-caps text-label-caps text-on-surface-variant border-b border-border-subtle text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {checks.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-on-surface-variant font-body-sm">No compliance records found.</td></tr>
                      ) : (
                        checks.slice().sort((a, b) => new Date(b.startedAt || b.checkDate).getTime() - new Date(a.startedAt || a.checkDate).getTime()).slice(0, 20).map(check => {
                          const veh = vehicles.find(v => v.id === check.vehicleId);
                          const drv = drivers.find(d => d.id === check.driverId);
                          const relatedDefs = defects.filter(df => df.checkId === check.id);
                          return (
                            <tr key={check.id} className="hover:bg-surface-container-low transition-colors">
                              <td className="p-4 font-data-mono text-data-mono">{check.startedAt || check.checkDate}</td>
                              <td className="p-4">
                                {veh && <UkPlate registration={veh.registration} size="sm" />}
                              </td>
                              <td className="p-4 font-body-md">{drv?.fullName || '—'}</td>
                              <td className="p-4">
                                {relatedDefs.length > 0 ? (
                                  <StatusPill label={`${relatedDefs.length} Defect(s)`} color="red" />
                                ) : check.quickCheckAlert ? (
                                  <StatusPill label="Under-Time" color="orange" />
                                ) : (
                                  <StatusPill label="Passed" color="green" />
                                )}
                              </td>
                              <td className="p-4 text-right">
                                <button onClick={() => triggerPdfDownload(check)} className="text-primary hover:underline font-body-sm cursor-pointer">View Report</button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-border-subtle flex justify-between items-center bg-surface-container-low">
                  <span className="text-body-sm text-on-surface-variant">Page 1 of {Math.max(1, Math.ceil(checks.length / 20))}</span>
                </div>
              </div>

              {/* Bottom Insights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                <div className="bg-surface-card border border-border-subtle p-card-padding flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">DVSA COMPLIANCE RATING</span>
                    <span className="material-symbols-outlined text-compliance-green">verified</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-data-mono text-headline-md font-bold">{complianceScore}%</span>
                  </div>
                  <div className="w-full bg-surface-container h-1.5 mt-2 overflow-hidden">
                    <div className="bg-compliance-green h-full" style={{ width: `${complianceScore}%` }}></div>
                  </div>
                </div>
                <div className="bg-surface-card border border-border-subtle p-card-padding flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">UNDER-TIME ALERTS (7D)</span>
                    <span className="material-symbols-outlined text-major-defect-orange">warning</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-data-mono text-headline-md font-bold text-major-defect-orange">{checks.filter(c => c.quickCheckAlert).length}</span>
                  </div>
                </div>
                <div className="bg-surface-card border border-border-subtle p-card-padding flex flex-col gap-2">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">FLEET DEFECT DENSITY</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-data-mono text-headline-md font-bold">{vehicles.length > 0 ? (activeDefectsCount / vehicles.length).toFixed(2) : '0'}</span>
                    <span className="text-body-sm text-on-surface-variant">Defects/Unit</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB: SETTINGS ===== */}
          {activeTab === 'settings' && (
            <div className="flex flex-col gap-6 max-w-3xl">
              <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                <h3 className="font-title-sm text-title-sm text-primary mb-1">Company Profile</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Manage your operator compliance settings.</p>
              </div>

              <form onSubmit={handleSaveCompany} className="bg-surface-card border border-border-subtle p-card-padding space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Company Name</label>
                    <input type="text" value={compName} onChange={(e) => setCompName(e.target.value)} className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary" />
                  </div>
                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Email Address</label>
                    <input type="email" value={compEmail} onChange={(e) => setCompEmail(e.target.value)} className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Manager Password</label>
                    <input type="text" value={compPassword} onChange={(e) => setCompPassword(e.target.value)} className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary" />
                  </div>
                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">O-Licence Number</label>
                    <input type="text" value={compLicence} onChange={(e) => setCompLicence(e.target.value)} className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary" />
                  </div>
                </div>
                <div className="border-t border-border-subtle pt-6">
                  <h4 className="font-title-sm text-title-sm text-primary mb-4">Company Logo</h4>
                  <div className="bg-surface-container border border-border-subtle p-4 rounded flex flex-col sm:flex-row items-center gap-4">
                    {compLogo ? (
                      <div className="relative shrink-0">
                        <img src={compLogo} alt="Company logo" className="h-16 w-auto max-w-[160px] object-contain rounded border border-border-subtle bg-white p-1" />
                        <button type="button" onClick={() => setCompLogo("")}
                          className="absolute -top-2 -right-2 bg-danger-red text-on-primary w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center cursor-pointer hover:bg-danger-red/80">
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="shrink-0 w-16 h-16 bg-surface-card border border-border-subtle rounded flex items-center justify-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-2xl">image</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">Upload your company logo. It will appear on dashboards, PDF reports, and invoices.</p>
                      <label className="inline-block bg-secondary-container text-on-secondary-container font-label-caps text-label-caps px-4 py-2 rounded font-bold cursor-pointer hover:opacity-90 transition-opacity">
                        {compLogo ? 'Change Logo' : 'Upload Logo'}
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setCompLogoSaving(true);
                          try {
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                setCompLogo(reader.result);
                              }
                              setCompLogoSaving(false);
                            };
                            reader.onerror = () => setCompLogoSaving(false);
                            reader.readAsDataURL(file);
                          } catch (err) {
                            setCompLogoSaving(false);
                          }
                        }} />
                      </label>
                      {compLogoSaving && <span className="ml-2 text-[11px] text-on-surface-variant font-data-mono">Processing...</span>}
                    </div>
                  </div>
                </div>
                <div className="border-t border-border-subtle pt-6">
                  <h4 className="font-title-sm text-title-sm text-primary mb-4">Minimum Check Durations (minutes)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">LGV</label>
                      <input type="number" min={1} value={minLgv} onChange={(e) => setMinLgv(Number(e.target.value))} className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">HGV</label>
                      <input type="number" min={1} value={minHgv} onChange={(e) => setMinHgv(Number(e.target.value))} className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">HGV + Trailer</label>
                      <input type="number" min={1} value={minHgvTrailer} onChange={(e) => setMinHgvTrailer(Number(e.target.value))} className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary" />
                    </div>
                  </div>
                </div>

                {/* Push Notifications */}
                <div className="border-t border-border-subtle pt-6">
                  <h4 className="font-title-sm text-title-sm text-primary mb-4">Notifications</h4>
                  <div className="flex items-center justify-between p-4 bg-surface-container border border-border-subtle">
                    <div>
                      <span className="font-body-md font-bold text-primary">Push Notifications</span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">Receive real-time alerts for defects and grounded vehicles.</p>
                    </div>
                    <button type="button" onClick={requestPermission}
                      className={`px-4 py-2 font-label-caps text-label-caps font-bold cursor-pointer ${notifPermission === 'granted' ? 'bg-compliance-green/10 text-compliance-green border border-compliance-green/20' : 'bg-primary text-on-primary'}`}>
                      {notifPermission === 'granted' ? 'ENABLED' : 'ENABLE'}
                    </button>
                  </div>
                </div>

                {compErrorMsg && <div className="p-3 bg-danger-red/10 text-danger-red font-body-sm rounded border border-danger-red/20">{compErrorMsg}</div>}

                {/* Alert Rules */}
                <div className="border-t border-border-subtle pt-6">
                  <h4 className="font-title-sm text-title-sm text-primary mb-4">Automated Alerts</h4>
                  <div className="space-y-3">
                    {[
                      { trigger: 'defect_logged', label: 'When a defect is logged' },
                      { trigger: 'mot_expiring', label: 'When MOT is expiring (30 days)' },
                      { trigger: 'schedule_due', label: 'When a schedule is due' },
                      { trigger: 'vehicle_grounded', label: 'When a vehicle is grounded' },
                    ].map(t => {
                      const existing = alertRules.find(r => r.trigger === t.trigger);
                      return (
                        <div key={t.trigger} className="flex items-center justify-between p-4 bg-surface-container border border-border-subtle">
                          <div>
                            <span className="font-body-md font-bold text-primary">{t.label}</span>
                            {existing && <p className="text-xs text-on-surface-variant">Channel: {existing.channel} · Recipients: {Array.isArray(existing.recipients) ? existing.recipients.join(', ') : existing.recipients || '—'}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            {existing ? (
                              <>
                                <button onClick={() => handleToggleAlertRule(existing.id, existing.enabled)}
                                  className={`px-3 py-1 text-xs font-bold rounded cursor-pointer ${existing.enabled ? 'bg-compliance-green/10 text-compliance-green border border-compliance-green/20' : 'bg-surface-container-low text-on-surface-variant border border-border-subtle'}`}>
                                  {existing.enabled ? 'ON' : 'OFF'}
                                </button>
                                <button onClick={() => handleDeleteAlertRule(existing.id)} className="p-1 text-on-surface-variant hover:text-danger-red cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                              </>
                            ) : (
                              <button onClick={() => handleAddAlertRule(t.trigger)} className="px-3 py-1 bg-primary text-on-primary text-xs font-bold rounded cursor-pointer">Enable</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                
                <div className="flex justify-end pt-4 border-t border-border-subtle">
                  <button type="submit" className="px-6 py-3 bg-primary text-on-primary font-label-caps text-label-caps font-bold hover:opacity-90 transition-all cursor-pointer">
                    {compSavedMsg ? 'SAVED ✓' : 'Save Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ===== TAB: BILLING ===== */}
                    {/* ===== TAB: ANALYTICS ===== */}
          {activeTab === 'analytics' && (
            <div className="flex flex-col gap-6">
              {/* Summary Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
                <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">TOTAL CHECKS</p>
                  <p className="font-headline-md text-headline-md font-bold text-primary">{checks.length}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">All time</p>
                </div>
                <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">DEFECT RATE</p>
                  <p className="font-headline-md text-headline-md font-bold text-major-defect-orange">{checks.length > 0 ? Math.round((defects.length / checks.length) * 100) : 0}%</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{defects.length} defects logged</p>
                </div>
                <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">COMPLIANCE</p>
                  <p className="font-headline-md text-headline-md font-bold text-compliance-green">{complianceScore}%</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Current score</p>
                </div>
                <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">GROUNDED</p>
                  <p className="font-headline-md text-headline-md font-bold text-danger-red">{groundedCount}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Vehicles grounded</p>
                </div>
              </div>

              {/* Fleet Status Donut + Defects Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
                {/* Fleet Status */}
                <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                  <h3 className="font-title-sm text-title-sm text-primary mb-4">Fleet Status</h3>
                  <div className="flex items-center gap-8">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#eeeeec" strokeWidth="15" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#16A34A" strokeWidth="15" strokeDasharray={251.2 * (vehicles.filter(v => !v.isGrounded).length / Math.max(1, vehicles.length))} strokeDashoffset={251.2 * (1 - vehicles.filter(v => !v.isGrounded).length / Math.max(1, vehicles.length))} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-headline-md font-bold text-primary">{Math.round((vehicles.filter(v => !v.isGrounded).length / Math.max(1, vehicles.length)) * 100)}%</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-compliance-green"></div><span className="text-body-sm">{vehicles.filter(v => !v.isGrounded).length} Roadworthy</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-danger-red"></div><span className="text-body-sm">{groundedCount} Grounded</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-major-defect-orange"></div><span className="text-body-sm">{activeDefectsCount} Active Defects</span></div>
                    </div>
                  </div>
                </div>

                {/* Defects by Severity */}
                <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                  <h3 className="font-title-sm text-title-sm text-primary mb-4">Defects by Severity</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Dangerous', count: defects.filter(d => d.severity === 'dangerous').length, color: '#DC2626' },
                      { label: 'Major', count: defects.filter(d => d.severity === 'major').length, color: '#EA580C' },
                      { label: 'Minor', count: defects.filter(d => d.severity === 'minor').length, color: '#F59E0B' },
                    ].map(item => {
                      const max = Math.max(defects.length, 1);
                      return (
                        <div key={item.label}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-body-sm font-bold text-primary">{item.label}</span>
                            <span className="font-data-mono text-data-mono">{item.count}</span>
                          </div>
                          <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(item.count / max) * 100}%`, backgroundColor: item.color }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Top Failed Items */}
              <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                <h3 className="font-title-sm text-title-sm text-primary mb-4">Most Failed Checklist Items</h3>
                {(() => {
                  const failCounts: Record<string, { label: string; count: number }> = {};
                  checks.forEach(c => c.items?.forEach(item => {
                    if (item.result === 'fail') {
                      if (!failCounts[item.itemKey]) failCounts[item.itemKey] = { label: item.itemLabel, count: 0 };
                      failCounts[item.itemKey].count++;
                    }
                  }));
                  const sorted = Object.values(failCounts).sort((a, b) => b.count - a.count).slice(0, 5);
                  return sorted.length === 0 ? (
                    <div className="text-center py-8 text-on-surface-variant font-body-sm">No failed items recorded yet.              {/* Driver Scores Leaderboard */}
              <div className="bg-surface-card border border-border-subtle p-card-padding">
                <h3 className="font-title-sm text-title-sm text-primary mb-4">Driver Scores</h3>
                {driverScores.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-variant font-body-sm">No driver data yet.</div>
                ) : (
                  <div className="space-y-2">
                    {driverScores.map((s, i) => (
                      <div key={s.driverId} className="flex items-center justify-between p-3 bg-surface-container-low border border-border-subtle">
                        <div className="flex items-center gap-3">
                          <span className={"w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white " + (s.overallScore >= 90 ? "bg-compliance-green" : s.overallScore >= 70 ? "bg-major-defect-orange" : "bg-danger-red")}>{i + 1}</span>
                          <div>
                            <p className="font-body-md font-bold text-primary">{s.driverName}</p>
                            <div className="flex gap-2 text-[10px] text-on-surface-variant">
                              <span>Compl: {s.breakdown.completeness}%</span>
                              <span>Speed: {s.breakdown.speed}%</span>
                              <span>Defects: {s.breakdown.defects}%</span>
                            </div>
                          </div>
                        </div>
                        <span className={"px-2 py-1 rounded font-label-caps text-label-caps font-bold " + (s.overallScore >= 90 ? "bg-compliance-green/10 text-compliance-green" : s.overallScore >= 70 ? "bg-major-defect-orange/10 text-major-defect-orange" : "bg-danger-red/10 text-danger-red")}>{s.overallScore}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div></div>
                  ) : (
                    <div className="space-y-2">
                      {sorted.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-surface-container-low border border-border-subtle">
                          <span className="font-body-md text-primary">{item.label}</span>
                          <span className="font-data-mono text-data-mono text-danger-red">{item.count}x</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ===== TAB: PARTS INVENTORY ===== */}
          {activeTab === "parts" && (
            <div className="flex flex-col gap-6">
              <div className="bg-surface-card border border-border-subtle p-card-padding flex items-center justify-between">
                <div><h3 className="font-title-sm text-title-sm text-primary">Parts Inventory</h3><p className="font-body-sm text-body-sm text-on-surface-variant">Manage spare parts stock and suppliers.</p></div>
                <button onClick={() => { setShowPartModal(true) }} className="flex items-center gap-2 bg-primary text-secondary-container px-4 py-2 font-bold font-label-caps text-label-caps hover:opacity-90 cursor-pointer"><span className="material-symbols-outlined text-lg">add</span> Add Part</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {parts.length === 0 ? <div className="col-span-full bg-surface-card border border-border-subtle p-card-padding text-center py-12 text-on-surface-variant font-body-sm">No parts in inventory.</div>
                : parts.map(p => {
                  const lowStock = p.quantity <= p.minStock;
                  const outOfStock = p.quantity === 0;
                  return (<div key={p.id} className={"bg-surface-card border " + (outOfStock ? "border-danger-red/30" : lowStock ? "border-orange-400/30" : "border-border-subtle") + " p-card-padding flex flex-col"}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-title-sm text-title-sm text-primary">{p.name}</h4>
                        <span className={"px-2 py-0.5 text-[10px] font-label-caps rounded uppercase " + (outOfStock ? "bg-danger-red/10 text-danger-red" : lowStock ? "bg-orange-400/10 text-orange-500" : "bg-compliance-green/10 text-compliance-green")}>{outOfStock ? "OUT" : lowStock ? "LOW" : "IN STOCK"}</span>
                      </div>
                      <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Qty:</span><span className={"font-data-mono font-bold" + (outOfStock ? " text-danger-red" : "")}>{p.quantity}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Min Stock:</span><span className="font-data-mono">{p.minStock}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Unit Cost:</span><span className="font-data-mono">£{p.unitCost.toFixed(2)}</span></div>
                      {p.supplier && <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Supplier:</span><span className="font-body-sm">{p.supplier}</span></div>}
                      <div className="mt-3 pt-3 border-t border-border-subtle flex gap-2">
                        <button onClick={() => { fetch(`/api/parts/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json", "X-Company-Id": company.id }, body: JSON.stringify({ quantity: p.quantity + 1 }) }).then(() => loadPartsAndWOs()); }} className="flex-1 py-1 border border-border-subtle text-on-surface-variant hover:bg-surface-container text-xs cursor-pointer">+1</button>
                        <button onClick={async () => { if (confirm("Delete part?")) { await fetch(`/api/parts/${p.id}`, { method: "DELETE", headers: { "X-Company-Id": company.id } }); loadPartsAndWOs(); }}} className="px-2 py-1 border border-danger-red/20 text-danger-red hover:bg-danger-red/5 text-xs cursor-pointer"><span className="material-symbols-outlined text-sm">delete</span></button>
                      </div>
                    </div>);
                })}
              </div>
            </div>
          )}

          {/* ===== TAB: WORK ORDERS ===== */}
          {activeTab === "workorders" && (
            <div className="flex flex-col gap-6">
              <div className="bg-surface-card border border-border-subtle p-card-padding flex items-center justify-between">
                <div><h3 className="font-title-sm text-title-sm text-primary">Work Orders</h3><p className="font-body-sm text-body-sm text-on-surface-variant">Track mechanic tasks from defect reports.</p></div>
                <button onClick={() => { setShowWOModal(true) }} className="flex items-center gap-2 bg-primary text-secondary-container px-4 py-2 font-bold font-label-caps text-label-caps hover:opacity-90 cursor-pointer"><span className="material-symbols-outlined text-lg">add</span> New Work Order</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
                {[{status:"open",label:"Open",color:"bg-blue-500/10 text-blue-600"},{status:"in_progress",label:"In Progress",color:"bg-amber-500/10 text-amber-600"},{status:"awaiting_parts",label:"Awaiting Parts",color:"bg-purple-500/10 text-purple-600"},{status:"completed",label:"Completed",color:"bg-emerald-500/10 text-emerald-600"}].map(col => {
                  const items = workOrders.filter(w => w.status === col.status);
                  return (<div key={col.status} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/wo-id"); if (id && col.status !== workOrders.find(w => w.id === id)?.status) handleWOStatus(id, col.status); }} className="bg-surface-container-low border border-border-subtle p-3">
                      <div className={"text-xs font-bold px-2 py-1 rounded mb-3 " + col.color}>{col.label} ({items.length})</div>
                      <div className="space-y-2 min-h-[120px]">
                        {items.length === 0 ? <div className="text-xs text-on-surface-variant text-center py-4 italic">Empty</div>
                        : items.slice(0, 10).map(wo => {
                          const veh = vehicles.find(v => v.id === wo.vehicleId);
                          return (<div key={wo.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/wo-id", wo.id)} className="bg-white border border-border-subtle p-3 text-xs hover:border-primary transition-colors cursor-pointer" onClick={() => { if (wo.status !== "completed") { const next = wo.status === "open" ? "in_progress" : wo.status === "in_progress" ? "awaiting_parts" : "completed"; handleWOStatus(wo.id, next); }}}>
                              <div className="flex justify-between items-start mb-1"><span className="font-bold text-primary">{wo.title}</span></div>
                              {veh && <div className="mb-1"><UkPlate registration={veh.registration} size="sm" /></div>}
                              {wo.assignedMechanic && <div className="text-on-surface-variant mb-1">Mechanic: {wo.assignedMechanic}</div>}
                              {wo.notes && <div className="text-on-surface-variant truncate">{wo.notes}</div>}
                              <div className="text-[9px] text-on-surface-variant mt-1 font-data-mono">{new Date(wo.createdAt).toLocaleDateString()}</div>
                            </div>);
                        })}
                      </div>
                    </div>);
                })}
              </div>
            </div>
          )}

          {/* ===== TAB: FLEET MAP ===== */}
          {activeTab === "fleetmap" && (
            <div className="flex flex-col gap-6">
              <div className="bg-surface-card border border-border-subtle p-card-padding">
                <h3 className="font-title-sm text-title-sm text-primary mb-1">Fleet Location Map</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Real-time vehicle positions via GPS tracking during walkaround checks.</p>
                <div id="fleet-map" className="w-full h-[500px] bg-surface-container border border-border-subtle relative rounded overflow-hidden">
                  {vehiclePositions.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant font-body-sm flex-col gap-2">
                      <span className="material-symbols-outlined text-4xl">map</span>
                      <span>No location data yet. Positions appear when drivers perform walkaround checks with GPS enabled.</span>
                    </div>
                  ) : (
                    <>
                      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                      <div id="leaflet-map-container" className="w-full h-full"></div>
                      <script dangerouslySetInnerHTML={{__html: `
                        (function() {
                          const container = document.getElementById('leaflet-map-container');
                          if (!container || window.leafletMapInited) return;
                          window.leafletMapInited = true;
                          const L = window.L;
                          if (!L) {
                            const script = document.createElement('script');
                            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                            script.onload = function() { initMap(); };
                            document.head.appendChild(script);
                            return;
                          }
                          function initMap() {
                            const map = L.map('leaflet-map-container').setView([52.5, -1.5], 7);
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                              attribution: '&copy; OpenStreetMap contributors'
                            }).addTo(map);
                            const positions = ` + JSON.stringify(vehiclePositions) + `;
                            const vehicles = ` + JSON.stringify(vehicles) + `;
                            positions.forEach(function(pos) {
                              const veh = vehicles.find(function(v) { return v.id === pos.vehicleId; });
                              const reg = veh ? veh.registration : 'Unknown';
                              const color = veh && veh.isGrounded ? 'red' : 'blue';
                              const marker = L.circleMarker([pos.latitude, pos.longitude], {
                                radius: 8, fillColor: color, color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.8
                              }).addTo(map);
                              marker.bindPopup('<b>' + reg + '</b><br/>Lat: ' + pos.latitude.toFixed(4) + '<br/>Lng: ' + pos.longitude.toFixed(4) + (pos.speed ? '<br/>Speed: ' + pos.speed.toFixed(1) + ' km/h' : '') + '<br/><a href="https://www.google.com/maps?q=' + pos.latitude + ',' + pos.longitude + '" target="_blank">Open in Google Maps</a>');
                            });
                            if (positions.length > 0) {
                              const bounds = positions.map(function(p) { return [p.latitude, p.longitude]; });
                              map.fitBounds(bounds, { padding: [30, 30] });
                            }
                          }
                          if (window.L) initMap();
                        })();
                      `}} />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB: FUEL & EXPENSES ===== */}
          {activeTab === 'fuel' && (
            <div className="flex flex-col gap-6">
              <div className="bg-surface-card border border-border-subtle p-card-padding flex items-center justify-between">
                <div>
                  <h3 className="font-title-sm text-title-sm text-primary">Fuel &amp; Expenses</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Track fuel purchases, costs, and vehicle expenses.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowFuelModal(true)} className="flex items-center gap-2 bg-primary text-secondary-container px-4 py-2 font-bold font-label-caps text-label-caps hover:opacity-90 cursor-pointer">Add Fuel</button>
                  <button onClick={() => setShowExpModal(true)} className="flex items-center gap-2 border border-primary text-primary px-4 py-2 font-bold font-label-caps text-label-caps hover:bg-primary hover:text-white cursor-pointer">Add Expense</button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
                <div className="bg-surface-card border border-border-subtle p-card-padding">
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">TOTAL FUEL SPENT</p>
                  <p className="font-headline-md text-headline-md font-bold text-primary">£{fuelRecords.reduce((s, r) => s + r.totalCost, 0).toFixed(2)}</p>
                </div>
                <div className="bg-surface-card border border-border-subtle p-card-padding">
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">TOTAL EXPENSES</p>
                  <p className="font-headline-md text-headline-md font-bold text-primary">£{expenses.reduce((s, r) => s + r.amount, 0).toFixed(2)}</p>
                </div>
                <div className="bg-surface-card border border-border-subtle p-card-padding">
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">LITERS PURCHASED</p>
                  <p className="font-headline-md text-headline-md font-bold text-primary">{fuelRecords.reduce((s, r) => s + r.liters, 0).toFixed(1)} L</p>
                </div>
                <div className="bg-surface-card border border-border-subtle p-card-padding">
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">AVG COST/LITER</p>
                  <p className="font-headline-md text-headline-md font-bold text-major-defect-orange">
                    £{fuelRecords.length > 0 ? (fuelRecords.reduce((s, r) => s + r.totalCost, 0) / fuelRecords.reduce((s, r) => s + r.liters, 0)).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>

              {/* Fuel Records Table */}
              <div className="bg-surface-card border border-border-subtle overflow-hidden">
                <div className="p-card-padding border-b border-border-subtle">
                  <h3 className="font-title-sm text-title-sm text-primary">Fuel Log</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead><tr className="bg-surface-container-low border-b border-border-subtle">
                      <th className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant">Date</th>
                      <th className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant">Vehicle</th>
                      <th className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant">Liters</th>
                      <th className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant">Cost/L</th>
                      <th className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant">Total</th>
                      <th className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant">Odometer</th>
                      <th className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant">Station</th>
                      <th className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant"></th>
                    </tr></thead>
                    <tbody className="divide-y divide-border-subtle">
                      {fuelRecords.length === 0 ? (
                        <tr><td colSpan={8} className="p-8 text-center text-on-surface-variant font-body-sm">No fuel records yet.</td></tr>
                      ) : fuelRecords.slice(0, 20).map(r => {
                        const veh = vehicles.find(v => v.id === r.vehicleId);
                        return (<tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="px-4 py-3 font-data-mono text-data-mono">{r.date}</td>
                          <td className="px-4 py-3">{veh ? <UkPlate registration={veh.registration} size="sm" /> : '—'}</td>
                          <td className="px-4 py-3 font-data-mono">{r.liters.toFixed(1)}</td>
                          <td className="px-4 py-3 font-data-mono">£{r.costPerLiter.toFixed(2)}</td>
                          <td className="px-4 py-3 font-data-mono font-bold">£{r.totalCost.toFixed(2)}</td>
                          <td className="px-4 py-3 font-data-mono">{r.odometer.toLocaleString()}</td>
                          <td className="px-4 py-3 font-body-sm text-on-surface-variant">{r.station}</td>
                          <td className="px-4 py-3"><button onClick={async () => { if (confirm('Delete?')) { await fetch(`/api/fuel/${r.id}`, { method: 'DELETE', headers: { 'X-Company-Id': company.id } }); loadFuelData(); }}} className="text-on-surface-variant hover:text-danger-red cursor-pointer"><X className="w-4 h-4" /></button></td>
                        </tr>);
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Expenses */}
              <div className="bg-surface-card border border-border-subtle p-card-padding">
                <h3 className="font-title-sm text-title-sm text-primary mb-4">Recent Expenses</h3>
                {expenses.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-variant font-body-sm">No expenses logged.</div>
                ) : (
                  <div className="space-y-2">
                    {expenses.slice(0, 10).map(e => {
                      const veh = vehicles.find(v => v.id === e.vehicleId);
                      return (
                        <div key={e.id} className="flex items-center justify-between p-3 bg-surface-container-low border border-border-subtle">
                          <div className="flex items-center gap-3">
                            <span className="font-label-caps text-[10px] uppercase text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">{e.category}</span>
                            {veh && <UkPlate registration={veh.registration} size="sm" />}
                            <span className="font-body-sm text-on-surface-variant">{e.description}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-data-mono font-bold text-primary">£{e.amount.toFixed(2)}</span>
                            <button onClick={async () => { if (confirm('Delete?')) { await fetch(`/api/expenses/${e.id}`, { method: 'DELETE', headers: { 'X-Company-Id': company.id } }); loadFuelData(); }}} className="text-on-surface-variant hover:text-danger-red cursor-pointer"><X className="w-4 h-4" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>


          )}
          {/* ===== TAB: MAINTENANCE ===== */}
          {activeTab === 'maintenance' && (
            <div className="flex flex-col gap-6">
              <div className="bg-surface-card border border-border-subtle p-card-padding flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-title-sm text-title-sm text-primary">Maintenance &amp; Documents</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Track service records, MOT dates, and store vehicle documents.</p>
                </div>
                <button onClick={() => { setMaintVeh(''); setMaintType('service'); setMaintTitle(''); setMaintDesc(''); setMaintDue(''); setMaintOdo(0); setMaintCost(0); setMaintWorkshop(''); setShowMaintModal(true); }}
                  className="flex items-center gap-2 bg-primary text-secondary-container px-6 py-3 font-bold font-label-caps text-label-caps hover:opacity-90 transition-all cursor-pointer active:scale-[0.98]">
                  <Plus className="w-4 h-4" /> Add Record
                </button>
              </div>

              {/* Maintenance Records */}
              <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                <h3 className="font-title-sm text-title-sm text-primary mb-4">Service Records</h3>
                {maintenanceRecords.length === 0 ? (
                  <div className="text-center py-12 text-on-surface-variant font-body-sm">No maintenance records yet.</div>
                ) : (
                  <div className="space-y-3">
                    {maintenanceRecords.map(m => {
                      const veh = vehicles.find(v => v.id === m.vehicleId);
                      return (
                        <div key={m.id} className="flex items-center justify-between p-4 bg-surface-container-low border border-border-subtle hover:border-primary transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded flex items-center justify-center ${m.status === 'completed' ? 'bg-compliance-green/10' : m.status === 'overdue' ? 'bg-danger-red/10' : 'bg-secondary-container/10'}`}>
                              <span className="material-symbols-outlined text-lg">{m.type === 'mot' ? 'calendar_today' : 'build'}</span>
                            </div>
                            <div>
                              <h4 className="font-body-md font-bold text-primary">{m.title}</h4>
                              <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                                {veh && <span><UkPlate registration={veh.registration} size="sm" /></span>}
                                <span>Due: {m.dueDate}</span>
                                {m.workshop && <span>@{m.workshop}</span>}
                                {m.cost ? <span>£{m.cost.toFixed(2)}</span> : null}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusPill label={m.status} color={m.status === 'completed' ? 'green' : m.status === 'overdue' ? 'red' : m.status === 'in_progress' ? 'amber' : 'slate'} />
                            <button onClick={async () => {
                              if (!confirm('Delete this record?')) return;
                              const res = await fetch(`/api/maintenance/${m.id}`, { method: 'DELETE', headers: { 'X-Company-Id': company.id } });
                              if (res.ok) loadMaint();
                            }} className="text-on-surface-variant hover:text-danger-red cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Documents Section */}
              <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-title-sm text-title-sm text-primary">Vehicle Documents</h3>
                  <button onClick={() => { setDocVeh(''); setDocType('other'); setDocName(''); setDocExpiry(''); setShowDocModal(true); }}
                    className="flex items-center gap-1 text-secondary-container font-bold text-sm hover:underline cursor-pointer">
                    <Plus className="w-4 h-4" /> Add Document
                  </button>
                </div>
                {docs.length === 0 ? (
                  <div className="text-center py-12 text-on-surface-variant font-body-sm">No documents uploaded. Add MOT certs, insurance, etc.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {docs.map(doc => {
                      const veh = doc.vehicleId ? vehicles.find(v => v.id === doc.vehicleId) : null;
                      const isExpiring = doc.expiryDate && doc.expiryDate < new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];
                      return (
                        <div key={doc.id} className={`p-4 border ${isExpiring ? 'border-danger-red/30 bg-danger-red/5' : 'border-border-subtle bg-surface-card'} flex flex-col gap-2`}>
                          <div className="flex justify-between items-start">
                            <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">{doc.type.toUpperCase()}</span>
                            <button onClick={async () => {
                              if (!confirm('Delete document?')) return;
                              const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE', headers: { 'X-Company-Id': company.id } });
                              if (res.ok) loadDocs();
                            }} className="text-on-surface-variant hover:text-danger-red cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                          </div>
                          <p className="font-body-md font-bold text-primary">{doc.fileName}</p>
                          {veh && <UkPlate registration={veh.registration} size="sm" />}
                          {doc.expiryDate && <p className={`text-xs font-data-mono ${isExpiring ? 'text-danger-red font-bold' : 'text-on-surface-variant'}`}>Expires: {doc.expiryDate}{isExpiring ? ' âš ' : ''}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* ===== TAB: TEMPLATES ===== */}
          {activeTab === 'templates' && (
            <div className="flex flex-col gap-6">
              <div className="bg-surface-card border border-border-subtle p-card-padding flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-title-sm text-title-sm text-primary">Checklist Templates</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Create and manage custom inspection checklist templates for your fleet.</p>
                </div>
                <button onClick={() => {
                  setEditingTemplate(null);
                  setTemplateName('');
                  setTemplateDesc('');
                  setTemplateItems([]);
                  setShowTemplateModal(true);
                }} className="flex items-center gap-2 bg-primary text-secondary-container px-6 py-3 font-bold font-label-caps text-label-caps hover:opacity-90 transition-all cursor-pointer active:scale-[0.98]">
                  <Plus className="w-4 h-4" /> New Template
                </button>
                <button type="button" onClick={() => {
                  setPublishTemplates([
                    { name: "Scaffolding Fleet Daily Check", desc: "10 items with load securement photos for scaffolding flatbeds", selected: true },
                    { name: "Haulage & Trailer Daily Check", desc: "8 items with trailer coupling photos for logistics fleets", selected: false },
                    { name: "Owner-Operator Daily Check", desc: "6 items streamlined for single-vehicle operators", selected: false },
                  ]);
                  setShowTemplatePicker(true);
                }} className="px-3 py-2 border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1">
                  + Add Built-in Templates
                </button>
              </div>

              {/* Template Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {/* DVSA Default Template - always shown first */}
                <div className="bg-surface-card border-2 border-secondary-container/30 p-card-padding flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-title-sm text-title-sm text-primary">DVSA 27-Point Standard</h4>
                      <span className="font-label-caps text-[10px] text-secondary-container uppercase tracking-wider">Default — Always Available</span>
                    </div>
                    <span className="font-data-mono text-data-mono text-on-surface-variant text-xs">27 items</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Official DVSA daily walkaround check. Cab interior (Group A) and vehicle exterior (Group B). Protected — cannot be edited or deleted.</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-0.5 bg-secondary-container/10 text-secondary-container text-[10px] font-label-caps rounded uppercase border border-secondary-container/20">interior</span>
                    <span className="px-2 py-0.5 bg-secondary-container/10 text-secondary-container text-[10px] font-label-caps rounded uppercase border border-secondary-container/20">exterior</span>
                  </div>
                  <div className="mt-auto pt-3 border-t border-border-subtle flex gap-2">
                    <button disabled className="flex-1 py-1.5 border border-border-subtle text-on-surface-variant/50 text-xs cursor-not-allowed">
                      Protected
                    </button>
                    <button disabled className="px-3 py-1.5 border border-border-subtle text-on-surface-variant/50 text-xs cursor-not-allowed">
                      <Lock className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {templates.length === 0 ? (
                  <div className="col-span-full bg-surface-card border border-border-subtle p-card-padding text-center py-16">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4 block">checklist</span>
                    <p className="font-body-md text-on-surface-variant">Create your first custom inspection checklist above.</p>
                  </div>
                ) : (
                  templates.map(tpl => (
                    <div key={tpl.id} className="bg-surface-card border border-border-subtle p-card-padding flex flex-col group hover:border-primary transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-title-sm text-title-sm text-primary">{tpl.name}</h4>
                        <span className="font-data-mono text-data-mono text-on-surface-variant text-xs">{tpl.items.length} items</span>
                      </div>
                      {tpl.description && <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">{tpl.description}</p>}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {[...new Set(tpl.items.map(i => i.group))].map(g => (
                          <span key={g} className="px-2 py-0.5 bg-surface-container text-on-surface-variant text-[10px] font-label-caps rounded uppercase">{g}</span>
                        ))}
                      </div>
                      <div className="mt-auto pt-3 border-t border-border-subtle flex gap-2">
                        <button onClick={() => {
                          if (tpl.id === 'tpl-dvsa-default') { alert('DVSA default template is built-in and cannot be edited.'); return; }
                          setEditingTemplate(tpl);
                          setTemplateName(tpl.name);
                          setTemplateDesc(tpl.description || '');
                          setTemplateItems(tpl.items.map(it => ({ ...it, group: it.group as any, requiresTrailer: !!it.requiresTrailer })));
                          setShowTemplateModal(true);
                        }} className="flex-1 py-1.5 border border-border-subtle text-on-surface-variant hover:bg-surface-container text-xs font-bold cursor-pointer uppercase tracking-tight">
                          {tpl.id === 'tpl-dvsa-default' ? 'Built-in' : 'Edit Logic'}
                        </button>
                        <button onClick={async () => {
                          if (tpl.id === 'tpl-dvsa-default') { alert('DVSA default template cannot be deleted.'); return; }
                          if (!confirm('Proceed to permanently remove this inspection template?')) return;
                          
                          if (onDeleteTemplate) {
                            await onDeleteTemplate(tpl.id);
                          } else {
                            const res = await fetch(`/api/templates/${tpl.id}`, { method: 'DELETE', headers: { 'X-Company-Id': company.id } });
                            if (res.ok) onTriggerRefresh();
                          }
                        }} className="px-3 py-1.5 border border-danger-red/20 text-danger-red hover:bg-danger-red/5 text-xs font-bold cursor-pointer rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ===== TAB: BILLING ===== */}
          {activeTab === 'billing' && (
            <div className="flex flex-col gap-6">
              {/* Top Row: Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                <div className="bg-surface-card border border-border-subtle p-card-padding flex flex-col justify-between min-h-[160px]">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Active Plan</p>
                      <h3 className="font-headline-md text-headline-md text-primary mt-1">
                        {company.plan === 'owner-driver' ? 'Solo' : company.plan === 'starter' ? 'Starter' : company.plan === 'growth' ? 'Growth Pro' : 'Enterprise'}
                      </h3>
                    </div>
                    <span className="material-symbols-outlined text-secondary-container text-3xl">verified</span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-data-mono text-data-mono text-2xl font-bold">
                      {company.plan === 'owner-driver' ? '£4.99' : company.plan === 'starter' ? '£14.99' : company.plan === 'growth' ? '£34.99' : 'POA'}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">/ month</span>
                  </div>

                </div>

                <div className="bg-surface-card border border-border-subtle p-card-padding flex flex-col justify-between min-h-[160px]">
                  <div>
                    <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Fleet Capacity</p>
                    <div className="mt-1 flex items-center justify-between">
                      <h3 className="font-headline-md text-headline-md text-primary">{vehicles.length} / {company.vehicleLimit}</h3>
                      <span className="font-body-sm text-body-sm text-compliance-green font-medium">{Math.max(0, company.vehicleLimit - vehicles.length)} Available</span>
                    </div>
                  </div>
                  <div className="w-full bg-surface-container-low h-2 mt-4 rounded-full overflow-hidden">
                    <div className="bg-primary h-full transition-all duration-700" style={{ width: `${Math.min(100, (vehicles.length / Math.max(1, company.vehicleLimit)) * 100)}%` }}></div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-surface-card border border-border-subtle p-card-padding flex flex-col justify-between min-h-[160px]">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Payment Method</p>
                      <h3 className="font-headline-md text-headline-md text-primary mt-1">Paddle</h3>
                    </div>
                    <span className="material-symbols-outlined text-secondary-container text-3xl">credit_card</span>
                  </div>
                  <div className="mt-auto">
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Billing is securely managed through Paddle.</p>
                    <button onClick={() => window.open("https://getwalksafe.co.uk/refund-policy.html", "_blank")}
                      className="mt-3 px-4 py-2 bg-primary text-white font-label-caps text-label-caps rounded hover:opacity-90 transition-opacity cursor-pointer w-full text-center">
                      View Billing Info
                    </button>
                  </div>
                </div>
              </div>

              {/* Plan Matrix */}
              <div>
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <h2 className="font-headline-md text-headline-md text-primary font-bold">Scaling Solutions</h2>
                    <p className="font-body-md text-body-md text-on-surface-variant">Select a plan that matches your operational complexity.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Solo */}
                  <div className="bg-surface-card border border-border-subtle p-card-padding flex flex-col h-full">
                    <h4 className="font-title-sm text-title-sm text-primary">Solo</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant min-h-[40px] mt-1">For independent owner-operators.</p>
                    <div className="mt-6"><span className="font-display-lg text-display-lg text-primary">£4.99</span><span className="text-on-surface-variant">/mo</span></div>
                    <ul className="mt-8 space-y-3 flex-1">
                      <li className="flex items-center gap-2 text-body-sm"><span className="material-symbols-outlined text-compliance-green text-lg">check_circle</span> 1 Vehicle License</li>
                      <li className="flex items-center gap-2 text-body-sm"><span className="material-symbols-outlined text-compliance-green text-lg">check_circle</span> Basic Digital Logbook</li>
                      <li className="flex items-center gap-2 text-body-sm opacity-40 line-through"><span className="material-symbols-outlined text-lg">cancel</span> DVSA Earned Recognition</li>
                    </ul>
                    <button onClick={() => handlePlanUpgrade('owner-driver', 1)} className="mt-8 w-full py-3 border border-primary text-primary font-bold font-label-caps hover:bg-primary hover:text-on-primary transition-all cursor-pointer">
                      {company.plan === 'owner-driver' ? 'CURRENT PLAN' : 'SELECT'}
                    </button>
                  </div>
                  {/* Starter */}
                  <div className="bg-surface-card border border-border-subtle p-card-padding flex flex-col h-full">
                    <h4 className="font-title-sm text-title-sm text-primary">Starter</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant min-h-[40px] mt-1">Small fleets growing their operations.</p>
                    <div className="mt-6"><span className="font-display-lg text-display-lg text-primary">£14.99</span><span className="text-on-surface-variant">/mo</span></div>
                    <ul className="mt-8 space-y-3 flex-1">
                      <li className="flex items-center gap-2 text-body-sm"><span className="material-symbols-outlined text-compliance-green text-lg">check_circle</span> Up to 5 Vehicles</li>
                      <li className="flex items-center gap-2 text-body-sm"><span className="material-symbols-outlined text-compliance-green text-lg">check_circle</span> Defect Triage System</li>
                      <li className="flex items-center gap-2 text-body-sm"><span className="material-symbols-outlined text-compliance-green text-lg">check_circle</span> Automated Comms</li>
                    </ul>
                    <button onClick={() => handlePlanUpgrade('starter', 5)} className="mt-8 w-full py-3 border border-primary text-primary font-bold font-label-caps hover:bg-primary hover:text-on-primary transition-all cursor-pointer">
                      {company.plan === 'starter' ? 'CURRENT PLAN' : 'SELECT'}
                    </button>
                  </div>
                  {/* Growth Pro */}
                  <div className="bg-surface-card border-2 border-primary p-card-padding flex flex-col h-full relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-compliance-green text-white font-label-caps text-[10px] px-3 py-1 rounded-full uppercase tracking-widest">Most Popular</div>
                    <h4 className="font-title-sm text-title-sm text-primary flex items-center justify-between">Growth Pro <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span></h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant min-h-[40px] mt-1">The compliance standard for mid-sized haulage.</p>
                    <div className="mt-6"><span className="font-display-lg text-display-lg text-primary">£34.99</span><span className="text-on-surface-variant">/mo</span></div>
                    <ul className="mt-8 space-y-3 flex-1">
                      <li className="flex items-center gap-2 text-body-sm font-semibold"><span className="material-symbols-outlined text-compliance-green text-lg">check_circle</span> Up to 20 Vehicles</li>
                      <li className="flex items-center gap-2 text-body-sm"><span className="material-symbols-outlined text-compliance-green text-lg">check_circle</span> ER Compliance Dashboard</li>
                      <li className="flex items-center gap-2 text-body-sm"><span className="material-symbols-outlined text-compliance-green text-lg">check_circle</span> Priority Support 24/7</li>
                      <li className="flex items-center gap-2 text-body-sm"><span className="material-symbols-outlined text-compliance-green text-lg">check_circle</span> Maintenance API access</li>
                    </ul>
                    <button onClick={() => handlePlanUpgrade('growth', 20)} className="mt-8 w-full py-3 bg-surface-container-low text-primary text-center font-bold font-label-caps border border-primary/10 cursor-pointer">
                      {company.plan === 'growth' ? 'CURRENT PLAN' : 'SELECT'}
                    </button>
                  </div>
                  {/* Enterprise */}
                  <div className="bg-surface-card border border-border-subtle p-card-padding flex flex-col h-full">
                    <h4 className="font-title-sm text-title-sm text-primary">Enterprise</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant min-h-[40px] mt-1">Multi-site logistics &amp; large fleets.</p>
                    <div className="mt-6"><span className="font-display-lg text-display-lg text-primary">POA</span></div>
                    <ul className="mt-8 space-y-3 flex-1">
                      <li className="flex items-center gap-2 text-body-sm"><span className="material-symbols-outlined text-compliance-green text-lg">check_circle</span> Unlimited Vehicles</li>
                      <li className="flex items-center gap-2 text-body-sm"><span className="material-symbols-outlined text-compliance-green text-lg">check_circle</span> Custom Integrations</li>
                      <li className="flex items-center gap-2 text-body-sm"><span className="material-symbols-outlined text-compliance-green text-lg">check_circle</span> Dedicated Account Manager</li>
                    </ul>
                    <button onClick={() => handlePlanUpgrade('enterprise', 999)} className="mt-8 w-full py-3 bg-primary text-white font-bold font-label-caps hover:bg-primary/90 transition-all cursor-pointer">
                      TALK TO SALES
                    </button>
                  </div>
                </div>
              </div>

              {/* Invoice History */}
              <div className="bg-surface-card border border-border-subtle p-card-padding hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-title-sm text-title-sm text-primary">Invoice History</h3>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 border border-border-subtle flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-sm">filter_list</span> Filter
                    </button>
                    <button className="px-3 py-1.5 border border-border-subtle flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-sm">download</span> Export CSV
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border-subtle">
                        <th className="pb-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Invoice Ref</th>
                        <th className="pb-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Period</th>
                        <th className="pb-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Status</th>
                        <th className="pb-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Amount</th>
                        <th className="pb-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      <tr><td colSpan={5} className="py-8 text-center font-body-sm text-body-sm text-on-surface-variant">Invoices are managed through Paddle. Visit your Paddle dashboard for billing history.</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>{/* end main container */}
      </main>

      {/* ===== MODALS ===== */}

      {/* Add/Edit Vehicle Modal */}
      {(showVehModal || editingVehicle) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => { setShowVehModal(false); resetVehForm(); }}>
          <div className="bg-white w-full max-w-2xl border border-border-subtle shadow-xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ borderRadius: '0.5rem' }}>
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">directions_car</span>
                <h3 className="font-title-sm text-title-sm text-primary">{editingVehicle ? 'Edit Vehicle' : 'Register New Asset'}</h3>
              </div>
              <button onClick={() => { setShowVehModal(false); resetVehForm(); }} className="p-1 hover:bg-surface-container rounded transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveVehicle} className="p-6 space-y-5">
              {/* DVLA Lookup */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">UK Registration Number</label>
                  <div className="flex">
                    <div className="flex items-stretch h-12 rounded-sm overflow-hidden border border-black/10 shadow-sm">
                      <div className="bg-plate-blue w-3 flex flex-col items-center justify-center">
                        <span className="text-[6px] text-white font-bold leading-none">GB</span>
                      </div>
                      <div className="bg-plate-yellow px-3 flex items-center">
                        <input type="text" value={vehReg} onChange={(e) => setVehReg(e.target.value.toUpperCase())} maxLength={8}
                          placeholder="ENTER VRM" className="bg-transparent border-none text-center font-plate-text text-[20px] focus:outline-hidden text-primary placeholder-primary/20 w-28 tracking-widest uppercase" />
                      </div>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={handleDvlaLookup} disabled={dvlaLoading}
                  className="px-4 py-2.5 bg-primary text-on-primary font-label-caps text-label-caps font-bold hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2">
                  {dvlaLoading ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> LOOKING UP...</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">cloud_download</span> DVLA Lookup</>
                  )}
                </button>
              </div>
              {dvlaError && <div className="p-2 bg-danger-red/10 text-danger-red text-body-sm rounded border border-danger-red/20">{dvlaError}</div>}
              {dvlaSuccess && <div className="p-2 bg-compliance-green/10 text-compliance-green text-body-sm rounded border border-compliance-green/20 flex items-center gap-2"><span className="material-symbols-outlined">check_circle</span> DVLA record found — fields auto-populated</div>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Make</label>
                  <input type="text" required value={vehMake} onChange={(e) => setVehMake(e.target.value)} className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary" />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Model</label>
                  <input type="text" required value={vehModel} onChange={(e) => setVehModel(e.target.value)} className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary" />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Year</label>
                  <input type="number" required value={vehYear} onChange={(e) => setVehYear(Number(e.target.value))} className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary" />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Colour</label>
                  <input type="text" required value={vehColour} onChange={(e) => setVehColour(e.target.value)} className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary" />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Type</label>
                  <select value={vehType} onChange={(e) => setVehType(e.target.value as any)} className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary">
                    <option value="lgv">LGV (Light Goods Vehicle)</option>
                    <option value="hgv">HGV (Heavy Goods Vehicle)</option>
                    <option value="hgv_trailer">HGV + Trailer</option>
                  </select>
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Assigned Driver</label>
                  <CustomSelect value={assignedDriverId} onChange={(val) => setAssignedDriverId(val)} placeholder="-- Assign Driver --" options={drivers.map(d => ({ value: d.id, label: d.fullName }))} />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">MOT Expiry</label>
                  <input type="date" value={vehMot} onChange={e => setVehMot(e.target.value)} className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary" min={new Date().toISOString().split("T")[0]} />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Tax Expiry</label>
                  <input type="date" value={vehTax} onChange={e => setVehTax(e.target.value)} className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary" min={new Date().toISOString().split("T")[0]} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                <button type="button" onClick={() => { setShowVehModal(false); resetVehForm(); }} className="px-4 py-2 border border-border-subtle text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSavingVehicle} className="px-6 py-2 bg-primary text-on-primary font-label-caps text-label-caps font-bold hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer">
                  {isSavingVehicle ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {showDrvModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => { setShowDrvModal(false); resetDrvForm(); }}>
          <div className="bg-white w-full max-w-lg border border-border-subtle shadow-xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ borderRadius: '0.5rem' }}>
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-title-sm text-title-sm text-primary flex items-center gap-2">{editingDriver ? 'Edit Driver' : 'Add New Driver'}
                {!editingDriver && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Step {drvStep} of 3</span>}
              </h3>
              <button onClick={() => { setShowDrvModal(false); resetDrvForm(); }} className="p-1 hover:bg-surface-container rounded transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveDriver} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Full Name</label>
                  <input type="text" required value={drvName} onChange={(e) => setDrvName(e.target.value)} className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary" />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Email</label>
                  <input type="email" value={drvEmail} onChange={(e) => setDrvEmail(e.target.value)} className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary" />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Phone</label>
                  <input type="text" value={drvPhone} onChange={(e) => setDrvPhone(e.target.value)} className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary" />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">4-Digit PIN</label>
                  <input type="text" maxLength={4} required value={drvPin} onChange={(e) => setDrvPin(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 1234" className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary font-data-mono tracking-widest text-center" />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Default Vehicle</label>
                  <CustomSelect value={drvDefaultVeh} onChange={(val) => setDrvDefaultVeh(val)} placeholder="-- None --" options={vehicles.map(v => ({ value: v.id, label: `${v.registration} (${v.make})` }))} />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={generateDriverLinkPlaceholder} className="px-3 py-1.5 border border-border-subtle text-on-surface-variant hover:bg-surface-container text-body-sm cursor-pointer">Generate Invite Link</button>
                {generatedLink && <span className="text-[10px] text-compliance-green font-data-mono">✓ Link created</span>}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                <button type="button" onClick={() => { setShowDrvModal(false); resetDrvForm(); }} className="px-4 py-2 border border-border-subtle text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSavingDriver} className="px-6 py-2 bg-primary text-on-primary font-label-caps text-label-caps font-bold hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer">
                  {isSavingDriver ? 'Saving...' : editingDriver ? 'Update Driver' : 'Add Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showSchModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowSchModal(false)}>
          <div className="bg-white w-full max-w-xl border border-border-subtle shadow-xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ borderRadius: '0.5rem' }}>
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-title-sm text-title-sm text-primary">Create Compliance Schedule</h3>
              <button onClick={() => setShowSchModal(false)} className="p-1 hover:bg-surface-container rounded transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <ChecklistSchedulerForm vehicles={vehicles} drivers={drivers} templates={templates} onSubmit={async (data) => { await onAddSchedule(data); setShowSchModal(false); }} />
            </div>
          </div>
        </div>
      )}

      {/* Part Modal */}
      {showPartModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowPartModal(false)}>
          <div className="bg-white w-full max-w-md border border-border-subtle shadow-xl" onClick={e => e.stopPropagation()} style={{ borderRadius: '0.5rem' }}>
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-title-sm text-title-sm text-primary">Add Part</h3>
              <button onClick={() => setShowPartModal(false)} className="p-1 hover:bg-surface-container rounded cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSavePart} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Part Name</label><input type="text" required value={partName} onChange={e => setPartName(e.target.value)} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded" /></div>
                <div><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Category</label>
                  <select value={partCat} onChange={e => setPartCat(e.target.value)} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded">
                    <option value="filter">Filter</option><option value="brake">Brake</option><option value="tire">Tire</option><option value="electrical">Electrical</option><option value="engine">Engine</option><option value="body">Body</option><option value="other">Other</option>
                  </select></div>
                <div><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Quantity</label><input type="number" min="0" required value={partQty} onChange={e => setPartQty(Number(e.target.value))} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded" /></div>
                <div><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Min Stock</label><input type="number" min="0" value={partMin} onChange={e => setPartMin(Number(e.target.value))} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded" /></div>
                <div><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Unit Cost (£)</label><input type="number" step="0.01" value={partCost} onChange={e => setPartCost(Number(e.target.value))} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded" /></div>
                <div className="col-span-2"><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Supplier</label><input type="text" value={partSupplier} onChange={e => setPartSupplier(e.target.value)} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                <button type="button" onClick={() => setShowPartModal(false)} className="px-4 py-2 border border-border-subtle text-on-surface-variant hover:bg-surface-container cursor-pointer">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-primary text-on-primary font-label-caps font-bold hover:opacity-90 cursor-pointer">Add Part</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Work Order Modal */}
      {showWOModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowWOModal(false)}>
          <div className="bg-white w-full max-w-lg border border-border-subtle shadow-xl" onClick={e => e.stopPropagation()} style={{ borderRadius: '0.5rem' }}>
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-title-sm text-title-sm text-primary">New Work Order</h3>
              <button onClick={() => setShowWOModal(false)} className="p-1 hover:bg-surface-container rounded cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveWO} className="p-6 space-y-4">
              <div><label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Vehicle</label><CustomSelect value={woVeh} onChange={setWoVeh} placeholder="Select vehicle" options={vehicles.map(v => ({ value: v.id, label: v.registration + ' (' + v.make + ')' }))} /></div>
              <div><label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Title</label><input type="text" required value={woTitle} onChange={e => setWotitle(e.target.value)} placeholder="e.g. Brake pad replacement" className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Assign Mechanic</label><input type="text" value={woMech} onChange={e => setWoMech(e.target.value)} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded" /></div>
                <div><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Related Defect (optional)</label><CustomSelect value={woDefect} onChange={setWoDefect} placeholder="-- None --" options={defects.filter(d => d.status !== 'closed').map(d => ({ value: d.id, label: d.itemLabel }))} /></div>
              </div>
              <div><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Notes</label><textarea value={woNotes} onChange={e => setWonotes(e.target.value)} rows={2} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded"></textarea></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                <button type="button" onClick={() => setShowWOModal(false)} className="px-4 py-2 border border-border-subtle text-on-surface-variant hover:bg-surface-container cursor-pointer">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-primary text-on-primary font-label-caps font-bold hover:opacity-90 cursor-pointer">Create Work Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Fuel Modal */}
      {showFuelModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowFuelModal(false)}>
          <div className="bg-white w-full max-w-lg border border-border-subtle shadow-xl" onClick={e => e.stopPropagation()} style={{ borderRadius: '0.5rem' }}>
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-title-sm text-title-sm text-primary">Add Fuel Record</h3>
              <button onClick={() => setShowFuelModal(false)} className="p-1 hover:bg-surface-container rounded cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveFuel} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Vehicle</label>
                  <CustomSelect value={fuelVeh} onChange={setFuelVeh} placeholder="Select vehicle" options={vehicles.map(v => ({ value: v.id, label: v.registration + ' (' + v.make + ')' }))} />
                </div>
                <div><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1" >Date</label><input type="date" value={fuelDate} onChange={e => setFuelDate(e.target.value)} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded" /></div>
                <div><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Fuel Type</label>
                  <select value={fuelType} onChange={e => setFuelType(e.target.value)} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded">
                    <option value="diesel">Diesel</option><option value="petrol">Petrol</option><option value="electric">Electric</option><option value="adblue">AdBlue</option>
                  </select>
                </div>
                <div><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Liters</label><input type="number" step="0.1" required value={fuelLiters} onChange={e => setFuelLiters(Number(e.target.value))} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded" /></div>
                <div><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Cost per Liter (£)</label><input type="number" step="0.01" value={fuelCostL} onChange={e => { setFuelCostL(Number(e.target.value)); setFuelTotal(Number(e.target.value) * fuelLiters); }} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded" /></div>
                <div><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Total Cost (£)</label><input type="number" step="0.01" value={fuelTotal} onChange={e => setFuelTotal(Number(e.target.value))} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded" /></div>
                <div><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Odometer (mi)</label><input type="number" value={fuelOdo} onChange={e => setFuelOdo(Number(e.target.value))} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded" /></div>
                <div className="col-span-2"><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Station</label><input type="text" value={fuelStation} onChange={e => setFuelStation(e.target.value)} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                <button type="button" onClick={() => setShowFuelModal(false)} className="px-4 py-2 border border-border-subtle text-on-surface-variant hover:bg-surface-container cursor-pointer">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-primary text-on-primary font-label-caps font-bold hover:opacity-90 cursor-pointer">Add Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowExpModal(false)}>
          <div className="bg-white w-full max-w-md border border-border-subtle shadow-xl" onClick={e => e.stopPropagation()} style={{ borderRadius: '0.5rem' }}>
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-title-sm text-title-sm text-primary">Add Expense</h3>
              <button onClick={() => setShowExpModal(false)} className="p-1 hover:bg-surface-container rounded cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div><label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Vehicle</label>
                <CustomSelect value={expVeh} onChange={setExpVeh} placeholder="Select vehicle" options={vehicles.map(v => ({ value: v.id, label: v.registration + ' (' + v.make + ')' }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Category</label>
                  <select value={expCat} onChange={e => setExpCat(e.target.value)} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded">
                    <option value="maintenance">Maintenance</option><option value="repair">Repair</option><option value="insurance">Insurance</option>
                    <option value="tax">Tax</option><option value="toll">Toll</option><option value="parking">Parking</option><option value="fine">Fine</option><option value="other">Other</option>
                  </select></div>
                <div><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Amount (£)</label><input type="number" step="0.01" required value={expAmt} onChange={e => setExpAmt(Number(e.target.value))} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded" /></div>
                <div><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1" >Date</label><input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded" /></div>
                <div className="col-span-2"><label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Description</label><input type="text" required value={expDesc} onChange={e => setExpDesc(e.target.value)} className="w-full bg-surface border border-border-subtle p-2 text-body-md rounded" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                <button type="button" onClick={() => setShowExpModal(false)} className="px-4 py-2 border border-border-subtle text-on-surface-variant hover:bg-surface-container cursor-pointer">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-primary text-on-primary font-label-caps font-bold hover:opacity-90 cursor-pointer">Add Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Maintenance Modal */}
      {showMaintModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowMaintModal(false)}>
          <div className="bg-white w-full max-w-lg border border-border-subtle shadow-xl" onClick={e => e.stopPropagation()} style={{ borderRadius: '0.5rem' }}>
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-title-sm text-title-sm text-primary">New Maintenance Record</h3>
              <button onClick={() => setShowMaintModal(false)} className="p-1 hover:bg-surface-container rounded cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveMaint} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Vehicle</label>
                  <CustomSelect value={maintVeh} onChange={setMaintVeh} placeholder="Select vehicle" options={vehicles.map(v => ({ value: v.id, label: `${v.registration} (${v.make})` }))} />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Title</label>
                  <input type="text" required value={maintTitle} onChange={e => setMaintTitle(e.target.value)} placeholder="e.g. Oil Change" className="w-full bg-surface border border-border-subtle p-2 text-body-md focus:outline-hidden focus:border-primary rounded" />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Type</label>
                  <CustomSelect value={maintType} onChange={setMaintType} options={[
                    { value: 'service', label: 'Service' },
                    { value: 'repair', label: 'Repair' },
                    { value: 'mot', label: 'MOT' },
                    { value: 'inspection', label: 'Inspection' },
                    { value: 'tire', label: 'Tire' },
                    { value: 'other', label: 'Other' }
                  ]} />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Due Date</label>
                  <input type="date" value={maintDue} onChange={e => setMaintDue(e.target.value)} className="w-full bg-surface border border-border-subtle p-2 text-body-md focus:outline-hidden focus:border-primary rounded" min={new Date().toISOString().split("T")[0]} />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Odometer</label>
                  <input type="number" value={maintOdo} onChange={e => setMaintOdo(Number(e.target.value))} className="w-full bg-surface border border-border-subtle p-2 text-body-md focus:outline-hidden focus:border-primary rounded" />
                </div>
                <div className="col-span-2">
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Description</label>
                  <textarea value={maintDesc} onChange={e => setMaintDesc(e.target.value)} rows={2} className="w-full bg-surface border border-border-subtle p-2 text-body-md focus:outline-hidden focus:border-primary rounded"></textarea>
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Workshop</label>
                  <input type="text" value={maintWorkshop} onChange={e => setMaintWorkshop(e.target.value)} placeholder="Workshop name" className="w-full bg-surface border border-border-subtle p-2 text-body-md focus:outline-hidden focus:border-primary rounded" />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Cost (£)</label>
                  <input type="number" value={maintCost} onChange={e => setMaintCost(Number(e.target.value))} className="w-full bg-surface border border-border-subtle p-2 text-body-md focus:outline-hidden focus:border-primary rounded" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                <button type="button" onClick={() => setShowMaintModal(false)} className="px-4 py-2 border border-border-subtle text-on-surface-variant hover:bg-surface-container cursor-pointer">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-primary text-on-primary font-label-caps text-label-caps font-bold hover:opacity-90 cursor-pointer">Add Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Modal */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowDocModal(false)}>
          <div className="bg-white w-full max-w-md border border-border-subtle shadow-xl" onClick={e => e.stopPropagation()} style={{ borderRadius: '0.5rem' }}>
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-title-sm text-title-sm text-primary">Add Document</h3>
              <button onClick={() => setShowDocModal(false)} className="p-1 hover:bg-surface-container rounded cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveDoc} className="p-6 space-y-4">
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Document Name</label>
                <input type="text" required value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. MOT Certificate 2025" className="w-full bg-surface border border-border-subtle p-2 text-body-md focus:outline-hidden focus:border-primary rounded" />
              </div>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Type</label>
                <CustomSelect value={docType} onChange={setDocType} options={[
                  { value: 'mot', label: 'MOT' },
                  { value: 'insurance', label: 'Insurance' },
                  { value: 'tax', label: 'Tax' },
                  { value: 'license', label: 'License' },
                  { value: 'other', label: 'Other' }
                ]} />
              </div>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Vehicle (optional)</label>
                <CustomSelect value={docVeh} onChange={setDocVeh} placeholder="-- All vehicles --" options={vehicles.map(v => ({ value: v.id, label: `${v.registration} (${v.make})` }))} />
              </div>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Expiry Date (optional)</label>
                <input type="date" value={docExpiry} onChange={e => setDocExpiry(e.target.value)} className="w-full bg-surface border border-border-subtle p-2 text-body-md focus:outline-hidden focus:border-primary rounded" min={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                <button type="button" onClick={() => setShowDocModal(false)} className="px-4 py-2 border border-border-subtle text-on-surface-variant hover:bg-surface-container cursor-pointer">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-primary text-on-primary font-label-caps text-label-caps font-bold hover:opacity-90 cursor-pointer">Add Document</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Template Builder Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowTemplateModal(false)}>
          <div className="bg-white w-full max-w-2xl border border-border-subtle shadow-xl overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()} style={{ borderRadius: '0.5rem' }}>
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-title-sm text-title-sm text-primary">{editingTemplate ? 'Edit Template' : 'New Checklist Template'}</h3>
              <button onClick={() => setShowTemplateModal(false)} className="p-1 hover:bg-surface-container rounded transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveTemplate} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Template Name</label>
                  <input type="text" required value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Daily Walkaround" className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary rounded" />
                </div>
                <div className="col-span-2">
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Description</label>
                  <input type="text" value={templateDesc} onChange={(e) => setTemplateDesc(e.target.value)} placeholder="Purpose of this checklist" className="w-full bg-surface border border-border-subtle p-2.5 text-body-md focus:outline-hidden focus:border-primary rounded" />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">CHECKLIST ITEMS ({templateItems.length})</span>
                  <button type="button" onClick={() => setTemplateItems([...templateItems, { key: String(templateItems.length + 1), label: '', group: 'exterior', guidance: '', requiresTrailer: false }])}
                    className="text-sm text-secondary-container font-bold flex items-center gap-1 hover:underline cursor-pointer">
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {templateItems.length === 0 ? (
                    <div className="text-center py-8 text-on-surface-variant font-body-sm border-2 border-dashed border-border-subtle rounded">
                      No items yet. Click "Add Item" to build your checklist.
                    </div>
                  ) : (
                    templateItems.map((item, i) => (
                      <div key={i} className="p-4 bg-surface-container-low border border-border-subtle rounded flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-data-mono text-[10px] text-on-surface-variant">Item #{i + 1}</span>
                          <button type="button" onClick={() => setTemplateItems(templateItems.filter((_, j) => j !== i))}
                            className="text-danger-red hover:text-danger-red/80 cursor-pointer">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                          <div className="col-span-3">
                            <label className="font-label-caps text-[9px] text-on-surface-variant block mb-0.5">Label</label>
                            <input type="text" required value={item.label} onChange={(e) => {
                              const next = [...templateItems]; next[i] = { ...next[i], label: e.target.value }; setTemplateItems(next);
                            }} placeholder="e.g. Tyre Condition" className="w-full bg-white border border-border-subtle p-1.5 text-xs focus:outline-hidden focus:border-primary rounded" />
                          </div>
                          <div className="col-span-2">
                            <label className="font-label-caps text-[9px] text-on-surface-variant block mb-0.5">Group</label>
                            <select value={item.group} onChange={(e) => {
                              const next = [...templateItems]; next[i] = { ...next[i], group: e.target.value }; setTemplateItems(next);
                            }} className="w-full bg-white border border-border-subtle p-1.5 text-xs focus:outline-hidden focus:border-primary rounded">
                              <option value="exterior">Exterior</option>
                              <option value="interior">Interior</option>
                            </select>
                          </div>
                          <div className="col-span-1 flex items-end pb-1">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" checked={item.requiresTrailer} onChange={(e) => {
                                const next = [...templateItems]; next[i] = { ...next[i], requiresTrailer: e.target.checked }; setTemplateItems(next);
                              }} className="w-3.5 h-3.5 text-primary accent-primary" />
                              <span className="font-label-caps text-[9px] text-on-surface-variant">Trailer</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="font-label-caps text-[9px] text-on-surface-variant block mb-0.5">Guidance</label>
                          <input type="text" value={item.guidance} onChange={(e) => {
                            const next = [...templateItems]; next[i] = { ...next[i], guidance: e.target.value }; setTemplateItems(next);
                          }} placeholder="Inspection guidance text" className="w-full bg-white border border-border-subtle p-1.5 text-xs focus:outline-hidden focus:border-primary rounded" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                <button type="button" onClick={() => setShowTemplateModal(false)} className="px-4 py-2 border border-border-subtle text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={savingTemplate} className="px-6 py-2 bg-primary text-on-primary font-label-caps text-label-caps font-bold hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer">
                  {savingTemplate ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* QR Code Login Modal */}
      {qrCodeModalLink && qrCodeModalDriverName && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => { setQrCodeModalLink(null); setQrCodeModalDriverName(null); }}>
          <div className="bg-white w-full max-w-md border border-border-subtle shadow-xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ borderRadius: '0.5rem' }}>
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-title-sm text-title-sm text-primary">QR Code Login Panel</h3>
              <button onClick={() => { setQrCodeModalLink(null); setQrCodeModalDriverName(null); }} className="p-1 hover:bg-surface-container rounded transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 flex flex-col items-center text-center">
              <h4 className="font-title-sm text-title-sm font-semibold text-primary">{qrCodeModalDriverName}</h4>
              <div className="mt-6 p-4 bg-white border-2 border-border-subtle rounded">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeModalLink)}`}
                  alt={`${qrCodeModalDriverName} QR Login`}
                  className="w-48 h-48 select-none mx-auto"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <p className="text-on-surface-variant font-body-md mt-4 mb-2">Scan with phone camera to authenticate.</p>
              <div className="bg-surface-container-low p-3 rounded border border-border-subtle w-full max-w-sm text-center">
                <p className="text-[10px] font-bold text-on-surface-variant mb-1">Or use this link:</p>
                <div className="bg-white border border-border-subtle p-2 rounded text-[10px] font-mono break-all select-all">{qrCodeModalLink}</div>
                <button onClick={() => { navigator.clipboard.writeText(qrCodeModalLink); alert("Link copied!"); }} className="mt-2 text-xs text-secondary-container font-bold hover:underline cursor-pointer">Copy Link</button>
              </div>
            </div>
            <div className="bg-surface-container-low p-4 text-center border-t border-border-subtle">
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Secure Authentication Protocol Active</p>

      {showTour && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowTour(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">i</span>
              <h2 className="text-lg font-bold text-primary">Welcome to WalkSafe</h2>
            </div>
            <div className="space-y-3">
              <div className="flex gap-3 p-3 bg-blue-50 rounded-lg"><span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0 text-xs">1</span><div><p className="font-semibold text-sm">Dashboard Overview</p><p className="text-xs text-gray-500">Check today status</p></div></div>
              <div className="flex gap-3 p-3 bg-blue-50 rounded-lg"><span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0 text-xs">2</span><div><p className="font-semibold text-sm">Add Vehicles & Drivers</p><p className="text-xs text-gray-500">Register with DVLA lookup</p></div></div>
              <div className="flex gap-3 p-3 bg-amber-50 rounded-lg"><span className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 text-xs">3</span><div><p className="font-semibold text-sm">Compliance Templates</p><p className="text-xs text-gray-500">Built-in checklists with mandatory photos</p></div></div>
              <div className="flex gap-3 p-3 bg-blue-50 rounded-lg"><span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0 text-xs">4</span><div><p className="font-semibold text-sm">Schedule & Track</p><p className="text-xs text-gray-500">Set recurring checks</p></div></div>
            </div>
            <button onClick={() => setShowTour(false)} className="w-full mt-5 py-3 bg-primary text-white font-bold text-sm rounded-lg hover:opacity-90 cursor-pointer">Got it</button>
          </div>
        </div>
      )}
            </div>
          </div>
        </div>
      )}


      {showTour && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTour(false)}>
          <div className="bg-white max-w-md rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">?</span>
              <h2 className="text-lg font-bold text-gray-900">Using WalkSafe</h2>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2 p-2 bg-blue-50 rounded-lg"><span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">1</span><div><p className="font-semibold text-sm text-gray-900">Dashboard</p><p className="text-xs text-gray-500">Check today compliance status and open defects</p></div></div>
              <div className="flex gap-2 p-2 bg-blue-50 rounded-lg"><span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">2</span><div><p className="font-semibold text-sm text-gray-900">Vehicles & Drivers</p><p className="text-xs text-gray-500">Add vehicles via DVLA lookup, assign PINs to drivers</p></div></div>
              <div className="flex gap-2 p-2 bg-amber-50 rounded-lg"><span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 text-xs">3</span><div><p className="font-semibold text-sm text-gray-900">Templates</p><p className="text-xs text-gray-500">Use built-in checklists with mandatory photo requirements</p></div></div>
              <div className="flex gap-2 p-2 bg-blue-50 rounded-lg"><span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">4</span><div><p className="font-semibold text-sm text-gray-900">Schedule</p><p className="text-xs text-gray-500">Set recurring checks, export PDF audit reports</p></div></div>
            </div>
            <button onClick={() => setShowTour(false)} className="w-full mt-4 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 cursor-pointer">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}







