-- Create table for fiscal receipts
CREATE TABLE IF NOT EXISTS public.fiscal_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT,
  amount INTEGER NOT NULL, -- Amount in kopecks
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'fiscal', 'error')),
  fiscal_document_number TEXT,
  fiscal_document_attribute TEXT,
  ofd_receipt_url TEXT,
  orange_data_response JSONB,
  items JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fiscal_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.fiscal_receipts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own receipts" 
ON public.fiscal_receipts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service can manage all receipts" 
ON public.fiscal_receipts 
FOR ALL 
USING (true);

-- Create indexes
CREATE INDEX idx_fiscal_receipts_user_id ON public.fiscal_receipts(user_id);
CREATE INDEX idx_fiscal_receipts_status ON public.fiscal_receipts(status);
CREATE INDEX idx_fiscal_receipts_receipt_id ON public.fiscal_receipts(receipt_id);
CREATE INDEX idx_fiscal_receipts_created_at ON public.fiscal_receipts(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_fiscal_receipts_updated_at
  BEFORE UPDATE ON public.fiscal_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();