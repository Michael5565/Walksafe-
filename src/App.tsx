/**
 * @license
 * SPDX-License-Identifier: Apache-2.0 
 */

import { useState, useEffect, FormEvent, useRef, Suspense, lazy } from "react";
import { Company, Vehicle, Driver, WalkaroundCheck, Defect, Announcement, ScheduledChecklist, Notification as WalkSafeNotification, ChecklistTemplate } from "./types";
import { Shield, Truck, Users, RefreshCw, AlertTriangle, Cpu, Wifi, WifiOff, Building, Lock, Key, Check, Plus, AlertCircle, ArrowRight, CornerDownRight, LogOut, Smartphone, Laptop, Bell, Megaphone, CalendarRange, X, Mail, Eye, EyeOff, Clock } from "lucide-react";
import { auth, db as firestore, ensureAuth } from "./lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, setDoc, doc, onSnapshot } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, sendEmailVerification, createUserWithEmailAndPassword } from "firebase/auth";

// Lazy-load the primary workflow components to dramatically reduce bundle sizes for individual users.
// E.g., Mobile PWA users won't download the heavy desktop Manager dashboard chunks.
const DriverPwa = lazy(() => import("./components/DriverPwa"));
const ManagerDashboard = lazy(() => import("./components/ManagerDashboard"));
const SignupFlow = lazy(() => import("./components/SignupFlow"));

// Backup fallback states in case Express server is compiling/initializing in background

const FALLBACK_COMPANY: Company = {
  id: "co-demo-01",
  name: "Murphy Plumbing & Fleet Ltd",
  oLicence: "OM1234567",
  plan: "growth",
  vehicleLimit: 9,
  createdAt: new Date().toISOString()
};

const FALLBACK_VEHICLES: Vehicle[] = [
  {
    id: "veh-01",
    companyId: "co-demo-01",
    registration: "AB12 CDE",
    make: "Ford",
    model: "Transit 350 L2 H2",
    year: 2021,
    colour: "White",
    type: "lgv",
    motExpiry: "2026-10-15",
    taxExpiry: "2026-09-01",
    isActive: true,
    isGrounded: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "veh-02",
    companyId: "co-demo-01",
    registration: "XY61 FGH",
    make: "Mercedes-Benz",
    model: "Sprinter 314 CDI",
    year: 2020,
    colour: "Silver",
    type: "lgv",
    motExpiry: "2026-03-14",
    taxExpiry: "2026-08-31",
    isActive: true,
    isGrounded: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "veh-03",
    companyId: "co-demo-01",
    registration: "BC14 JKL",
    make: "DAF",
    model: "LF 150 Box Van",
    year: 2018,
    colour: "Red",
    type: "hgv",
    motExpiry: "2026-05-18",
    taxExpiry: "2026-07-20",
    isActive: true,
    isGrounded: false,
    createdAt: new Date().toISOString()
  }
];

const FALLBACK_DRIVERS: Driver[] = [
  {
    id: "drv-01",
    companyId: "co-demo-01",
    fullName: "James Murphy",
    phone: "+44 7700 900123",
    pin: "1234",
    defaultVehicleId: "veh-01",
    installToken: "token-murphy",
    createdAt: new Date().toISOString()
  },
  {
    id: "drv-02",
    companyId: "co-demo-01",
    fullName: "Keval Patel",
    phone: "+44 7700 900567",
    pin: "5678",
    defaultVehicleId: "veh-02",
    installToken: "token-patel",
    createdAt: new Date().toISOString()
  },
  {
    id: "drv-03",
    companyId: "co-demo-01",
    fullName: "Teilo Walsh",
    phone: "+44 7700 900888",
    pin: "9999",
    defaultVehicleId: "veh-03",
    installToken: "token-walsh",
    createdAt: new Date().toISOString()
  }
];

