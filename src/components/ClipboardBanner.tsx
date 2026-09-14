import React from 'react';
import { ShieldAlert, CheckCircle2, Copy, ExternalLink, X } from 'lucide-react';
import { ClipboardStatus } from '../utils/clipboard';

interface ClipboardBannerProps {
  status: ClipboardStatus;
  lastError: string | null;
  onDismissError: () => void;
  onRequestPermission: () => void;
}

export const ClipboardBanner: React.FC<ClipboardBannerProps> = ({
  status,
  lastError,
  onDismissError,
  onRequestPermission
}) => {
  if (lastError) {
    const isIframeBlocked =
      lastError.toLowerCase().includes('denied') ||
      lastError.toLowerCase().includes('permission') ||
      lastError.toLowerCase().includes('not allowed') ||
      lastError.toLowerCase().includes('policy');

    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-900 text-xs flex items-start justify-between gap-3 shadow-sm animate-in fade-in duration-200">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-950">
              {isIframeBlocked
                ? 'Clipboard Access Blocked by Browser'
                : 'Unable to Read Clipboard'}
            </p>
            <p className="text-amber-800 leading-relaxed">
              {isIframeBlocked
                ? 'Browsers restrict automatic clipboard reading inside embedded previews. You can grant permission by clicking the button below, or paste directly into the box using Ctrl+V (or ⌘+V).'
                : lastError}
            </p>
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={onRequestPermission}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium transition-colors"
              >
                Request Clipboard Access
              </button>
              <button
                type="button"
                onClick={() => {
                  window.open(window.location.href, '_blank');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 rounded border border-amber-300 font-medium transition-colors"
              >
                Open in New Tab
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismissError}
          className="text-amber-600 hover:text-amber-800 p-1"
          title="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (status.state === 'granted') {
    return null; // Silent when granted
  }

  return null;
};
