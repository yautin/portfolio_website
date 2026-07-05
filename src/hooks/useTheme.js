import { useSyncExternalStore } from "react";

// Reactive access to the current theme for any component (e.g. the 3D hero),
// driven by the `data-theme` attribute the navbar toggle sets on <html>.
const subscribe = (callback) => {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
};

const getSnapshot = () =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

const getServerSnapshot = () => "dark";

export const useTheme = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
