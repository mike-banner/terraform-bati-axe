-- Add access_token to projects for Magic Link access
ALTER TABLE public.projects 
ADD COLUMN access_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Create messages table for Asynchronous Chat
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    is_pro_sender BOOLEAN NOT NULL DEFAULT true,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE
);

-- RLS Configuration for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Pro can read messages for their own leads
CREATE POLICY "Pros can view messages for their leads" 
ON public.messages 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.leads l 
        WHERE l.id = messages.lead_id 
        AND l.pro_id = auth.uid()
    )
);

-- Pro can insert messages for their own leads (backend handles validation of unlock status)
CREATE POLICY "Pros can insert messages for their leads" 
ON public.messages 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.leads l 
        WHERE l.id = messages.lead_id 
        AND l.pro_id = auth.uid()
    )
);

-- Customers will read and write messages via secure Nitro API, which bypasses RLS (using service_role key), 
-- so no direct public policies are needed for customers.
