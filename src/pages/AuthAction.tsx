import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, applyActionCode, checkActionCode, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function AuthAction() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<string>("");
  const [oobCode, setOobCode] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mode") || "";
    const code = params.get("oobCode") || "";
    const apiKey = params.get("apiKey") || "";
    setMode(m);
    setOobCode(code);

    if (!code) {
      setStatus("error");
      setMessage("Invalid or missing verification code.");
      return;
    }

    if (m === "verifyEmail") {
      applyActionCode(auth, code)
        .then(() => {
          setStatus("success");
          setMessage("Email verified successfully! You can now close this tab and return to the app.");
        })
        .catch((err) => {
          setStatus("error");
          if (err.code === "auth/expired-action-code") {
            setMessage("This verification link has expired. Please request a new one from the app.");
          } else if (err.code === "auth/invalid-action-code") {
            setMessage("This verification link has already been used or is invalid.");
          } else {
            setMessage("Failed to verify email: " + err.message);
          }
        });
    } else if (m === "resetPassword") {
      verifyPasswordResetCode(auth, code)
        .then((email) => {
          setMessage(`Reset password for ${email}`);
          setShowPasswordForm(true);
          setStatus("loading");
        })
        .catch((err) => {
          setStatus("error");
          setMessage("This password reset link is invalid or has expired.");
        });
    } else if (m === "recoverEmail") {
      checkActionCode(auth, code)
        .then((info) => {
          const restoredEmail = info.data.email || "";
          return applyActionCode(auth, code).then(() => restoredEmail);
        })
        .then((email) => {
          setStatus("success");
          setMessage(`Your email has been restored to ${email}.`);
        })
        .catch((err) => {
          setStatus("error");
          setMessage("Failed to recover email: " + err.message);
        });
    } else {
      setStatus("error");
      setMessage("Unknown action type.");
    }
  }, []);

  const handlePasswordReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setShowPasswordForm(false);
      setStatus("success");
      setMessage("Password reset successfully! You can now log in with your new password.");
    } catch (err: any) {
      alert("Failed to reset password: " + err.message);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f9f9f7",
      fontFamily: "Inter, system-ui, sans-serif",
      padding: 24
    }}>
      <div style={{
        background: "#fff",
        border: "1px solid #E5E5E0",
        borderRadius: 16,
        padding: "32px 40px",
        maxWidth: 420,
        width: "100%",
        textAlign: "center",
        boxShadow: "0 4px 24px rgba(0,0,0,0.04)"
      }}>
        <div style={{
          width: 48,
          height: 48,
          background: "#fea619",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px"
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#684000" strokeWidth="2.5">
            <path d="M9 12l2 2 4-4"/>
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1a1c1b", margin: "0 0 8px" }}>WalkSafe</h1>

        {status === "loading" && !showPasswordForm && (
          <p style={{ color: "#77767b", fontSize: 14 }}>Processing your request...</p>
        )}

        {status === "success" && (
          <>
            <div style={{ width: 48, height: 48, background: "#16A34A/10", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "16px auto" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <p style={{ color: "#16A34A", fontSize: 14, fontWeight: 600 }}>{message}</p>
            <a href="/" style={{
              display: "inline-block",
              marginTop: 20,
              padding: "10px 24px",
              background: "#000",
              color: "#fff",
              textDecoration: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13
            }}>Return to App</a>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ width: 48, height: 48, background: "#DC2626/10", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "16px auto" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </div>
            <p style={{ color: "#DC2626", fontSize: 14 }}>{message}</p>
            <a href="/" style={{
              display: "inline-block",
              marginTop: 20,
              padding: "10px 24px",
              background: "#000",
              color: "#fff",
              textDecoration: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13
            }}>Return to App</a>
          </>
        )}

        {showPasswordForm && (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: "#47464b", fontSize: 13, marginBottom: 12 }}>{message}</p>
            <input
              type="password"
              placeholder="New password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid #E5E5E0",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                marginBottom: 12
              }}
            />
            <button
              onClick={handlePasswordReset}
              style={{
                width: "100%",
                padding: "12px 0",
                background: "#000",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer"
              }}
            >Reset Password</button>
          </div>
        )}
      </div>
    </div>
  );
}
