-- Add cost_price column to products for margin tracking
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT NULL;
