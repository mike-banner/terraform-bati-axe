-- =====================================================
-- KPI Engine — tables + views for dashboard analytics
-- =====================================================

-- 1. Track marketing spend (manual entry by admin)
CREATE TABLE IF NOT EXISTS marketing_spend_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_code VARCHAR(10) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    channel TEXT NOT NULL, -- 'facebook_ads', 'flyers', 'linkedin', etc.
    description TEXT,
    logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 2. KPI snapshots (batch-computed daily by cron or on-demand)
CREATE TABLE IF NOT EXISTS kpi_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_code VARCHAR(10) NOT NULL DEFAULT 'all',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    -- Economic
    cac NUMERIC(10,2),
    ltv NUMERIC(10,2),
    ltv_cac_ratio NUMERIC(5,2),
    churn_rate NUMERIC(5,2),
    -- Marketplace
    matching_rate NUMERIC(5,2),
    retention_rate NUMERIC(5,2),
    -- Network
    supplier_activation_rate NUMERIC(5,2),
    -- Raw counts
    new_paid_artisans INTEGER DEFAULT 0,
    total_paid_artisans INTEGER DEFAULT 0,
    canceled_artisans INTEGER DEFAULT 0,
    total_projects INTEGER DEFAULT 0,
    matched_projects INTEGER DEFAULT 0,
    total_marketing_spend NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 3. View: Matching rate 48h (projects with ≥3 leads within 48h)
CREATE OR REPLACE VIEW view_kpi_matching_48h AS
WITH project_lead_counts AS (
    SELECT
        p.id AS project_id,
        p.created_at AS project_created_at,
        COUNT(l.id) FILTER (
            WHERE l.created_at <= p.created_at + INTERVAL '48 hours'
        ) AS leads_within_48h
    FROM projects p
    LEFT JOIN leads l ON p.id = l.project_id
    WHERE p.status != 'closed'
    GROUP BY p.id, p.created_at
)
SELECT
    COUNT(*) AS total_projects,
    COUNT(*) FILTER (WHERE leads_within_48h >= 3) AS matched_projects,
    ROUND(
        (COUNT(*) FILTER (WHERE leads_within_48h >= 3)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2
    ) AS matching_rate_pct
FROM project_lead_counts;

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketing_spend_date ON marketing_spend_logs(logged_date);
CREATE INDEX IF NOT EXISTS idx_marketing_spend_dept ON marketing_spend_logs(department_code);
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_period ON kpi_snapshots(period_start, period_end);

-- 5. RLS: admin-only access
ALTER TABLE marketing_spend_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only_marketing" ON marketing_spend_logs
    FOR ALL USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "admin_only_kpi" ON kpi_snapshots
    FOR ALL USING (auth.jwt()->>'role' = 'admin');
