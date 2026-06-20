import { useEffect, useState } from "react";

export default function VerifyEmail() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Missing verification token. Please use the link from your email.");
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");
        } else {
          setStatus("error");
          setMessage(data.message || data.error || "Verification failed. The link may have expired or already been used.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error. Please check your connection and try again.");
      });
  }, []);

  // Auto-redirect to login after 5 seconds on success
  useEffect(() => {
    if (status === "success") {
      const t = setTimeout(() => window.location.href = "/login", 5000);
      return () => clearTimeout(t);
    }
  }, [status]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg,#fffbf2 0%,#f9f9f7 50%,#f0f4ff 100%)",
      fontFamily: "Inter, system-ui, sans-serif",
      padding: 24,
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{ position: "fixed", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(254,166,25,0.10) 0%,transparent 70%)", pointerEvents: "none" }} />
      <div style={{ background: "#fff", border: "1px solid #E5E5E0", borderRadius: 20, padding: "40px 36px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.06)", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#fea619,#f08000)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(254,166,25,0.35)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M9 12l2 2 4-4"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "0.04em", color: "#1a1c1b" }}>Walk<span style={{ color: "#fea619" }}>Safe</span></span>
        </div>
        <p style={{ fontSize: 10, color: "#fea619", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 24px" }}>UK DVSA Compliant</p>
        <div style={{ width: 56, height: 56, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", background: status === "loading" ? "#f4f4f2" : status === "success" ? "#dcfce7" : "#fef2f2", border: "1px solid " + (status === "loading" ? "#E5E5E0" : status === "success" ? "#bbf7d0" : "#fecaca") }}>
          {status === "loading" && <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fea619" strokeWidth="2.5"><path d="M21 12a9 9 0 11-6.219-8.558"/></svg>}
          {status === "success" && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>}
          {status === "error" && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>}
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1a1c1b", margin: "0 0 8px" }}>
          {status === "loading" && "Verifying your email..."}
          {status === "success" && "Email Verified"}
          {status === "error" && "Verification Failed"}
        </h1>
        <p style={{ color: status === "error" ? "#DC2626" : "#47464b", fontSize: 13, lineHeight: 1.5, margin: "0 0 24px" }}>{message}</p>
        {status === "success" && (
          <>
            <p style={{ color: "#77767b", fontSize: 11, margin: "0 0 12px" }}>Redirecting to login in 5 seconds...</p>
            <a href="/login" style={{ display: "inline-block", padding: "10px 28px", background: "#000", color: "#fff", textDecoration: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, transition: "opacity 0.2s" }}
               onMouseOver={e => (e.currentTarget.style.opacity = "0.85")} onMouseOut={e => (e.currentTarget.style.opacity = "1")}>Go to Login</a>
          </>
        )}
        {status === "error" && (
          <a href="/login" style={{ display: "inline-block", padding: "10px 28px", background: "#000", color: "#fff", textDecoration: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, transition: "opacity 0.2s" }}
             onMouseOver={e => (e.currentTarget.style.opacity = "0.85")} onMouseOut={e => (e.currentTarget.style.opacity = "1")}>Go to Login</a>
        )}
      </div>
    </div>
  );
}
