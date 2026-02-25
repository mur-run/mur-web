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

export function showToast(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const id = nextId++;
  _toasts = [..._toasts, { id, message, type }];
  notify();
  setTimeout(() => {
    _toasts = _toasts.filter(t => t.id !== id);
    notify();
  }, 3500);
}

export function subscribeToasts(fn: (t: ToastItem[]) => void): () => void {
  _listeners.push(fn);
  fn([..._toasts]);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}
