import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const MessageContext = createContext("");
const NotifyContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => { setMessage(""); timer.current = null; }, 2400);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return <NotifyContext.Provider value={notify}><MessageContext.Provider value={message}>{children}</MessageContext.Provider></NotifyContext.Provider>;
}

export const useToastMessage = () => useContext(MessageContext);
export const useNotify = () => useContext(NotifyContext);