// Helper for slow networks (exhausted data) so it fails fast into offline mode instead of hanging
const fetchWithTimeout = async (url: string, options: any = {}, timeoutMs = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

export default function App() {

  // Session details
  interface ActiveWorkspace {
    company: Company;
    role: 'manager' | 'driver';
    managerUsername?: string;
  }

  // Build version — increment to force cache clear on deploy
  const APP_VERSION = '1.0.4';

  // On mount: clear stale localStorage if version changed (ensures updates reflect immediately)
  useEffect(() => {
    const cachedVersion = localStorage.getItem('walksafe_app_version');
    if (cachedVersion !== APP_VERSION) {
      // Clear all walksafe-prefixed cache keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('walksafe_vehicles_') || key.startsWith('walksafe_drivers_') || 
            key.startsWith('walksafe_checks_') || key.startsWith('walksafe_defects_') ||
            key.startsWith('walksafe_announcements_') || key.startsWith('walksafe_schedules_') ||
            key.startsWith('walksafe_templates_') || key.startsWith('walksafe_notifications_') ||
            key.startsWith('walksafe_company_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      localStorage.setItem('walksafe_app_version', APP_VERSION);
      console.log(`[Cache] Cleared stale data for app version ${APP_VERSION}`);
    }
  }, []);

  const [wsSession, setWsSession] = useState<ActiveWorkspace | null>(() => {
    try {
      const v = localStorage.getItem("walksafe_workspace_session");
      if (v) return JSON.parse(v);
    } catch {}
    return null;
  });

  const [currentRole, setCurrentRole] = useState<'driver' | 'manager'>('manager');
  const [magicDriver, setMagicDriver] = useState<Driver | null>(() => {
    try {
      const v = localStorage.getItem("walksafe_driver_session");
      if (v) return JSON.parse(v);
    } catch {}
    return null;
  });
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Helper for resilient, local-first dataset initialization
  const getInitialState = <T,>(keySuffix: string, fallback: T): T => {
    try {
      const v = localStorage.getItem("walksafe_workspace_session");
      if (v) {
        const session = JSON.parse(v);
        const cid = session?.company?.id;
        if (cid) {
          const cached = localStorage.getItem(`walksafe_${keySuffix}_${cid}`);
          if (cached) return JSON.parse(cached);
        }
      }
    } catch (e) {
      console.warn("Error restoring state initializer cache for " + keySuffix, e);
    }
    return fallback;
  };

  // Core synchronized state
  const [company, setCompany] = useState<Company>(() => {
    try {
      const v = localStorage.getItem("walksafe_workspace_session");
      if (v) {
        const session = JSON.parse(v);
        const cid = session?.company?.id;
        if (cid) {
          const cached = localStorage.getItem(`walksafe_company_${cid}`);
          if (cached) return JSON.parse(cached);
        }
        if (session?.company) return session.company;
      }
    } catch {}
    return FALLBACK_COMPANY;
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => getInitialState<Vehicle[]>("vehicles", []));
  const [drivers, setDrivers] = useState<Driver[]>(() => getInitialState<Driver[]>("drivers", []));
  const [checks, setChecks] = useState<WalkaroundCheck[]>(() => getInitialState<WalkaroundCheck[]>("checks", []));
  const [defects, setDefects] = useState<Defect[]>(() => getInitialState<Defect[]>("defects", []));
  
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => getInitialState<Announcement[]>("announcements", []));
  const [schedules, setSchedules] = useState<ScheduledChecklist[]>(() => getInitialState<ScheduledChecklist[]>("schedules", []));
  const [templates, setTemplates] = useState<ChecklistTemplate[]>(() => getInitialState<ChecklistTemplate[]>("templates", []));
  const [notifications, setNotifications] = useState<WalkSafeNotification[]>(() => getInitialState<WalkSafeNotification[]>("notifications", []));

  const [syncQueue, setSyncQueue] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(`walksafe_sync_queue`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isTrialBannerDismissed, setIsTrialBannerDismissed] = useState<boolean>(() => {
    try {
      const cid = wsSession?.company.id || "co-demo-01";
      return localStorage.getItem(`walksafe_trial_banner_dismissed_${cid}`) === "true";
    } catch {}
    return false;
  });

  useEffect(() => {
    localStorage.setItem(`walksafe_sync_queue`, JSON.stringify(syncQueue));
  }, [syncQueue]);

  useEffect(() => {
    const cid = wsSession?.company.id;
    if (cid) {
      setIsTrialBannerDismissed(localStorage.getItem(`walksafe_trial_banner_dismissed_${cid}`) === "true");
    }
  }, [wsSession?.company.id]);
  
  // Real-time Push Notifications Client Engine
  const localInstanceIdRef = useRef<string>("client-" + crypto.randomUUID());
  const knownAnnouncementsRef = useRef<string[]>([]);
  const knownSchedulesRef = useRef<string[]>([]);
  const [activePushNotification, setActivePushNotification] = useState<{
    id: string;
    type: 'announcement' | 'schedule';
    title: string;
    message: string;
  } | null>(null);
  
  // Loading & status trackers
  const [loading, setLoading] = useState(true);
  const [synced, setSynced] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Save changes back to localStorage whenever state changes
  useEffect(() => {
    if (wsSession) {
      const cid = wsSession.company.id;
      localStorage.setItem(`walksafe_company_${cid}`, JSON.stringify(company));
    }
  }, [company, wsSession]);

  useEffect(() => {
    if (wsSession) {
      const cid = wsSession.company.id;
      localStorage.setItem(`walksafe_vehicles_${cid}`, JSON.stringify(vehicles));
    }
  }, [vehicles, wsSession]);

  useEffect(() => {
    if (wsSession) {
      const cid = wsSession.company.id;
      localStorage.setItem(`walksafe_drivers_${cid}`, JSON.stringify(drivers));
    }
  }, [drivers, wsSession]);

  useEffect(() => {
    if (wsSession) {
      const cid = wsSession.company.id;
      localStorage.setItem(`walksafe_checks_${cid}`, JSON.stringify(checks));
    }
  }, [checks, wsSession]);

  useEffect(() => {
    if (wsSession) {
      const cid = wsSession.company.id;
      localStorage.setItem(`walksafe_defects_${cid}`, JSON.stringify(defects));
    }
  }, [defects, wsSession]);

  // Helper to publish a real-time data sync trigger Document onto Firestore
  const touchFirestoreSync = async (type: string) => {
    if (!wsSession) return;
    try {
      const cid = wsSession.company.id;
      const syncDocRef = doc(firestore, "companies", cid, "sync", "trigger");
      await setDoc(syncDocRef, {
        updatedAt: serverTimestamp(),
        type,
        senderId: localInstanceIdRef.current
      });
      console.log(`[Firestore Sync Channel] touchFirestoreSync succeeded for: ${type}`);
    } catch (e) {
      console.warn(`[Firestore Sync Channel] touchFirestoreSync warning (might be offline):`, e);
    }
  };

  // Load database state from server side
  const loadDatabaseState = async (silently = false) => {
    if (!wsSession) {
      setLoading(false);
      return;
    }
    
        // Cold-start: hydrate from localStorage cache if in-memory state is still empty
    try {
      if (vehicles.length === 0) {
        const cached = localStorage.getItem(`walksafe_vehicles_${wsSession.company.id}`);
        if (cached) setVehicles(JSON.parse(cached));
      }
      if (schedules.length === 0) {
        const cached = localStorage.getItem(`walksafe_schedules_${wsSession.company.id}`);
        if (cached) setSchedules(JSON.parse(cached));
      }
      if (checks.length === 0) {
        const cached = localStorage.getItem(`walksafe_checks_${wsSession.company.id}`);
        if (cached) setChecks(JSON.parse(cached));
      }
      if (notifications.length === 0) {
        const cached = localStorage.getItem(`walksafe_notifications_${wsSession.company.id}`);
        if (cached) setNotifications(JSON.parse(cached));
      }
      if (templates.length === 0) {
        const cached = localStorage.getItem(`walksafe_templates_${wsSession.company.id}`);
        if (cached) setTemplates(JSON.parse(cached));
      }
    } catch (_e) {}

    
    // Quick-bypass if the browser is explicitly offline to prevent any fetch timeout lag
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      // Offline - keep current in-memory state, mark offline, still try network
      setOnlineStatus(false);
      setSynced(false);
    }
    
    // Attempt parallel sync state flush to minimize connection timeouts on mobile networks
    if (syncQueue.length > 0) {
      let processedAnyWait = false;
      let remainingCheck = [...syncQueue];
      try {
        const cid = wsSession.company.id;
        const reqHeaders = { "Content-Type": "application/json", "X-Company-Id": cid };
        
        await Promise.all(syncQueue.map(async (item) => {
          try {
            let res;
            if (item.type === 'submit_check') {
              res = await fetchWithTimeout("/api/checks", { method: "POST", headers: reqHeaders, body: JSON.stringify(item.payload) }, 3000);
            } else if (item.type === 'close_defect') {
              res = await fetchWithTimeout(`/api/defects/${item.payload.defectId}/close`, { method: "PUT", headers: reqHeaders, body: JSON.stringify(item.payload.repairLog) }, 3000);
            } else if (item.type === 'add_vehicle') {
              res = await fetchWithTimeout("/api/vehicles", { method: "POST", headers: reqHeaders, body: JSON.stringify(item.payload) }, 3000);
            } else if (item.type === 'add_driver') {
              res = await fetchWithTimeout("/api/drivers", { method: "POST", headers: reqHeaders, body: JSON.stringify(item.payload) }, 3000);
            } else if (item.type === 'update_company') {
              res = await fetchWithTimeout("/api/company", { method: "PUT", headers: reqHeaders, body: JSON.stringify(item.payload) }, 3000);
            }
            
            if (res && res.ok && res.headers.get("content-type")?.includes("application/json")) {
              remainingCheck = remainingCheck.filter(i => i.id !== item.id);
              processedAnyWait = true;
            }
          } catch (e) {
            // failed to sync item under 3s timeout
          }
        }));
        
        if (processedAnyWait) {
          setSyncQueue(remainingCheck);
        }
      } catch (err) {}
      
      // If we still have pending items after trying, load local cache immediately and return
      if (remainingCheck.length > 0) {
        // Keep current in-memory state, mark offline
        setOnlineStatus(false);
        setSynced(false);
        if (!silently) setLoading(false);
        // Still try the main fetch below
      }
    }

    if (!silently) setLoading(true);
    
    const cid = wsSession.company.id;
    const reqHeaders = {
      "Content-Type": "application/json",
      "X-Company-Id": cid
    };

    try {
      const loadController = new AbortController();
      const loadTimeout = setTimeout(() => loadController.abort(), 4000);
      const fetchOpts = { headers: reqHeaders, signal: loadController.signal };

      let compData;
      try {
        const compRes = await fetchWithTimeout("/api/company", fetchOpts);
        if (compRes.ok && compRes.headers.get("content-type")?.includes("application/json")) {
          compData = await compRes.json();
          setCompany(compData);
          const updatedSession = { ...wsSession, company: compData };
          localStorage.setItem("walksafe_workspace_session", JSON.stringify(updatedSession));
        }
      } catch (e) {
        console.warn("Company fetch failed, using cached:", e);
      }
      
      // Perform all non-critical bulk entity fetches concurrently heavily optimizing TTIL over bad 3G/Edge
      const [vehRes, drvRes, checksRes, defectsRes, annRes, schRes, notRes, tplRes] = await Promise.all([
        fetchWithTimeout("/api/vehicles", fetchOpts).catch(() => ({ ok: false, json: async () => [] } as any)),
        fetchWithTimeout("/api/drivers", fetchOpts).catch(() => ({ ok: false, json: async () => [] } as any)),
        fetchWithTimeout("/api/checks", fetchOpts).catch(() => ({ ok: false, json: async () => [] } as any)),
        fetchWithTimeout("/api/defects", fetchOpts).catch(() => ({ ok: false, json: async () => [] } as any)),
        fetchWithTimeout("/api/announcements", fetchOpts).catch(() => ({ ok: false, json: async () => [] } as any)),
        fetchWithTimeout("/api/schedules", fetchOpts).catch(() => ({ ok: false, json: async () => [] } as any)),
        fetchWithTimeout("/api/notifications", fetchOpts).catch(() => ({ ok: false, json: async () => [] } as any)),
        fetchWithTimeout("/api/templates", fetchOpts).catch(() => ({ ok: false, json: async () => [] } as any))
      ]);

      if (vehRes.ok) {
        const data = await vehRes.json();
        setVehicles(data);
        localStorage.setItem(`walksafe_vehicles_${cid}`, JSON.stringify(data));
      }
      if (drvRes.ok) {
        const data = await drvRes.json();
        setDrivers(data);
        localStorage.setItem(`walksafe_drivers_${cid}`, JSON.stringify(data));
      }
      if (checksRes.ok) {
        const data = await checksRes.json();
        setChecks(data);
        localStorage.setItem(`walksafe_checks_${cid}`, JSON.stringify(data));
      }
      if (defectsRes.ok) {
        const data = await defectsRes.json();
        setDefects(data);
        localStorage.setItem(`walksafe_defects_${cid}`, JSON.stringify(data));
      }

      if (annRes.ok) {
        const anns = await annRes.json();
        setAnnouncements(anns);
        localStorage.setItem(`walksafe_announcements_${cid}`, JSON.stringify(anns));
      }

      if (schRes.ok) {
        const schs = await schRes.json();
        setSchedules(schs);
        localStorage.setItem(`walksafe_schedules_${cid}`, JSON.stringify(schs));
      }

      if (notRes.ok) {
        const nots = await notRes.json();
        setNotifications(nots);
        localStorage.setItem(`walksafe_notifications_${cid}`, JSON.stringify(nots));
      }

      if (tplRes.ok) {
        const tpls = await tplRes.json();
        setTemplates(tpls);
        localStorage.setItem(`walksafe_templates_${cid}`, JSON.stringify(tpls));
      }

      clearTimeout(loadTimeout);
      setSynced(true);
      setOnlineStatus(true);
      
    } catch (err) {
      console.warn("Backend offline or timing out. Keeping current in-memory state:", err);
      setSynced(false);
      setOnlineStatus(false);
    } finally {
      if (!silently) setLoading(false);
    }
  };

  const loadLocalCacheFallback = (cid: string) => {
    try {
      // Only fill states that are still at initial empty state (cold start), never overwrite fresh data
      const cachedVeh = localStorage.getItem(`walksafe_vehicles_${cid}`);
      if (cachedVeh && vehicles.length === 0) setVehicles(JSON.parse(cachedVeh));
      const cachedDrv = localStorage.getItem(`walksafe_drivers_${cid}`);
      if (cachedDrv && drivers.length === 0) setDrivers(JSON.parse(cachedDrv));
      const cachedChecks = localStorage.getItem(`walksafe_checks_${cid}`);
      if (cachedChecks && checks.length === 0) setChecks(JSON.parse(cachedChecks));
      const cachedDefects = localStorage.getItem(`walksafe_defects_${cid}`);
      if (cachedDefects && defects.length === 0) setDefects(JSON.parse(cachedDefects));
      const cachedAnn = localStorage.getItem(`walksafe_announcements_${cid}`);
      if (cachedAnn && announcements.length === 0) setAnnouncements(JSON.parse(cachedAnn));
      const cachedSch = localStorage.getItem(`walksafe_schedules_${cid}`);
      if (cachedSch && schedules.length === 0) setSchedules(JSON.parse(cachedSch));
      const cachedNot = localStorage.getItem(`walksafe_notifications_${cid}`);
      if (cachedNot && notifications.length === 0) setNotifications(JSON.parse(cachedNot));
      const cachedTpl = localStorage.getItem(`walksafe_templates_${cid}`);
      if (cachedTpl && templates.length === 0) setTemplates(JSON.parse(cachedTpl));
    } catch (e) {}
  };

  const processSyncQueue = async (currentQueue = syncQueue) => {
    if (!wsSession || currentQueue.length === 0) return;
    console.log("Processing pending changes sync...", currentQueue);
    let remaining = [...currentQueue];
    let activeQueueCopy = [...currentQueue];
    let processedAny = false;

    const cid = wsSession.company.id;
    const reqHeaders = {
      "Content-Type": "application/json",
      "X-Company-Id": cid
    };

    for (const item of activeQueueCopy) {
      try {
        if (item.type === 'submit_check') {
          const res = await fetchWithTimeout("/api/checks", {
            method: "POST",
            headers: reqHeaders,
            body: JSON.stringify(item.payload)
          });
          if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
            remaining = remaining.filter(i => i.id !== item.id);
            processedAny = true;
          }
        } else if (item.type === 'close_defect') {
          const res = await fetchWithTimeout(`/api/defects/${item.payload.defectId}/close`, {
            method: "PUT",
            headers: reqHeaders,
            body: JSON.stringify(item.payload.repairLog)
          });
          if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
            remaining = remaining.filter(i => i.id !== item.id);
            processedAny = true;
          }
        } else if (item.type === 'add_vehicle') {
          const res = await fetchWithTimeout("/api/vehicles", {
            method: "POST",
            headers: reqHeaders,
            body: JSON.stringify(item.payload)
          });
          if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
            remaining = remaining.filter(i => i.id !== item.id);
            processedAny = true;
          }
        } else if (item.type === 'add_driver') {
          const res = await fetchWithTimeout("/api/drivers", {
            method: "POST",
            headers: reqHeaders,
            body: JSON.stringify(item.payload)
          });
          if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
            remaining = remaining.filter(i => i.id !== item.id);
            processedAny = true;
          }
        } else if (item.type === 'update_company') {
          const res = await fetchWithTimeout("/api/company", {
            method: "PUT",
            headers: reqHeaders,
            body: JSON.stringify(item.payload)
          });
          if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
            remaining = remaining.filter(i => i.id !== item.id);
            processedAny = true;
          }
        }
      } catch (err) {
        console.warn("Sync stream interrupted. Retrying next connection:", err);
        break; // Network unavailable, pause sync processing
      }
    }

    setSyncQueue(remaining);

    if (processedAny) {
      loadDatabaseState(true);
      touchFirestoreSync("sync_queue");
    }
  };

  // On mount: register SW and system listeners
  useEffect(() => {
    ensureAuth();
    // 1. Process Magic Token Login Link verification
    const checkMagicLogin = async () => {
      const params = new URLSearchParams(window.location.search);
      let token = params.get("join") || params.get("magic");
      
      const hash = window.location.hash;
      if (!token) {
        if (hash.startsWith("#join/") || hash.startsWith("#magic/")) {
          token = hash.split("/")[1];
        } else if (window.location.pathname.startsWith("/join/")) {
          token = window.location.pathname.split("/join/")[1];
        } else if (window.location.pathname.startsWith("/magic/")) {
          token = window.location.pathname.split("/magic/")[1];
        }
      }
      
      if (token) {
        console.log("[Magic Login Checker] Found magic token:", token);
        try {
          const res = await fetch(`/api/auth/magic-login/${token}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.driver) {
              console.log("[Magic Login Checker] Driver authenticated successfully:", data.driver.fullName);
              const session: ActiveWorkspace = {
                company: data.company,
                role: 'driver'
              };
              localStorage.setItem("walksafe_workspace_session", JSON.stringify(session));
              localStorage.setItem("walksafe_driver_session", JSON.stringify(data.driver));
              localStorage.setItem("walksafe_last_cid", data.company.id);
              
              setWsSession(session);
              setCompany(data.company);
              setMagicDriver(data.driver);
              setCurrentRole('driver');
              
              // Clean query or path to keep browser address pristine
              window.history.replaceState({}, document.title, window.location.origin);
            }
          }
        } catch (err) {
          console.warn("[Magic Login Checker] Error verifying invite magic session:", err);
        }
      }
    };
    
    checkMagicLogin();

    // Paystack Billing Redirect Param Verifier (Live & Authentic)
    const checkPaymentRedirect = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("payment_success") === "true") {
        const plan = params.get("plan");
        const limitStr = params.get("limit");
        const sessionId = params.get("reference") || params.get("trxref") || "direct_activation";
        const limit = Number(limitStr || "1");
        
        const lastCid = localStorage.getItem("walksafe_last_cid");
        const currentSessionStr = localStorage.getItem("walksafe_workspace_session");
        let activeCid = "";
        
        if (currentSessionStr) {
          try {
            const sess = JSON.parse(currentSessionStr);
            activeCid = sess.company?.id;
          } catch (e) {}
        }
        if (!activeCid) {
          activeCid = lastCid || "co-demo-01";
        }

        if (activeCid && plan && limit) {
          try {
            const res = await fetch("/api/billing/verify-session", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Company-Id": activeCid
              },
              body: JSON.stringify({
                sessionId,
                plan,
                limit
              })
            });

            if (res.ok) {
              const data = await res.json();
              if (data.success && data.company) {
                // Update React states
                setCompany(data.company);
                
                // Update local storage session
                if (currentSessionStr) {
                  try {
                    const sess = JSON.parse(currentSessionStr);
                    sess.company = data.company;
                    localStorage.setItem("walksafe_workspace_session", JSON.stringify(sess));
                    setWsSession(sess);
                  } catch (e) {}
                }
                
                alert(` ✓ Payment Successful! Your WalkSafe Workspace has been upgraded to the ${plan.toUpperCase()} Plan (Limit: ${limit} active vehicles) via secure checkout.`);
              }
            }
          } catch (err) {
            console.error("Failed to verify billing transaction:", err);
          } finally {
            // Clean browser address bar
            window.history.replaceState({}, document.title, window.location.origin);
          }
        }
      } else if (params.get("payment_cancelled") === "true") {
        alert(" ✕ Payment Cancelled. Your license upgrade was aborted.");
        window.history.replaceState({}, document.title, window.location.origin);
      }
    };

    checkPaymentRedirect();

    // 2. Register Service Worker and Request System Notification permissions
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(async (reg) => {
          console.log("Progressive Web App SW activated safely:", reg.scope);

          // Listen for new SW taking control (auto-update on deploy)
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log("[SW] New service worker activated — reloading for fresh code.");
            window.location.reload();
          });

          // Listen for SW_UPDATED message from the activated service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SW_UPDATED') {
              console.log("[SW] Received SW_UPDATED signal from new service worker.");
              // The controllerchange event will fire next, triggering the reload
            }
          });
          
          if (Notification.permission === 'default') {
            await Notification.requestPermission();
          }
          
          if (Notification.permission === 'granted' && reg.pushManager) {
            try {
              const keyRes = await fetchWithTimeout("/api/push/public-key");
              if (keyRes.ok) {
                const { publicKey } = await keyRes.json();
                if (publicKey) {
                  const urlBase64ToUint8Array = (base64String: string) => {
                    const padding = '='.repeat((4 - base64String.length % 4) % 4);
                    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
                    const rawData = window.atob(base64);
                    const outputArray = new Uint8Array(rawData.length);
                    for (let i = 0; i < rawData.length; ++i) {
                      outputArray[i] = rawData.charCodeAt(i);
                    }
                    return outputArray;
                  };
                  
                  // 1. Web Push (Legacy/Worker Fallback)
                  const sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey)
                  });
                  
                  const cid = wsSession?.company?.id || localStorage.getItem("walksafe_last_cid") || "co-demo-01";
                  if (cid && sub) {
                    let fcmTokenToReg = null;
                    try {
                      const { messaging, requestPushPermission: rq } = await import("./lib/firebase");
                      if (messaging) {
                        fcmTokenToReg = await rq(cid, reg);
                      }
                    } catch (f) {
                      console.warn("[FCM] registration info:", f);
                    }

                    await fetchWithTimeout("/api/push/register", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        companyId: cid,
                        subscription: sub,
                        fcmToken: fcmTokenToReg
                      })
                    });
                    console.log("[Push Client] Device successfully registered in push database!");
                  }
                }
              }
            } catch (prErr) {
              console.warn("[Web Push Client] Setup warning (iframe context might block notifications):", prErr);
            }
          }
        })
        .catch((err) => console.warn("SW Registration block (iframe constraints):", err));
    }

    const handleOnline = () => {
      setOnlineStatus(true);
      processSyncQueue();
    };
    const handleOffline = () => {
      setOnlineStatus(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleResize = () => {
      const isMob = window.innerWidth < 768;
      setIsMobile(isMob);
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("resize", handleResize);
    };
  }, [wsSession?.company?.id]);

  // Helper to trigger realistic push notifications with synthesized chime
  const triggerPushNotification = (type: 'announcement' | 'schedule', title: string, message: string) => {
    // 1. Synth Acoustic Sound Chime using Web Audio API
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      // Harmonic chime chord (A5 -> C#6 -> E6 -> A6)
      oscillator.frequency.setValueAtTime(880.00, audioCtx.currentTime); // A5
      oscillator.frequency.setValueAtTime(1109.73, audioCtx.currentTime + 0.08); // C#6
      oscillator.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.16); // E6
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.log('Synthesizer sound block:', e);
    }

    // 2. Schedule push banner trigger (In-app fallback & visual indicator)
    setActivePushNotification({
      id: "push-" + Date.now() + Math.random().toString(36).substr(2, 4),
      type,
      title,
      message: message.length > 100 ? message.substring(0, 100) + '...' : message
    });

    // 3. Native OS System Notification (works outside the app)
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const notif = new Notification(title, { body: message, icon: '/vite.svg' });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {
        // Fallback for mobile browsers that strictly require Service Worker
        if (navigator.serviceWorker) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body: message,
              badge: '/vite.svg',
              icon: '/vite.svg',
              vibrate: [200, 100, 200, 100, 200, 100, 200]
            } as any);
          });
        }
      }
    }
  };

  // Push notification auto-dismissal
  useEffect(() => {
    if (activePushNotification) {
      const timer = setTimeout(() => {
        setActivePushNotification(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [activePushNotification?.id]);

  // Initial load tracking
  const isFirstLoadAnnRef = useRef<boolean>(true);
  const isFirstLoadSchRef = useRef<boolean>(true);

  // Detector A: New announcements
  useEffect(() => {
    if (announcements.length > 0) {
      const incomingIds = announcements.map(a => a.id);
      
      if (isFirstLoadAnnRef.current) {
        knownAnnouncementsRef.current = incomingIds;
        isFirstLoadAnnRef.current = false;
      } else {
        const newborns = announcements
          .filter(a => !knownAnnouncementsRef.current.includes(a.id))
          .sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });

        if (newborns.length > 0) {
          const newest = newborns[0];
          triggerPushNotification('announcement', ` 📢 Notice: ${newest.title}`, newest.content);
        }
        knownAnnouncementsRef.current = incomingIds;
      }
    }
  }, [announcements]);

  // Detector B: New schedules
  useEffect(() => {
    if (schedules.length > 0) {
      const incomingIds = schedules.map(s => s.id);
      
      if (isFirstLoadSchRef.current) {
        knownSchedulesRef.current = incomingIds;
        isFirstLoadSchRef.current = false;
      } else {
        const newborns = schedules.filter(s => !knownSchedulesRef.current.includes(s.id));
        if (newborns.length > 0) {
          const newest = newborns[0];
          const matchedVeh = vehicles.find(v => v.id === newest.vehicleId);
          const regSuffix = matchedVeh ? ` for vehicle ${matchedVeh.registration}` : '';
          triggerPushNotification('schedule', ` 🗓️ Task Scheduled: ${newest.title}`, `Inspection is mandated${regSuffix} due ${newest.dueDate}.`);
        }
        knownSchedulesRef.current = incomingIds;
      }
    }
  }, [schedules, vehicles]);

  // Workspace Sync Trigger & Background Synchronizer
  useEffect(() => {
    if (wsSession) {
      setCompany(wsSession.company);
      setCurrentRole(wsSession.role);
      loadDatabaseState();

      // Real-time Firestore sync channel trigger subscription!
      // This listener acts as an instant, zero-polling reactive push-sync channel.
      // Whenever another user (manager or driver) touches/updates this company's DB,
      // it updates the company's Firestore sync trigger document.
      // This instantly notifies us, updating our UI locally in under a second!
      let unsubscribeFirestore: (() => void) | null = null;
      try {
        const cid = wsSession.company.id;
        const syncDocRef = doc(firestore, "companies", cid, "sync", "trigger");
        unsubscribeFirestore = onSnapshot(syncDocRef, (snapshot) => {
          if (snapshot.exists()) {
            const syncData = snapshot.data();
            console.log("[Firestore Sync Channel] Received instant database refresh broadcast:", syncData);
            
            // Only trigger database reload if this broadcast did not originate from this exact device instance!
            if (syncData && syncData.senderId !== localInstanceIdRef.current) {
              console.log("[Firestore Sync Channel] Foreign broadcast matching - syncing local state with database silently.");
              loadDatabaseState(true);
            } else {
              console.log("[Firestore Sync Channel] Blocked reload on self-originated sync call.");
            }
          }
        }, (err) => {
          console.warn("[Firestore Sync Channel] Snapshot listener blocked or fully offline (safe fallback in effect):", err);
        });
      } catch (evtErr) {
        console.warn("[Firestore Sync Channel] Setup failed:", evtErr);
      }

      // Event listener for real-time background syncs natively pushed from the service worker
      // instead of aggressively polling the server every few seconds.
      const handleSwMessage = (event: MessageEvent) => {
        if (event.data && (event.data.type === 'PUSH_SYNC' || event.data.type === 'PUSH_RECEIVED')) {
          processSyncQueue();
          loadDatabaseState(true);
        }
      };

      if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('message', handleSwMessage);
      }

      return () => {
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
        }
        if (navigator.serviceWorker) {
          navigator.serviceWorker.removeEventListener('message', handleSwMessage);
        }
      };
    } else {
      setLoading(false);
      isFirstLoadAnnRef.current = true;
      isFirstLoadSchRef.current = true;
      knownAnnouncementsRef.current = [];
      knownSchedulesRef.current = [];
    }
  }, [wsSession?.company?.id]);

  const handleLogOut = () => {
    // 1. Log out from Firebase client-side Auth
    signOut(auth).catch(e => console.warn("[Firebase Auth] Custom sign out warning:", e));

    // Collect and fully purge all walksafe_ prefix keys to prevent caching pollution when role swapping
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("walksafe_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    setWsSession(null);
    setMagicDriver(null);
    setVehicles([]);
    setDrivers([]);
    setChecks([]);
    setDefects([]);
  };

  // API Callbacks with robust Local-First, Network Synchronized strategy

  const handleAddVehicle = async (vehPayload: any) => {
    const tempId = "veh-" + Date.now();
    const cid = wsSession?.company.id || company.id;
    const newV: Vehicle = {
      id: tempId,
      companyId: cid,
      registration: vehPayload.registration.toUpperCase(),
      make: vehPayload.make,
      model: vehPayload.model,
      year: Number(vehPayload.year) || new Date().getFullYear(),
      colour: vehPayload.colour,
      type: vehPayload.type,
      motExpiry: vehPayload.motExpiry,
      taxExpiry: vehPayload.taxExpiry,
      isActive: true,
      isGrounded: false,
      createdAt: new Date().toISOString()
    };

    // Update state immediately
    setVehicles(prev => [...prev, newV]);

    const reqHeaders = {
      "Content-Type": "application/json",
      "X-Company-Id": cid
    };

    try {
      const res = await fetchWithTimeout("/api/vehicles", {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify(vehPayload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save vehicle");
      }
      await loadDatabaseState(true);
      touchFirestoreSync("add_vehicle");
    } catch (err) {
      console.warn("Saving vehicle locally & queuing for background sync:", err);
      setSyncQueue(prev => [...prev, {
        id: "sync-" + Date.now() + Math.random().toString(36).substr(2, 5),
        type: 'add_vehicle',
        payload: vehPayload
      }]);
    }
  };

  const handleAddDriver = async (drvPayload: any) => {
    const tempId = "drv-" + Date.now();
    const cid = wsSession?.company.id || company.id;
    const newD: Driver = {
      id: tempId,
      companyId: cid,
      fullName: drvPayload.fullName,
      email: drvPayload.email,
      phone: drvPayload.phone,
      pin: drvPayload.pin,
      defaultVehicleId: drvPayload.defaultVehicleId,
      assignedVehicleIds: drvPayload.assignedVehicleIds || [],
      installToken: drvPayload.installToken || "token-" + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString()
    };

    // Update state immediately
    setDrivers(prev => [...prev, newD]);

    const reqHeaders = {
      "Content-Type": "application/json",
      "X-Company-Id": cid
    };

    try {
      const res = await fetchWithTimeout("/api/drivers", {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify(drvPayload)
      });
      if (res.ok) {
        await loadDatabaseState(true);
        touchFirestoreSync("add_driver");
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to add driver");
      }
    } catch (err: any) {
      console.warn("Saving driver locally & queuing for background sync:", err);
      // For specific duplicate errors, we might want to NOT queue it for sync and instead alert the user immediately
      if (err.message && (err.message.includes("email") || err.message.includes("use"))) {
         throw err; 
      }
      setSyncQueue(prev => [...prev, {
        id: "sync-" + Date.now() + Math.random().toString(36).substr(2, 5),
        type: 'add_driver',
        payload: drvPayload
      }]);
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (!confirm("Are you sure you want to delete this driver? All active roster roles and associations will be removed.")) {
      return;
    }
    const cid = wsSession?.company.id || company.id;
    const reqHeaders = {
      "Content-Type": "application/json",
      "X-Company-Id": cid
    };

    setDrivers(prev => prev.filter(d => d.id !== driverId));

    try {
      const res = await fetchWithTimeout(`/api/drivers/${driverId}`, {
        method: "DELETE",
        headers: reqHeaders
      });
      if (res.ok) {
        await loadDatabaseState(true);
        touchFirestoreSync("delete_driver");
      }
    } catch (err) {
      console.warn("Deleted driver offline fallback applied:", err);
    }
  };

  const handleUpdateDriver = async (driverId: string, drvPayload: Partial<Driver>) => {
    const cid = wsSession?.company.id || company.id;
    const reqHeaders = {
      "Content-Type": "application/json",
      "X-Company-Id": cid
    };

    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, ...drvPayload } : d));

    try {
      const res = await fetchWithTimeout(`/api/drivers/${driverId}`, {
        method: "PUT",
        headers: reqHeaders,
        body: JSON.stringify(drvPayload)
      });
      if (res.ok) {
        await loadDatabaseState(true);
        touchFirestoreSync("update_driver");
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to update driver");
      }
    } catch (err: any) {
      console.warn("Saving driver update offline fallback:", err);
      if (err.message && (err.message.includes("email") || err.message.includes("use"))) {
         throw err; 
      }
    }
  };

  const handleUpdateVehicle = async (vehicleId: string, vehPayload: Partial<Vehicle>) => {
    const cid = wsSession?.company.id || company.id;
    const reqHeaders = {
      "Content-Type": "application/json",
      "X-Company-Id": cid
    };

    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, ...vehPayload } : v));

    try {
      const res = await fetchWithTimeout(`/api/vehicles/${vehicleId}`, {
        method: "PUT",
        headers: reqHeaders,
        body: JSON.stringify(vehPayload)
      });
      if (res.ok) {
        await loadDatabaseState(true);
        touchFirestoreSync("update_vehicle");
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to update vehicle");
      }
    } catch (err: any) {
      console.warn("Updated vehicle offline fallback applied:", err);
      if (err.message && err.message.includes("registration")) {
         throw err; 
      }
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm("Are you sure you want to delete this vehicle? This will remove all compliance records and past walkround check histories permanently.")) {
      return;
    }
    const cid = wsSession?.company.id || company.id;
    const reqHeaders = {
      "Content-Type": "application/json",
      "X-Company-Id": cid
    };

    setVehicles(prev => prev.filter(v => v.id !== vehicleId));

    try {
      const res = await fetchWithTimeout(`/api/vehicles/${vehicleId}`, {
        method: "DELETE",
        headers: reqHeaders
      });
      if (res.ok) {
        await loadDatabaseState(true);
        touchFirestoreSync("delete_vehicle");
      }
    } catch (err) {
      console.warn("Deleted vehicle offline fallback applied:", err);
    }
  };

  const handleCheckSubmitted = async (checkPayload: any) => {
    const newCheckId = "chk-" + Date.now();
    checkPayload.id = newCheckId;
    const cid = wsSession?.company.id || company.id;
    const hasFailures = checkPayload.items.some((it: any) => it.result === 'fail');
    
    checkPayload.createdAt = new Date().toISOString();
    
    const newCheck: WalkaroundCheck = {
      id: newCheckId,
      vehicleId: checkPayload.vehicleId,
      driverId: checkPayload.driverId,
      companyId: cid,
      startedAt: checkPayload.startedAt,
      completedAt: new Date().toISOString(),
      durationSeconds: Math.round((Date.now() - new Date(checkPayload.startedAt).getTime()) / 1000),
      result: hasFailures ? 'defect' : 'nil_defect',
      driverSignature: checkPayload.driverSignature,
      checkDate: new Date().toISOString().split('T')[0],
      items: checkPayload.items,
      createdAt: new Date().toISOString(),
      latitude: checkPayload.latitude,
      longitude: checkPayload.longitude,
      miscDamageNotes: checkPayload.miscDamageNotes,
      miscDamagePhotoUrl: checkPayload.miscDamagePhotoUrl,
      templateName: checkPayload.templateName
    };

    // Update checks state locally
    setChecks(prev => [newCheck, ...prev]);

    // Handle defects locally from submitted check failures
    if (checkPayload.results && Array.isArray(checkPayload.results)) {
      const news = checkPayload.results.map((f: any) => ({
        id: "def-" + Math.random().toString(36).substr(2, 5),
        checkId: newCheckId,
        itemKey: f.itemKey,
        itemLabel: f.itemLabel,
        vehicleId: checkPayload.vehicleId,
        companyId: cid,
        severity: f.severity,
        description: f.description,
        photoUrl: f.photoUrl,
        status: 'open' as const,
        createdAt: new Date().toISOString()
      }));
      setDefects(prev => [...prev, ...news]);

      if (checkPayload.results.some((f: any) => f.severity === 'dangerous')) {
        setVehicles(prev => prev.map(v => v.id === checkPayload.vehicleId ? { ...v, isGrounded: true } : v));
      }
    }

    // Execute server synchronization asynchronously in the background so there is zero delay for the driver!
    (async () => {
      const reqHeaders = {
        "Content-Type": "application/json",
        "X-Company-Id": cid
      };

      try {
        const res = await fetchWithTimeout("/api/checks", {
          method: "POST",
          headers: reqHeaders,
          body: JSON.stringify(checkPayload)
        });
        if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
          loadDatabaseState(true);
          touchFirestoreSync("submit_check");
        } else {
          throw new Error("Server sync failed");
        }
      } catch (err) {
        console.warn("Saving walkaround check locally & queuing for background sync:", err);
        setSyncQueue(prev => [...prev, {
          id: "sync-" + Date.now() + Math.random().toString(36).substr(2, 5),
          type: 'submit_check',
          payload: checkPayload
        }]);
      }
    })();
    
    return newCheck;
  };

  const handleCloseDefect = async (defectId: string, repairLog: any) => {
    const cid = wsSession?.company.id || company.id;
    // Apply local state closing immediately
    const updatedDefects = defects.map(d => {
      if (d.id === defectId) {
        return {
          ...d,
          status: 'closed' as const,
          engineerName: repairLog.engineerName,
          repairDescription: repairLog.repairDescription,
          partsUsed: repairLog.partsUsed,
          repairCompletedAt: new Date().toISOString(),
          engineerSignature: repairLog.engineerSignature,
          closedBy: "Fleet Manager",
          closedAt: new Date().toISOString()
        };
      }
      return d;
    });
    setDefects(updatedDefects);

    // Unground vehicle locally if appropriate
    const targetDef = defects.find(d => d.id === defectId);
    if (targetDef) {
      const vehicleId = targetDef.vehicleId;
      const stillGrounded = updatedDefects.some(d => d.vehicleId === vehicleId && d.severity === 'dangerous' && d.status !== 'closed');
      if (!stillGrounded) {
        setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, isGrounded: false } : v));
      }
    }

    // Execute server defect closure asynchronously in the background
    (async () => {
      const reqHeaders = {
        "Content-Type": "application/json",
        "X-Company-Id": cid
      };

      try {
        const res = await fetchWithTimeout(`/api/defects/${defectId}/close`, {
          method: "PUT",
          headers: reqHeaders,
          body: JSON.stringify(repairLog)
        });
        if (res.ok) {
          loadDatabaseState(true);
          touchFirestoreSync("close_defect");
        } else {
          throw new Error("Server reply failed");
        }
      } catch (err) {
        console.warn("Closing defect locally & queuing for background sync:", err);
        setSyncQueue(prev => [...prev, {
          id: "sync-" + Date.now() + Math.random().toString(36).substr(2, 5),
          type: 'close_defect',
          payload: { defectId, repairLog }
        }]);
      }
    })();
  };

  const handleUpdateCompany = async (compPayload: any) => {
    const cid = wsSession?.company.id || company.id;
    setCompany(prev => ({ ...prev, ...compPayload }));

    const reqHeaders = {
      "Content-Type": "application/json",
      "X-Company-Id": cid
    };

    try {
      const res = await fetchWithTimeout("/api/company", {
        method: "PUT",
        headers: reqHeaders,
        body: JSON.stringify(compPayload)
      });
      if (res.ok) {
        await loadDatabaseState(true);
        touchFirestoreSync("update_company");
      } else {
        const data = await res.json();
        throw new Error(data.error || "Server error updating carrier");
      }
    } catch (err: any) {
      console.warn("Updated company profile locally & queuing for background sync:", err);
      if (err.message && (err.message.includes("email") || err.message.includes("use"))) {
         throw err; 
      }
      setSyncQueue(prev => [...prev, {
        id: "sync-" + Date.now() + Math.random().toString(36).substr(2, 5),
        type: 'update_company',
        payload: compPayload
      }]);
    }
  };

  const handleAddAnnouncement = async (annPayload: any) => {
    const cid = wsSession?.company.id || company.id;
    const reqHeaders = {
      "Content-Type": "application/json",
      "X-Company-Id": cid
    };

    try {
      const res = await fetchWithTimeout("/api/announcements", {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify(annPayload)
      });
      if (res.ok) {
        await loadDatabaseState(true);
        touchFirestoreSync("add_announcement");
      }
    } catch (err) {
      console.warn("Failed posting announcement to backend:", err);
      const offlineAnn: Announcement = {
        id: "ann-offline-" + Date.now(),
        companyId: cid,
        title: annPayload.title,
        content: annPayload.content,
        important: !!annPayload.important,
        createdAt: new Date().toISOString(),
        expiresAt: annPayload.expiresAt || undefined
      };
      setAnnouncements(prev => [offlineAnn, ...prev]);
    }
  };

  const handleAddSchedule = async (schPayload: any) => {
    const cid = wsSession?.company.id || company.id;
    const reqHeaders = {
      "Content-Type": "application/json",
      "X-Company-Id": cid
    };

    try {
      const res = await fetchWithTimeout("/api/schedules", {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify(schPayload)
      });
      if (res.ok) {
        await loadDatabaseState(true);
        touchFirestoreSync("add_schedule");
      }
    } catch (err) {
      console.warn("Failed scheduling checklist to backend:", err);
      const offlineSch: ScheduledChecklist = {
        id: "sch-offline-" + Date.now(),
        companyId: cid,
        title: schPayload.title,
        vehicleId: schPayload.vehicleId,
        dueDate: schPayload.dueDate || new Date().toISOString().split('T')[0],
        status: "pending",
        templateId: schPayload.templateId || undefined,
        createdAt: new Date().toISOString()
      };
      setSchedules(prev => [...prev, offlineSch]);
    }
  };

  const handleSaveTemplate = async (templateId: string | null, tplPayload: any) => {
    const cid = wsSession?.company.id || company.id;
    const method = templateId ? 'PUT' : 'POST';
    const url = templateId ? `/api/templates/${templateId}` : '/api/templates';
    
    try {
      const res = await fetchWithTimeout(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Company-Id': cid },
        body: JSON.stringify(tplPayload)
      });
      if (res.ok) {
        await loadDatabaseState(true);
        touchFirestoreSync("template_change");
        return true;
      }
    } catch (err) {
      console.warn("Template sync failed:", err);
    }
    return false;
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const cid = wsSession?.company.id || company.id;
    try {
      const res = await fetchWithTimeout(`/api/templates/${templateId}`, {
        method: 'DELETE',
        headers: { 'X-Company-Id': cid }
      });
      if (res.ok) {
        await loadDatabaseState(true);
        touchFirestoreSync("template_change");
        return true;
      }
    } catch (err) {
      console.warn("Template deletion failed:", err);
    }
    return false;
  };

  const handleResetDriverPin = async (driverId: string, newPin: string) => {
    const cid = wsSession?.company.id || company.id;
    const reqHeaders = {
      "Content-Type": "application/json",
      "X-Company-Id": cid
    };

    try {
      const res = await fetchWithTimeout(`/api/drivers/${driverId}/reset-pin`, {
        method: "PUT",
        headers: reqHeaders,
        body: JSON.stringify({ pin: newPin })
      });
      if (res.ok) {
        await loadDatabaseState(true);
        touchFirestoreSync("reset_pin");
        return true;
      }
      return false;
    } catch (err) {
      console.warn("Reset driver pin offline fallback applied:", err);
      setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, pin: newPin } : d));
      return true;
    }
  };

  const handleMarkNotificationsAsRead = async () => {
    const cid = wsSession?.company.id || company.id;
    const reqHeaders = {
      "Content-Type": "application/json",
      "X-Company-Id": cid
    };

    try {
      await fetchWithTimeout("/api/notifications/read", { method: "PUT", headers: reqHeaders });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.warn("Cleared notifications offline fallback:", err);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }
  };

  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = (to: string) => {
    window.history.pushState(null, "", to);
    setCurrentPath(to);
  };

  useEffect(() => {
    if (!wsSession) {
      if (currentPath !== "/" && currentPath !== "/login" && currentPath !== "/signup") {
        navigateTo("/");
      }
    } else {
      if (currentPath === "/login" || currentPath === "/signup") {
        navigateTo("/");
      }
    }
  }, [wsSession, currentPath]);

  if (!wsSession) {
    if (currentPath === "/") {
      return (
        <LandingPage 
          onGoToLogin={() => navigateTo("/login")} 
          onGoToSignup={() => navigateTo("/signup")} 
        />
      );
    }

    if (currentPath === "/signup") {
      return (
        <div style={{minHeight:'100vh',background:'#f9f9f7',color:'#1a1c1b',fontFamily:"'Inter',sans-serif",display:'flex',flexDirection:'column',justifyContent:'center',overflowX:'hidden',overflowY:'auto',padding:'40px 24px',WebkitFontSmoothing:'antialiased'}}>
          <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',maxWidth:900,margin:'0 auto 32px',width:'100%'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:36,height:36,background:'#fea619',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#684000" strokeWidth="2.5"><path d="M9 12l2 2 4-4"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <span style={{fontWeight:800,fontSize:18,letterSpacing:'0.04em',color:'#1a1c1b'}}>Walk<span style={{color:'#fea619'}}>Safe</span></span>
            </div>
            <button onClick={() => navigateTo('/login')} style={{padding:'6px 16px',fontSize:12,fontWeight:600,background:'transparent',color:'#47464b',border:'1px solid #E5E5E0',borderRadius:4,cursor:'pointer'}}>Sign In</button>
          </header>
          <main style={{width:'100%',maxWidth:900,margin:'0 auto'}}>
            <Suspense fallback={<div style={{textAlign:'center',padding:40,fontSize:13,color:'#77767b'}}>Loading...</div>}>
              <SignupFlow 
                onLoginSuccess={(session, driver) => {
                  localStorage.setItem("walksafe_workspace_session", JSON.stringify(session));
                  if (driver) { localStorage.setItem("walksafe_driver_session", JSON.stringify(driver)); setMagicDriver(driver); }
                  setWsSession(session); setCompany(session.company); setCurrentRole(session.role);
                }}
                onBackToLogin={() => navigateTo("/login")}
              />
            </Suspense>
          </main>
          <footer style={{textAlign:'center',marginTop:32,paddingTop:16,borderTop:'1px solid #E5E5E0',fontSize:10,color:'#77767b',textTransform:'uppercase',letterSpacing:'0.05em'}}>
            DVSA COMPLIANT &copy; 2026 WALKSAFE
          </footer>
        </div>
      );
    }

    return (
      <div style={{minHeight:'100vh',background:'#f9f9f7',color:'#1a1c1b',fontFamily:"'Inter',sans-serif",display:'grid',gridTemplateColumns:'repeat(12,1fr)',WebkitFontSmoothing:'antialiased'}}>
        
        {/* LEFT COLUMN: Brand & Demo (desktop only) */}
        <div style={{display:'none',flexDirection:'column',justifyContent:'space-between',padding:40,borderRight:'1px solid #E5E5E0',background:'#f4f4f2'}} className="lg:flex lg:col-span-5">
          <div>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:32}}>
              <div style={{width:40,height:40,background:'#fea619',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#684000" strokeWidth="2.5"><path d="M9 12l2 2 4-4"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div>
                <span style={{fontWeight:800,fontSize:20,letterSpacing:'0.04em',color:'#1a1c1b'}}>Walk<span style={{color:'#fea619'}}>Safe</span></span>
                <span style={{display:'block',fontSize:9,color:'#fea619',fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase'}}>UK DVSA Compliant</span>
              </div>
            </div>
            <div style={{background:'#fff',border:'1px solid #E5E5E0',borderRadius:16,padding:20,boxShadow:'0 4px 24px rgba(0,0,0,0.04)'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:36,height:36,borderRadius:8,background:'rgba(254,166,25,0.1)',display:'flex',alignItems:'center',justifyContent:'center'}}><Truck style={{width:18,height:18,color:'#fea619'}} /></div>
                  <div><span style={{fontWeight:700,fontSize:13,color:'#1a1c1b',display:'block'}}>Volvo FH Globetrotter</span><span style={{fontSize:10,color:'#77767b'}}>GH22 TUV &middot; HGV</span></div>
                </div>
                <span style={{fontSize:8,fontWeight:700,color:'#fea619',background:'rgba(254,166,25,0.1)',padding:'3px 8px',borderRadius:999}}><span style={{width:6,height:6,borderRadius:'50%',background:'#fea619',display:'inline-block',marginRight:4}} />Compliant</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8,fontSize:12}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#f4f4f2',padding:'8px 12px',borderRadius:8}}>
                  <span style={{display:'flex',alignItems:'center',gap:6,color:'#fea619'}}><Check style={{width:14,height:14}} strokeWidth={3} /> Tyre Treads</span>
                  <span style={{fontSize:10,color:'#77767b'}}>PASS (11.5mm)</span>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#f4f4f2',padding:'8px 12px',borderRadius:8}}>
                  <span style={{display:'flex',alignItems:'center',gap:6,color:'#fea619'}}><Check style={{width:14,height:14}} strokeWidth={3} /> Brakes & Air</span>
                  <span style={{fontSize:10,color:'#77767b'}}>PASS (Verified)</span>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#f4f4f2',padding:'8px 12px',borderRadius:8}}>
                  <span style={{display:'flex',alignItems:'center',gap:6,color:'#fea619'}}><Check style={{width:14,height:14}} strokeWidth={3} /> Lights & Horns</span>
                  <span style={{fontSize:10,color:'#77767b'}}>PASS (100%)</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,paddingTop:20,borderTop:'1px solid #E5E5E0'}}>
            <div><span style={{fontWeight:700,fontSize:14,color:'#fea619'}}>2.4M+</span><span style={{display:'block',fontSize:9,color:'#77767b',textTransform:'uppercase'}}>Logs Sync'd</span></div>
            <div><span style={{fontWeight:700,fontSize:14,color:'#fea619'}}>99.8%</span><span style={{display:'block',fontSize:9,color:'#77767b',textTransform:'uppercase'}}>Uptime</span></div>
            <div><span style={{fontWeight:700,fontSize:14,color:'#fea619'}}>0</span><span style={{display:'block',fontSize:9,color:'#77767b',textTransform:'uppercase'}}>Fine Audits</span></div>
          </div>
        </div>

        {/* RIGHT COLUMN: Login */}
        <div style={{gridColumn:'span 12',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',padding:24,minHeight:'100vh'}} className="lg:col-span-7">
          
          {/* Mobile header */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:24,textAlign:'center'}} className="lg:hidden">
            <div style={{width:36,height:36,background:'#fea619',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#684000" strokeWidth="2.5"><path d="M9 12l2 2 4-4"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <span style={{fontWeight:800,fontSize:18,letterSpacing:'0.04em',color:'#1a1c1b'}}>WALKSAFE</span>
            <span style={{fontSize:9,color:'#fea619',fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase'}}>UK DVSA COMPLIANT</span>
          </div>

          {/* Login card */}
          <div style={{width:'100%',maxWidth:400,background:'#fff',border:'1px solid #E5E5E0',borderRadius:16,padding:'24px 28px',boxShadow:'0 4px 24px rgba(0,0,0,0.04)'}}>
            <h3 style={{fontSize:18,fontWeight:700,color:'#1a1c1b',marginBottom:20}}>Sign In</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const email = (form.elements.namedItem('email') as HTMLInputElement).value;
              const password = (form.elements.namedItem('password') as HTMLInputElement).value;
              try {
                const res = await fetch('/api/auth/login-manager', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email, password })
                });
                if (!res.ok) { alert('Invalid credentials'); return; }
                const data = await res.json();
                if (data.success && data.company) {
                  const session = { company: data.company, role: 'manager' as const };
                  localStorage.setItem('walksafe_workspace_session', JSON.stringify(session));
                  setWsSession(session);
                  setCompany(data.company);
                  setCurrentRole('manager');
                }
              } catch { alert('Connection error. Please try again.'); }
            }}>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,color:'#47464b',fontWeight:600,display:'block',marginBottom:4}}>Work Email or Workspace Code</label>
                <input type="text" name="email" required className="focus:border-[#fea619] focus:ring-2 focus:ring-[#fea619]/10" style={{width:'100%',background:'#f9f9f7',border:'1px solid #E5E5E0',borderRadius:8,padding:'10px 14px',fontSize:14,color:'#1a1c1b',outline:'none'}} placeholder="you@company.co.uk" />
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,color:'#47464b',fontWeight:600,display:'block',marginBottom:4}}>Manager Password</label>
                <input type="password" name="password" required className="focus:border-[#fea619] focus:ring-2 focus:ring-[#fea619]/10" style={{width:'100%',background:'#f9f9f7',border:'1px solid #E5E5E0',borderRadius:8,padding:'10px 14px',fontSize:14,color:'#1a1c1b',outline:'none'}} placeholder="Enter password" />
              </div>
              <button type="submit" style={{width:'100%',padding:'12px 0',background:'#000',color:'#fff',border:'none',borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer',transition:'all 0.15s'}}>Sign In</button>
              <p style={{textAlign:'center',marginTop:12,fontSize:12,color:'#77767b'}}>
                New here? <button type="button" onClick={() => navigateTo('/signup')} style={{background:'none',border:'none',color:'#fea619',cursor:'pointer',fontWeight:600,fontSize:12,padding:0}}>Start Free Trial</button>
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Check if workspace subscription trial has ended:
  const checkIsTrialExpired = () => {
    if (!company) return false;
    if (company.isSubscribed) return false;
    
    const expiryDate = company.trialEndsAt ? new Date(company.trialEndsAt) : new Date(new Date(company.createdAt).getTime() + 30 * 24 * 3600 * 1000);
    return new Date() > expiryDate;
  };

  const isExpired = checkIsTrialExpired();

  if (isExpired) {
    return (
      <div className="flex flex-col min-h-screen bg-black text-[#F5F5F5] justify-center items-center py-10 px-4 sm:px-6 select-text font-sans overflow-y-auto w-full">
        <div className="bg-[#111111] border border-[#262626] rounded-3xl p-6 sm:p-10 max-w-xl w-full text-center shadow-2xl relative overflow-hidden transition-all my-auto">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 to-amber-500" />
          
          <div className="mx-auto w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-500/20 mb-6">
            <AlertTriangle className="w-8 h-8 animate-pulse text-rose-500" />
          </div>

          <h2 className="text-xl sm:text-2xl font-display font-black tracking-tight text-[#F5F5F5] uppercase leading-tight">
            Compliance Operations Suspended
          </h2>
          <span className="text-xs text-rose-400 font-mono font-bold uppercase tracking-widest mt-1.5 block">
            30-Day Free Trial Concluded
          </span>

          <p className="text-xs text-[#E5E5E5] mt-4 leading-relaxed max-w-md mx-auto">
            Your initial 30-day free trial period for workspace <code className="bg-black/80 px-2 py-0.5 rounded text-amber-500 font-mono text-[11px] font-bold">{company.id}</code> has expired. In accordance with DVSA commercial enforcement audit regulations, vehicle inspections and defect reporting are locked until billing is established.
          </p>

          <div className="mt-8 space-y-4 pt-6 border-t border-[#262626]">
            <span className="text-[10px] uppercase font-mono text-amber-500 font-bold tracking-widest block mb-1">
              Select A Professional Plan Tier
            </span>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="bg-black/40 hover:bg-black/70 border border-[#262626] p-3 rounded-xl transition-all">
                <span className="text-[10px] font-bold text-amber-500 block uppercase">Owner-Driver</span>
                <span className="text-base font-bold text-[#F5F5F5] block mt-1">£4.99<span className="text-[9.5px] font-normal text-neutral-500 block">/mo</span></span>
                <span className="text-[9.5px] text-neutral-400 block leading-snug mt-1">1 Logistics Asset, 1 Secure Driver PIN.</span>
              </div>
              <div className="bg-black/95 border-2 border-amber-500 p-3 rounded-xl transition-all relative">
                <span className="bg-amber-500 text-black font-sans font-extrabold text-[8px] uppercase px-1 rounded absolute -top-2 right-2">Popular</span>
                <span className="text-[10px] font-bold text-amber-500 block uppercase">Starter Fleet</span>
                <span className="text-base font-bold text-[#F5F5F5] block mt-1">£14.99<span className="text-[9.5px] font-normal text-neutral-500 block">/mo</span></span>
                <span className="text-[9.5px] text-neutral-400 block leading-snug mt-1">3 Vehicles, Scheduled Audits.</span>
              </div>
              <div className="bg-black/40 hover:bg-black/70 border border-[#262626] p-3 rounded-xl transition-all">
                <span className="text-[10px] font-bold text-amber-500 block uppercase">Growth Fleet</span>
                <span className="text-base font-bold text-[#F5F5F5] block mt-1">£34.99<span className="text-[9.5px] font-normal text-slate-500 block">/mo</span></span>
                <span className="text-[9.5px] text-neutral-400 block leading-snug mt-1">10 Vehicles, Operator Notices.</span>
              </div>
            </div>

            <button
              onClick={async () => {
                await handleUpdateCompany({ isSubscribed: true });
                await loadDatabaseState(true);
              }}
              className="w-full mt-4 bg-[#fea619] hover:bg-[#e89500] text-[#684000] font-display font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-xl hover:shadow-[#fea619]/10 flex items-center justify-center gap-2 transition-all cursor-pointer font-bold"
            >
              <Check className="w-4 h-4 text-black font-black stroke-[3]" />
              Activate Subscription & Resume Inspections
            </button>
            
            <button
              onClick={async () => {
                const updatedComp = { 
                  ...company, 
                  trialEndsAt: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
                  isSubscribed: false
                };
                await handleUpdateCompany(updatedComp);
                await loadDatabaseState(true);
              }}
              className="text-[11px] text-amber-500 hover:text-amber-400 transition-colors font-mono font-bold block mt-4 mx-auto cursor-pointer"
            >
               ⚠️ Sandbox Override: Reset Trial and Grant 15 Days
            </button>
          </div>
        </div>
      </div>
    );
  }

  const companyCreatedAtString = company?.createdAt || new Date().toISOString();
  const daysRemaining = Math.max(0, Math.ceil((new Date(company?.trialEndsAt || new Date(companyCreatedAtString).getTime() + 30 * 24 * 3600 * 1000).getTime() - Date.now()) / (24 * 3600 * 1000)));

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden selection:bg-amber-500 selection:text-black">
      
      {/* 30-Day Free Trial Remaining Banner Alert */}
      {!company?.isSubscribed && currentRole === 'manager' && daysRemaining <= 7 && !isTrialBannerDismissed && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-black px-5 py-2 text-xs font-sans font-black flex flex-wrap justify-between items-center gap-3 select-none z-50 shadow-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-black shrink-0 stroke-[2.5]" />
            <span>
              WALKSAFE SANDBOX NOTICE: Your 30-day free trial has <strong className="underline decoration-amber-950 decoration-2">{daysRemaining} days remaining</strong>. Upgrade now to guarantee compliant daily vehicle inspections.
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={async () => {
                await handleUpdateCompany({ isSubscribed: true });
                await loadDatabaseState(true);
              }}
              className="bg-black text-[#F5F5F5] hover:bg-neutral-900 text-[10px] font-mono font-bold uppercase py-1 px-3 rounded-md transition-colors leading-none hover:shadow-lg focus:outline-none cursor-pointer"
            >
              Activate Subscription Plan
            </button>
            <button
              id="dismiss-trial-banner"
              onClick={() => {
                const cid = wsSession?.company.id || company.id;
                localStorage.setItem(`walksafe_trial_banner_dismissed_${cid}`, "true");
                setIsTrialBannerDismissed(true);
              }}
              className="text-black hover:text-neutral-900 p-1 rounded-full transition-colors focus:outline-none cursor-pointer flex items-center justify-center bg-transparent border-0"
              title="Dismiss banner"
            >
              <X className="w-3.5 h-3.5 text-black font-black stroke-[3]" />
            </button>
          </div>
        </div>
      )}
      
      {/* Top Header Rail: Hidden on real mobile devices to focus content entirely on the native PWA, displayed on tablets and laptops */}
      <div className="hidden md:flex bg-[#0c0c0c] border-b border-[#262626] px-6 py-3 items-center justify-between gap-4 text-white z-30 select-none">
        
        </div>

      {/* Primary Display Content Container Area */}
      {currentRole === 'driver' ? (
        <div className="flex-1 flex flex-col bg-black overflow-hidden">
          <Suspense fallback={<div className="flex-1 flex items-center justify-center text-amber-500 font-mono animate-pulse">Loading Driver Interface...</div>}>
            <DriverPwa
              vehicles={vehicles}
              drivers={drivers}
              company={company}
              checks={checks}
              defects={defects}
              announcements={announcements}
              schedules={schedules}
              onCheckSubmitted={handleCheckSubmitted}
              onTriggerRefresh={loadDatabaseState}
              onLogOutWorkspace={handleLogOut}
              initialDriver={magicDriver}
              onAddVehicle={handleAddVehicle}
              onDeleteVehicle={handleDeleteVehicle}
              onCloseDefect={handleCloseDefect}
              onAddSchedule={handleAddSchedule}
              onSaveTemplate={handleSaveTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              templates={templates}
              onUpdateCompany={handleUpdateCompany}
              onUpdateDriver={handleUpdateDriver}
            />
          </Suspense>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-500 font-mono animate-pulse">Loading Manager Dashboard...</div>}>
            <ManagerDashboard
              vehicles={vehicles}
              drivers={drivers}
              company={company}
              checks={checks}
              defects={defects}
              announcements={announcements}
              schedules={schedules}
              notifications={notifications}
              onAddVehicle={handleAddVehicle}
              onAddDriver={handleAddDriver}
              onUpdateDriver={handleUpdateDriver}
              onDeleteDriver={handleDeleteDriver}
              onUpdateVehicle={handleUpdateVehicle}
              onDeleteVehicle={handleDeleteVehicle}
              onCloseDefect={handleCloseDefect}
              onUpdateCompany={handleUpdateCompany}
              onAddAnnouncement={handleAddAnnouncement}
              onAddSchedule={handleAddSchedule}
              onSaveTemplate={handleSaveTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              templates={templates}
              onResetDriverPin={handleResetDriverPin}
              onMarkNotificationsAsRead={handleMarkNotificationsAsRead}
              onTriggerRefresh={loadDatabaseState}
              onLogOutWorkspace={handleLogOut}
            />
          </Suspense>
        </div>
      )}

    </div>
  );
}

function LandingPage({ onGoToLogin, onGoToSignup }: { onGoToLogin: () => void; onGoToSignup: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', background: '#f9f9f7' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, background: '#fea619', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='#684000' strokeWidth='2.5'><path d='M9 12l2 2 4-4'/><path d='M21 12a9 9 0 11-18 0 9 9 0 0118 0z'/></svg>
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '0.04em', color: '#1a1c1b' }}>Walk<span style={{ color: '#fea619' }}>Safe</span></span>
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, lineHeight: 1.2, color: '#1a1c1b', margin: '0 0 12px' }}>
          Fleet Compliance Platform
        </h1>
        <p style={{ fontSize: 16, color: '#47464b', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.6 }}>
          Sign in to manage your vehicle checks, defects, and compliance records. New here? Visit <a href='https://www.getwalksafe.co.uk' style={{ color: '#fea619', fontWeight: 600 }}>getwalksafe.co.uk</a> to learn more.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onGoToLogin} style={{ padding: '12px 32px', background: '#000', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer' }}>
            Sign In
          </button>
          <button onClick={onGoToSignup} style={{ padding: '12px 32px', background: 'transparent', color: '#1a1c1b', border: '1px solid #E5E5E0', borderRadius: 4, fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer' }}>
            Start Free Trial
          </button>
        </div>
      </div>
      <div style={{ borderTop: '1px solid #E5E5E0', paddingTop: 24, width: '100%', maxWidth: 400 }}>
        <p style={{ fontSize: 11, color: '#77767b', margin: 0 }}>
          <a href='https://www.getwalksafe.co.uk' style={{ color: '#77767b', textDecoration: 'underline' }}>getwalksafe.co.uk</a> &middot; &copy; 2026 WalkSafe
        </p>
      </div>
    </div>
  );
}
