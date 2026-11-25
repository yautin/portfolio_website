import { useSyncExternalStore } from "react";

// Reactive access to the current theme for any component (e.g. the 3D hero),
// The pre-paint bootstrap still honours a previously saved theme on <html>.
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
