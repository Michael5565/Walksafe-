import React, { useState, useEffect, useRef } from "react";

interface TourStep {
  tab: string;
  targetSelector: string;
  title: string;
  desc: string;
  position: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  { tab: "overview", targetSelector: ".dashboard-overview-header", title: "Dashboard Overview", desc: "See today compliance status, open defects, and fleet health at a glance.", position: "bottom" },
  { tab: "vehicles", targetSelector: "[class*='Register New Asset']", title: "Add Vehicles", desc: "Register vehicles via DVLA lookup. Enter the UK registration and details auto-fill.", position: "bottom" },
  { tab: "drivers", targetSelector: "[class*='Add Driver']", title: "Add Drivers", desc: "Create driver accounts with 4-digit PINs. Assign vehicles and print QR login codes.", position: "bottom" },
  { tab: "templates", targetSelector: "[class*='Built-in']", title: "Compliance Templates", desc: "Publish built-in checklists with mandatory photo requirements for DVSA-proof walkarounds.", position: "bottom" },
  { tab: "schedules", targetSelector: "[class*='Schedule']", title: "Schedule Checks", desc: "Set daily/weekly recurring walkaround checks for each vehicle and driver.", position: "bottom" },
];

interface TourSpotlightProps {
  step: number;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
  onTabChange: (tab: string) => void;
}

export default function TourSpotlight({ step, onNext, onBack, onClose, onTabChange }: TourSpotlightProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [ready, setReady] = useState(false);

  const currentStep = TOUR_STEPS[Math.min(step, TOUR_STEPS.length - 1)];

  const updatePosition = () => {
    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect(r);
      const gap = 16;
      const cardW = 320;
      const style: React.CSSProperties = { position: "fixed", zIndex: 1001 };
      let left = Math.max(16, Math.min(r.left + r.width / 2 - cardW / 2, window.innerWidth - cardW - 16));
      switch (currentStep.position) {
        case "bottom":
          style.top = r.bottom + gap;
          style.left = left;
          break;
        case "top":
          style.bottom = window.innerHeight - r.top + gap;
          style.left = left;
          break;
      }
      setTooltipStyle(style);
      setReady(true);
    } else {
      // Fallback: center the tooltip on screen
      setRect(null);
      const cardW = 320;
      setTooltipStyle({
        position: "fixed", zIndex: 1001,
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
      });
      setReady(true);
    }
  };

  useEffect(() => {
    onTabChange(currentStep.tab);
    const timer = setTimeout(updatePosition, 200);
    window.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [step]);

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.55)", cursor: "pointer" }}
        onClick={onClose}
      />
      {rect && (
        <div
          style={{
            position: "fixed", left: rect.left - 4, top: rect.top - 4,
            width: rect.width + 8, height: rect.height + 8,
            zIndex: 1000, background: "transparent", borderRadius: 8,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            pointerEvents: "none",
          }}
        />
      )}
      {ready && (
        <div style={{ ...tooltipStyle, width: 320, background: "#fff", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", padding: "20px 24px", zIndex: 1001 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
            {TOUR_STEPS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 4, background: i === step ? "#1A56DB" : "#E5E7EB", transition: "background 0.3s" }} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#1A56DB", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{step + 1}</span>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>{currentStep.title}</h3>
          </div>
          <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5, margin: "0 0 16px 36px" }}>{currentStep.desc}</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={onBack} style={{ padding: "6px 16px", borderRadius: 8, border: step === 0 ? "1px solid #E5E7EB" : "1px solid #D1D5DB", background: step === 0 ? "#F9FAFB" : "#fff", color: step === 0 ? "#D1D5DB" : "#374151", fontSize: 13, fontWeight: 600, cursor: step === 0 ? "default" : "pointer", opacity: step === 0 ? 0.5 : 1 }} disabled={step === 0}>Back</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", color: "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Skip</button>
              {step < TOUR_STEPS.length - 1 ? (
                <button onClick={onNext} style={{ padding: "6px 20px", borderRadius: 8, border: "none", background: "#1A56DB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 1px 4px rgba(26,86,219,0.3)" }}>Next</button>
              ) : (
                <button onClick={onClose} style={{ padding: "6px 20px", borderRadius: 8, border: "none", background: "#1A56DB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Done</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
