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

      {typeof showTour !== "undefined" && showTour && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setShowTour(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-primary mb-4">Welcome to WalkSafe</h2>
            <div className="space-y-3 mb-6">
              <div className="flex gap-3 p-3 bg-blue-50 rounded-lg"><span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">1</span><div><p className="font-semibold text-sm">Dashboard</p><p className="text-xs text-gray-500">Check status, defects, fleet health</p></div></div>
              <div className="flex gap-3 p-3 bg-blue-50 rounded-lg"><span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">2</span><div><p className="font-semibold text-sm">Vehicles & Drivers</p><p className="text-xs text-gray-500">Register with DVLA lookup</p></div></div>
              <div className="flex gap-3 p-3 bg-amber-50 rounded-lg"><span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">3</span><div><p className="font-semibold text-sm">Templates</p><p className="text-xs text-gray-500">Built-in scaffolding checklists</p></div></div>
              <div className="flex gap-3 p-3 bg-blue-50 rounded-lg"><span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">4</span><div><p className="font-semibold text-sm">Schedule</p><p className="text-xs text-gray-500">Recurring checks, PDF exports</p></div></div>
            </div>
            <button onClick={() => setShowTour(false)} className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:opacity-90 cursor-pointer">Got it</button>
          </div>
        </div>
      )}
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

      {typeof showTour !== "undefined" && showTour && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setShowTour(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-primary mb-4">Welcome to WalkSafe</h2>
            <div className="space-y-3 mb-6">
              <div className="flex gap-3 p-3 bg-blue-50 rounded-lg"><span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">1</span><div><p className="font-semibold text-sm">Dashboard</p><p className="text-xs text-gray-500">Check status, defects, fleet health</p></div></div>
              <div className="flex gap-3 p-3 bg-blue-50 rounded-lg"><span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">2</span><div><p className="font-semibold text-sm">Vehicles & Drivers</p><p className="text-xs text-gray-500">Register with DVLA lookup</p></div></div>
              <div className="flex gap-3 p-3 bg-amber-50 rounded-lg"><span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">3</span><div><p className="font-semibold text-sm">Templates</p><p className="text-xs text-gray-500">Built-in scaffolding checklists</p></div></div>
              <div className="flex gap-3 p-3 bg-blue-50 rounded-lg"><span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">4</span><div><p className="font-semibold text-sm">Schedule</p><p className="text-xs text-gray-500">Recurring checks, PDF exports</p></div></div>
            </div>
            <button onClick={() => setShowTour(false)} className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:opacity-90 cursor-pointer">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}


