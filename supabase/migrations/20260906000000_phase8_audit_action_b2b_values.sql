-- Phase 8 — audit_action manquait les valeurs B2B, insert silencieusement
-- avalé par le try/catch non-bloquant (diffuse.post.ts, restitution.post.ts).
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'b2b_tender_diffused';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'b2b_restitution_sent';
