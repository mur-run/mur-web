export interface ToastItem {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error';
}

let nextId = 0;
let _toasts: ToastItem[] = [];
let _listeners: Array<(t: ToastItem[]) => void> = [];

function notify() {
  _listeners.forEach(l => l([..._toasts]));
}

const _timers = new Map<number, ReturnType<typeof setTimeout>>();

export function showToast(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const id = nextId++;
  _toasts = [..._toasts, { id, message, type }];
  notify();
  const timer = setTimeout(() => {
    _toasts = _toasts.filter(t => t.id !== id);
    _timers.delete(id);
    notify();
  }, 3500);
  _timers.set(id, timer);
}

export function clearAllToasts() {
  _timers.forEach(t => clearTimeout(t));
  _timers.clear();
  _toasts = [];
  notify();
}

export function subscribeToasts(fn: (t: ToastItem[]) => void): () => void {
  _listeners.push(fn);
  fn([..._toasts]);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}
