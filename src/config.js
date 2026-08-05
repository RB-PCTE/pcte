// src/config.js — the frontend's only environment-dependent value.
//
// There is deliberately no dev/prod detection here yet. REBUILD_PLAN.md step 9
// (deploy) is where the production API host gets decided; until then a single
// constant is the whole config layer.
//
// ⚠️ Update this before deploying to GitHub Pages — and make sure the deployed
// origin is listed in the backend's ALLOWED_ORIGINS env var, or every request
// will fail CORS preflight.

export const API_BASE = "http://localhost:8000";
