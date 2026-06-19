import { useState, FormEvent, useEffect } from "react";
import {
  Mail, Lock, User, Building, ArrowRight, Check, AlertCircle,
  CheckCircle2, Shield, Clock, ChevronDown, RefreshCw, Eye, EyeOff, Send
} from "lucide-react";
import { Company, Driver } from "../types";
import { auth } from "../lib/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";

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

interface SignupFlowProps {
  onLoginSuccess: (session: { company: Company; role: 'manager' | 'driver' }, driver?: Driver) => void;
  onBackToLogin: () => void;
}

export default function SignupFlow({ onLoginSuccess, onBackToLogin }: SignupFlowProps) {
  const [step, setStep] = useState<'details' | 'plan' | 'verify' | 'confirm'>('details');
  const [showPassword, setShowPassword] = useState(false);

  // Details form
  const [fullName, setFullName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");

  // Plan selection
  const [selectedPlan, setSelectedPlan] = useState<'solo' | 'starter' | 'growth'>('starter');

  // Verification Pending states
  const [isVerified, setIsVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [verifyStatusMsg, setVerifyStatusMsg] = useState("");

  // Submit states
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Reset error on field change
  useEffect(() => {
    setError("");
  }, [fullName, workEmail, password, orgName]);

  // Countdown clock timer for email resend capability
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const plans = [
    {
      id: 'solo' as const,
      name: 'Solo Operator',
      description: "Ideal for owner-drivers overseeing their own vehicle checks",
      monthlyPrice: 4.99,
      maxVehicles: 1,
      features: [
        '1 Active Commercial Vehicle',
        '1 Main Driver Profile',
        'DVSA compliant walkaround checks',
        'Cloud-backed PDF audit reports',
        'Full offline-first logging capabilities'
      ],
      highlight: false,
    },
    {
      id: 'starter' as const,
      name: 'Starter Fleet',
      description: 'Ideal for small logistics operators with compact fleets',
      monthlyPrice: 14.99,
      maxVehicles: 3,
      features: [
        'Up to 3 Active Fleet Vehicles',
        'Unlimited driver PIN accounts',
        'Central Manager compliance dashboard',
        'Real-time immediate defect notifications',
        'PDF report downloads and archiving'
      ],
      highlight: true,
    },
    {
      id: 'growth' as const,
      name: 'Growth Fleet',
      description: 'Built for industrial fleets requiring complete compliance metrics',
      monthlyPrice: 34.99,
      maxVehicles: 10,
      features: [
        'Up to 10 Active Fleet Vehicles',
        'Unlimited operators & managers',
        'Advanced visual metrics analytics board',
        'Audit schedule builder & automation',
        'Priority technical support channels'
      ],
      highlight: false,
    },
    {
      id: 'enterprise' as const,
      name: 'Enterprise Scale',
      description: 'Custom scaled capacity for multi-depot commercial fleets',
      monthlyPrice: 0, // Contact us for pricing
      maxVehicles: 99,
      features: [
        'Up to 99 Active Fleet Vehicles',
        'Unlimited managers and drivers',
        'Custom safety signature verification',
        'Developer API & Custom Webhooks',
        'BACS Direct Debit fee optimized'
      ],
      highlight: false,
    }
  ];

  const currentPlan = plans.find((p) => p.id === selectedPlan);

  const handleDetailsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !workEmail.trim() || !password.trim() || !orgName.trim()) {
      setError("Please fill in all details.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(workEmail.trim())) {
      setError("Enter a valid work email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase character.");
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError("Password must contain at least one lowercase character.");
      return;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      setError("Password must contain at least one non-alphanumeric (special) character.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchWithTimeout("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: workEmail.trim().toLowerCase() }),
      });
      if (response.ok) {
        const checkData = await response.json();
        if (checkData.exists) {
          setError("An account with this email address is already registered on our platform. Since you already have an account, please click 'Cancel' below and log in directly from the login screen.");
          setIsLoading(false);
          return;
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "Could not verify email uniqueness on our platform. Please try again.");
        setIsLoading(false);
        return;
      }
    } catch (checkErr) {
      console.warn("Check email platform warning (offline or transient):", checkErr);
      setError("Network or server connection issue. Please verify you are online and try again.");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    // Move to plan selection
    setStep("plan");
  };

  // Periodically poll email verification status while on verification step
  useEffect(() => {
    if (step !== 'verify') return;
    let isMounted = true;
    const interval = setInterval(async () => {
      if (auth.currentUser) {
        try {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified && isMounted) {
            setIsVerified(true);
            setVerifyStatusMsg("SUCCESS: Email successfully verified! Transitioning to confirmation...");
            clearInterval(interval);
            setTimeout(() => {
              if (isMounted) setStep("confirm");
            }, 1500);
          }
        } catch (reloadErr) {
          console.warn("Background reload warning:", reloadErr);
        }
      }
    }, 4000); // Check status every 4 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [step]);

  const handlePlanSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setVerifyStatusMsg("");

    try {
      const cleanEmail = workEmail.trim().toLowerCase();
      let user = auth.currentUser;

      if (!user) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          user = userCredential.user;
          console.log("[Firebase Auth] Account pre-registered for verification:", user.uid);
        } catch (authErr: any) {
          if (authErr.code === "auth/email-already-in-use") {
            setError("An account with this email address already exists. Please return to login.");
            setIsLoading(false);
            return;
          } else {
            throw authErr;
          }
        }
      }

      if (user) {
        await sendEmailVerification(user);
        setVerifyStatusMsg("Work email verification link has been dispatched successfully! Please check your inbox.");
        setStep("verify");
      }
    } catch (err: any) {
      setError(`Authentication Setup Failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerify = async () => {
    setError("");
    setVerifyStatusMsg("");
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setResendTimer(60);
        setVerifyStatusMsg("Audit verification payload successfully dispatched to your email!");
      } else {
        setError("Your session is inactive. Please return to Details and retry registration.");
      }
    } catch (err: any) {
      setError(`Failed to dispatch verification email: ${err.message}`);
    }
  };

  const handleManualCheckVerify = async () => {
    setError("");
    if (auth.currentUser) {
      setIsLoading(true);
      try {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          setIsVerified(true);
          setVerifyStatusMsg("SUCCESS: Email successfully verified! Transitioning...");
          setTimeout(() => {
            setStep("confirm");
          }, 1200);
        } else {
          setError("Work email is not verified yet. Please locate and click the security link from your mail client.");
        }
      } catch (err: any) {
        setError(`Verification check failed: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    } else {
      setError("No active session detected. Please sign up again.");
    }
  };


  const handleFinalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // 1. Ensure User Credentials in Firebase Authentication client-side exists
      if (!auth.currentUser) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, workEmail.trim().toLowerCase(), password);
          console.log("[Firebase Auth] Account registered successfully:", userCredential.user?.uid);
        } catch (authErr: any) {
          if (authErr.code === "auth/email-already-in-use") {
            console.warn("[Firebase Auth] Profile already exists, continuing sync with database...");
          } else {
            setError(`Authentication Registration Failed: ${authErr.message}`);
            setIsLoading(false);
            return;
          }
        }
      }

      // Auto-generate workspace ID
      const baseSlug = orgName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "company";
      const cleanId = (baseSlug + "-" + Math.floor(1000 + Math.random() * 9000)).substring(0, 25);

      const res = await fetchWithTimeout("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cleanId,
          name: orgName.trim(),
          plan: selectedPlan,
          managerEmail: workEmail.trim().toLowerCase(),
          managerPassword: password,
          managerFullName: fullName.trim(),
          maxVehicles: currentPlan?.maxVehicles || 1,
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);

        // Open Paddle checkout for card entry (trial, no charge)
        try {
          const planMap: Record<string, string> = {
            'solo': 'pri_01kv3ad64hkb1f6gpjxa5av4mx',
            'owner-driver': 'pri_01kv3ad64hkb1f6gpjxa5av4mx',
            'starter': 'pri_01kv3bhykfmhk0m61g7r2tv1vt',
            'growth': 'pri_01kv3ap1zk2vszmaj822vppyj2',
          };
          const priceId = planMap[selectedPlan];
          const P = (window as any).Paddle;
          if (P && P.Checkout && priceId) {
            P.Checkout.open({
              items: [{ priceId, quantity: 1 }],
              customer: { email: workEmail.trim().toLowerCase() },
              customData: { userId: data.company.id, plan: selectedPlan, vehicle_limit: String(currentPlan?.maxVehicles || 1) },
              settings: { theme: 'light', successUrl: window.location.origin + '/?payment_success=true&plan=' + selectedPlan + '&limit=' + (currentPlan?.maxVehicles || 1), allowLogout: true }
            });
          }
        } catch (e) {
          console.warn('[Paddle] Checkout open failed (non-blocking):', e);
        }

        setTimeout(() => {
          onLoginSuccess(
            {
              company: data.company,
              role: 'manager',
            },
            data.driver
          );
        }, 1500);
      } else {
        setError(
          data.error || "Workspace activation failed. Please try again."
        );
      }
    } catch (err) {
      setError("Network or timeout error occurred during database sync.");
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamically configure maximum width of the onboarding container card
  // On plan selection, expand the card smoothly to 4XL so plans display side-by-side cleanly on desktop/laptop.
  // For standard details form, verification code, and activation, reduce to a cozy, highly eligible XL.
  const cardMaxWidthClass = step === 'plan' ? 'max-w-4xl' : 'max-w-lg';

  return (
    <div className={`w-full ${cardMaxWidthClass} mx-auto bg-white border border-[#e8e8e4] rounded-2xl p-7 sm:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.07),0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 space-y-6 select-text text-left`}>
      
      {/* Visual Identity Title */}
      <div>
        <div className="inline-flex items-center gap-2 bg-[#fea619]/10 border border-[#fea619]/20 rounded-full px-3 py-1 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#fea619] inline-block"></span>
          <span className="text-[11px] font-bold text-[#c07200] uppercase tracking-wider">Fleet Registration</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1c1b] leading-tight tracking-tight">
          Create your workspace
        </h2>
        <p className="text-[#77767b] text-sm mt-1.5 leading-relaxed">
          Set up your DVSA-compliant compliance platform in minutes.
        </p>
      </div>

      {/* Horizontal Multi-Step Circle Stepper */}
      <div className="py-1 select-none">
        <div className="flex items-center justify-between relative">
          {/* Track background */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-[#eeeeec] -translate-y-1/2 z-0" />
          {/* Animated progress fill */}
          <div 
            className="absolute top-4 left-4 h-0.5 bg-gradient-to-r from-[#fea619] to-[#f08000] -translate-y-1/2 z-0 transition-all duration-500 ease-out" 
            style={{ 
              width: 
                step === 'details' ? '0%' : 
                step === 'plan' ? '33%' : 
                step === 'verify' ? '66%' : '100%' 
            }} 
          />

          {[
            { key: 'details', label: 'Details' },
            { key: 'plan', label: 'Plan' },
            { key: 'verify', label: 'Verify' },
            { key: 'confirm', label: 'Confirm' }
          ].map((s, idx) => {
            const stepList = ['details', 'plan', 'verify', 'confirm'];
            const stepIndex = stepList.indexOf(step);
            const isCompleted = idx < stepIndex;
            const isActive = s.key === step;
            return (
              <div key={s.key} className="relative z-10 flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  isCompleted ? 'bg-gradient-to-br from-[#fea619] to-[#f08000] text-white shadow-md shadow-[#fea619]/25' :
                  isActive ? 'bg-white border-2 border-[#fea619] text-[#c07200] shadow-[0_0_0_4px_rgba(254,166,25,0.12)]' : 
                  'bg-[#f4f4f2] border border-[#e0e0dc] text-[#a0a09a]'
                }`}>
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : <span className="text-xs font-extrabold">{idx + 1}</span>}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 transition-colors ${
                  isActive ? 'text-[#c07200]' : isCompleted ? 'text-[#1a1c1b]' : 'text-[#a0a09a]'
                }`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Signup forms based on Step */}

      {/* Step 1: Account details form */}
      {step === 'details' && (
        <form onSubmit={handleDetailsSubmit} className="space-y-4 animate-in fade-in duration-200">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-sm text-rose-600 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Manager Full name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[#77767b]">
              Your Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#c8c5cb]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Kenneth Sutherland"
                className="w-full pl-10 pr-4 py-3 bg-[#fafaf8] border-[1.5px] border-[#e8e8e4] hover:border-[#c8c5cb] focus:border-[#fea619] focus:ring-2 focus:ring-[#fea619]/12 rounded-xl text-sm text-[#1a1c1b] placeholder-[#c0bfc4] focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Fleet organization name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[#77767b]">
              Company / Fleet Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#c8c5cb]">
                <Building className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Clydeside Haulage Ltd"
                className="w-full pl-10 pr-4 py-3 bg-[#fafaf8] border-[1.5px] border-[#e8e8e4] hover:border-[#c8c5cb] focus:border-[#fea619] focus:ring-2 focus:ring-[#fea619]/12 rounded-xl text-sm text-[#1a1c1b] placeholder-[#c0bfc4] focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Work Email address */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[#77767b]">
              Work Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#c8c5cb]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                placeholder="e.g. manager@clydeside.co.uk"
                className="w-full pl-10 pr-4 py-3 bg-[#fafaf8] border-[1.5px] border-[#e8e8e4] hover:border-[#c8c5cb] focus:border-[#fea619] focus:ring-2 focus:ring-[#fea619]/12 rounded-xl text-sm text-[#1a1c1b] placeholder-[#c0bfc4] focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Manager Password creation */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[#77767b]">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#c8c5cb]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 chars, upper, lower & special"
                className="w-full pl-10 pr-10 py-3 bg-[#fafaf8] border-[1.5px] border-[#e8e8e4] hover:border-[#c8c5cb] focus:border-[#fea619] focus:ring-2 focus:ring-[#fea619]/12 rounded-xl text-sm text-[#1a1c1b] placeholder-[#c0bfc4] focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#c8c5cb] hover:text-[#47464b] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Interactive Password Requirements Checklist */}
            {password.length > 0 && (
              <div className="p-3.5 bg-[#fafaf8] border border-[#e8e8e4] rounded-xl mt-1 text-[12px] space-y-2 animate-in fade-in duration-200">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#a0a09a] block">Password requirements</span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {[
                    [password.length >= 6, 'At least 6 characters'],
                    [/[A-Z]/.test(password), 'Uppercase letter'],
                    [/[a-z]/.test(password), 'Lowercase letter'],
                    [/[^A-Za-z0-9]/.test(password), 'Special character'],
                  ].map(([met, label]) => (
                    <div key={String(label)} className="flex items-center gap-1.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        met ? 'bg-[#fea619] text-white' : 'bg-[#eeeeec] text-[#c0bfc4]'
                      }`}>
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span className={`text-[11px] transition-colors ${met ? 'text-[#1a1c1b] font-semibold' : 'text-[#a0a09a]'}`}>{String(label)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit action trigger */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#1a1c1b] to-[#333] hover:from-[#2c2e2d] hover:to-[#444] text-white font-bold text-[13px] uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md group mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Checking email..." : "Continue"}
            {!isLoading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
          </button>

          {/* Return button */}
          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full text-center text-[12px] text-[#a0a09a] hover:text-[#47464b] transition-colors font-semibold tracking-wider pt-1"
          >
            ← Back to login
          </button>
        </form>
      )}

      {/* Step 2: Plan Selection Cards */}
      {step === 'plan' && (
        <form onSubmit={handlePlanSubmit} className="space-y-4 animate-in fade-in duration-200">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/15 rounded-xl flex items-start gap-2 text-xs text-rose-400 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                {error}
                {error.includes("auth/admin-restricted-operation") && (
                  <span className="block mt-1 text-[13px] text-[#47464b]  normal-case">
                    Troubleshooting: Self-signup is restricted in your Firebase Console. Please go to 
                    <strong className="text-[#1a1c1b]"> Firebase Auth Console &gt; Settings &gt; User Actions</strong> and ensure "Enable create (sign up)" is checked.
                  </span>
                )}
                {error.includes("auth/operation-not-allowed") && (
                  <span className="block mt-1 text-[13px] text-[#47464b]  normal-case">
                    Troubleshooting: Email/Password Authentication provider may not be enabled or fully updated in your Firebase project. Please ensure it is set to Enabled under Build &gt; Authentication &gt; Sign-in method.
                  </span>
                )}
              </span>
            </div>
          )}
          
          {/* Mobile Space-saving Segmented Slider */}
          <div className="md:hidden grid grid-cols-3 gap-1 p-1 bg-[#f4f4f2] border border-[#E5E5E0] rounded-xl relative select-none">
            {plans.filter(p => p.id !== 'enterprise').map((p) => {
              const isActive = selectedPlan === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlan(p.id)}
                  className={`py-2 px-1 rounded-lg text-[13px] font-black uppercase tracking-wider text-center transition-all duration-300 ${
                    isActive
                      ? 'bg-[#000] text-[#fff] font-bold shadow-md '
                      : 'text-[#47464b] hover:text-[#1a1c1b]'
                  }`}
                >
                  {p.id === 'solo' ? 'Solo' : p.id === 'starter' ? 'Starter' : 'Growth'}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {plans.map((plan) => {
              const matchesSelected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => {
                    if (plan.id === 'enterprise') {
                      window.location.href = "mailto:support@getwalksafe.co.uk?subject=WalkSafe%20Enterprise%20Fleet%20Inquiry";
                    } else {
                      setSelectedPlan(plan.id);
                    }
                  }}
                  className={`text-left p-5 rounded-xl border-2 transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                    matchesSelected
                      ? 'border-[#fea619] bg-[#fef7e6] shadow-xl shadow-[#fea619]/5'
                      : 'border-[#E5E5E0] bg-black/35 hover:border-[#c8c5cb]'
                  } ${matchesSelected ? 'flex' : 'flex'}`}
                >
                  {/* Selected indicators */}
                  {matchesSelected && (
                    <div className="absolute top-3.5 right-3.5 bg-[#fea619]/20 border border-[#fea619]/30 p-1 rounded-full text-[#fea619]">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}


                  <div>
                    <h3 className=" font-bold text-[#1a1c1b] text-sm uppercase tracking-wider">{plan.name}</h3>
                    <p className="text-[#47464b] text-[13px] mt-0.5 leading-normal">{plan.description}</p>
                    
                    <div className="my-2 flex items-baseline gap-1">
                      {plan.id === 'enterprise' ? (
                        <span className="text-xl  font-extrabold text-[#1a1c1b]">Contact Us</span>
                      ) : (
                        <>
                          <span className="text-xl  font-extrabold text-[#1a1c1b]">£{plan.monthlyPrice}</span>
                          <span className="text-[#77767b]  text-[12px]">/mo after trial</span>
                        </>
                      )}
                    </div>

                    <ul className="space-y-1 pt-2 border-t border-[#E5E5E0]/45">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 text-[13px] text-[#47464b] font-medium">
                           <Check className="w-3 h-3 text-[#fea619] shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep('details')}
              className="px-5 py-3 border-[1.5px] border-[#e8e8e4] hover:border-[#c8c5cb] text-[#47464b] hover:text-[#1a1c1b] rounded-xl font-bold text-[12px] uppercase tracking-wider transition-all bg-white cursor-pointer shadow-sm"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={selectedPlan === 'enterprise'}
              className={`flex-1 font-bold text-[13px] uppercase tracking-wider py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all ${
                selectedPlan === 'enterprise' 
                  ? 'bg-[#e8e8e6] text-[#77767b] cursor-not-allowed hidden' 
                  : 'bg-gradient-to-r from-[#1a1c1b] to-[#333] hover:from-[#2c2e2d] text-white cursor-pointer'
              }`}
            >
              Continue to Verify
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Verification Pending Stage */}
      {step === 'verify' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="text-center bg-[#f4f4f2] border border-[#E5E5E0] rounded-2xl p-5 sm:p-6 space-y-4 relative">
            <div className="mx-auto w-11 h-11 rounded-xl bg-[#fea619]/10 border border-[#fea619]/20 flex items-center justify-center text-[#fea619]">
              <Send className="w-5 h-5 animate-pulse" />
            </div>
            
            <div className="space-y-1">
              <h3 className=" font-bold text-base text-[#1a1c1b] uppercase tracking-wider">Work Email Verification Dispatched</h3>
              <p className="text-[#47464b] text-xs leading-normal max-w-sm mx-auto">
                We have transmitted an authorized verification payload to <strong className="text-[#1a1c1b]">{workEmail || "your email"}</strong>. Click the security link embedded inside to verify your session.
              </p>
            </div>

            {verifyStatusMsg && (
              <div className="p-2.5 bg-[#fea619]/10 border border-[#fea619]/20 text-[#fea619] text-[12px] font-medium rounded-lg animate-in fade-in duration-200">
                {verifyStatusMsg}
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/15 rounded-xl flex items-start gap-2 text-xs text-rose-400 text-left animate-in fade-in duration-200 leading-normal">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto">
              {/* Manual Check Verification Button */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleManualCheckVerify}
                className="w-full bg-[#000] hover:opacity-85 text-[#fff] text-[12px] font-bold uppercase tracking-wider py-2.5 px-3 rounded-lg transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#1a1c1b]" />
                    Querying verified status...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#fea619]" />
                    Confirm Verification Status
                  </>
                )}
              </button>

              {/* Countdown clock for resending link */}
              <button
                type="button"
                disabled={resendTimer > 0}
                onClick={handleResendVerify}
                className="w-full bg-[#f4f4f2] border border-[#E5E5E0] text-[12px] font-bold uppercase tracking-wider text-[#1a1c1b] py-2.5 px-3 rounded-lg transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 hover:bg-[#e8e8e6]"
              >
                {resendTimer > 0 ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-[#fea619]" />
                    Resend available in {resendTimer}s
                  </>
                ) : (
                  "Resend verification email"
                )}
              </button>

            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setStep('plan')}
              className="px-4 py-2 border border-[#E5E5E0] hover:border-[#c8c5cb] text-[#47464b] rounded-lg font-bold text-[12px] uppercase tracking-wider transition-colors bg-transparent border-0 cursor-pointer"
            >
              Back to Plans
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Confirm Summary */}
      {step === 'confirm' && (
        <form onSubmit={handleFinalSubmit} className="space-y-4 animate-in fade-in duration-200">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/15 rounded-xl flex items-start gap-2 text-xs text-rose-400 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-[#fea619]/10 border border-[#E5E5E0] rounded-xl flex items-center gap-2 text-xs text-[#fea619]">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#fea619]" />
              <span>Workspace provisioned! Redirecting to dashboard...</span>
            </div>
          )}

          {/* Account Summary section */}
          <div className="space-y-2 bg-[#f4f4f2]/50 p-4 rounded-xl border border-[#E5E5E0]">
            <h3 className=" font-bold text-[#1a1c1b] text-xs uppercase tracking-wider">Workspace Summary</h3>
            
            <div className="space-y-1.5 text-xs text-[#47464b] font-medium">
              <div className="flex justify-between border-b border-[#E5E5E0]/30 pb-1.5">
                <span className="text-[#77767b] uppercase text-[13px] tracking-normal">Manager Profile</span>
                <span>{fullName}</span>
              </div>
              <div className="flex justify-between border-b border-[#E5E5E0]/30 pb-1.5">
                <span className="text-[#77767b] uppercase text-[13px] tracking-normal">Work Email</span>
                <span className="break-all">{workEmail}</span>
              </div>
              <div className="flex justify-between pb-0.5">
                <span className="text-[#77767b] uppercase text-[13px] tracking-normal">Organization Fleet</span>
                <span>{orgName}</span>
              </div>
            </div>
          </div>

          {/* Plan chosen card summary */}
          <div className="bg-[#fef7e6] border border-[#fea619]/30 p-4 rounded-xl space-y-3">
            <div>
              <span className="text-[13px] font-bold uppercase tracking-wider text-[#fea619]">Plan Allocation Chosen</span>
              <h4 className=" font-black text-[#1a1c1b] text-sm uppercase tracking-wider mt-0.5">{currentPlan?.name}</h4>
              <p className="text-[#47464b] text-[13px] mt-0.5 leading-normal">{currentPlan?.description}</p>
            </div>

            <div className="pt-2.5 border-t border-[#E5E5E0] flex justify-between items-baseline">
              <div>
                <span className="text-[13px] text-[#77767b] block uppercase tracking-wider ">30-Day Trial Activation</span>
                <span className="text-lg font-black text-[#fea619] uppercase tracking-wider mt-0.5 block">£0.00 FREE</span>
              </div>
              <div className="text-right">
                <span className="text-[13px] text-[#77767b] block uppercase tracking-wider ">Subscription After</span>
                <span className="text-xs font-bold text-[#1a1c1b] tracking-normal mt-0.5 block">
                  {currentPlan?.id === 'enterprise' ? 'Custom Quote' : `£${currentPlan?.monthlyPrice}/mo`}
                </span>
              </div>
            </div>
          </div>

          {/* Compliance guarantee checklist */}
          <div className="space-y-1.5 text-xs text-[#47464b] font-medium">
            <div className="flex gap-2">
              <Shield className="w-3.5 h-3.5 text-[#fea619] shrink-0 mt-0.5" />
              <span>Full statutory DVSA-compliant log templates included</span>
            </div>
            <div className="flex gap-2">
              <Check className="w-3.5 h-3.5 text-[#fea619] shrink-0 mt-0.5" />
              <span>Card collected for trial — no charge until after 30 days</span>
            </div>
            <div className="flex gap-2">
              <Check className="w-3.5 h-3.5 text-[#fea619] shrink-0 mt-0.5" />
              <span>Cancel or adjust limits directly inside the billings view</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full bg-gradient-to-r from-[#1a1c1b] to-[#333] hover:from-[#2c2e2d] text-white font-bold text-[13px] uppercase tracking-wider py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 border-0"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Activating workspace...
                </>
              ) : (
                <>
                  Activate Fleet Workspace
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('verify')}
              disabled={isLoading || success}
              className="py-1.5 text-[12px] text-[#a0a09a] hover:text-[#47464b] transition-colors disabled:opacity-50 font-semibold tracking-wider"
            >
              ← Back to email verification
            </button>
          </div>
        </form>
      )}

      {/* Branded support link block */}
      <div className="pt-4 border-t border-[#e8e8e4] text-center">
        <p className="text-[12px] text-[#a0a09a] tracking-wide">
          Need help getting started?
        </p>
        <a 
          href="mailto:support@getwalksafe.co.uk" 
          className="text-xs text-[#fea619] hover:text-[#c07200] font-bold tracking-wide block mt-1 transition-colors"
        >
          support@getwalksafe.co.uk
        </a>
      </div>

    </div>
  );
}
