CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name text NOT NULL CHECK (char_length(customer_name) BETWEEN 1 AND 120),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 180),
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pagada' CHECK (status IN ('pagada', 'pendiente', 'reembolsada')),
  sold_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.sales TO authenticated;
CREATE POLICY "Users can read their own sales" ON public.sales
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add their own sales" ON public.sales
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sales" ON public.sales
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
