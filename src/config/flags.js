import { featureFlags } from "./features";

// The app's resolved feature flags — computed once, here.
//
// This is deliberately the ONLY place in the app that touches `import.meta.env`
// as a whole object. Vite inlines that object literally at every reference, so
// calling featureFlags(import.meta.env) from each consumer stamped a full copy
// of every VITE_ var into three different chunks. One touch point, one copy.
//
// Passing the whole object rather than an explicit allowlist of the five vars
// features.js reads is intentional. An allowlist would be marginally smaller,
// but it would have to stay in sync with features.js by hand — and forgetting
// to add a var there would make its flag silently read `undefined` and report
// OFF. That is precisely the silent-misconfiguration failure this whole
// mechanism exists to prevent. The cost is a few hundred bytes of values that
// are public by definition (every VITE_ var ships to the browser anyway).
export const FLAGS = featureFlags(import.meta.env);
