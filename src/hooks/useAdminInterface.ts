import { useEffect, useState, useCallback } from "react";

/**
 * Préférence d'interface admin :
 *  - "refonte" → nouvelle charte Pays de Manosque (V1 Éditorial)
 *  - "classic" → ancienne interface avant refonte
 *
 * La préférence est stockée dans localStorage et peut être changée
 * à la volée via setAdminInterface() (émet un event pour sync tous
 * les hooks dans l'app).
 */
export type AdminInterface = "refonte" | "classic";

const LS_KEY = "apidia_admin_interface";
const DEFAULT: AdminInterface = "refonte";
const EVENT = "apidia:admin-interface-change";

export function getAdminInterface(): AdminInterface {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v === "classic" ? "classic" : "refonte";
  } catch {
    return DEFAULT;
  }
}

export function setAdminInterface(next: AdminInterface) {
  try {
    localStorage.setItem(LS_KEY, next);
  } catch {}
  window.dispatchEvent(new CustomEvent<AdminInterface>(EVENT, { detail: next }));
}

export function useAdminInterface(): [AdminInterface, (v: AdminInterface) => void] {
  const [pref, setPref] = useState<AdminInterface>(() => getAdminInterface());

  useEffect(() => {
    const handler = (e: Event) => {
      const next = (e as CustomEvent<AdminInterface>).detail ?? getAdminInterface();
      setPref(next);
    };
    const storageHandler = (e: StorageEvent) => {
      if (e.key === LS_KEY) setPref(getAdminInterface());
    };
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

  const update = useCallback((v: AdminInterface) => setAdminInterface(v), []);
  return [pref, update];
}
