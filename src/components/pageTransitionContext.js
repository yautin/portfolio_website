import { createContext, useContext } from "react";

// Context + hook for the route portal transition, kept in a non-component
// module so PageTransition.jsx can stay component-only (fast-refresh clean).
export const TransitionContext = createContext(null);

// Returns { portalTo, portalReveal } — or {} outside a provider, so callers
// can optional-chain safely.
export const usePageTransition = () => useContext(TransitionContext) ?? {};
