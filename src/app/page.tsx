"use client";

import Script from "next/script";
import { useRef, useState, useEffect } from "react";

declare global {
  interface Window {
    webgazer: any;
  }
}

export default function GazePage() {
  // predefine states -> start on loading state until camera starts
  const [status, setStatus] = useState<
    "loading" | "ready" | "calibrating" | "test"
  >("loading");

  const [calibrationPoints, setCalibrationPoints] = useState(0);
  const [activeLabel, setActiveLabel] = useState("GAZE CONTROL");

  const statusRef = useRef(status);
  const lookTimer = useRef<NodeJS.Timeout | null>(null);
  const currentElement = useRef<HTMLElement | null>(null);

  //time needed to activate button in ms
  const DWELL_TIME = 500;

  //get current page status
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  //actiavte webgazer or reset timer
  useEffect(() => {
    return () => {
      if (window.webgazer) {
        window.webgazer.end();
      }
      resetTimer();
    };
  }, []);

  // initialise webgazer with ocrrect settings
  const initWebGazer = () => {
    if (!window.webgazer) return;

    window.webgazer
      .setRegression("ridge")
      .setGazeListener((data: any) => {
        if (!data || statusRef.current !== "test") return;
        handleGaze(data);
      })
      .begin();

    window.webgazer
      .showVideoPreview(false)
      .showPredictionPoints(true)
      .applyKalmanFilter(true);

    //update status to next stage
    setStatus("calibrating");
  };

  // Count and siaply clicks for calibration
  // because why not
  const handleCalibrationClick = () => {
    setCalibrationPoints((prev) => prev + 1);
  };

  // locate gaze pointer on page
  // if gaze pointer is on an element
  // and that element has been deemed reactable to gaze control
  // start a fresh timer to trigger a click
  // otherwise reset a timer
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

  //starts on click timer based on DWELL_TIME
  const startTimer = (el: HTMLElement) => {
    el.style.outline = "6px solid #6366f1";

    lookTimer.current = setTimeout(() => {
      el.click();
      resetTimer();
    }, DWELL_TIME);
  };

  //reset timer on failed click
  const resetTimer = () => {
    if (lookTimer.current) {
      clearTimeout(lookTimer.current);
      lookTimer.current = null;
    }

    if (currentElement.current) {
      currentElement.current.style.outline = "";
      currentElement.current = null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 font-mono">
      {/* Activate gaze control */}
      <Script
        src="https://webgazer.cs.brown.edu/webgazer.js"
        strategy="lazyOnload"
        onLoad={() => setStatus("ready")}
      />

      {/* Page Title and prompt */}
      <div className="fixed top-10 text-center">
        <h1 className="text-2xl font-black text-slate-900 font-mono underline">
          {activeLabel}
        </h1>
        <p className="text-slate-500 font-mono underline">
          {status === "calibrating"
            ? "To train the tracker, please look at the red dots while clicking them repeatedly, the more clicks the better"
            : status === "test" ? "Use the gaze tracker to hover on the buttons to activate them"
            : "Follow the prompts below"}
        </p>
      </div>

      {/* Camera start button */}
      {status === "ready" && (
        <>
        <p className="px-10 font-mono text-slate-900 text-m text-center">
          Thankyou for participating in this test. Please complete the tasks on the next pages once on a laptop
          and once on a mobile, spend no more than 5 mins on each go through. Once complete please answer the short survey.
          Please note that your participation is entirely voluntary 
          and you can stop at any point. For any questions please reach out.</p>
        <button
          onClick={initWebGazer}
          className="px-10 py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-xl hover:bg-emerald-700 transition-color font-mono"
        >
          Initialize Camera
        </button>
        </>
      )}

      {/* calibration page */}
      {status === "calibrating" && (
        <div className="relative w-full h-[600px] flex flex-col items-center justify-between">
          {/* Create grid for calibration spots */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-10">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="flex items-center justify-center">
                <button
                  onClick={handleCalibrationClick}
                  className="w-8 h-8 bg-red-400 rounded-full hover:bg-red-500 transition-color shadow-md active:bg-red-800"
                />
              </div>
            ))}
          </div>

          {/* On click change to test stage */}
          <div className="z-10 mt-auto mb-10 font-mono">
            <button
              onClick={() => setStatus("test")}
              className="px-10 py-4 bg-emerald-500 font-mono font-bold text-white rounded-xl shadow-2xl hover:bg-emerald-700 transition-color"
            >
              Start Test ({calibrationPoints} clicks)
            </button>
          </div>
        </div>
      )}

      {/* Actual button clicking stage */}
      {/* On button activation page title displays button clicked */}
      {status === "test" && (
        <div className="grid grid-cols-2 gap-4 max-w-4xl w-full font-mono">
          <div className="col-span-2 flex justify-center font-mono">
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

//button template
//defined as clickable by gaze control
function GazeButton({
  label,
  onActivate,
}: {
  label: string;
  onActivate: (label: string) => void;
}) {
  return (
    <button
      data-gazeable="true"
      className="w-full h-42 md:h-60 bg-slate-300 border-4 border-slate-200 rounded-3xl text-xl font-bold text-slate-700 transition-color"
      onClick={() => onActivate(label)}
    >
      {label}
    </button>
  );
}