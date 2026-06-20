import React, { useRef, useState, useEffect } from "react";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  placeholderText?: string;
  id?: string;
}

export default function SignaturePad({ onSave, placeholderText = "Sign here", id }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Set up crisp rendering by taking devicePixelRatio into account
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get displayed width and height
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#000000"; // Signature color
      ctx.lineWidth = 2.5;
    }
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  // Sync canvas style and color based on container/theme if needed, but standard dark/light ink works best
  const startDrawing = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (clientX: number, clientY: number) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas && hasDrawn) {
      const dataUrl = canvas.toDataURL("image/png");
      onSave(dataUrl);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setIsDrawing(false);
    onSave(""); // empty signature
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    startDrawing(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    draw(e.clientX, e.clientY);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      startDrawing(touch.clientX, touch.clientY);
      // Prevent scrolling while signing
      e.preventDefault();
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      draw(touch.clientX, touch.clientY);
      e.preventDefault();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full" id={id}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={stopDrawing}
        className="w-full h-32 bg-slate-50 cursor-crosshair rounded-lg block touch-none"
        style={{ touchAction: "none" }}
      />
      
      {!hasDrawn && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none px-4">
          <span className="text-xs text-slate-400 font-mono text-center">
            {placeholderText}
          </span>
        </div>
      )}

      {hasDrawn && (
        <button
          type="button"
          onClick={clearCanvas}
          className="absolute bottom-2 right-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-100 px-2 py-1 rounded text-[10px] font-mono tracking-wider font-bold transition-all uppercase"
        >
          Clear Ink
        </button>
      )}
    </div>
  );
}
