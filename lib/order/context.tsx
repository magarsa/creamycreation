"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Category, Flavour } from "@/lib/domain/order";

export interface OrderDraft {
  session_id: string; // for grouping pending photo uploads
  event_date?: string;
  occasion?: Category;
  size?: string;
  addon_ids: string[];
  flavour?: Flavour;
  message?: string;
  notes?: string;
  reference_link?: string;
  style_tag?: string;
  photo_paths: string[];
  preferred_name?: string;
  email?: string;
  ig_handle?: string;
}

const STORAGE_KEY = "cc_order_draft";

function emptyDraft(): OrderDraft {
  return { session_id: crypto.randomUUID(), photo_paths: [], addon_ids: [] };
}

interface OrderContextValue {
  draft: OrderDraft;
  update: (patch: Partial<OrderDraft>) => void;
  reset: () => void;
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OrderDraft>(emptyDraft);
  const hydrated = useRef(false);

  // Restore an in-progress draft on mount (survives a refresh within the flow).
  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        // A draft saved before addon_ids existed (pre-deploy tab left open)
        // won't have it at runtime even though the type claims otherwise —
        // default so .includes()/.map() calls don't throw.
        const parsed = JSON.parse(raw) as Partial<OrderDraft>;
        // One-time hydration from client-only storage; both server and client
        // first render the empty draft, so there's no hydration mismatch.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft((d) => ({ ...d, ...parsed, addon_ids: parsed.addon_ids ?? [] }));
      } catch {
        /* ignore corrupt draft */
      }
    }
    hydrated.current = true;
  }, []);

  // Persist after hydration so we don't clobber a stored draft with the initial empty one.
  useEffect(() => {
    if (hydrated.current) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }
  }, [draft]);

  const update = (patch: Partial<OrderDraft>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const reset = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setDraft(emptyDraft());
  };

  return (
    <OrderContext.Provider value={{ draft, update, reset }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder must be used within OrderProvider");
  return ctx;
}
