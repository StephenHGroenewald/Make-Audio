import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Sparkles, X, Smartphone } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as standalone PWA, do not render
  if (isInstalled) {
    return null;
  }

  // Native prompt available (Android / Desktop Chrome / Edge)
  if (isInstallable) {
    return (
      <button
        id="pwa-install-btn"
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-md border border-emerald-500 transition-all shadow-2xs cursor-pointer active:scale-95"
        title="Install Kokoro TTS App"
      >
        <Download className="w-3.5 h-3.5 text-white" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow (no native trigger available)
  if (isIOS) {
    return (
      <>
        <button
          id="pwa-install-ios-btn"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md border border-indigo-200 transition-all shadow-2xs cursor-pointer active:scale-95"
          title="Install Kokoro TTS App on iOS"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-slate-200 relative animate-in zoom-in-95 duration-150">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100"
                title="Close guide"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Install on iOS (iPhone / iPad)</h3>
              </div>
              
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <p>
                  Get the standalone app on your iOS device in just two steps:
                </p>
                <ol className="list-decimal list-inside space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <li>Tap the <strong className="text-slate-800">Share</strong> button in Safari’s bottom toolbar.</li>
                  <li>Scroll down and tap <strong className="text-indigo-600">Add to Home Screen</strong>.</li>
                </ol>
                <p className="text-[10px] text-slate-400">
                  Runs locally with persistent browser cache & instant speech synthesis.
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-slate-100 hover:bg-slate-200 py-2 text-xs font-semibold text-slate-700 transition"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
