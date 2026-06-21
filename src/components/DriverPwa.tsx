import React, { useState, useEffect, useRef } from "react";
import { 
  Shield, Truck, AlertTriangle, CheckCircle, RefreshCw, X, Play, Clock, 
  BookOpen, ChevronDown, Check, AlertOctagon, User, Phone, ArrowLeft, ArrowRight, Download, Lock,
  Trash2, LogOut, CheckSquare, Calendar, Camera, MapPin, Image, Megaphone
} from "lucide-react";
import { Vehicle, Driver, WalkaroundCheck, Defect, Company, CHECKLIST_ITEMS, CheckItemResult, DefectSeverity, Announcement, ScheduledChecklist, ChecklistTemplate } from "../types";
import SignaturePad from "./SignaturePad";
import { generateDVSA_PDF } from "../utils/pdfGenerator";
import { isScheduleDueToday } from "../utils/scheduleUtils";

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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs font-bold bg-white border border-border-subtle rounded px-2.5 py-1.5 text-on-surface-variant  flex justify-between items-center hover:bg-surface-container-low transition-all focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden select-none cursor-pointer w-full"
      >
        <span className="truncate">{selectedOpt ? selectedOpt.label : placeholder}</span>
        <ChevronDown className={`w-3 h-3 text-on-surface-variant shrink-0 ml-1.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      
      {open && (
        <div className="absolute left-0 mt-1 w-full bg-white border border-border-subtle rounded shadow-sm py-1 z-50 max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-surface-container-low flex items-center justify-between ${
                value === opt.value ? 'bg-secondary-container/10/50 text-secondary font-bold' : 'text-on-surface'
              }`}
            >
              <span>{opt.label}</span>
              {value === opt.value && <Check className="w-3 h-3 text-secondary-container shrink-0 ml-1" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface DriverPwaProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  company: Company;
  checks: WalkaroundCheck[];
  defects: Defect[];
  announcements: Announcement[];
  schedules: ScheduledChecklist[];
  templates?: ChecklistTemplate[];
  onCheckSubmitted: (checkData: any) => Promise<any>;
  onTriggerRefresh: () => void;
  onLogOutWorkspace?: () => void;
  initialDriver?: Driver | null;
  onAddVehicle?: (vehPayload: any) => Promise<void>;
  onDeleteVehicle?: (vehicleId: string) => Promise<void>;
  onCloseDefect?: (defectId: string, repairLog: any) => Promise<void>;
  onAddSchedule?: (schPayload: any) => Promise<void>;
  onUpdateCompany?: (compPayload: Partial<Company>) => Promise<void>;
  onUpdateDriver?: (driverId: string, drvPayload: Partial<Driver>) => Promise<void>;
}

