"use client";

import Script from "next/script";
import { useRef, useState, useEffect } from "react";

declare global {
  interface Window {
    webgazer: any;
  }
}

export default function GazePage() {
  const [status, setStatus] = useState<"loading" | "ready" | "calibrating" | "test" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [calibrationPoints, setCalibrationPoints] = useState(0);
  const [activeLabel, setActiveLabel] = useState("GAZE CONTROL");

  const statusRef = useRef(status);
  const lookTimer = useRef<NodeJS.Timeout | null>(null);
  const currentElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const initWebGazer = async () => {
    if (!window.webgazer) return;

    try {
      // 1. WINDOWS FIX: Find the correct RGB camera (ignore IR/Virtual cams)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      
      // Look for "Integrated" or "Webcam" - avoid "IR" or "Virtual"
      const bestCamera = videoDevices.find(d => 
        !d.label.toLowerCase().includes('ir') && 
        !d.label.toLowerCase().includes('virtual')
      ) || videoDevices[0];

      if (!bestCamera) throw new Error("No camera detected. Please check Windows Privacy Settings.");

      // 2. Start WebGazer with specific constraints
      await window.webgazer
        .setRegression("ridge")
        .setGazeListener((data: any) => {
          if (!data || statusRef.current !== "test") return;
          handleGaze(data);
        })
        .begin();

      // 3. FORCE VISIBILITY: Windows sometimes hides the generated video
      // This ensures the tracker UI is visible and not 0x0 pixels
      window.webgazer
        .showVideoPreview(true)
        .showPredictionPoints(true)
        .applyKalmanFilter(true);

      // Manually styling the WebGazer video to ensure it's on top and visible on Windows
      const videoElement = document.getElementById("webgazerVideoFeed");
      if (videoElement) {
        videoElement.style.border = "4px solid #10b981";
        videoElement.style.borderRadius = "12px";
        videoElement.style.position = "fixed";
        videoElement.style.top = "10px";
        videoElement.style.left = "10px";
        videoElement.style.zIndex = "9999";
      }

      setStatus("calibrating");
    } catch (err: any) {
      console.error("Tracker failed:", err);
      setErrorMessage(err.message || "Camera failed to initialize.");
      setStatus("error");
    }
  };

  const handleCalibrationClick = () => {
    setCalibrationPoints((prev) => prev + 1);
  };

  const handleGaze = (data: { x: number; y: number }) => {
    const element = document.elementFromPoint(data.x, data.y)?.closest("button") as HTMLElement | null;
    if (element && element.dataset.gazeable === "true") {
      if (currentElement.current !== element) {
        resetTimer();
        currentElement.current = element;
        startTimer(element);
      }
    } else {
      resetTimer();
    }
  };

  const startTimer = (el: HTMLElement) => {
    el.style.outline = "6px solid #6366f1";
    lookTimer.current = setTimeout(() => {
      el.click();
      resetTimer();
    }, 500);
  };

  const resetTimer = () => {
    if (lookTimer.current) clearTimeout(lookTimer.current);
    if (currentElement.current) currentElement.current.style.outline = "";
    currentElement.current = null;
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-slate-50 p-6 pt-10 font-mono">
      <Script
        src="/webgazer.js"
        strategy="afterInteractive"
        onLoad={() => setStatus("ready")}
      />

      <div className="text-center mb-10">
        <h1 className="text-2xl font-black text-slate-900 underline">{activeLabel}</h1>
        <p className="text-slate-500 mt-2">
          {status === "calibrating" ? "Click red dots to calibrate." : 
           status === "test" ? "Gaze at buttons to click." : "Follow the prompts."}
        </p>
      </div>

      {status === "error" && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          <strong>Windows Error:</strong> {errorMessage}
          <button onClick={() => window.location.reload()} className="block mt-2 underline">Retry</button>
        </div>
      )}

      {status === "ready" && (
        <button
          onClick={initWebGazer}
          className="px-10 py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-xl hover:bg-emerald-600 transition-all"
        >
          Initialize Camera
        </button>
      )}

      {status === "calibrating" && (
        <div className="relative w-full h-[500px] border-2 border-dashed border-slate-300 rounded-3xl">
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-10">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="flex items-center justify-center">
                <button
                  onClick={handleCalibrationClick}
                  className="w-10 h-10 bg-red-500 rounded-full hover:scale-110 active:bg-red-800 transition-all"
                />
              </div>
            ))}
          </div>
          <div className="absolute bottom-6 w-full flex justify-center">
            <button onClick={() => setStatus("test")} className="px-10 py-4 bg-emerald-500 text-white rounded-xl">
              Start Test ({calibrationPoints} samples)
            </button>
          </div>
        </div>
      )}

      {status === "test" && (
        <div className="grid grid-cols-2 gap-4 max-w-4xl w-full">
          <GazeButton label="Top Left" onActivate={setActiveLabel} />
          <GazeButton label="Top Right" onActivate={setActiveLabel} />
          <GazeButton label="Bottom Left" onActivate={setActiveLabel} />
          <GazeButton label="Bottom Right" onActivate={setActiveLabel} />
        </div>
      )}
    </div>
  );
}

function GazeButton({ label, onActivate }: { label: string; onActivate: (label: string) => void }) {
  return (
    <button
      data-gazeable="true"
      className="w-full h-32 bg-white border-2 border-slate-200 rounded-2xl text-xl font-bold text-slate-700 shadow-sm"
      onClick={() => onActivate(label)}
    >
      {label}
    </button>
  );
}