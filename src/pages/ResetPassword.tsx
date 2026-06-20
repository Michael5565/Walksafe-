import { useEffect, useState } from "react";

export default function ResetPassword() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<"form" | "loading" | "success" | "error">("form");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"request" | "reset">("request");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      setToken(t);
      setMode("reset");
    }
  }, []);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setMessage("Please enter your email address.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("success");
        setMessage(data.message || "A reset link has been sent to your email.");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to send reset email.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("success");
        setMessage("Password reset successfully! Redirecting to login...");
        setTimeout(() => window.location.href = "/login", 3000);
      } else {
        setStatus("error");
        setMessage(data.error || data.message || "Reset failed. The link may have expired.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#fffbf2 0%,#f9f9f7 50%,#f0f4ff 100%)", fontFamily: "Inter, system-ui, sans-serif", padding: 24, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(254,166,25,0.10) 0%,transparent 70%)", pointerEvents: "none" }} />
      <div style={{ background: "#fff", border: "1px solid #E5E5E0", borderRadius: 20, padding: "40px 36px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.06)", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#fea619,#f08000)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(254,166,25,0.35)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M9 12l2 2 4-4"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "0.04em", color: "#1a1c1b" }}>Walk<span style={{ color: "#fea619" }}>Safe</span></span>
        </div>
        <p style={{ fontSize: 10, color: "#fea619", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 24px" }}>UK DVSA Compliant</p>

        {mode === "request" && (
          <form onSubmit={handleRequestReset} style={{ textAlign: "left" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a1c1b", margin: "0 0 4px", textAlign: "center" }}>Forgot Password?</h2>
            <p style={{ fontSize: 12, color: "#77767b", margin: "0 0 16px", textAlign: "center" }}>Enter your email and we'll send you a reset link.</p>
            {message && <p style={{ color: status === "error" ? "#DC2626" : "#16A34A", fontSize: 12, margin: "0 0 12px", textAlign: "center" }}>{message}</p>}
            <input type="email" placeholder="you@company.co.uk" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "12px 14px", border: "1px solid #E5E5E0", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12, background: "#fafaf8" }} />
            <button type="submit" style={{ width: "100%", padding: "12px 0", background: "#000", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: "0.04em" }}>Send Reset Link</button>
            <p style={{ textAlign: "center", marginTop: 12, fontSize: 12 }}>
              <a href="/login" style={{ color: "#fea619", textDecoration: "none", fontWeight: 600 }}>Back to Login</a>
            </p>
          </form>
        )}
        {mode === "reset" && (
          <form onSubmit={handleReset} style={{ textAlign: "left" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a1c1b", margin: "0 0 16px", textAlign: "center" }}>Reset Your Password</h2>
            {message && <p style={{ color: status === "error" ? "#DC2626" : "#16A34A", fontSize: 12, margin: "0 0 12px", textAlign: "center" }}>{message}</p>}
            <input type="password" placeholder="New password (min 6 characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: "100%", padding: "12px 14px", border: "1px solid #E5E5E0", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12, background: "#fafaf8" }} />
            <button type="submit" style={{ width: "100%", padding: "12px 0", background: "#000", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: "0.04em" }}>Reset Password</button>
          </form>
        )}
        {status === "loading" && <p style={{ color: "#77767b", fontSize: 14 }}>Resetting your password...</p>}
        {status === "success" && (
          <>
            <div style={{ width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", background: "#dcfce7" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <p style={{ color: "#16A34A", fontSize: 14, fontWeight: 600, margin: "0 0 16px" }}>{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", background: "#fef2f2" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </div>
            <p style={{ color: "#DC2626", fontSize: 14, margin: "0 0 16px" }}>{message}</p>
            <a href="/login" style={{ display: "inline-block", padding: "10px 28px", background: "#000", color: "#fff", textDecoration: "none", borderRadius: 8, fontWeight: 600, fontSize: 13 }}>Go to Login</a>
          </>
        )}
      </div>
    </div>
  );
}
