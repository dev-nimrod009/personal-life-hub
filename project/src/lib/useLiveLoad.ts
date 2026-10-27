import { useEffect } from "react";
import { subscribeToData } from "./data";

export function useLiveLoad(load: () => void | Promise<void>, deps: unknown[] = []): void {
  useEffect(() => {
    void load();
    return subscribeToData(() => {
      void load();
    });
    // Callers pass the data dependencies that should retrigger a local read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
