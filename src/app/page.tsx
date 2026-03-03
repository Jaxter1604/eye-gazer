"use client";

import Script from "next/script";
import { useRef, useState, useEffect, useCallback } from "react";

declare global {
  interface Window {
    webgazer: any;
  }
}

export default function GazePage() {
  const [status, setStatus] = useState<"loading" | "ready" | "calibrating" | "test">("loading");
  const [calibrationPoints, setCalibrationPoints] = useState(0);
  const [activeLabel, setActiveLabel] = useState("GAZE CONTROL");
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const statusRef = useRef(status);
  const lookTimer = useRef<NodeJS.Timeout | null>(null);
  const currentElement = useRef<HTMLElement | null>(null);

  const DWELL_TIME = 500;

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Comprehensive cleanup for Windows/Chrome camera processes
  useEffect(() => {
    return () => {
      if (window.webgazer) {
        window.webgazer.pause();
        window.webgazer.end();
      }
      resetTimer();
    };
  }, []);

  const initWebGazer = useCallback(() => {
    if (!window.webgazer) {
      alert("WebGazer script not yet loaded. Please wait a moment.");
      return;
    }

    window.webgazer
      .setRegression("ridge")
      .setGazeListener((data: any) => {
        if (!data || statusRef.current !== "test") return;
        handleGaze(data);
      })
      .saveDataAcrossSessions(false) // Prevents stale data on Windows browser cache
      .begin();

    window.webgazer
      .showVideoPreview(true)
      .showPredictionPoints(true)
      .applyKalmanFilter(true);

    setStatus("calibrating");
  }, []);

  const handleCalibrationClick = () => {
    setCalibrationPoints((prev) => prev + 1);
  };

  const handleGaze = (data: { x: number; y: number }) => {
    // Windows High-DPI Fix: elementFromPoint uses client coordinates. 
    // We ensure we are looking at the element at the specific viewport X/Y.
    const element = document
      .elementFromPoint(data.x, data.y)
      ?.closest("[data-gazeable='true']") as HTMLElement | null;

    if (element) {
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
    // Visual feedback is crucial for gaze control
    el.style.outline = "6px solid #6366f1";
    el.style.backgroundColor = "rgba(99, 102, 241, 0.1)";

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
      {/* IMPORTANT: Ensure webgazer.js is in your /public folder.
        Windows browsers often block local scripts if the pathing isn't explicit.
      */}
      <Script
        src="/webgazer.js"
        strategy="lazyOnload"
        onLoad={() => {
          setScriptLoaded(true);
          setStatus("ready");
        }}
      />

      <div className="text-center mb-10">
        <h1 className="text-2xl font-black text-slate-900 underline">
          {activeLabel}
        </h1>
        <p className="text-slate-500 mt-2 max-w-md">
          {status === "loading" && "Loading eye tracking library..."}
          {status === "ready" && "Camera ready. Please initialize to start."}
          {status === "calibrating" && "Look at red dots and click them repeatedly."}
          {status === "test" && "Hover your eyes over buttons to select them."}
        </p>
      </div>

      {status === "ready" && (
        <div className="flex flex-col items-center gap-6">
          <p className="px-10 text-slate-700 text-center max-w-2xl">
            Thank you for participating. This test works best in **Chrome or Edge** on Windows. 
            Please ensure your face is well-lit.
          </p>
          <button
            onClick={initWebGazer}
            className="px-10 py-4 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
          >
            Start Eye Tracker
          </button>
        </div>
      )}

      {status === "calibrating" && (
        <div className="relative w-full max-w-4xl h-[500px] border-2 border-dashed border-slate-300 rounded-2xl">
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="flex items-center justify-center">
                <button
                  onClick={handleCalibrationClick}
                  className="w-10 h-10 bg-red-500 rounded-full hover:scale-110 transition-transform shadow-md active:bg-red-800"
                />
              </div>
            ))}
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <button
              onClick={() => setStatus("test")}
              className="px-8 py-3 bg-emerald-600 font-bold text-white rounded-lg shadow-xl hover:bg-emerald-700"
            >
              Finish Calibration ({calibrationPoints} clicks)
            </button>
          </div>
        </div>
      )}

      {status === "test" && (
        <div className="grid grid-cols-2 gap-6 max-w-4xl w-full">
          <div className="col-span-2 flex justify-center">
            <GazeButton label="Top Center" onActivate={setActiveLabel} />
          </div>
          <GazeButton label="Left Wing" onActivate={setActiveLabel} />
          <GazeButton label="Right Wing" onActivate={setActiveLabel} />
          <GazeButton label="Base Left" onActivate={setActiveLabel} />
          <GazeButton label="Base Right" onActivate={setActiveLabel} />
        </div>
      )}
    </div>
  );
}

function GazeButton({ label, onActivate }: { label: string; onActivate: (l: string) => void }) {
  return (
    <button
      data-gazeable="true"
      className="w-full h-32 bg-white border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-800 shadow-sm transition-all hover:border-emerald-500"
      onClick={() => onActivate(label)}
    >
      {label}
    </button>
  );
}