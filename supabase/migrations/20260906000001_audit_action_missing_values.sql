-- Même bug de classe que 20260906000000 : ces deux valeurs sont utilisées par
-- des inserts audit_logs existants (Phase 5.10/5.11) mais n'ont jamais été
-- ajoutées à l'enum audit_action — insert avalé silencieusement par un
-- try/catch non-bloquant, aucune trace d'audit écrite.
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'b2b_request_updated';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'document_artisan_updated';
