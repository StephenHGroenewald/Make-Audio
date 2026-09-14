import { ClipboardPermissionState, ClipboardStatus } from '../types/tts';

export type { ClipboardStatus };

/**
 * Check the current clipboard-read permission status
 */
export async function getClipboardPermission(): Promise<ClipboardPermissionState> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return 'unsupported';
  }

  if (navigator.permissions && navigator.permissions.query) {
    try {
      // @ts-expect-error clipboard-read permission name
      const result = await navigator.permissions.query({ name: 'clipboard-read' });
      return (result.state as ClipboardPermissionState) || 'prompt';
    } catch {
      // Some browsers (e.g. Firefox) do not support querying clipboard-read
      return 'prompt';
    }
  }

  return 'prompt';
}

export async function checkClipboardPermission(): Promise<ClipboardStatus> {
  const state = await getClipboardPermission();
  return { state };
}

/**
 * Read text directly from the user's clipboard, triggering the permission prompt if needed
 */
export async function readTextFromClipboard(): Promise<{ text: string; error?: string }> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return {
      text: '',
      error: 'Clipboard API is not supported in this browser. Please use keyboard paste (Ctrl+V / Cmd+V).',
    };
  }

  try {
    const text = await navigator.clipboard.readText();
    return { text };
  } catch (err: unknown) {
    const errorObj = err as Error;
    const isDenied =
      errorObj?.name === 'NotAllowedError' ||
      errorObj?.message?.toLowerCase().includes('denied') ||
      errorObj?.message?.toLowerCase().includes('permission');

    if (isDenied) {
      return {
        text: '',
        error:
          'Clipboard permission was not granted. Please allow clipboard permissions in your browser or paste directly using Ctrl+V (⌘+V).',
      };
    }

    return {
      text: '',
      error: errorObj?.message || 'Unable to access clipboard.',
    };
  }
}

export const readClipboardText = readTextFromClipboard;
