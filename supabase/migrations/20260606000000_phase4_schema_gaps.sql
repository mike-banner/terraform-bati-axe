-- Supabase Migration: Phase 4 — Schema Gaps
-- Date: 2026-06-06

-- Add 'claimed' status to lead_status ENUM (used when a professional pays to unlock a lead)
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'claimed';

-- Add timeline_range to projects (required for BASIC lead display: D-05, D-17)
-- Values: '1_semaine', '1_mois', '3_mois', '6_mois', 'flexible'
ALTER TABLE projects ADD COLUMN IF NOT EXISTS timeline_range TEXT;