export default function DriverPwa({
  vehicles,
  drivers,
  company,
  checks,
  defects,
  announcements,
  schedules,
  templates: templatesFromProps,
  onCheckSubmitted,
  onTriggerRefresh,
  onLogOutWorkspace,
  initialDriver,
  onAddVehicle,
  onDeleteVehicle,
  onCloseDefect,
  onAddSchedule,
  onUpdateCompany,
  onUpdateDriver
}: DriverPwaProps) {
  // App Phase
  // 'pin' -> 'home' -> 'precheck' -> 'wizard' -> 'complete' -> 'roadside' | 'history'
  const [phase, setPhase] = useState<'pin' | 'home' | 'precheck' | 'wizard' | 'complete' | 'roadside' | 'history' | 'media' | 'profile'>(initialDriver ? 'home' : 'pin');

  // Auth state
  const [pinInput, setPinInput] = useState<string>("");
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(initialDriver || null);
  const [assignedVehicle, setAssignedVehicle] = useState<Vehicle | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState<number>(0);
  const [activeTemplateId, setActiveTemplateId] = useState<string | undefined>(undefined);
const [activeTemplateName, setActiveTemplateName] = useState<string | undefined>(undefined);

  // Solo Operator DVLA State
  const [soloVehReg, setSoloVehReg] = useState("");
  const [soloVehMake, setSoloVehMake] = useState("");
  const [soloVehModel, setSoloVehModel] = useState("");
  const [soloVehYear, setSoloVehYear] = useState(new Date().getFullYear().toString());
  const [soloVehColour, setSoloVehColour] = useState("White");
  const [soloVehType, setSoloVehType] = useState("lgv");
  const [soloVehMot, setSoloVehMot] = useState(new Date(Date.now() + 31536000000).toISOString().split('T')[0]);
  const [soloVehTax, setSoloVehTax] = useState(new Date(Date.now() + 15768000000).toISOString().split('T')[0]);
  const [dvlaLoading, setDvlaLoading] = useState(false);
  const [dvlaSuccess, setDvlaSuccess] = useState(false);
  const [dvlaError, setDvlaError] = useState("");

  const handleDvlaLookup = async () => {
    if (!soloVehReg.trim()) return;
    setDvlaLoading(true);
    setDvlaError("");
    setDvlaSuccess(false);

    try {
      const response = await fetch(`/api/dvla-lookup/${soloVehReg.trim().toUpperCase()}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Could not locate vehicle details.");
      }
      
      const data = await response.json();
      setSoloVehMake(data.make);
      setSoloVehModel(data.model);
      setSoloVehYear(data.year);
      setSoloVehColour(data.colour);
      setSoloVehType(data.type);
      setSoloVehMot(data.motExpiry);
      setSoloVehTax(data.taxExpiry);
      
      setDvlaSuccess(true);
    } catch (err: any) {
      setDvlaError(err.message || "DVLA lookup failed.");
    } finally {
      setDvlaLoading(false);
    }
  };

  // Push Notification setup
  useEffect(() => {
    if (currentDriver) {
      import("../lib/firebase").then(async ({ requestPushPermission, onMessage, messaging }) => {
        let registration: ServiceWorkerRegistration | undefined;
        try {
          if ('serviceWorker' in navigator) {
            registration = await navigator.serviceWorker.getRegistration();
          }
        } catch (e) {
          console.warn("[SW] Failed to get registration for FCM:", e);
        }

        requestPushPermission(currentDriver.companyId, registration).then(token => {
          if (token) {
            fetch("/api/push/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ companyId: currentDriver.companyId, fcmToken: token })
            }).catch(console.error);
          }
        });

        if (messaging) {
          onMessage(messaging, (payload) => {
            console.log('[Foreground Push] Message received:', payload);
            onTriggerRefresh(); // Ensure UI stays in sync when in foreground
          });
        }
      });
    }
  }, [currentDriver]);

  const isInitializedRef = useRef(false);
  const [lastInitialDriverId, setLastInitialDriverId] = useState<string | undefined>(initialDriver?.id);
  const prevPhaseRef = useRef(phase);

  useEffect(() => {
    if (initialDriver?.id !== lastInitialDriverId) {
      isInitializedRef.current = false;
      setLastInitialDriverId(initialDriver?.id);
    }
  }, [initialDriver?.id, lastInitialDriverId]);

  useEffect(() => {
    if (isInitializedRef.current) return;

    if (initialDriver) {
      setCurrentDriver(initialDriver);
      setPhase('home');
      isInitializedRef.current = true;
    } else if (!currentDriver && company && company.isSoloOperator && drivers && drivers.length > 0) {
      // Auto-recover solo operator session directly from the database load
      setCurrentDriver(drivers[0]);
      setPhase('home');
      isInitializedRef.current = true;
    }
  }, [initialDriver, company, drivers, currentDriver]);

  // Synchronize phase and wizard item transitions with HTML5 History API popstate to allow native device back button navigation
  useEffect(() => {
    // Set initial window history state on mount
    window.history.replaceState({ phase, currentItemIndex }, "");

    const handlePopState = (event: PopStateEvent) => {
      if (event && event.state) {
        const state = event.state;
        if (typeof state.phase === "string") {
          setPhase(state.phase as any);
          if (state.phase === 'wizard' && typeof state.currentItemIndex === "number") {
            setCurrentItemIndex(state.currentItemIndex);
          }
        }
      } else {
        // Fallback safely to home screen to prevent exiting the application container immediately
        setPhase('home');
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Track and push detailed phase and checklist progress into history stack
  useEffect(() => {
    const currentState = window.history.state;
    // Terminal/start screens should replace state to prevent looping on already-submitted cards
    const isTerminalPhase = phase === 'complete' || phase === 'roadside' || phase === 'home' || phase === 'pin';
    
    const hasStateChanged = !currentState || 
                           currentState.phase !== phase || 
                           (!isTerminalPhase && phase === 'wizard' && currentState.currentItemIndex !== currentItemIndex);

    if (hasStateChanged) {
      if (isTerminalPhase) {
        window.history.replaceState({ phase, currentItemIndex }, "");
      } else {
        window.history.pushState({ phase, currentItemIndex }, "");
      }
    }
    prevPhaseRef.current = phase;
  }, [phase, currentItemIndex]);

  useEffect(() => {
    if (currentDriver && vehicles && vehicles.length > 0 && !assignedVehicle) {
      const allowed = (currentDriver.assignedVehicleIds && currentDriver.assignedVehicleIds.length > 0)
        ? vehicles.filter(v => currentDriver.assignedVehicleIds?.includes(v.id) || currentDriver.defaultVehicleId === v.id)
        : vehicles;
      
      const defaultVeh = vehicles.find(v => v.id === currentDriver.defaultVehicleId) || allowed[0] || vehicles[0];
      if (defaultVeh) {
        setAssignedVehicle(defaultVeh);
      }
    }
  }, [currentDriver, vehicles, assignedVehicle]);

  // Active check wizard state
  const [checkStartedAt, setCheckStartedAt] = useState<string | null>(null);
  const [gpsWatchId, setGpsWatchId] = useState<number | null>(null);

  // Continuous GPS tracking during active check
  useEffect(() => {
    if (!checkStartedAt || !assignedVehicle) {
      if (gpsWatchId !== null) { navigator.geolocation.clearWatch(gpsWatchId); setGpsWatchId(null); }
      return;
    }
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        fetch('/api/positions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Company-Id': company.id },
          body: JSON.stringify({
            vehicleId: assignedVehicle.id,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            speed: pos.coords.speed,
            heading: pos.coords.heading
          })
        }).catch(() => {});
      },
      (err) => console.warn('[GPS Watch]', err.message),
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
    );
    setGpsWatchId(watchId);
    return () => { navigator.geolocation.clearWatch(watchId); };
  }, [checkStartedAt, assignedVehicle?.id]);
  const [wizardItems, setWizardItems] = useState<CheckItemResult[]>([]);
  const [activeCheckResults, setActiveCheckResults] = useState<{
    itemKey: string;
    itemLabel: string;
    result: 'pass' | 'fail';
    severity?: DefectSeverity;
    description?: string;
    photoUrl?: string;
  }[]>([]);

  // GPS / Geolocation Tracking State
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'acquiring' | 'success' | 'error'>('idle');

  // Active defect reporting modal
  const [isReportingDefect, setIsReportingDefect] = useState<boolean>(false);
  const [defectSeverity, setDefectSeverity] = useState<DefectSeverity>('major');
  const [defectDescription, setDefectDescription] = useState<string>("");
  const [defectPhoto, setDefectPhoto] = useState<string>("");
  const [requiredPhotoUrl, setRequiredPhotoUrl] = useState<string>("");
  const [requiredPhotoItemKey, setRequiredPhotoItemKey] = useState<string | null>(null);
  const [miscDamageNotes, setMiscDamageNotes] = useState<string>("");
  const [miscDamagePhotoUrl, setMiscDamagePhotoUrl] = useState<string>("");
  const [showGuidance, setShowGuidance] = useState<boolean>(false);
  const [resolvingDefectId, setResolvingDefectId] = useState<string | null>(null);
  const [selectedZoomImage, setSelectedZoomImage] = useState<any>(null);

  // HTML5 Direct Camera & Canvas states
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraMode, setCameraMode] = useState<'defect' | 'misc' | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [usingInAppCamera, setUsingInAppCamera] = useState<boolean>(false);
  const [cameraInitError, setCameraInitError] = useState<string | null>(null);
  const [isCameraFlash, setIsCameraFlash] = useState<boolean>(false);

  // Manage direct active camera streams
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    if (cameraMode) {
      setCameraInitError(null);
      setUsingInAppCamera(false);
      navigator.mediaDevices?.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      }).then((stream) => {
        activeStream = stream;
        setCameraStream(stream);
        setUsingInAppCamera(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }, 150);
      }).catch((err) => {
        console.warn("[Camera API] Failed to initiate live stream:", err);
        setCameraInitError(err.message || "Failed to start camera. Please verify permission.");
        setUsingInAppCamera(false);
      });
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      setCameraStream(null);
      setUsingInAppCamera(false);
    };
  }, [cameraMode]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, usingInAppCamera, cameraMode]);

  // Listen for Visibility changes to auto-refresh state when driver re-opens the app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onTriggerRefresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [onTriggerRefresh]);

  // Listen for Service Worker updates to force-reload the app for the latest code
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  // Native Camera and Gallery Triggers
  const defectCameraInputRef = useRef<HTMLInputElement>(null);
  const defectGalleryInputRef = useRef<HTMLInputElement>(null);
  const miscCameraInputRef = useRef<HTMLInputElement>(null);
  const miscGalleryInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Solo Operator Manager Tab States
  const [activeSoloTab, setActiveSoloTab] = useState<'check' | 'vehicles' | 'profile' | 'defects' | 'media'>('check');

  // Solo Operator Company form states
  const [orgFormName, setOrgFormName] = useState(company.name);
  const [orgLicence, setOrgLicence] = useState(company.oLicence || "");
  const [isUpdatingCompany, setIsUpdatingCompany] = useState(false);

  // Solo Operator Driver form states
  const [opFullName, setOpFullName] = useState(currentDriver?.fullName || "");
  const [opEmail, setOpEmail] = useState(currentDriver?.email || "");
  const [opPhone, setOpPhone] = useState(currentDriver?.phone || "");
  const [opPin, setOpPin] = useState(currentDriver?.pin || "1111");
  const [opPassword, setOpPassword] = useState("");
  const [isUpdatingDriver, setIsUpdatingDriver] = useState(false);

  // Message Modal state
  const [messageModal, setMessageModal] = useState<{title: string, message: string} | null>(null);

  // QR Code Modal
  const [qrCodeModalLink, setQrCodeModalLink] = useState<string | null>(null);
  const [qrCodeError, setQrCodeError] = useState(false);

  // Helper to trigger alerts
  const triggerAlert = (message: string, title: string = "Notice") => {
    setMessageModal({ title, message });
  };

  // Solo Operator Vehicles states
  const [newReg, setNewReg] = useState("");
  const [newMake, setNewMake] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newVehType, setNewVehType] = useState<'lgv' | 'hgv' | 'hgv_trailer'>('lgv');
  const [newMot, setNewMot] = useState("");
  const [newTax, setNewTax] = useState("");
  const [showAddVehForm, setShowAddVehForm] = useState(false);
  const [isAddingVeh, setIsAddingVeh] = useState(false);

  // Solo Operator Schedules states
  const [newSchTitle, setNewSchTitle] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id || "");
  const [newSchDate, setNewSchDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [showScheduledForm, setShowScheduledForm] = useState(false);
  const [isAddingSch, setIsAddingSch] = useState(false);

  // Completion state
  const [driverSignature, setDriverSignature] = useState<string>("");
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState<string>("");
  const [isGroundedAlert, setIsGroundedAlert] = useState<boolean>(false);
  const [lastSubmittedCheck, setLastSubmittedCheck] = useState<WalkaroundCheck | null>(null);
  const [pendingScheduleId, setPendingScheduleId] = useState<string | null>(null);
  const todayLocal = new Date().getFullYear() + "-" + String(new Date().getMonth()+1).padStart(2,"0") + "-" + String(new Date().getDate()).padStart(2,"0");

  // Selected check for history view
  const [selectedHistoryCheck, setSelectedHistoryCheck] = useState<WalkaroundCheck | null>(null);

  // PWA Intelligent Installation & Prompts states
  const deferredPromptRef = useRef<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true;
  });
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'installed'>('idle');
  const [installProgress, setInstallProgress] = useState<number>(0);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return localStorage.getItem('walksafe_install_banner_dismissed') === 'true';
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setInstallStatus('idle');
    };

    const handleAppInstalledEvent = () => {
      setInstallStatus('installed');
      setIsStandalone(true);
      setIsDismissed(true);
      localStorage.setItem('walksafe_install_banner_dismissed', 'true');
      deferredPromptRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt, { once: false });
    window.addEventListener('appinstalled', handleAppInstalledEvent, { once: false });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalledEvent);
    };
  }, []);

  useEffect(() => {
    if (currentDriver && phase === 'home') {
      localStorage.removeItem('walksafe_install_banner_dismissed');
      setIsDismissed(false);
      setInstallStatus('idle');
    }
  }, [currentDriver?.id, phase]);

  const handleInstallApp = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      setShowIosGuide(true);
      return;
    }
    
    if (!deferredPromptRef.current) {
      triggerAlert(
        'Installation not available on this browser. Please ensure you are using Chrome or Edge on Android, or Chrome on Desktop.',
        'Installation Failed'
      );
      return;
    }
    
    // Improved logic: Call prompt and handle choice as an async/await flow
    try {
      setInstallProgress(0);
      deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;
      
      if (outcome === 'accepted') {
        setInstallStatus('installing');
        // Show realistic progress
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 20;
          if (progress >= 100) {
            clearInterval(interval);
            setInstallStatus('installed');
            setIsStandalone(true);
            setIsDismissed(true);
            localStorage.setItem('walksafe_install_banner_dismissed', 'true');
          } else {
            setInstallProgress(Math.min(progress, 99));
          }
        }, 300);
      } else {
        setInstallStatus('idle');
      }
    } catch (err) {
      console.error("[PWA Install] Error during prompt flow:", err);
      setInstallStatus('idle');
    } finally {
      deferredPromptRef.current = null;
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Limit maximum dimensions for optimal visual fidelity and space efficiency (e.g. 600 width/height)
          const MAX_WIDTH = 600;
          const MAX_HEIGHT = 600;

          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            if (width > height) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            } else {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            
            // Just compress once to WebP or lower JPEG quality to guarantee fast snapping
            const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
            resolve(dataUrl);
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = () => {
          resolve(event.target?.result as string);
        };
      };
      reader.onerror = () => {
        resolve("");
      };
    });
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const file = target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await compressImage(file);
      if (dataUrl) {
        setDefectPhoto(dataUrl);
      } else {
        // Ultimate fallback
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") setDefectPhoto(reader.result);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error(err);
      // Extra fallback in case of generic error
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") setDefectPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    } finally {
      if (target) target.value = '';
    }
  };

  const handleMiscPhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const file = target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await compressImage(file);
      if (dataUrl) {
        setMiscDamagePhotoUrl(dataUrl);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") setMiscDamagePhotoUrl(reader.result);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error(err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") setMiscDamagePhotoUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } finally {
      if (target) target.value = '';
    }
  };

  // Determine items needed for check: use the EXACT template selected when creating the schedule
  const getRelevantChecklist = (vehicle: Vehicle, templateId?: string) => {
    // 1. If a specific template was selected for this schedule, use it
    if (templateId && templatesFromProps) {
      const found = templatesFromProps.find(t => t.id === templateId);
      if (found) return found.items.filter(it => !it.requiresTrailer || vehicle.type === 'hgv_trailer');
    }
    // 2. No template selected — use the standard DVSA 27-point checklist (the default)
    return CHECKLIST_ITEMS.filter(it => !it.requiresTrailer || vehicle.type === 'hgv_trailer');
  };

  // Begin check flow
  const handleBeginCheck = (scheduleId?: string) => {
    if (!assignedVehicle) return;
    setCheckStartedAt(new Date().toISOString());
    
    // Find the schedule and its templateId if applicable
    let scheduleTemplateId: string | undefined;
    if (scheduleId) {
      setPendingScheduleId(scheduleId);
      const matchedSch = schedules.find(s => s.id === scheduleId);
      if (matchedSch) scheduleTemplateId = matchedSch.templateId;
    } else {
      setPendingScheduleId(null);
    }
    setActiveTemplateId(scheduleTemplateId);
    let resolvedName: string | undefined;
    if (scheduleTemplateId && templatesFromProps) {
      const foundTpl = templatesFromProps.find(t => t.id === scheduleTemplateId);
      if (foundTpl) resolvedName = foundTpl.name;
    }
    setActiveTemplateName(resolvedName);

    setCurrentItemIndex(0);
    
    // Set up items with default states, using schedule's template if specified
    const items = getRelevantChecklist(assignedVehicle, scheduleTemplateId).map((it, idx) => ({
      itemKey: it.key,
      itemLabel: it.label,
      result: 'pass' as const, // default to pass, manual change to fail
      sequenceOrder: idx + 1
    }));
    setWizardItems(items);
    setActiveCheckResults([]);
    setIsGroundedAlert(false);
    setMiscDamageNotes("");
    setMiscDamagePhotoUrl("");

    // Initial GPS lock trigger
    setGpsCoords(null);
    setGpsStatus('acquiring');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setGpsStatus('success');
          console.log("[GPS Verification] Coordinates captured successfully:", position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          setGpsStatus('error');
          console.warn("[GPS Verification] Failed to capture coordinates:", error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setGpsStatus('error');
      console.warn("[GPS Verification] Geolocation API not available inside this browser");
    }

    setPhase('wizard');
  };

  // Handle Pass/Fail responses in Wizard
  const handleItemPass = () => {
    if (!assignedVehicle) return;
    const currentItem = getRelevantChecklist(assignedVehicle, activeTemplateId)[currentItemIndex];

    // If this item requires a photo and no photo has been taken, open camera first
    if (currentItem.requiresPhoto && !requiredPhotoUrl) {
      setRequiredPhotoItemKey(currentItem.key);
      setCameraMode('defect');  // Reuse camera but for mandatory photo
      return;
    }
    
    // Save pass state
    const resultItem: any = {
      itemKey: currentItem.key,
      itemLabel: currentItem.label,
      result: 'pass' as const
    };
    if (requiredPhotoUrl) {
      resultItem.photoUrl = requiredPhotoUrl;
      setRequiredPhotoUrl("");
      setRequiredPhotoItemKey(null);
    }
    
    const updated = [...activeCheckResults.filter(r => r.itemKey !== currentItem.key), resultItem];
    setActiveCheckResults(updated);
    setRequiredPhotoUrl("");

    // Subtle audio feedback for speedy, professional touch input confirmation
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch(e){}

    // Trigger auto advance
    advanceWizard(updated);
  };

  const handleItemFail = () => {
    // Open the defect modal configuration
    setDefectSeverity('major');
    setDefectDescription("");
    setDefectPhoto("");
    setIsReportingDefect(true);
  };

  const confirmDefectReport = () => {
    if (!assignedVehicle) return;
    const currentItem = getRelevantChecklist(assignedVehicle, activeTemplateId)[currentItemIndex];

    // If this item requires a photo and no photo has been taken, open camera first
    if (currentItem.requiresPhoto && !requiredPhotoUrl) {
      setRequiredPhotoItemKey(currentItem.key);
      setCameraMode('defect');  // Reuse camera but for mandatory photo
      return;
    }

    const resultItem: any = {
      itemKey: currentItem.key,
      itemLabel: currentItem.label,
      result: 'fail' as const,
      severity: defectSeverity,
      description: defectDescription.trim() || `Asset wear noted on ${currentItem.label}`,
      photoUrl: defectPhoto || "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=400" // fallbacks as per selection rules
    };

    const updated = [...activeCheckResults.filter(r => r.itemKey !== currentItem.key), resultItem];
    setActiveCheckResults(updated);
    setRequiredPhotoUrl("");
    setIsReportingDefect(false);

    if (defectSeverity === 'dangerous') {
      setIsGroundedAlert(true);
    }

    advanceWizard(updated);
  };

  const advanceWizard = (currentResults: typeof activeCheckResults) => {
    if (!assignedVehicle) return;
    const itemsList = getRelevantChecklist(assignedVehicle, activeTemplateId);
    if (currentItemIndex < itemsList.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
      setShowGuidance(false);
    } else {
      // Ensure all items are explicitly answered as PASS or FAIL
      const allCompleted = itemsList.every(item => currentResults.some(r => r.itemKey === item.key));
      if (!allCompleted) {
        triggerAlert("Compliance alert: All check list items must be verified before submitting. Please review unanswered areas.", "Incomplete Check");
        return;
      }

      // Completed last element, switch to signature/conclusion screen!
      // Map results back to items
      const finalItems: CheckItemResult[] = wizardItems.map(w => {
        const found = currentResults.find(r => r.itemKey === w.itemKey);
        return {
          ...w,
          result: found ? found.result : 'pass'
        };
      });

      setWizardItems(finalItems);
      setPhase('complete');
    }
  };

  // Submit check to backend
  const handleSubmitCheck = async () => {
    if (isSubmitting || !currentDriver || !assignedVehicle || !checkStartedAt) return;
    setIsSubmitting(true);

    // Filter failed items for defect payload
    const reportedFailures = activeCheckResults.filter(r => r.result === 'fail');

    const checkPayload = {
      vehicleId: assignedVehicle.id,
      driverId: currentDriver.id,
      startedAt: checkStartedAt,
      driverSignature: driverSignature || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='30'></svg>",
      items: wizardItems.map(w => { const r = activeCheckResults.find(a => a.itemKey === w.itemKey); return { itemKey: w.itemKey, itemLabel: w.itemLabel, result: r ? r.result : "pass", sequenceOrder: w.sequenceOrder }; }),
      latitude: gpsCoords?.latitude || null,
      longitude: gpsCoords?.longitude || null,
      miscDamageNotes,
      miscDamagePhotoUrl,
      templateName: activeTemplateName,
      scheduleId: pendingScheduleId,
      results: reportedFailures.map(f => ({
        itemKey: f.itemKey,
        itemLabel: f.itemLabel,
        severity: f.severity,
        description: f.description,
        photoUrl: f.photoUrl
      }))
    };

    try {
      const newlyCreated = await onCheckSubmitted(checkPayload);
      
      // Select newly entered check if available to show roadside
      setLastSubmittedCheck(newlyCreated);
      
      // Auto-jump to the main active screen
      setPhase('roadside');
      // Immediately ground the vehicle if dangerous defect was reported
      if (reportedFailures.some(r => r.severity === 'dangerous')) {
        setAssignedVehicle(prev => prev ? { ...prev, isGrounded: true } : prev);
      }
      // The associated schedule is now marked as completed by the backend 
      // when the check is submitted (see scheduleId in checkPayload).
      if (pendingScheduleId) {
        onTriggerRefresh();
        setPendingScheduleId(null);
      }
    } catch (err) {
      console.error(err);
      // fallback in case of issues
      setPhase('home');
    } finally {
        setIsSubmitting(false);
    }
  };

  // Triggers native device camera input
  const triggerDefectCamera = () => {
    defectCameraInputRef.current?.click();
  };
  const triggerDefectGallery = () => {
    defectGalleryInputRef.current?.click();
  };

  // Export DVSA Report A4 PDF directly inside Driver Portal
  const downloadDriverPDF = (c: WalkaroundCheck) => {
    const dVeh = (vehicles && vehicles.length > 0) ? (vehicles.find(v => v.id === c.vehicleId) || assignedVehicle || vehicles[0]) : assignedVehicle;
    const dDrv = (drivers && drivers.length > 0) ? (drivers.find(d => d.id === c.driverId) || currentDriver || drivers[0]) : currentDriver;
    let relateDefs = defects ? defects.filter(df => df.checkId === c.id) : [];

    // Fallback: If defects are empty (e.g. because of propagation delay with parent state refresh),
    // and there are failed items in the current active wizard, reconstruct them immediately.
    if (relateDefs.length === 0 && activeCheckResults && activeCheckResults.length > 0 && c.id === lastSubmittedCheck?.id) {
      relateDefs = activeCheckResults
        .filter(r => r.result === 'fail')
        .map((r, idx) => ({
          id: `def-temp-${idx}-${Date.now()}`,
          checkId: c.id,
          itemKey: r.itemKey,
          itemLabel: r.itemLabel,
          vehicleId: c.vehicleId,
          companyId: c.companyId,
          severity: r.severity || 'major',
          description: r.description || 'Logged walkaround defect',
          reportedTo: 'Fleet Manager',
          photoUrl: r.photoUrl,
          status: 'open' as const,
          createdAt: c.createdAt || new Date().toISOString()
        }));
    }
    
    const doc = generateDVSA_PDF(c, dVeh!, dDrv!, company, relateDefs);
    const regLabel = dVeh ? dVeh.registration : "UNKNOWN";
    const dateLabel = c ? c.checkDate : new Date().toISOString().split('T')[0];
    doc.save(`WalkSafe_Record_${regLabel}_${dateLabel}.pdf`);
  };

  const getDriverPastChecks = () => {
    if (!currentDriver) return [];
    return checks
      .filter(c => c.driverId === currentDriver.id)
      .sort((a,b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  };

  const getCapturedImages = () => {
    const list: {
      id: string;
      url: string;
      sourceType: 'defect' | 'miscellaneous';
      category: string;
      notes: string;
      date: string;
      vehicleReg: string;
      driverName: string;
      severity?: string;
      status?: string;
    }[] = [];

    // 1. Defect Photos
    defects.forEach(d => {
      const chk = checks.find(c => c.id === d.checkId);
      const isMyDefect = company.isSoloOperator || (chk && chk.driverId === currentDriver?.id);
      
      if (d.photoUrl && isMyDefect) {
        const veh = vehicles.find(v => v.id === d.vehicleId);
        list.push({
          id: `defect-${d.id}`,
          url: d.photoUrl,
          sourceType: 'defect',
          category: d.itemLabel || "Unclassified Item",
          notes: d.description || "No defect notes.",
          date: d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-GB") : (chk?.checkDate || "Unknown"),
          vehicleReg: veh ? veh.registration.toUpperCase() : "Unknown",
          driverName: currentDriver?.fullName || "Operator",
          severity: d.severity,
          status: d.status
        });
      }
    });

    // 2. Miscellaneous Damage Photos
    checks.forEach(c => {
      const isMyCheck = company.isSoloOperator || c.driverId === currentDriver?.id;
      if (c.miscDamagePhotoUrl && isMyCheck) {
        const veh = vehicles.find(v => v.id === c.vehicleId);
        list.push({
          id: `misc-${c.id}`,
          url: c.miscDamagePhotoUrl,
          sourceType: 'miscellaneous',
          category: "Miscellaneous Damage",
          notes: c.miscDamageNotes || "Miscellaneous damage noted during walkaround.",
          date: c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB") : c.checkDate,
          vehicleReg: veh ? veh.registration.toUpperCase() : "Unknown",
          driverName: currentDriver?.fullName || "Operator"
        });
      }
    });

    return list.sort((a,b) => b.id.localeCompare(a.id));
  };

  const renderMediaGalleryContent = () => {
    const images = getCapturedImages();

    if (images.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface-container rounded border border-border-subtle text-on-surface-variant font-sans my-4 min-h-[300px]">
          <div className="p-3 bg-surface-container-high border border-border-subtle text-secondary-container rounded-full mb-3.5">
            <Image className="w-8 h-8 opacity-60 animate-pulse" />
          </div>
          <h4 className="font-sans font-bold text-sm tracking-wide text-primary uppercase">No Compliance Media Logged</h4>
          <p className="text-[11px] leading-relaxed mt-1 max-w-[280px]">
            Photos relative to defect failures or miscellaneous cosmetic damage taken during your Walkaround checks will automatically sync here with their categories, dates, and operator notes.
          </p>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-16 scrollbar-thin scrollbar-thumb-border-subtle">
        {images.map(img => (
          <div 
            key={img.id} 
            className="relative bg-surface border border-border-subtle/90 rounded shadow-sm flex flex-col text-primary overflow-hidden group hover:border-border-subtle transition-all duration-300 animate-fadeIn"
          >
            {/* Image Section - occupying full top row */}
            <div className="relative w-full h-48 sm:h-56 bg-surface-container overflow-hidden border-b border-border-subtle flex items-center justify-center shrink-0">
              <img 
                src={img.url} 
                alt={img.category} 
                className="w-full h-full object-cover cursor-pointer hover:scale-102 transition-all duration-300"
                onClick={() => {
                  setSelectedZoomImage(img);
                }}
                referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              
              {/* Overlay Glass Badge on image */}
              <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap z-10">
                <span className={`px-2.5 py-1 rounded-lg font-mono font-black text-[9.5px] tracking-wider uppercase backdrop-blur-sm shadow-sm ${
                  img.sourceType === 'defect' 
                    ? img.severity === 'dangerous' 
                      ? 'bg-danger-red/100/80 text-on-primary border border-red-400/50' 
                      : img.severity === 'major' 
                        ? 'bg-major-defect-orange/80 text-on-primary border border-orange-400/50' 
                        : 'bg-yellow-555/80 bg-yellow-500/80 text-primary border border-yellow-405/50 font-bold'
                    : 'bg-surface-container/85 text-secondary-container border border-border-subtle/30'
                }`}>
                  {img.sourceType === 'defect' ? `${img.severity?.toUpperCase()} DEFECT` : "MISC DAMAGE"}
                </span>

                {img.sourceType === 'defect' && img.status && (
                  <span className={`px-2.5 py-1 rounded-lg font-mono font-black text-[9px] tracking-wider uppercase backdrop-blur-sm shadow-sm ${
                    img.status === 'resolved' 
                      ? 'bg-emerald-600/85 text-on-primary border border-emerald-450/30' 
                      : 'bg-amber-600/85 text-on-primary border border-amber-450/30'
                  }`}>
                    {img.status.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Tap to zoom tip */}
              <div className="absolute bottom-2.5 right-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[8.5px] tracking-widest text-on-surface uppercase select-none pointer-events-none border border-border-subtle/40">
                🔎 TAP TO ZOOM
              </div>
            </div>

            {/* Info Section - spacious block underneath */}
            <div className="p-4 flex flex-col gap-3">
              {/* Category Header */}
              <div className="flex justify-between items-start gap-2">
                <h4 className="font-sans font-extrabold text-primary uppercase tracking-wide leading-snug text-xs sm:text-sm">
                  {img.category}
                </h4>
                <span className="text-on-surface-variant font-mono text-[9px] bg-surface-container px-1.5 py-0.5 rounded shrink-0">
                  {img.date}
                </span>
              </div>

              {/* Notes */}
              <p className="text-[11px] text-on-surface-variant leading-relaxed font-sans bg-surface-container/40 p-2.5 rounded border border-border-subtle/60 font-mono italic">
                "{img.notes}"
              </p>

              {/* Bottom tag row metadata */}
              <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-border-subtle text-[10px]">
                <span className="reg-plate text-[8.5px] px-2 py-0.5 leading-none uppercase tracking-wider font-bold">
                  {img.vehicleReg}
                </span>
                <span className="bg-surface-container/80 border border-border-subtle text-on-surface-variant font-mono text-[9.5px] px-2 py-0.5 rounded-md flex items-center gap-1">
                  👤 {img.driverName}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

   return (
    <div className="fixed inset-0 md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-[420px] md:max-h-[90vh] md:min-h-[600px] md:rounded-2xl md:shadow-2xl flex flex-col bg-surface-container text-on-surface overflow-hidden">
      {/* Active Navigation Header (Fixed) */}
      <div className="bg-[#0f172a] border-b border-[#2a2a30] px-4 py-3 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-secondary-container" />
          <span className="font-sans text-lg font-bold tracking-wider text-white uppercase">WalkSafe</span>
        </div>
        
        {currentDriver && (
          <div className="flex items-center gap-2">
            <span className="text-xs bg-white/10 border border-white/20 font-mono text-secondary-container px-2 py-0.5 rounded-sm">
              PIN ENABLED
            </span>
            <button 
              onClick={() => { if (onLogOutWorkspace) onLogOutWorkspace(); }} 
              className="text-xs text-zinc-400 hover:text-white underline"
            >
              Log out
            </button>
          </div>
        )}
      </div>

      {/* Screen layout content (Scrollable area) */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          
          {/* 1. SCREEN: Driver Authentication Required (Fallback) */}
          {phase === 'pin' && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 bg-surface-container text-center">
              <div className="inline-flex p-4 bg-secondary-container/10 rounded-full border border-secondary-container/20 mb-4">
                <Lock className="w-10 h-10 text-secondary-container" />
              </div>
              <h1 className="font-sans text-2xl font-bold tracking-tight text-primary uppercase">
                Secure Session Required
              </h1>
              <p className="text-sm text-on-surface-variant mt-2 max-w-[240px]">
                Your driver session has expired or is inactive. Please return to the main sign-in portal.
              </p>
              
              {onLogOutWorkspace && (
                <button
                  onClick={onLogOutWorkspace}
                  className="mt-8 bg-secondary-container/100 text-primary px-6 py-2.5 rounded font-sans font-black text-xs uppercase tracking-widest shadow-sm shadow-amber-500/20"
                >
                  Return to Portal
                </button>
              )}
            </div>
          )}

          {/* 2. SCREEN: Driver Home Screen (PWA Dashboard) */}
          {phase === 'home' && currentDriver && (
            <div className="flex-1 flex flex-col gap-5 px-4 py-5 bg-surface-container-low text-primary relative pb-24">
              
              {(!company.isSoloOperator || activeSoloTab === 'check') && (
                <>
                  {/* Driver Welcome banner */}
              <div className="bg-surface-card border border-border-subtle rounded p-card-padding text-on-surface shadow-sm relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-5">
                  <Truck className="w-32 h-32 text-primary" />
                </div>
                <span className="font-label-caps text-label-caps text-secondary-container uppercase tracking-widest font-bold">Driver Portal</span>
                <h2 className="font-headline-md text-headline-md font-bold text-primary mt-1">
                  {new Date().getHours() < 12 ? 'GOOD MORNING' : new Date().getHours() < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING'}, {currentDriver.fullName.toUpperCase()}
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Today: {new Date().toLocaleDateString("en-GB", { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>

              {/* PWA Intelligent Installation Module */}
              {!isStandalone && !isDismissed && (
                <div className="bg-surface-card border border-secondary-container/20 rounded p-card-padding text-on-surface shadow-sm flex flex-col gap-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-secondary-container/5 rounded-full blur-xl pointer-events-none" />
                  
                  <button
                    onClick={() => {
                      setIsDismissed(true);
                      localStorage.setItem('walksafe_install_banner_dismissed', 'true');
                    }}
                    className="absolute top-3.5 right-3.5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer p-0.5 rounded-full hover:bg-surface-container-high z-10"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-secondary-container/10 rounded-lg border border-secondary-container/25 text-secondary-container shrink-0">
                      <Download className="w-4 h-4 animate-bounce" />
                    </div>
                    <div className="pr-6">
                      <h4 className="font-label-caps text-label-caps text-secondary-container uppercase tracking-wide">PWA Seamless Installation Tool</h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-relaxed">
                        To guarantee high-integrity walks, offline safety logging, and instant PDF dispatches, install WalkSafe directly onto your device screen.
                      </p>
                    </div>
                  </div>

                  {installStatus === 'idle' && (
                    <div className="flex flex-col gap-1.5 mt-0.5">
                      <div className="flex gap-2">
                        <button
                          onClick={handleInstallApp}
                          className="flex-1 bg-secondary-container/100 hover:bg-amber-400 text-primary font-sans font-black text-[10px] uppercase tracking-wider py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          Install Directly
                        </button>
                        <button
                          onClick={() => setShowIosGuide(!showIosGuide)}
                          className="bg-surface-container-high hover:bg-surface-container-high text-on-surface font-sans font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-lg transition-all border border-border-subtle flex items-center justify-center gap-1 cursor-pointer"
                        >
                          Apple (iOS) Guide
                        </button>
                      </div>

                      {showIosGuide && (
                        <div className="mt-1 bg-surface/65 p-3 rounded-lg border border-border-subtle text-xs text-on-surface space-y-1.5 animate-in slide-in-from-top duration-200">
                          <span className="font-black text-[9px] text-secondary-container block uppercase tracking-wide font-sans">Apple iOS Safari Installation:</span>
                          <ol className="list-decimal list-inside space-y-1 text-on-surface-variant text-[10px] leading-relaxed">
                            <li>Open <span className="text-on-primary font-mono font-bold">WalkSafe</span> inside your mobile <span className="text-on-primary font-bold">Safari browser</span>.</li>
                            <li>Tap the browser's <span className="text-secondary-container font-bold font-sans">Share icon</span> 📤 (the square with an arrow pointing up).</li>
                            <li>Scroll down the options list and select <span className="text-on-primary font-semibold font-sans">"Add to Home Screen"</span>.</li>
                            <li>Tap <span className="text-on-primary font-bold font-sans">Add</span> at the top-right corner to launch directly from your home screen.</li>
                          </ol>
                        </div>
                      )}
                    </div>
                  )}

                  {installStatus === 'installing' && (
                    <div className="mt-0.5 bg-surface/40 p-3 rounded-lg border border-border-subtle space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-on-surface-variant font-medium flex items-center gap-1.5">
                          <RefreshCw className="w-3 h-3 text-secondary-container animate-spin" />
                          Installing WalkSafe Compliance App...
                        </span>
                        <span className="text-secondary-container font-mono font-extrabold">{installProgress}%</span>
                      </div>
                      <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-secondary-container/100 h-full transition-all duration-300 rounded-full" 
                          style={{ width: `${installProgress}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-on-surface-variant text-center font-sans animate-pulse">
                        ⚠️ Registering offline compliance caches & vehicle databases. This may take up to 2 minutes or so. Please do not close this screen.
                      </p>
                    </div>
                  )}

                  {installStatus === 'installed' && (
                    <div className="mt-0.5 bg-compliance-green/10 border border-emerald-500/25 p-3 rounded-lg text-center space-y-2 animate-in zoom-in-95 duration-200">
                      <span className="text-[10px] text-compliance-green font-black block uppercase tracking-wider">
                        ✓ INSTALLED & READY
                      </span>
                      <p className="text-[10px] text-on-surface leading-snug">
                        WalkSafe has been successfully added to your home screen!
                      </p>
                      <button
                        onClick={() => {
                          setIsStandalone(true);
                          setIsDismissed(true);
                          localStorage.setItem('walksafe_install_banner_dismissed', 'true');
                        }}
                        className="bg-compliance-green hover:bg-emerald-400 text-primary font-sans font-black text-[9px] uppercase tracking-wider py-1.5 px-4 rounded-lg transition-all mx-auto block cursor-pointer"
                      >
                        Acknowledge & Dismiss
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Assigned Schedule Checklist Reminders — tap to start check */}
              {assignedVehicle && !assignedVehicle.isGrounded && schedules && schedules.some(s => s.vehicleId === assignedVehicle.id && isScheduleDueToday(s)) && (
                <div className="bg-secondary-container/10 border border-secondary-container/20 rounded p-card-padding">
                  <span className="font-label-caps text-label-caps text-secondary-container font-bold block mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Mandated Audit Task Due
                  </span>
                  <div className="space-y-2">
                    {schedules
                      .filter(s => s.vehicleId === assignedVehicle.id && isScheduleDueToday(s))
                      .map((sch) => (
                        <button key={sch.id} onClick={() => handleBeginCheck(sch.id)}
                          className="w-full text-left bg-surface-card border border-border-subtle p-3 rounded flex justify-between items-center hover:bg-surface-container-low transition-colors cursor-pointer">
                          <div>
                            <span className="font-body-md font-bold text-primary text-xs block leading-tight">
                              {sch.title}
                            </span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 block">
                              Tap to start this compliance check — Due: {sch.dueDate}
                            </span>
                          </div>
                          <span className="bg-secondary-container/15 text-secondary-container font-data-mono text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                            Start
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Dynamic Organizational Announcements Broadcaster — only show non-expired */}
              {announcements && announcements.filter(ann => !ann.expiresAt || ann.expiresAt >= todayLocal).length > 0 && (
                <div className="bg-surface-card border border-border-subtle rounded p-card-padding">
                  <span className="font-label-caps text-label-caps text-secondary-container font-bold block mb-3 uppercase tracking-wider flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5" />
                    Fleet Operator Notices
                  </span>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {announcements.filter(ann => !ann.expiresAt || ann.expiresAt >= todayLocal).map((ann) => (
                      <div 
                        key={ann.id} 
                        className={`p-3 rounded-lg border text-body-sm leading-relaxed ${
                          ann.important 
                            ? 'bg-danger-red/5 border-danger-red/20 text-danger-red' 
                            : 'bg-surface-container border-border-subtle text-on-surface'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className="font-bold leading-tight block">
                            {ann.important && "HIGH PRIORITY: "}{ann.title}
                          </span>
                          <span className="font-data-mono text-[9px] text-on-surface-variant whitespace-nowrap">
                            {new Date(ann.createdAt).toLocaleDateString("en-GB")}
                          </span>
                        </div>
                        <p className="text-on-surface-variant text-body-sm leading-relaxed">
                          {ann.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicle Assignment Display */}
              {assignedVehicle ? (
                <div className="bg-surface-card border border-border-subtle rounded p-card-padding">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase block">Assigned Logistics Asset</span>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <h3 className="font-title-sm text-title-sm text-primary">
                        {assignedVehicle.make} {assignedVehicle.model}
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Type: {assignedVehicle.type === 'lgv' ? 'Light Goods (Rigid Van)' : assignedVehicle.type === 'hgv' ? 'HGV Core (Rigid Chassis)' : 'Articulated HGV + Trailer'}
                      </p>
                    </div>
                    <div>
                      <span className="bg-plate-yellow text-black font-plate-text text-plate-text tracking-widest uppercase px-2 py-0.5 rounded-sm border border-black/10">{assignedVehicle.registration}</span>
                    </div>
                  </div>

                  {(() => {
                    const todayStr = todayLocal;
                    const motExpired = assignedVehicle.motExpiry && assignedVehicle.motExpiry < todayStr;
                    const taxExpired = assignedVehicle.taxExpiry && assignedVehicle.taxExpiry < todayStr;
                    const hasDocExpiry = motExpired || taxExpired;
                    const hasDefect = defects.some(d => d.vehicleId === assignedVehicle.id && d.severity === 'dangerous' && d.status !== 'closed');
                    if (!assignedVehicle.isGrounded) return null;
                    return (
                      <div className="bg-danger-red/5 border border-danger-red/20 text-danger-red rounded p-2.5 mt-3 text-body-sm flex gap-2">
                        <AlertOctagon className="w-4 h-4 text-danger-red shrink-0" />
                        <div>
                          <span className="font-bold">VEHICLE COMPLIANCE LOCK IN EFFECT</span>
                          {hasDocExpiry && <p className="text-body-sm text-danger-red/90 mt-0.5">⚠️ Expired document{motExpired && taxExpired ? 's' : ''}: {motExpired ? 'MOT' : ''}{motExpired && taxExpired ? ' + ' : ''}{taxExpired ? 'Tax' : ''}</p>}
                          {hasDefect && <p className="text-body-sm text-danger-red/90 mt-0.5">🚫 Dangerous defect{defects.filter(d => d.vehicleId === assignedVehicle.id && d.severity === 'dangerous' && d.status !== 'closed').length > 1 ? 's' : ''} reported</p>}
                          {!hasDocExpiry && !hasDefect && <p className="text-body-sm text-danger-red/90 mt-0.5">Grounded by fleet manager</p>}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Switch default vehicle selector */}
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Not your registration today?</span>
                    <CustomSelect
                      value={assignedVehicle.id}
                      onChange={(val) => {
                        const target = vehicles.find(v => v.id === val);
                        if (target) setAssignedVehicle(target);
                      }}
                      options={(() => {
                        const allowed = (currentDriver?.assignedVehicleIds && currentDriver.assignedVehicleIds.length > 0)
                          ? vehicles.filter(v => currentDriver.assignedVehicleIds?.includes(v.id) || currentDriver.defaultVehicleId === v.id)
                          : vehicles;
                        return allowed.map(v => ({ value: v.id, label: v.registration }));
                      })()}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-secondary-container/5 border border-secondary-container/20 rounded p-card-padding flex items-center justify-between gap-2">
                  <p className="text-primary font-bold text-body-sm leading-relaxed"><AlertTriangle className="w-4 h-4 inline text-secondary-container" /> No vehicle assigned.</p>
                  <button 
                    onClick={() => setActiveSoloTab('vehicles')}
                    className="bg-secondary-container/15 text-secondary-container font-bold text-[10px] px-3 py-1 rounded uppercase tracking-wider hover:bg-secondary-container/25 cursor-pointer"
                  >
                    Add Vehicle
                  </button>
                </div>
              )}

              {/* Compliance checklist actions trigger box */}
              {assignedVehicle && !company.isSoloOperator && (
                <div className="bg-surface-card border border-border-subtle rounded p-card-padding text-center flex flex-col items-center">
                  <div className="p-3 bg-secondary-container/10 rounded-full text-secondary-container mb-3">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>
                  
                  <span className="font-title-sm text-title-sm text-primary tracking-tight">
                    MANDATORY DAILY WALKAROUND CHECK
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-[280px]">
                    You must perform a 27-point walkaround audit before moving the vehicle. Completing this under 5 minutes flags your record.
                  </p>

                  <button
                    onClick={handleBeginCheck}
                    disabled={assignedVehicle.isGrounded}
                    className="w-full mt-4 bg-secondary-container text-on-secondary-container font-bold py-3 px-4 rounded shadow-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    START WALKAROUND CHECK
                  </button>
                  
                  <div className="flex gap-4 mt-3 w-full">
                    <button
                      onClick={() => setPhase('roadside')}
                      className="flex-1 bg-surface-container text-on-surface font-data-mono text-data-mono py-2 px-1 rounded hover:bg-surface-container-high flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-secondary-container" />
                      ROADSIDE DVSA
                    </button>
                    <button
                      onClick={() => setPhase('history')}
                      className="flex-1 bg-surface-container-low text-on-surface-variant border border-border-subtle rounded hover:bg-surface-container-low flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      MY HISTORY
                    </button>
                  </div>
                  <button
                    onClick={() => setPhase('media')}
                    className="w-full mt-2.5 bg-surface-container-high hover:bg-surface-container-high text-on-surface font-bold text-body-sm py-2.5 px-3 rounded flex items-center justify-center gap-2 cursor-pointer transition-all border border-border-subtle"
                  >
                    <Image className="w-3.5 h-3.5 text-secondary-container" />
                    VEHICLE PHOTO GALLERY
                  </button>
                </div>
              )}

              {/* Solo Operator Active Defects close / sign-off button row */}
              {company.isSoloOperator && defects && defects.filter(d => d.vehicleId === assignedVehicle?.id && d.status !== 'closed').length > 0 && (
                <div className="bg-danger-red/10 border border-rose-200 p-4 rounded space-y-3 font-sans text-xs">
                  <div className="flex items-center gap-2 text-danger-red font-bold uppercase">
                    <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
                    <span className="font-sans font-bold text-xs tracking-wide">Active Asset Compliance Defects</span>
                  </div>
                  <div className="space-y-2">
                    {defects
                      .filter(d => d.vehicleId === assignedVehicle?.id && d.status !== 'closed')
                      .map((d) => (
                        <div key={d.id} className="p-3 bg-surface-container border border-border-subtle rounded-lg flex items-center justify-between gap-3 text-on-primary">
                          {resolvingDefectId === d.id ? (
                            <div className="flex-1 text-xs">
                              <span className="text-secondary-container font-bold block mb-1">
                                Mark this fault as solved?
                              </span>
                              <p className="text-[10px] text-on-surface leading-normal mb-2.5">
                                I certify that I have resolved this defect, and declare this vehicle safe for road use (Operator sign-off).
                              </p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const repairPayload = {
                                      engineerName: currentDriver?.fullName || "Operator",
                                      repairDescription: "Inspected and resolved under Operator Sign-off.",
                                      partsUsed: "None required",
                                      closedBy: "Operator sign off"
                                    };
                                    
                                    try {
                                      if (onCloseDefect) {
                                        await onCloseDefect(d.id, repairPayload);
                                      } else {
                                        await fetch(`/api/defects/${d.id}/close`, {
                                          method: "PUT",
                                          headers: {
                                            "Content-Type": "application/json",
                                            "x-company-id": company.id
                                          },
                                          body: JSON.stringify(repairPayload)
                                        });
                                      }
                                      setResolvingDefectId(null);
                                      onTriggerRefresh();
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className="bg-compliance-green hover:bg-emerald-400 text-primary font-bold text-[10px] uppercase py-1 px-3 rounded-md cursor-pointer transition-colors"
                                >
                                  Yes, Mark Solved
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setResolvingDefectId(null)}
                                  className="bg-surface-container-high hover:bg-surface-container-high text-on-surface font-bold text-[10px] uppercase py-1 px-3 border border-border-subtle rounded-md cursor-pointer transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="min-w-0 flex-1">
                                <span className="font-sans font-extrabold text-primary text-xs block truncate">{d.itemLabel}</span>
                                <span className="text-[10px] text-zinc-400 mt-0.5 block truncate">{d.description}</span>
                              </div>
                              
                              <button
                                onClick={() => setResolvingDefectId(d.id)}
                                className="bg-compliance-green hover:bg-emerald-400 text-primary text-primary font-semibold text-[9px] uppercase tracking-wider py-1.5 px-3 rounded-lg shrink-0 cursor-pointer"
                              >
                                Resolve
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Compliance button trigger for solo operator */}
              {company.isSoloOperator && assignedVehicle && (
                <div className="bg-white rounded p-4 border border-border-subtle  text-center flex flex-col items-center font-sans">
                  <span className="font-sans text-xs font-black text-primary tracking-tight uppercase">
                    MANDATORY DAILY WALKAROUND CHECK
                  </span>
                  <p className="text-[11px] text-slate-505 text-on-surface-variant mt-1 max-w-[280px]">
                    Perform your DVSA compliance walkaround check before driving.
                  </p>
                  <button
                    onClick={handleBeginCheck}
                    disabled={assignedVehicle.isGrounded}
                    className="w-full mt-3.5 bg-secondary-container/100 text-primary font-sans font-medium py-3 px-4 rounded shadow-sm hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    START WALKAROUND CHECK
                  </button>
                  <div className="flex gap-3 mt-3 w-full">
                    <button
                      onClick={() => setPhase('roadside')}
                      className="flex-1 bg-surface-container text-primary font-mono text-xs py-2 px-1 rounded-lg hover:bg-surface-container-high flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Shield className="w-3" />
                      ROADSIDE DVSA
                    </button>
                    <button
                      onClick={() => setPhase('history')}
                      className="flex-1 bg-surface-container-low text-on-surface font-mono text-xs py-2 px-1 border border-border-subtle rounded-lg hover:bg-slate-205 hover:bg-surface-container-low flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Clock className="w-3 h-3 text-on-surface-variant" />
                      MY HISTORY
                    </button>
                  </div>
                  <button
                    onClick={() => setActiveSoloTab('defects')}
                    className="w-full mt-2 bg-surface-card border border-danger-red/30 text-danger-red font-sans text-xs py-2.5 px-3 rounded flex items-center justify-center gap-2 cursor-pointer font-bold transition-all hover:bg-danger-red/5"
                  >
                  <span className="material-symbols-outlined text-sm">warning</span>
                  VIEW DEFECTS
                </button>
                <button
                    onClick={() => setPhase('media')}
                    className="w-full mt-2 bg-surface-container-high hover:bg-surface-container-high text-primary font-sans text-xs py-2.5 px-3 rounded flex items-center justify-center gap-2 cursor-pointer font-bold transition-all border border-border-subtle"
                  >
                    <Image className="w-3.5 h-3.5 text-secondary-container" />
                    VEHICLE PHOTO GALLERY
                  </button>
                </div>
              )}

                </>
              )}

              {/* Solo Operator Fuel Tab */}
              {company.isSoloOperator && activeSoloTab === 'fuel' && (
                <div className="bg-surface-card border border-border-subtle rounded p-card-padding animate-fadeIn">
                  <h3 className="font-title-sm text-title-sm text-primary mb-4">Fuel Records</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Track fuel purchases for your vehicle.</p>
                  <div className="mt-6 p-6 bg-surface-container-low border border-border-subtle text-center">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-2">local_gas_station</span>
                    <p className="font-body-sm text-on-surface-variant">Fuel tracking is managed from the admin dashboard.</p>
                  </div>
                </div>
              )}

              {/* Solo Operator Parts Tab */}
              {company.isSoloOperator && activeSoloTab === 'parts' && (
                <div className="bg-surface-card border border-border-subtle rounded p-card-padding animate-fadeIn">
                  <h3 className="font-title-sm text-title-sm text-primary mb-4">Parts Inventory</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">View parts stock levels and request items.</p>
                  <div className="mt-6 p-6 bg-surface-container-low border border-border-subtle text-center">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-2">inventory_2</span>
                    <p className="font-body-sm text-on-surface-variant">Parts inventory is managed from the admin dashboard.</p>
                  </div>
                </div>
              )}
              {/* Solo Operator Active Defect Panel UI */}
              {company.isSoloOperator && activeSoloTab === 'vehicles' && (
                <div className="flex-1 flex flex-col gap-4 font-sans text-xs">
                  <div className="bg-surface-container text-primary rounded p-4 shadow">
                    <h3 className="text-sm font-bold tracking-tight uppercase">Asset Inventory Control</h3>
                    <p className="text-[11px] text-on-surface-variant mt-1">Directly register or remove vehicle licenses in your fleet.</p>
                  </div>

                  {/* Add vehicle form block */}
                  <div className="bg-white p-4 rounded border border-border-subtle space-y-3">
                    <span className="font-bold text-primary uppercase tracking-wide block">Register New Logistics Asset</span>
                    
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      
                      if (!soloVehReg || !soloVehMake || !soloVehModel || !soloVehType) {
                        triggerAlert("Missing required fields for registration plate dispatch.", "Validation Error");
                        return;
                      }

                      if (onAddVehicle) {
                        try {
                          await onAddVehicle({
                            registration: soloVehReg.toUpperCase().trim(),
                            make: soloVehMake.trim(),
                            model: soloVehModel.trim(),
                            type: soloVehType,
                            year: parseInt(soloVehYear || "2021"),
                            colour: soloVehColour.trim() || "White",
                            motExpiry: soloVehMot,
                            taxExpiry: soloVehTax,
                          });
                          triggerAlert(`Asset ${soloVehReg.toUpperCase()} successfully dispatched to roster.`, "Vehicle Registered");
                          // Reset forms
                          setSoloVehReg("");
                          setSoloVehMake("");
                          setSoloVehModel("");
                          setSoloVehYear("2021");
                          setSoloVehColour("White");
                          setDvlaSuccess(false);
                          onTriggerRefresh(); // Trigger data reload in App.tsx
                        } catch (err: any) {
                          triggerAlert("Failed to register vehicle: " + err.message, "Error");
                        }
                      } else {
                        const res = await fetch("/api/vehicles", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            "x-company-id": company.id
                          },
                          body: JSON.stringify({
                            registration: soloVehReg.toUpperCase().trim(),
                            make: soloVehMake.trim(),
                            model: soloVehModel.trim(),
                            type: soloVehType,
                            year: parseInt(soloVehYear || "2021"),
                            colour: soloVehColour.trim() || "White",
                            motExpiry: soloVehMot,
                            taxExpiry: soloVehTax,
                          })
                        });

                        if (res.ok) {
                          alert(`Asset ${soloVehReg.toUpperCase()} successfully dispatched to roster.`);
                          
                          // Reset forms
                          setSoloVehReg("");
                          setSoloVehMake("");
                          setSoloVehModel("");
                          setSoloVehYear("2021");
                          setSoloVehColour("White");
                          setDvlaSuccess(false);

                          onTriggerRefresh(); // Trigger data reload in App.tsx
                        } else {
                          const errText = await res.text();
                          alert("Failed to register vehicle: " + errText);
                        }
                      }
                    }} className="space-y-2 text-primary">
                      
                      <div>
                        <label className="text-[10px] text-on-surface-variant font-bold uppercase block mb-1">Vehicle Registration Plate *</label>
                        <div className="flex w-full gap-2">
                          <input 
                            required 
                            name="reg" 
                            value={soloVehReg}
                            onChange={(e) => setSoloVehReg(e.target.value)}
                            placeholder="e.g. AB12 CDE" 
                            className="flex-1 border border-slate-300 rounded px-2.5 py-2 focus:outline-none focus:border-amber-500 uppercase font-mono text-sm tracking-widest font-bold bg-secondary-container/10" 
                          />
                          <button 
                            type="button"
                            onClick={handleDvlaLookup}
                            disabled={dvlaLoading}
                            className="bg-surface-container text-primary px-4 py-2 rounded font-bold uppercase tracking-wide text-[10px] hover:bg-surface-container-high disabled:bg-slate-300"
                          >
                            {dvlaLoading ? 'SEARCHING...' : 'DVLA LOOKUP'}
                          </button>
                        </div>
                      </div>

                      {dvlaSuccess && (
                        <div className="bg-compliance-green/10 text-emerald-700 p-2 rounded text-[10px] font-bold border border-compliance-green/30">
                          ✅ DVLA match found. Fields have been auto-populated.
                        </div>
                      )}
                      
                      {dvlaError && (
                        <div className="bg-danger-red/10 text-rose-700 p-2 rounded text-[10px] font-bold border border-rose-200">
                          ⚠️ {dvlaError}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <label className="text-[10px] text-on-surface-variant font-bold uppercase">Make *</label>
                          <input required name="make" value={soloVehMake} onChange={e => setSoloVehMake(e.target.value)} placeholder="e.g. Mercedes" className="w-full border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-amber-500 text-xs" />
                        </div>
                        <div>
                          <label className="text-[10px] text-on-surface-variant font-bold uppercase">Model *</label>
                          <input required name="model" value={soloVehModel} onChange={e => setSoloVehModel(e.target.value)} placeholder="e.g. Sprinter" className="w-full border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-amber-500 text-xs" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-on-surface-variant font-bold uppercase block mb-1">Asset Category *</label>
                          <CustomSelect 
                            value={soloVehType} 
                            onChange={setSoloVehType} 
                            options={[
                              { value: 'lgv', label: 'Light Goods Rigid Van' },
                              { value: 'hgv', label: 'HGV Core Rigid Chassis' },
                              { value: 'artic', label: 'Articulated Tractor Truck' }
                            ]} 
                          />
                          <input type="hidden" name="type" value={soloVehType} />
                        </div>
                        <div>
                          <label className="text-[9px] text-on-surface-variant block">Year / Colour</label>
                          <div className="flex gap-1">
                            <input type="number" name="year" value={soloVehYear} onChange={e => setSoloVehYear(e.target.value)} className="w-1/2 border border-slate-300 rounded px-1.5 py-1 text-xs" />
                            <input name="color" value={soloVehColour} onChange={e => setSoloVehColour(e.target.value)} className="w-1/2 border border-slate-300 rounded px-1.5 py-1 text-xs" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-on-surface-variant block">MOT Expiry</label>
                          <input type="date" name="mot" value={soloVehMot} onChange={e => setSoloVehMot(e.target.value)} className="w-full border border-slate-300 rounded px-1.5 py-1 text-[10px]" />
                        </div>
                        <div>
                          <label className="text-[9px] text-on-surface-variant block">Tax Expiry</label>
                          <input type="date" name="tax" value={soloVehTax} onChange={e => setSoloVehTax(e.target.value)} className="w-full border border-slate-300 rounded px-1.5 py-1 text-[10px]" />
                        </div>
                      </div>

                      <button type="submit" className="w-full bg-secondary-container/100 hover:bg-amber-600 text-primary font-bold uppercase tracking-wide py-2 rounded shadow transition-all cursor-pointer text-xs mt-1">
                        Register Compliance Asset ✓
                      </button>
                    </form>
                  </div>

                  {/* Vehicles inventory lists */}
                  <div className="space-y-2">
                    <span className="font-bold text-on-surface uppercase tracking-widest text-[10px] block">Roster Inventory ({vehicles.length})</span>
                    {vehicles.map((v) => (
                      <div key={v.id} className="bg-white border border-border-subtle rounded p-3 flex justify-between items-center text-primary">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="reg-plate text-[10px] py-0.5 px-2 font-mono">{v.registration}</span>
                            <span className="font-bold text-primary">{v.make} {v.model}</span>
                          </div>
                          <span className="text-[10px] text-on-surface-variant block mt-1 uppercase font-mono">
                            Type: {v.type.toUpperCase()} • Grounded: {v.isGrounded ? "⚠️ YES" : "✅ NO"}
                          </span>
                        </div>
                        
                        {vehicles.length > 1 && (
                          <button
                            onClick={async () => {
                              if (confirm(`Are you sure you want to retire asset ${v.registration} from WalkSafe monitoring? This cannot be undone.`)) {
                                if (onDeleteVehicle) {
                                  try {
                                    await onDeleteVehicle(v.id);
                                    alert("Asset retired successfully.");
                                    onTriggerRefresh(); // Reload
                                  } catch (error) {
                                    alert("Failed to retire asset.");
                                  }
                                } else {
                                  const res = await fetch(`/api/vehicles/${v.id}`, {
                                    method: "DELETE",
                                    headers: {
                                      "x-company-id": company.id
                                    }
                                  });
                                  if (res.ok) {
                                    alert("Asset retired successfully.");
                                    onTriggerRefresh(); // Reload
                                  } else {
                                    alert("Failed to retire asset.");
                                  }
                                }
                              }
                            }}
                            className="bg-surface-container-low p-2 text-danger-red rounded-lg hover:bg-danger-red/10 border border-border-subtle cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Solo Operator Defects Panel UI */}
              {company.isSoloOperator && activeSoloTab === 'defects' && (
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Open Defects</h3>
                    <span className="text-xs text-on-surface-variant">{defects.filter(d => d.status !== 'closed').length} open</span>
                  </div>
                  {defects.filter(d => d.status !== 'closed').length === 0 ? (
                    <div className="text-center py-8 text-on-surface-variant font-body-sm">
                      <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">check_circle</span>
                      No open defects!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {defects.filter(d => d.status !== 'closed').map(d => {
                        const veh = vehicles.find(v => v.id === d.vehicleId);
                        const isDangerous = d.severity === 'dangerous';
                        return (
                          <div key={d.id} className="bg-surface-card border border-border-subtle rounded-lg p-4 shadow-sm">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isDangerous ? "bg-danger-red text-white" : d.severity === 'major' ? "bg-major-defect-orange text-white" : "bg-secondary-container text-primary"}`}>{d.severity.toUpperCase()}</span>
                                {veh && <span className="text-[10px] text-on-surface-variant ml-2">{veh.registration}</span>}
                              </div>
                              <span className="text-[10px] text-on-surface-variant">{new Date(d.createdAt).toLocaleDateString('en-GB')}</span>
                            </div>
                            <p className="font-bold text-sm text-primary mb-1">{d.itemLabel}</p>
                            {d.photoUrl && (
                              <div className="mb-3 rounded-lg overflow-hidden border border-border-subtle cursor-pointer" onClick={() => setSelectedZoomImage({ url: d.photoUrl, category: d.itemLabel, notes: d.description })}>
                                <img src={d.photoUrl} alt={d.itemLabel} className="w-full h-40 object-cover hover:opacity-90 transition-opacity" referrerPolicy="no-referrer" />
                              </div>
                            )}
                            <button onClick={async () => {
                              try {
                                await onCloseDefect(d.id, { engineerName: currentDriver?.fullName || "Solo Operator", repairDescription: "Closed by operator", partsUsed: "", engineerSignature: "solo-close" });
                                onTriggerRefresh();
                                triggerAlert("Defect has been closed successfully.", "Defect Closed");
                              } catch(e) { triggerAlert("Failed to close defect.", "Error"); }
                            }} className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity">
                              <span className="material-symbols-outlined text-sm">check</span> CLOSE DEFECT
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
{company.isSoloOperator && activeSoloTab === 'profile' && (
                <div className="flex-1 flex flex-col gap-4 font-sans text-xs">
                  <div className="bg-surface-container text-primary p-4 rounded flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-secondary-container font-black tracking-widest block uppercase">DVSA compliance rating</span>
                      <h4 className="text-sm font-bold mt-0.5 uppercase">EXCELLENT - GREEN ZONE</h4>
                    </div>
                    <span className="h-2.5 w-2.5 rounded-full bg-compliance-green animate-pulse ring-4 ring-emerald-500/20" />
                  </div>

                  {/* Company settings cards */}
                  <div className="bg-surface-card rounded p-4 border border-border-subtle space-y-3 text-primary ">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-on-surface-variant uppercase text-[10px] block tracking-wide">Registered Carrier Information</span>
                      <button 
                        onClick={() => setIsUpdatingCompany(!isUpdatingCompany)}
                        className="text-[10px] font-bold text-on-secondary-container hover:text-secondary bg-secondary-container/10 px-2 py-0.5 rounded uppercase"
                      >
                        {isUpdatingCompany ? 'Cancel' : 'Edit'}
                      </button>
                    </div>

                    <button 
                      onClick={() => window.location.reload()}
                      className="text-[10px] font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-low mt-2 px-2 py-1 rounded uppercase block w-full"
                    >
                      Force Update PWA
                    </button>

                    {isUpdatingCompany ? (
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (onUpdateCompany) {
                          try {
                            await onUpdateCompany({ name: orgFormName, oLicence: orgLicence });
                            setIsUpdatingCompany(false);
                            alert("Fleet information updated successfully.");
                          } catch (err) {
                            alert("Failed to update company.");
                          }
                        }
                      }} className="space-y-2 mt-2">
                        <div>
                          <label className="text-[10px] text-on-surface-variant font-bold uppercase block mb-1">Fleet / Company Name</label>
                          <input required value={orgFormName} onChange={e => setOrgFormName(e.target.value)} className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500 text-xs" />
                        </div>
                        <div>
                          <label className="text-[10px] text-on-surface-variant font-bold uppercase block mb-1">O-Licence Code</label>
                          <input required value={orgLicence} onChange={e => setOrgLicence(e.target.value)} className="w-full font-mono border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500 text-xs uppercase" />
                        </div>
                        <button type="submit" className="w-full bg-primary text-white font-bold text-xs uppercase py-2 rounded-lg">Save Changes</button>
                      </form>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-on-surface-variant block">Fleet Name</span>
                          <span className="font-bold text-slate-905">{company.name}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-505 block">O-Licence Code</span>
                          <span className="font-mono font-bold text-primary">{company.oLicence || "OM1234567"}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Driver session overview */}
                  <div className="bg-surface-card rounded p-4 border border-border-subtle space-y-3 text-primary ">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-on-surface uppercase text-[10px] block tracking-wide font-sans">Operator Session Credentials</span>
                      <button 
                        onClick={() => setIsUpdatingDriver(!isUpdatingDriver)}
                        className="text-[10px] font-bold text-on-secondary-container hover:text-secondary bg-secondary-container/10 px-2 py-0.5 rounded uppercase"
                      >
                        {isUpdatingDriver ? 'Cancel' : 'Edit'}
                      </button>
                    </div>

                    {isUpdatingDriver ? (
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (onUpdateDriver && currentDriver) {
                          try {
                            const updatePayload: any = { 
                              fullName: opFullName, 
                              email: opEmail, 
                              phone: opPhone, 
                            };
                            if (!company.isSoloOperator) {
                                updatePayload.pin = opPin;
                            }
                            await onUpdateDriver(currentDriver.id, updatePayload);
                            
                            // If solo operator, update company credentials
                            if (company.isSoloOperator) {
                                await onUpdateCompany({ 
                                  email: opEmail, 
                                  name: opFullName, // Sync names if solo operator
                                  managerPassword: opPassword || company.managerPassword 
                                });
                            }

                            setIsUpdatingDriver(false);
                            setOpPassword(""); // Clear password field after success
                            triggerAlert("Operator profile updated successfully.", "Profile Updated");
                          } catch (err: any) {
                            triggerAlert(err.message || "Failed to update profile.", "Error");
                          }
                        }
                      }} className="space-y-2 mt-2">
                        <div>
                          <label className="text-[10px] text-on-surface-variant font-bold uppercase block mb-1">Full Name</label>
                          <input required value={opFullName} onChange={e => setOpFullName(e.target.value)} className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500 text-xs" />
                        </div>
                        <div>
                          <label className="text-[10px] text-on-surface-variant font-bold uppercase block mb-1">Login Email</label>
                          <input type="email" required value={opEmail} onChange={e => setOpEmail(e.target.value)} className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500 text-xs" />
                        </div>
                        {company.isSoloOperator && (
                          <div>
                            <label className="text-[10px] text-on-surface-variant font-bold uppercase block mb-1">New Password (Optional)</label>
                            <input type="password" value={opPassword} onChange={e => setOpPassword(e.target.value)} className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500 text-xs" />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-on-surface-variant font-bold uppercase block mb-1">Phone</label>
                            <input value={opPhone} onChange={e => setOpPhone(e.target.value)} className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500 text-xs" />
                          </div>
                          {!company.isSoloOperator && (
                            <div>
                              <label className="text-[10px] text-on-surface-variant font-bold uppercase block mb-1">Driver PIN Card</label>
                              <input required minLength={4} maxLength={6} pattern="\d+" value={opPin} onChange={e => setOpPin(e.target.value)} className="w-full font-mono font-bold tracking-widest border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500 text-xs" />
                            </div>
                          )}
                        </div>
                        <button type="submit" className="w-full bg-surface-container text-primary font-bold text-xs uppercase py-2 rounded-lg cursor-pointer">Save Profile</button>
                      </form>
                    ) : (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">FullName:</span>
                          <span className="font-bold text-primary">{currentDriver.fullName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Login Email:</span>
                          <span className="text-on-surface-variant">{currentDriver.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Carrier Phone:</span>
                          <span className="text-on-surface-variant">{currentDriver.phone || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Driver PIN Card:</span>
                          <span className="font-mono text-on-surface-variant">● ● ● ● ({currentDriver.pin})</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Magic Link Generation */}
                    {!isUpdatingDriver && (
                      <div className="pt-2 border-t border-border-subtle flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const token = currentDriver?.installToken || currentDriver?.id || "";
                            const host = window.location.origin;
                            const fullLink = `${host}/?join=${token}`;
                            navigator.clipboard.writeText(fullLink);
                            alert("Copied Magic Login Link to Clipboard! Send this directly to the driver's phone:\n\n" + fullLink);
                          }}
                          className="flex-1 py-2 px-2 text-[10px] bg-surface-container-low font-semibold text-on-surface hover:bg-surface-container-low rounded-lg  cursor-pointer flex items-center justify-center gap-1"
                        >
                          Copy Magic Link
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const token = currentDriver?.installToken || "token-" + Math.random().toString(36).substr(2, 9);
                            const host = window.location.origin;
                            const fullLink = `${host}/?join=${token}`;
                            setQrCodeModalLink(fullLink); setQrCodeError(false);
                          }}
                          className="flex-1 py-2 px-2 text-[10px] bg-secondary-container/100 text-primary font-semibold hover:bg-amber-600 rounded-lg  cursor-pointer flex items-center justify-center gap-1"
                        >
                          QR Login Code
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Action row to exit workspace */}
                  {onLogOutWorkspace && (
                    <button
                      onClick={() => {
                        if (confirm("Disconnect and exit this driver capsule portal session? Working records will persist safely.")) {
                          onLogOutWorkspace();
                        }
                      }}
                      className="w-full bg-danger-red/10 border border-rose-200 text-danger-red font-bold py-3 px-4 rounded flex items-center justify-center gap-1.5 hover:bg-rose-100 transition-colors cursor-pointer text-xs"
                    >
                      <LogOut className="w-3.5 h-3.5 animate-pulse" />
                      SECURE LOGOUT FROM WORKSPACE
                    </button>
                  )}
                </div>
              )}

              {/* Solo Operator Media Gallery Tab */}
              {company.isSoloOperator && activeSoloTab === 'media' && (
                <div className="flex-1 flex flex-col gap-4 font-sans text-xs">
                  <div className="bg-surface-container border border-border-subtle text-on-primary rounded p-4 shadow">
                    <h3 className="text-sm font-bold tracking-tight uppercase flex items-center gap-1.5">
                      <Image className="w-4 h-4 text-emerald-555 text-compliance-green animate-pulse" />
                      COMPLIANCE MEDIA HUB
                    </h3>
                    <p className="text-[11px] text-on-surface-variant mt-1">
                      Direct archive containing all defect screenshots, damage captures, and miscellaneous warning labels synced on checks.
                    </p>
                  </div>

                  <div className="flex-1 overflow-hidden flex flex-col">
                    {renderMediaGalleryContent()}
                  </div>
                </div>
              )}

              {/* Simple guidance note */}
              <div className="mt-auto bg-surface-container-low p-3 rounded-lg text-center text-[11px] text-on-surface-variant font-sans border border-border-subtle">
                💡 WalkSafe syncs compliance checks to the main portal database instantly.
              </div>

              {/* Bottom action row */}
              <div className="flex gap-2">
                <button
                  onClick={() => setPhase('profile')}
                  className="flex-1 bg-surface-card border border-border-subtle text-on-surface font-bold text-xs py-2.5 px-3 rounded flex items-center justify-center gap-2 cursor-pointer transition-all hover:border-secondary-container"
                >
                  <User className="w-3.5 h-3.5 text-secondary-container" />
                  MY PROFILE
                </button>
                <button
                  onClick={() => setPhase('schedules')}
                  className="flex-1 bg-surface-card border border-border-subtle text-on-surface font-bold text-xs py-2.5 px-3 rounded flex items-center justify-center gap-2 cursor-pointer transition-all hover:border-secondary-container"
                >
                  <Calendar className="w-3.5 h-3.5 text-secondary-container" />
                  SCHEDULES
                </button>
              </div>
            </div>
          )}

          {/* 3. SCREEN: Pre-Check Guide Details */}
          {phase === 'precheck' && assignedVehicle && (
            <div className="flex-1 bg-surface-container px-5 py-6 flex flex-col justify-between">
              <div>
                <h2 className="font-sans text-xl font-bold text-secondary-container tracking-wider">PRE-CHECK PROCESS</h2>
                
                <div className="mt-4 p-4 bg-surface rounded border border-border-subtle text-center flex flex-col items-center">
                  <span className="text-on-surface-variant text-xs">Inspecting Vehicle:</span>
                  <span className="reg-plate mt-2">{assignedVehicle.registration}</span>
                  <span className="text-on-primary font-sans text-sm mt-2">{assignedVehicle.make} {assignedVehicle.model}</span>
                </div>

                <div className="mt-6 flex flex-col gap-3 text-sm text-on-surface">
                  <div className="flex gap-2 items-start bg-surface/40 p-2.5 rounded border border-border-subtle">
                    <CheckCircle className="w-4 h-4 text-secondary-container shrink-0 mt-0.5" />
                    <span>Insert your tachograph card into the unit</span>
                  </div>
                  <div className="flex gap-2 items-start bg-surface/40 p-2.5 rounded border border-border-subtle">
                    <CheckCircle className="w-4 h-4 text-secondary-container shrink-0 mt-0.5" />
                    <span>Set truck head unit mode selector to OTHER WORK</span>
                  </div>
                  <div className="flex gap-2 items-start bg-surface/40 p-2.5 rounded border border-border-subtle">
                    <CheckCircle className="w-4 h-4 text-secondary-container shrink-0 mt-0.5" />
                    <span>Walk to the vehicle exterior to inspect tyres first</span>
                  </div>
                </div>

                <div className="mt-6 bg-amber-950/20 rounded-lg p-3 border border-amber-500/25 text-xs text-secondary-container">
                  ⚠️ <strong>DVSA LAWS:</strong> This check should take 10–15 minutes. Completing it in under 5 minutes will flag your record for manager compliance review.
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleBeginCheck}
                  className="w-full bg-secondary-container/100 text-primary font-sans font-bold py-3.5 text-center text-lg rounded shadow-sm hover:bg-amber-600 uppercase cursor-pointer"
                >
                  BEGIN CHECK NOW
                </button>
                <button
                  type="button"
                  onClick={() => setPhase('home')}
                  className="w-full bg-surface-container text-on-surface-variant font-bold py-2.5 px-4 border border-border-subtle rounded uppercase tracking-wide transition-all cursor-pointer hover:bg-surface-container-high"
                >
                  ✕ CANCEL & RETURN TO DASHBOARD
                </button>
              </div>
            </div>
          )}

          {/* 4. SCREEN: Checklist Wizard 27 Items */}
          {phase === 'wizard' && assignedVehicle && (
            <div className="flex-1 min-h-0 bg-surface-container flex flex-col justify-between">
              
              {/* Wizard Status bar */}
              <div className="bg-surface-card px-4 py-3 border-b border-border-subtle flex items-center justify-between text-body-sm text-on-surface-variant">
                <span className="font-bold text-secondary-container font-data-mono">
                  ITEM {currentItemIndex + 1} OF {getRelevantChecklist(assignedVehicle, activeTemplateId).length}
                </span>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Are you sure you want to cancel this active walkaround check? Your current check answers will be discarded.")) {
                        setPhase('home');
                        setCurrentItemIndex(0);
                        setActiveCheckResults([]);
                      }
                    }}
                    className="text-danger-red hover:text-danger-red/80 font-bold text-[10px] uppercase tracking-wider bg-danger-red/5 border border-danger-red/20 px-2 py-0.5 rounded transition-all cursor-pointer"
                  >
                    ✕ Cancel Check
                  </button>
                  <span className="font-data-mono text-[11px] bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant font-medium flex items-center gap-1 leading-none">
                    <Clock className="w-3 h-3 text-secondary-container animate-pulse" />
                    {checkStartedAt ? Math.round((Date.now() - new Date(checkStartedAt).getTime()) / 60000) : 0} m running
                  </span>
                </div>
              </div>

              {/* Visual Progress bar */}
              <div className="w-full bg-surface-container-high h-1.5 block">
                <div 
                  className="bg-secondary-container h-full transition-all duration-300"
                  style={{ width: `${((currentItemIndex + 1) / getRelevantChecklist(assignedVehicle, activeTemplateId).length) * 100}%` }}
                />
              </div>

              {/* ACTIVE ITEM INSPECTION BOX */}
              <div className="flex-1 px-5 py-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center bg-surface-card py-1.5 px-3 rounded border border-border-subtle text-[11px] text-on-surface-variant font-data-mono">
                    <span className="uppercase font-bold text-secondary-container">
                      GROUP: {getRelevantChecklist(assignedVehicle, activeTemplateId)[currentItemIndex].group === 'interior' ? 'Cab Interior Group A' : 'Vehicle Exterior Group B'}
                    </span>
                    <span className="bg-plate-yellow text-black font-plate-text text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded-sm border border-black/10">{assignedVehicle.registration}</span>
                  </div>

                  {/* Large Area Label */}
                  <div className="text-center my-6">
                    <h3 className="font-headline-md text-headline-md font-extrabold text-primary uppercase tracking-tight">
                      {getRelevantChecklist(assignedVehicle, activeTemplateId)[currentItemIndex].label}
                    </h3>
                  </div>

                  {/* Guidance Explanation Drawer */}
                  <div className="bg-surface-card border border-border-subtle rounded p-card-padding">
                    <button
                      onClick={() => setShowGuidance(!showGuidance)}
                      className="w-full flex items-center justify-between font-body-md font-bold text-on-surface"
                    >
                      <span className="flex items-center gap-1.5 uppercase text-on-surface">
                        <BookOpen className="w-4 h-4 text-secondary-container" />
                        Official DVSA Inspection Guidance
                      </span>
                      <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${showGuidance ? 'rotate-180' : ''}`} />
                    </button>

                    {showGuidance && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-2.5 leading-relaxed pt-2 border-t border-border-subtle">
                        {getRelevantChecklist(assignedVehicle, activeTemplateId)[currentItemIndex].guidance}
                      </p>
                    )}
                  </div>
                </div>

                {/* BIG TOUCH TARGET ACTION BUTTONS */}
                <div className="flex flex-col gap-4 mt-6">
                  <button
                    onClick={handleItemPass}
                    className="w-full h-18 bg-compliance-green text-on-primary font-bold text-xl rounded shadow-sm hover:bg-compliance-green/90 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle className="w-6 h-6 shrink-0" />
                    PASS ITEM
                  </button>

                  <button
                    onClick={handleItemFail}
                    className="w-full h-18 bg-danger-red text-on-primary font-bold text-xl rounded shadow-sm hover:bg-danger-red/90 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <X className="w-6 h-6 shrink-0" />
                    FAIL / DEFECT
                  </button>
                </div>
              </div>

              {/* Wizard Nav Controls footer */}
              <div className="bg-surface-card px-5 py-4 border-t border-border-subtle flex justify-between items-center">
                <button
                  onClick={() => {
                    if (currentItemIndex > 0) {
                      window.history.back();
                    } else {
                      setPhase('precheck');
                    }
                    setShowGuidance(false);
                  }}
                  className="font-body-sm font-semibold text-on-surface-variant hover:text-primary flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                
                

                {activeCheckResults.some(r => r.itemKey === getRelevantChecklist(assignedVehicle, activeTemplateId)[currentItemIndex]?.key) ? (
                  <button
                    onClick={() => advanceWizard(activeCheckResults)}
                    className="font-body-sm font-bold text-secondary-container hover:text-secondary-container flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    Next <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="font-body-sm text-on-surface-variant/30 font-data-mono flex items-center gap-1 select-none">
                    <ArrowRight className="w-3.5 h-3.5 opacity-30" />
                  </span>
                )}
              </div>

              {/* DEFECT REPORTING MODAL Overlay */}
              {isReportingDefect && (
                <div className="absolute inset-0 bg-white z-40 p-4 overflow-y-auto flex flex-col">
                  <div>
                    <div className="flex justify-between items-center border-b border-border-subtle pb-3">
                      <h4 className="font-sans text-lg font-bold text-danger-red flex items-center gap-1.5 uppercase">
                        <AlertTriangle className="w-5 h-5" />
                        REPORT COMPLIANCE DEFECT
                      </h4>
                      <button 
                        onClick={() => setIsReportingDefect(false)}
                        className="p-1 bg-surface-container-high hover:bg-surface-container-high rounded text-on-surface-variant"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="mt-3 bg-red-950/25 border border-red-500/20 p-2.5 rounded-lg text-xs text-red-400">
                      <strong>Target Area:</strong> {getRelevantChecklist(assignedVehicle, activeTemplateId)[currentItemIndex].label}
                    </div>

                    {/* Defect Severity buttons */}
                    <div className="mt-4">
                      <span className="text-xs font-bold text-on-surface block uppercase tracking-wider">
                        Select Defect Severity (DVSA Rules)
                      </span>
                      
                      <div className="flex flex-col gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setDefectSeverity('dangerous')}
                          className={`p-3 text-left rounded-lg border text-xs flex gap-2 transition-colors ${
                            defectSeverity === 'dangerous' 
                              ? 'border-red-600 bg-danger-red/10 text-danger-red' 
                              : 'border-border-subtle bg-white text-on-surface-variant hover:border-red-300'
                          }`}
                        >
                          <span className="shrink-0 font-bold text-danger-red font-mono">DANGEROUS</span>
                          <div>
                            <span className="font-bold block">Vehicle Grounded Immediate Lock</span>
                            <span className="text-[10px] ">Immediate safety risk. Vehicle is legally barred from public roads.</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDefectSeverity('major')}
                          className={`p-3 text-left rounded-lg border text-xs flex gap-2 transition-colors ${
                            defectSeverity === 'major' 
                              ? 'border-orange-500 bg-major-defect-orange/10 text-major-defect-orange' 
                              : 'border-border-subtle bg-white text-on-surface-variant hover:border-orange-300'
                          }`}
                        >
                          <span className="shrink-0 font-bold text-major-defect-orange font-mono">MAJOR FAULT</span>
                          <div>
                            <span className="font-bold block">Significant defect requiring engineer triage</span>
                            <span className="text-[10px] ">Requires repair. Driver may operate with special caution to local depot.</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDefectSeverity('minor')}
                          className={`p-3 text-left rounded-lg border text-xs flex gap-2 transition-colors ${
                            defectSeverity === 'minor' 
                              ? 'border-yellow-500 bg-yellow-100 text-yellow-800' 
                              : 'border-border-subtle bg-white text-on-surface-variant hover:border-yellow-300'
                          }`}
                        >
                          <span className="shrink-0 font-bold text-secondary font-mono">MINOR / ADVISORY</span>
                          <div>
                            <span className="font-bold block">Minor wear / Cosmetic discrepancy</span>
                            <span className="text-[10px] ">Notate for record. Repair before next annual scheduled servicing.</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Fault description */}
                    <div className="mt-4">
                      <label className="text-xs font-bold text-gray-800 block uppercase tracking-wider mb-1.5">
                        Describe the Fault Logged
                      </label>
                      <textarea
                        value={defectDescription}
                        onChange={(e) => setDefectDescription(e.target.value)}
                        placeholder='e.g., "Nearside outer tail lamp has direct structural crack and is blowing moisture."'
                        rows={2}
                        className="w-full bg-white border-2 border-gray-300 rounded-lg p-3 text-sm text-gray-900 focus:outline-hidden focus:border-red-500 placeholder-gray-500"
                      />
                    </div>

                    {/* Camera upload box */}
                    <div className="mt-4">
                      <span className="text-xs font-bold text-on-surface block uppercase tracking-wider mb-1">
                        Camera Photo Evidence (Mandatory)
                      </span>
                      
                      <div className="bg-surface-container rounded-lg border border-border-subtle p-3.5 text-center">
                        {defectPhoto ? (
                          <div className="relative inline-block mx-auto rounded-lg overflow-hidden border border-border-subtle w-full">
                            <img 
                              src={defectPhoto} 
                              alt="Captured Asset Failure" 
                              className="h-40 w-full object-cover rounded-lg bg-surface"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => setDefectPhoto("")}
                              className="absolute top-1 right-1 bg-danger-red hover:bg-danger-red/100 p-1 font-bold text-on-primary rounded-full shadow-sm transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Native Gallery input to allow uploading from device storage */}
                            <input 
                              type="file" 
                              ref={defectGalleryInputRef} 
                              accept="image/*" 
                              onChange={handlePhotoCapture} 
                              className="absolute w-0 h-0 opacity-0 overflow-hidden"
                            />
                            
                            {/* Take Photo Button - triggers live stream in-app camera */}
                            <button
                              type="button"
                              onClick={() => setCameraMode('defect')}
                              className="w-full bg-danger-red hover:bg-danger-red/90 text-on-primary font-bold text-body-md py-3.5 rounded uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                            >
                              <Camera className="w-4 h-4 fill-white shrink-0" />
                              📷 Take Photo (Camera)
                            </button>
                            

                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={confirmDefectReport}
                    disabled={!defectDescription || !defectPhoto}
                    className="w-full mt-6 bg-danger-red text-on-primary font-sans text-lg font-bold py-3 text-center rounded shadow-sm disabled:opacity-40 disabled:pointer-events-none hover:bg-danger-red/100 uppercase transition-colors"
                  >
                    CONFIRM DEFECT & RESUME CHECK
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 5. SCREEN: Check Complete Screen (Signature Required) */}
          {phase === 'complete' && assignedVehicle && currentDriver && (
            <div className="flex-1 bg-surface-container px-5 py-6 flex flex-col justify-between text-on-surface">
              <div>
                <h3 className="font-sans text-xl font-bold text-primary uppercase text-center tracking-wide">
                  {activeCheckResults.some(r => r.result === 'fail') ? "WALKAROUND DEFECT SUMMARY" : "NIL DEFECT INSPECTION SUCCESS"}
                </h3>

                <div className="my-5 p-4 bg-surface rounded border border-border-subtle text-center flex flex-col items-center">
                  <span className="text-on-surface-variant text-[11px] uppercase tracking-wider block">Assessed Asset</span>
                  <span className="reg-plate my-1.5">{assignedVehicle.registration}</span>
                  <span className="text-[11px] text-on-surface-variant font-mono">
                    Time: {checkStartedAt ? Math.round((Date.now() - new Date(checkStartedAt).getTime()) / 1000) : 0} seconds elapsed
                  </span>
                </div>

                {/* Defect overview block */}
                {activeCheckResults.some(r => r.result === 'fail') ? (
                  <div className="bg-red-950/20 border border-red-500/25 rounded-lg p-3 max-h-[160px] overflow-y-auto">
                    <span className="text-xs text-red-400 font-bold block mb-1">
                      ⚠️ OUTSTANDING DEFECTS REGISTERED IN LOG:
                    </span>
                    <ul className="text-xs flex flex-col gap-1 text-on-surface list-disc list-inside">
                      {activeCheckResults.filter(r => r.result === 'fail').map((d, index) => (
                        <li key={index} className="truncate">
                          <strong className="text-red-400">[{d.severity?.toUpperCase()}]</strong> {d.itemLabel}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-emerald-950/20 border border-compliance-green/20 rounded-lg p-3 text-center">
                    <span className="text-compliance-green text-xs font-bold block mb-1">
                      ✓ NO VEHICLE DEFECTS FOUND
                    </span>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">
                      Vehicle matches standard DVSA operator fitness standards and is prepared for regular transport work.
                    </p>
                  </div>
                )}

                {/* Grounded Lock Notice inside Signature screen */}
                {isGroundedAlert && (
                  <div className="bg-danger-red/90 rounded-lg p-3 mt-4 border border-red-700 text-center flex flex-col items-center text-on-primary">
                    <AlertOctagon className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold uppercase tracking-wider">⛔ VEHICLE GROUNDED SAFETY LOCK</span>
                    <p className="text-[10px] mt-1 opacity-90 max-w-[280px]">
                      This vehicle cannot be driven. Your operator administrator has been paged immediately. Call Dave Briggs (Mechanic) at depot.
                    </p>
                  </div>
                )}

                {/* Miscellaneous Damage Section */}
                <div className="mt-4 bg-surface p-4 rounded border border-border-subtle space-y-3">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-secondary-container shrink-0" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wide">
                      Miscellaneous Damage & Notes (Optional)
                    </span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant">
                    Document any minor wear, cosmetic damage or issues that did not fit standard items.
                  </p>
                  
                  <div>
                    <textarea
                      placeholder="Add cosmetic damages notes, scratch description, etc..."
                      value={miscDamageNotes}
                      onChange={(e) => setMiscDamageNotes(e.target.value)}
                      rows={2}
                      className="w-full bg-surface-container border border-border-subtle rounded-lg p-2.5 text-on-surface text-xs focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-3">
                    {/* Native Gallery input to allow uploading from device store */}
                    <input 
                      type="file" 
                      ref={miscGalleryInputRef} 
                      accept="image/*" 
                      onChange={handleMiscPhotoCapture} 
                      className="absolute w-0 h-0 opacity-0 overflow-hidden" 
                    />

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setCameraMode('misc')}
                        className="flex-1 bg-secondary-container/10 border border-secondary-container/20 hover:bg-secondary-container/100/15 py-2.5 px-3 rounded-lg text-center text-[11px] font-bold text-secondary-container transition-all flex items-center justify-center gap-1 cursor-pointer font-sans"
                      >
                        <Camera className="w-3.5 h-3.5 text-secondary-container shrink-0" />
                        📷 Take Photo (Camera)
                      </button>



                      {miscDamagePhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setMiscDamagePhotoUrl("")}
                          className="bg-red-950/45 text-red-400 hover:bg-red-950/70 border border-red-900/40 px-2.5 py-2.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                          title="Remove photo"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {miscDamagePhotoUrl && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-border-subtle w-full animate-fadeIn shadow-sm">
                        <img 
                          src={miscDamagePhotoUrl} 
                          alt="Cosmetic Damage Preview" 
                          className="h-40 w-full object-cover bg-surface"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* SIGNATURE AREA */}
                <div className="mt-4">
                  <label className="font-label-caps text-label-caps text-primary block uppercase mb-1 tracking-wider">
                    DRIVER SIGNATURE
                  </label>
                  <div className="flex gap-2 mb-3">
                    <button type="button" onClick={() => { setSignatureMode('draw'); setDriverSignature(""); }}
                      className={'flex-1 py-1.5 text-[11px] font-bold rounded transition-colors cursor-pointer ' + (signatureMode === 'draw' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant border border-border-subtle')}>
                      Draw Signature
                    </button>
                    <button type="button" onClick={() => { setSignatureMode('type'); setDriverSignature(""); }}
                      className={'flex-1 py-1.5 text-[11px] font-bold rounded transition-colors cursor-pointer ' + (signatureMode === 'type' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant border border-border-subtle')}>
                      Type Name
                    </button>
                  </div>
                  
                  {signatureMode === 'draw' ? (
                    <div className="rounded overflow-hidden border border-border-subtle bg-surface p-1">
                      <SignaturePad 
                        onSave={(data) => setDriverSignature(data)}
                        placeholderText="Draw signature with finger to certify"
                        id="driver-pwa-sigp"
                      />
                    </div>
                  ) : (
                    <div>
                      <input type="text" value={typedName} onChange={(e) => {
                        setTypedName(e.target.value);
                        // Create an SVG signature from typed name
                        const name = e.target.value.trim();
                        if (name) {
                          const svg = '<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"300\" height=\"60\"><style>text{font-family:serif;font-size:24px;font-style:italic;fill:#1a1c1b;}</style><text x=\"20\" y=\"40\">' + name.replace(/"/g, '&quot;') + '</text><text x=\"20\" y=\"52\" font-size=\"10\" fill=\"#888\">Electronically signed</text></svg>';
                          setDriverSignature('data:image/svg+xml;utf8,' + encodeURIComponent(svg));
                        } else {
                          setDriverSignature("");
                        }
                      }} placeholder="Type your full name as legal signature"
                        className="w-full bg-surface border border-border-subtle p-3 text-body-md text-primary font-serif italic focus:outline-hidden focus:border-primary rounded"
                      />
                    </div>
                  )}
                  <span className="font-body-sm text-body-sm text-on-surface-variant text-center block mt-1">
                    Sign off serves as official legal driver compliance declaration.
                  </span>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { if (!isSubmitting) setPhase('home'); }}
                  disabled={isSubmitting}
                  className="flex-1 bg-surface-container-high border border-border-subtle font-sans font-bold py-3 rounded-lg text-xs disabled:opacity-40"
                >
                  DISCARD CHECK
                </button>
                <button
                  onClick={handleSubmitCheck}
                  disabled={!driverSignature || isSubmitting}
                  className="flex-2 bg-secondary-container/100 text-primary font-sans text-base font-extrabold py-3 rounded-lg disabled:opacity-40"
                >
                  {isSubmitting ? "PROCESSING..." : "SUBMIT & CERTIFY ✓"}
                </button>
              </div>
            </div>
          )}

          {/* 6. SCREEN: Roadside compliance (tamper-proof officer view) */}
          {phase === 'roadside' && assignedVehicle && currentDriver && (
            <div className="flex-1 bg-surface-container px-5 py-6 flex flex-col justify-between">
              <div className="text-center">
                <div className="inline-flex py-1 px-3 bg-danger-red/5 border border-danger-red/20 rounded text-[10px] text-danger-red font-data-mono uppercase font-bold tracking-widest mb-4">
                  DVSA OFFICERS ROADSIDE CARD
                </div>

                <div className="bg-surface-card border border-border-subtle rounded p-5 shadow-sm">
                  <span className="font-label-caps text-label-caps text-on-surface-variant block uppercase font-data-mono mb-2">Registered compliance plate</span>
                  <span className="bg-plate-yellow text-black font-plate-text text-[22px] tracking-widest uppercase py-1.5 px-6 leading-none mb-4 inline-flex rounded-sm border border-black/10">{assignedVehicle.registration}</span>

                  <div className="mt-4 flex flex-col gap-3 font-data-mono text-body-sm border-t border-border-subtle pt-4 text-left">
                    <div className="flex justify-between border-b border-border-subtle pb-1.5">
                      <span className="text-on-surface-variant">Result:</span>
                      <span className={`font-bold ${(lastSubmittedCheck || checks[0])?.result === 'nil_defect' ? 'text-compliance-green' : 'text-major-defect-orange'}`}>
                        {(lastSubmittedCheck || checks[0])?.result === 'nil_defect' ? 'NIL DEFECTS' : 'FAULTS REPORTED'}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-border-subtle pb-1.5">
                      <span className="text-on-surface-variant">Driver Check:</span>
                      <span className="text-primary">{currentDriver.fullName}</span>
                    </div>

                    <div className="flex justify-between border-b border-border-subtle pb-1.5">
                      <span className="text-on-surface-variant">Checked Today:</span>
                      <span className="text-primary">
                        {new Date().toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' })} UTC
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-border-subtle pb-1.5">
                      <span className="text-on-surface-variant">Audit Check ID:</span>
                      <span className="text-secondary-container text-[11px] font-data-mono">WS-{lastSubmittedCheck?.id.toUpperCase().substr(0, 14) || "DEMO-ACTIVE-LOG"}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Operator license:</span>
                      <span className="text-primary">{company.oLicence || "OM1234567"}</span>
                    </div>

                    {((lastSubmittedCheck && lastSubmittedCheck.latitude) || (checks[0] && checks[0].latitude)) && (
                      <div className="flex justify-between border-t border-border-subtle pt-1.5">
                        <span className="text-on-surface-variant font-data-mono text-body-sm">GPS Verification:</span>
                        <span className="bg-compliance-green/5 border border-compliance-green/20 text-compliance-green font-data-mono text-[9px] py-0.5 px-2 rounded inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-compliance-green animate-pulse" />
                          VERIFIED: {(lastSubmittedCheck?.latitude || checks[0]?.latitude)?.toFixed(4)}, {(lastSubmittedCheck?.longitude || checks[0]?.longitude)?.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mt-4">
                  Handheld compliance certification has unique server-side hashed checksums to prevent tampering. Validated with local UK DVSA laws.
                </p>

                {/* Direct download report PDF in lock-screen shortcut */}
                <button
                  onClick={() => downloadDriverPDF(lastSubmittedCheck || checks[0])}
                  className="w-full mt-4 bg-secondary-container text-on-secondary-container font-bold py-2.5 rounded text-body-md flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <Download className="w-4 h-4" />
                  DOWNLOAD ROADWORTHINESS PDF
                </button>
              </div>

              <button
                onClick={() => setPhase('home')}
                className="w-full bg-primary text-on-primary font-bold py-3.5 rounded uppercase tracking-wider mt-4 cursor-pointer hover:opacity-90 transition-opacity"
              >
                RETURN TO DASHBOARD
              </button>
            </div>
          )}

          {/* 7. SCREEN: Driver Check History List */}
          {phase === 'history' && currentDriver && (
            <div className="flex-1 bg-surface-container-low p-4 text-primary flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-border-subtle">
                  <h3 className="font-sans text-lg font-bold text-primary">CHECK ARCHIVE HISTORIC</h3>
                  <button onClick={() => setPhase('home')} className="text-xs text-on-surface-variant underline font-semibold">Back</button>
                </div>

                <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[380px] p-0.5">
                  {getDriverPastChecks().length > 0 ? (
                    getDriverPastChecks().map(ch => (
                      <div 
                        key={ch.id} 
                        onClick={() => setSelectedHistoryCheck(ch)}
                        className={`p-3 rounded-lg border bg-white cursor-pointer hover:border-amber-500 transition-colors ${
                          selectedHistoryCheck?.id === ch.id ? 'border-amber-500 ring-1 ring-amber-500' : 'border-border-subtle'
                        }`}
                      >
                        <div className="flex justify-between items-start text-xs">
                          <div>
                            <span className="font-bold text-primary">{ch.checkDate}</span>
                            <span className="text-[10px] text-on-surface-variant font-mono block">Duration: {Math.round((ch.durationSeconds || 0)/60)}m</span>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            ch.result === 'nil_defect' ? 'bg-compliance-green/20 text-compliance-green' : 'bg-orange-100 text-orange-850'
                          }`}>
                            {ch.result === 'nil_defect' ? '✓ NIL FAULT' : '⚠️ FAULTS'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-on-surface-variant font-sans">
                      No matching historical daily walks recorded for this pin session.
                    </div>
                  )}
                </div>

                {/* Sub-block detail preview drawer */}
                {selectedHistoryCheck && (
                  <div className="bg-white border border-slate-300 p-3.5 rounded-lg mt-4 text-xs  text-primary">
                    <span className="font-bold block uppercase tracking-wide text-on-surface-variant mb-2">Check Details Record</span>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-on-surface-variant">Ref ID:</span>
                      <span className="font-mono text-zinc-600">WS-{selectedHistoryCheck.id.substr(0,10)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-on-surface-variant">Date Logged:</span>
                      <span className="text-on-surface-variant">{selectedHistoryCheck.checkDate}</span>
                    </div>
                    
                    <button
                      onClick={() => downloadDriverPDF(selectedHistoryCheck)}
                      className="w-full mt-2.5 bg-primary text-white font-mono text-[11px] font-bold py-1.5 rounded flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5 text-secondary-container" /> DOWNLOAD PDF RECORD
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setPhase('home')}
                className="w-full bg-primary text-on-primary font-bold py-3.5 rounded uppercase mt-4 cursor-pointer hover:opacity-90 transition-opacity"
              >
                RETURN HOME
              </button>
            </div>
          )}

          {/* 8B. SCREEN: Driver Profile */}
          {phase === 'profile' && currentDriver && (
            <div className="flex-1 bg-surface-container p-4 text-primary flex flex-col gap-4 overflow-y-auto pb-24">
              <div className="bg-surface-card border border-border-subtle rounded p-card-padding">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-secondary-container/10 rounded-full border border-secondary-container/20">
                    <User className="w-6 h-6 text-secondary-container" />
                  </div>
                  <div>
                    <h3 className="font-title-sm text-title-sm text-primary">{currentDriver.fullName}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{currentDriver.email || 'No email set'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-body-sm">
                  <div className="bg-surface-container-low p-3 rounded border border-border-subtle">
                    <span className="font-label-caps text-label-caps text-on-surface-variant block">Company</span>
                    <span className="font-bold text-primary block mt-0.5">{company.name}</span>
                  </div>
                  <div className="bg-surface-container-low p-3 rounded border border-border-subtle">
                    <span className="font-label-caps text-label-caps text-on-surface-variant block">O-Licence</span>
                    <span className="font-bold text-primary block mt-0.5">{company.oLicence || 'N/A'}</span>
                  </div>
                  <div className="bg-surface-container-low p-3 rounded border border-border-subtle">
                    <span className="font-label-caps text-label-caps text-on-surface-variant block">Phone</span>
                    <span className="font-bold text-primary block mt-0.5">{currentDriver.phone || 'N/A'}</span>
                  </div>
                  <div className="bg-surface-container-low p-3 rounded border border-border-subtle">
                    <span className="font-label-caps text-label-caps text-on-surface-variant block">Plan</span>
                    <span className="font-bold text-primary block mt-0.5 uppercase">{company.plan}</span>
                  </div>
                </div>
              </div>

              {/* Assigned Vehicle Info */}
              {assignedVehicle && (
                <div className="bg-surface-card border border-border-subtle rounded p-card-padding">
                  <h4 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-3">Assigned Vehicle</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-title-sm text-title-sm text-primary">{assignedVehicle.make} {assignedVehicle.model}</span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        Type: {assignedVehicle.type.toUpperCase()} • {assignedVehicle.colour}
                      </p>
                    </div>
                    <span className="bg-plate-yellow text-black font-plate-text text-plate-text tracking-widest uppercase px-2 py-0.5 rounded-sm border border-black/10">
                      {assignedVehicle.registration}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border-subtle">
                    <div>
                      <span className="font-label-caps text-[10px] text-on-surface-variant">MOT</span>
                      <span className={`font-data-mono text-data-mono block ${assignedVehicle.motExpiry < new Date().toISOString().split('T')[0] ? 'text-danger-red' : 'text-compliance-green'}`}>
                        {assignedVehicle.motExpiry}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-caps text-[10px] text-on-surface-variant">Tax</span>
                      <span className={`font-data-mono text-data-mono block ${assignedVehicle.taxExpiry < new Date().toISOString().split('T')[0] ? 'text-danger-red' : 'text-compliance-green'}`}>
                        {assignedVehicle.taxExpiry}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* PWA Install Status */}
              <div className="bg-surface-card border border-border-subtle rounded p-card-padding">
                <h4 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-3">App Status</h4>
                <div className="flex items-center justify-between">
                  <span className="font-body-md text-body-sm text-on-surface">Installation</span>
                  <span className={`px-2 py-0.5 rounded font-label-caps text-[10px] uppercase ${isStandalone ? 'bg-compliance-green/10 text-compliance-green' : 'bg-secondary-container/10 text-secondary-container'}`}>
                    {isStandalone ? 'Installed' : 'Web App'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-body-md text-body-sm text-on-surface">Device</span>
                  <span className="font-data-mono text-data-mono text-on-surface-variant">{navigator.platform || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle">
                  <span className="font-body-md text-body-sm text-on-surface">App Version</span>
                  <span className="font-data-mono text-data-mono text-secondary-container font-bold">1.0.4</span>
                </div>
              </div>

              {/* Logout */}
              {onLogOutWorkspace && (
                <button
                  onClick={() => {
                    if (confirm("Disconnect and exit this driver session?")) onLogOutWorkspace();
                  }}
                  className="w-full bg-danger-red/10 border border-danger-red/20 text-danger-red font-bold py-3 px-4 rounded flex items-center justify-center gap-1.5 hover:bg-danger-red/20 transition-colors cursor-pointer font-body-md"
                >
                  <LogOut className="w-4 h-4" />
                  SECURE LOGOUT
                </button>
              )}
            </div>
          )}

          {/* 8C. SCHEDULE VIEW (for non-solo drivers) */}
          {phase === 'schedules' && currentDriver && (
            <div className="flex-1 bg-surface-container-low p-4 text-primary flex flex-col gap-4 overflow-y-auto pb-24">
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-border-subtle">
                <h3 className="font-title-sm text-title-sm text-primary">My Compliance Schedule</h3>
                <button onClick={() => setPhase('home')} className="font-body-sm text-body-sm text-on-surface-variant underline cursor-pointer">Back</button>
              </div>
              {schedules.filter(s => assignedVehicle ? s.vehicleId === assignedVehicle.id : true).length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {schedules
                    .filter(s => assignedVehicle ? s.vehicleId === assignedVehicle.id : true)
                    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                    .map(sch => {
                      const veh = vehicles.find(v => v.id === sch.vehicleId);
                      const isOverdue = sch.status === 'pending' && sch.dueDate < new Date().toISOString().split('T')[0];
                      return (
                        <button key={sch.id} onClick={() => { if (sch.status !== 'completed') handleBeginCheck(sch.id); }} className={`w-full text-left bg-surface-card border rounded p-card-padding ${
                          isOverdue ? 'border-danger-red/30 bg-danger-red/5' : 'border-border-subtle'
                        } hover:bg-surface-container-low transition-colors cursor-pointer`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-body-md font-bold text-primary truncate">{sch.title}</h4>
                              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                                {veh ? veh.registration : 'Unknown'} • Due: {sch.dueDate}
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded font-label-caps text-[10px] uppercase shrink-0 ml-2 ${
                              sch.status === 'completed' 
                                ? 'bg-compliance-green/10 text-compliance-green'
                                : isOverdue
                                  ? 'bg-danger-red/10 text-danger-red'
                                  : 'bg-secondary-container/10 text-secondary-container'
                            }`}>
                              {sch.status === 'completed' ? 'Done' : isOverdue ? 'Overdue' : 'Pending'}
                            </span>
                          </div>
                          {sch.frequency && sch.isRecurring && (
                            <span className="font-label-caps text-[10px] text-on-surface-variant mt-2 block uppercase">
                              Recurring: {sch.frequency}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center py-12">
                    <Calendar className="w-10 h-10 text-on-surface-variant/40 mx-auto mb-3" />
                    <p className="font-body-md text-body-md text-on-surface-variant">No scheduled compliance tasks</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 8. SCREEN: Driver Photo Gallery */}
          {phase === 'media' && currentDriver && (
            <div className="flex-1 bg-surface-container p-4 text-primary flex flex-col justify-between overflow-hidden">
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-border-subtle shrink-0 font-sans">
                  <div className="flex items-center gap-1.5">
                    <Image className="w-4 h-4 text-compliance-green animate-pulse" />
                    <h3 className="font-sans text-sm font-bold tracking-wider uppercase text-primary">CAPTURED WALKAROUND MEDIA</h3>
                  </div>
                  <button 
                    onClick={() => setPhase('home')} 
                    className="text-xs bg-surface-container-high hover:bg-surface-container-high px-3 py-1 rounded-md text-on-surface font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  {renderMediaGalleryContent()}
                </div>
              </div>

              <button
                onClick={() => setPhase('home')}
                className="w-full bg-primary text-on-primary font-bold py-3.5 rounded uppercase tracking-wider mt-3 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              >
                RETURN TO HOME DASHBOARD
              </button>
            </div>
          )}

        </div>

        {/* Bottom Navigation for all drivers — visible on home, history, media, profile, schedules phases */}
        {(phase === 'home' || phase === 'history' || phase === 'media' || phase === 'profile' || phase === 'schedules') && currentDriver && (
          <div className="bg-surface-card border-t border-border-subtle h-16 flex items-center justify-around z-50 shrink-0 relative w-full">
            <button 
              onClick={() => { setPhase('home'); setActiveSoloTab('check'); }}
              className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer ${phase === 'home' && activeSoloTab === 'check' ? 'text-secondary-container font-black' : 'text-on-surface-variant'}`}
            >
              <CheckSquare className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 uppercase tracking-wider font-mono">Checks</span>
            </button>
            <button 
              onClick={() => company.isSoloOperator ? setActiveSoloTab('defects') : setPhase('schedules')}
              className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer ${company.isSoloOperator ? (activeSoloTab === 'defects' ? 'text-secondary-container font-black' : 'text-on-surface-variant') : (phase === 'schedules' ? 'text-secondary-container font-black' : 'text-on-surface-variant')}`}
            >
              {company.isSoloOperator ? <span className="material-symbols-outlined w-5 h-5">warning</span> : <Calendar className="w-5 h-5" />}
              <span className="text-[9px] mt-0.5 uppercase tracking-wider font-mono">{company.isSoloOperator ? 'Defects' : 'Schedule'}</span>
            </button>
            <button 
              onClick={() => setPhase('history')}
              className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer ${phase === 'history' ? 'text-secondary-container font-black' : 'text-on-surface-variant'}`}
            >
              <Clock className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 uppercase tracking-wider font-mono">History</span>
            </button>
            <button 
              onClick={() => setPhase('media')}
              className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer ${phase === 'media' ? 'text-secondary-container font-black' : 'text-on-surface-variant'}`}
            >
              <Image className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 uppercase tracking-wider font-mono">Photos</span>
            </button>
            <button 
              onClick={() => setPhase('profile')}
              className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer ${phase === 'profile' ? 'text-secondary-container font-black' : 'text-on-surface-variant'}`}
            >
              <User className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 uppercase tracking-wider font-mono">Profile</span>
            </button>
          </div>
        )}

      {/* Global Message Alert Modal */}
      {messageModal && (
        <div className="fixed inset-0 bg-surface/70 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded w-full max-w-sm shadow-md p-6 text-center border border-border-subtle">
            <h5 className="font-sans font-bold text-lg text-primary mb-2">{messageModal.title}</h5>
            <p className="text-sm text-on-surface-variant mb-6">{messageModal.message}</p>
            <button
              onClick={() => setMessageModal(null)}
              className="w-full py-2.5 px-4 bg-surface-container text-primary font-semibold text-xs rounded hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* DRIVER QR CODE LOGIN DIALOG MODAL */}
      {qrCodeModalLink && (
        <div className="fixed inset-0 bg-surface/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded w-full max-w-sm shadow-md overflow-hidden flex flex-col items-center p-6 text-center border border-border-subtle">
            <div className="w-full flex justify-between items-center mb-4">
              <span className="font-sans font-black text-primary uppercase tracking-wide text-sm">QR login passcode bypass</span>
              <button 
                onClick={() => { setQrCodeModalLink(null); }} 
                className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-full cursor-pointer flex items-center justify-center border-0 bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-surface-container-low p-4 rounded border border-border-subtle mb-4">
              <span className="text-xs font-bold text-on-surface-variant block uppercase mb-1 font-mono">Driver Identity</span>
              <h5 className="text-lg font-bold text-primary uppercase font-sans">{currentDriver?.fullName}</h5>
            </div>

            <p className="text-xs text-on-surface-variant leading-normal mb-6">
              Scan this QR code with any smartphone camera to launch the driver session directly. No login password or manual PIN is required.
            </p>

            {/* High fidelity QR Code generated via qrserver API */}
            <div className="bg-white border-2 border-border-subtle p-4 rounded  mb-6 font-mono text-center">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeModalLink)}`} 
                alt={`${currentDriver?.fullName} Scannable QR Login Token`}
                className="w-48 h-48 select-none mx-auto"
                referrerPolicy="no-referrer"
              />
            </div>
            {qrCodeError && (
              <div className="bg-surface-container p-4 rounded border border-border-subtle mb-4 text-center">
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">QR code could not be loaded. Use the link instead:</p>
                <div className="bg-surface-card border border-border-subtle p-2 rounded text-[10px] font-mono break-all">{qrCodeModalLink}</div>
              </div>
            )}

            <div className="w-full flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(qrCodeModalLink);
                  alert("Copied custom connection link to clipboard.");
                }}
                className="w-full py-2.5 px-4 bg-surface-container hover:bg-surface-container-high text-primary font-semibold text-xs rounded shadow-sm transition-colors cursor-pointer border-0"
              >
                Copy Link Rather
              </button>
              <button
                type="button"
                onClick={() => { setQrCodeModalLink(null); }}
                className="w-full py-2.5 px-4 bg-white border border-border-subtle hover:bg-surface-container-low text-on-surface-variant text-xs font-semibold rounded transition-colors cursor-pointer"
              >
                Close QR Code
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Hidden Snapshot Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* SOLID, CLEAN IN-APP CAMERA VIEWFINDER MODAL */}
      {cameraMode && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col justify-between overflow-hidden">
          {/* Tactical Camera Shutter Flash animation overlay */}
          {isCameraFlash && (
            <div className="absolute inset-0 bg-white z-[110] animate-pulse" />
          )}

          {/* Top header navigation */}
          <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between z-20">
            <button
              onClick={() => {
                setRequiredPhotoItemKey(null);
                setRequiredPhotoUrl("");
                setCameraMode(null);
              }}
              className="text-on-primary hover:text-on-surface font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 focus:outline-hidden cursor-pointer bg-surface-container/60 backdrop-blur-sm py-1.5 px-3 rounded-lg"
            >
              <X className="w-4 h-4 text-danger-red" /> Close
            </button>
            <div className="flex flex-col items-center">
              <span className="text-[12px] text-secondary-container font-sans font-bold tracking-tight uppercase">
                {cameraMode === 'defect' ? "Take Defect Photo" : "Take Cosmetic Photo"}
              </span>
            </div>

          </div>

          {/* Viewfinder stream */}
          <div className="relative flex-1 flex items-center justify-center bg-zinc-950">
            {usingInAppCamera && cameraStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-zinc-600 px-8 text-center">
                <div className="relative">
                  <Camera className="w-12 h-12 stroke-1 text-on-surface-variant animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-secondary-container/100 rounded-full animate-ping" />
                </div>
                <p className="text-[11px] font-sans tracking-wide uppercase text-on-surface-variant">Initializing camera...</p>
                {cameraInitError && (
                  <p className="text-[10px] text-red-400 font-sans italic max-w-xs">{cameraInitError}</p>
                )}
              </div>
            )}

            {/* Custom Alignment Brackets */}
            <div className="absolute inset-x-10 inset-y-20 border border-white/10 pointer-events-none z-10 flex flex-col justify-between">
              {/* Corner brackets */}
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-2 border-l-2 border-amber-500" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-amber-500" />
              </div>
              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-2 border-l-2 border-amber-500" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-amber-500" />
              </div>
            </div>
            
            {/* Instructions Overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 border border-zinc-800/80 rounded-full px-4 py-1.5 z-10 pointer-events-none text-center whitespace-nowrap">
              <span className="text-[10px] font-sans tracking-wider text-zinc-300 uppercase">Center item and press button below</span>
            </div>
          </div>

          {/* Bottom shutter panel */}
          <div className="h-28 bg-black flex items-center justify-center z-20">
            {/* Main Shutter Button */}
            <button
              onClick={() => {
                // Flash animation effect
                setIsCameraFlash(true);
                setTimeout(() => setIsCameraFlash(false), 90);
                
                // Snap using current stream state
                if (videoRef.current && cameraStream && canvasRef.current) {
                  const video = videoRef.current;
                  const canvas = canvasRef.current;
                  canvas.width = video.videoWidth || 1280;
                  canvas.height = video.videoHeight || 720;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const quality = 0.65;
                    const dataUrl = canvas.toDataURL("image/jpeg", quality);
                    
                    if (cameraMode === 'defect') {
                      if (requiredPhotoItemKey) {
                        setRequiredPhotoUrl(dataUrl);
                        setCameraMode(null);
                        setRequiredPhotoItemKey(null);
                      } else {
                        setDefectPhoto(dataUrl);
                      }
                    } else if (cameraMode === 'misc') {
                      setMiscDamagePhotoUrl(dataUrl);
                    }
                  }
                }
                setCameraMode(null);
              }}
              className="group relative w-16 h-16 rounded-full bg-zinc-800 border-2 border-white flex items-center justify-center cursor-pointer transition-transform active:scale-90 hover:scale-105 focus:outline-hidden"
              title="Shutter Button"
            >
              <div className="absolute inset-1 rounded-full bg-white group-active:bg-zinc-200 transition-transform duration-75" />
            </button>
          </div>
        </div>
      )}

      {/* 9. COMPLIANCE IMAGE ZOOM OVERLAY MODAL */}
      {selectedZoomImage && (
        <div className="fixed inset-0 bg-surface/95 backdrop-blur-sm z-[150] flex flex-col justify-between p-4 overflow-y-auto">
          {/* Top controller */}
          <div className="flex items-center justify-between w-full border-b border-border-subtle pb-3 shrink-0">
            <span className="font-mono text-[10px] text-zinc-500">ZOOM LENS VIEW</span>
            <button
              onClick={() => setSelectedZoomImage(null)}
              className="p-1 px-3 bg-danger-red/100/10 hover:bg-danger-red/1.0.30 text-red-400 text-xs uppercase font-extrabold rounded-lg tracking-wider border border-red-500/20 cursor-pointer"
            >
              CLOSE PREVIEW ×
            </button>
          </div>

          {/* Central Zoom image frame */}
          <div className="flex-1 my-4 flex items-center justify-center p-1 relative">
            <img 
              src={selectedZoomImage.url} 
              alt={selectedZoomImage.category} 
              className="max-h-[60vh] max-w-full rounded border border-border-subtle shadow-md object-contain bg-surface"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Bottom attribution panel */}
          <div className="bg-surface-container border border-border-subtle rounded p-5  text-on-primary flex flex-col gap-3 font-sans shrink-0 max-w-md mx-auto w-full">
            <div className="flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded font-mono font-black text-[9px] uppercase ${
                selectedZoomImage.sourceType === 'defect' 
                  ? selectedZoomImage.severity === 'dangerous' 
                    ? 'bg-rose-955/60 text-danger-red border border-red-900/40' 
                    : selectedZoomImage.severity === 'major' 
                      ? 'bg-orange-955/60 text-major-defect-orange border border-orange-900/40' 
                      : 'bg-yellow-955/60 text-yellow-500 border border-yellow-905/40'
                  : 'bg-surface-container-high text-on-surface border border-border-subtle'
              }`}>
                {selectedZoomImage.sourceType === 'defect' ? `${selectedZoomImage.severity} defect` : "Miscellaneous Damage"}
              </span>

              <span className="text-on-surface-variant text-[10px] font-mono">{selectedZoomImage.date}</span>
            </div>

            <div>
              <span className="text-[10px] text-secondary-container uppercase font-black block tracking-wider font-mono">Category Label</span>
              <h4 className="text-sm font-bold text-primary uppercase tracking-normal leading-tight mt-0.5">
                {selectedZoomImage.category}
              </h4>
            </div>

            {selectedZoomImage.notes && (
              <div>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold block tracking-wider font-mono">Registered Description / Notes</span>
                <p className="text-xs text-on-surface leading-relaxed mt-1 font-sans bg-surface p-3 rounded border border-border-subtle/60 font-mono">
                  {selectedZoomImage.notes}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-border-subtle text-[10px] text-on-surface-variant">
              <span className="reg-plate text-[9px] py-1 px-1.5 uppercase font-mono tracking-wide leading-none">
                Plate: {selectedZoomImage.vehicleReg}
              </span>
              <span className="font-mono bg-slate-955 border border-border-subtle px-2 py-0.5 rounded-md">
                👤 {selectedZoomImage.driverName}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
