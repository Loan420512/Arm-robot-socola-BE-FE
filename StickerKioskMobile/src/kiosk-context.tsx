import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { resolve, type Session } from '../../StickerKiosk/src/kiosk/session';

export { resolve };
import { createMobileKiosk, type MobileKiosk } from './mobile-kiosk';

const KioskContext = createContext<MobileKiosk | null>(null);
const kiosk = createMobileKiosk();

export function KioskProvider(props: { readonly children: ReactNode }) {
  return <KioskContext.Provider value={kiosk}>{props.children}</KioskContext.Provider>;
}

export function useKiosk(): MobileKiosk {
  const value = useContext(KioskContext);
  if (!value) throw new Error('KioskProvider is missing');
  return value;
}

export function useSession(): Session {
  const store = useKiosk();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
