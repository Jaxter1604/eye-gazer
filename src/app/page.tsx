"use client";

import Script from "next/script";
import { useRef, useState, useEffect } from "react";

declare global {
  interface Window {
    webgazer: any;
  }
}

export default function GazePage() {
  // States to track initialization and errors
  const [status, setStatus] = useState<"loading" | "ready" | "calibrating" | "test" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [calibrationPoints, setCalibrationPoints] = useState(0);
  const [activeLabel, setActiveLabel] = useState("GAZE CONTROL");

  const statusRef = useRef(status);
  const lookTimer = useRef<NodeJS.Timeout | null>(null);
  const currentElement = useRef<HTMLElement | null>(null);

  const DWELL_TIME = 500;

  // Keep ref in sync with state for the gaze listener
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Clean up WebGazer when leaving the page
  useEffect(() => {
    return () => {
      if (window.webgazer) {
        window.webgazer.end();
      }
      resetTimer();
    };
  }, []);

  /**
   * WINDOWS FIX: Explicitly check for WebGL support. 
   * WebGazer's "ridge" regression will fail silently if Hardware Acceleration is off.
   */
  const checkHardwareSupport = () => {
    try {
      const canvas = document.createElement("canvas");
      const supportsWebGL = !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
      if (!supportsWebGL) throw new Error("WebGL is disabled. Please enable Hardware Acceleration in your browser settings.");
    } catch (e) {
      throw new Error("Hardware Acceleration is required for gaze tracking.");
    }
  };

  const initWebGazer = async () => {
    if (!window.webgazer) {
      setErrorMessage("The tracking script hasn't finished loading yet.");
      return;
    }

    try {
      // 1. Check WebGL (Fixes Windows "No Tracker" issues)
      checkHardwareSupport();

      // 2. Explicitly request camera to trigger the Windows/Browser prompt
      await navigator.mediaDevices.getUserMedia({ video: true });

      // 3. Start WebGazer
      await window.webgazer
        .setRegression("ridge")
        .setGazeListener((data: any) => {
          if (!data || statusRef.current !== "test") return;
          handleGaze(data);
        })
        .begin();

      // 4. Configure UI
      window.webgazer
        .showVideoPreview(true) // Set to TRUE so users see if the camera is working
        .showPredictionPoints(true)
        .applyKalmanFilter(true);

      setStatus("calibrating");
    } catch (err: any) {
      console.error("Initialization failed:", err);
      setErrorMessage(err.message || "Camera access was denied or a hardware error occurred.");
      setStatus("error");
    }
  };

  const handleCalibrationClick = () => {
    setCalibrationPoints((prev) => prev + 1);
  };

  const handleGaze = (data: { x: number; y: number }) => {
    const element = document
      .elementFromPoint(data.x, data.y)
      ?.closest("button") as HTMLElement | null;

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
    // Visual feedback that the eye is "hovering"
    el.style.outline = "6px solid #6366f1";
    el.style.transition = "background-color 0.5s ease";
    el.style.backgroundColor = "#e0e7ff";

    lookTimer.current = setTimeout(() => {
      el.click();
      resetTimer();
    }, DWELL_TIME);
  };

  const resetTimer = () => {
    if (lookTimer.current) {
      clearTimeout(lookTimer.current);
      lookTimer.current = null;
    }
    if (currentElement.current) {
      currentElement.current.style.outline = "";
      currentElement.current.style.backgroundColor = "";
      currentElement.current = null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-slate-50 p-6 pt-10 font-mono">
      {/* Load local script from /public folder */}
      <Script
        src="/webgazer.js"
        strategy="afterInteractive"
        onLoad={() => setStatus("ready")}
        onError={() => {
          setStatus("error");
          setErrorMessage("Failed to load /webgazer.js from the public directory.");
        }}
      />

      <div className="text-center mb-10">
        <h1 className="text-2xl font-black text-slate-900 underline">
          {activeLabel}
        </h1>
        <p className="text-slate-500 mt-2">
          {status === "calibrating" ? "Click red dots while looking directly at them." : 
           status === "test" ? "Stare at a button to 'click' it." : 
           status === "error" ? "Hardware Error" : "Follow the prompts below."}
        </p>
      </div>

      {/* Error UI */}
      {status === "error" && (
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl text-red-700 max-w-md text-center">
          <p className="font-bold mb-2">Wait! Something is blocking the camera:</p>
          <p className="text-sm">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg font-bold"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Landing State */}
      {status === "ready" && (
        <div className="flex flex-col items-center gap-6 max-w-xl text-center">
          <p className="text-slate-700">
            Windows users: Please ensure your <strong>Privacy Settings</strong> allow browser camera access and 
            <strong> Hardware Acceleration</strong> is enabled in Chrome/Edge.
          </p>
          <button
            onClick={initWebGazer}
            className="px-10 py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-600 transition-all"
          >
            Start Eye Tracker
          </button>
        </div>
      )}

      {/* Calibration State */}
      {status === "calibrating" && (
        <div className="relative w-full h-[500px] border-2 border-dashed border-slate-200 rounded-3xl">
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-8">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="flex items-center justify-center">
                <button
                  onClick={handleCalibrationClick}
                  className="w-10 h-10 bg-red-500 rounded-full hover:scale-125 active:bg-red-900 transition-all shadow-md"
                />
              </div>
            ))}
          </div>

          <div className="absolute bottom-8 w-full flex justify-center">
            <button
              onClick={() => setStatus("test")}
              className="px-8 py-3 bg-emerald-500 font-bold text-white rounded-xl shadow-xl"
            >
              Finish Calibration ({calibrationPoints} clicks)
            </button>
          </div>
        </div>
      )}

      {/* Main Testing State */}
      {status === "test" && (
        <div className="grid grid-cols-2 gap-4 max-w-4xl w-full">
          <div className="col-span-2 flex justify-center">
            <GazeButton label="Top Center" onActivate={setActiveLabel} />
          </div>
          <GazeButton label="Middle Left" onActivate={setActiveLabel} />
          <GazeButton label="Middle Right" onActivate={setActiveLabel} />
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
      className="w-full h-32 md:h-44 bg-white border-2 border-slate-200 rounded-2xl text-xl font-bold text-slate-600 shadow-sm transition-all"
      onClick={() => onActivate(label)}
    >
      {label}
    </button>
  );
}