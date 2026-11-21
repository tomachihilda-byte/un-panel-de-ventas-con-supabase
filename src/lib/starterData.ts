import { supabase } from './supabase';

export interface StarterProfile { id: string; display_name: string | null }
export interface StarterRow { id: string; title: string; is_example: boolean }

export async function loadStarterProfile(): Promise<StarterProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('id, display_name').eq('id', user.id).maybeSingle();
  return data;
}

export async function loadExampleRows(): Promise<StarterRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const gate = await supabase.from('cosmos_starter_seed').select('open').eq('id', true).maybeSingle();
  const shown = (row: { id?: string; is_example?: boolean } & Record<string, unknown>): StarterRow | null => {
    if (!row || typeof row.id !== 'string') return null;
    const value = row["title"];
    return { id: row.id, title: typeof value === 'string' ? value : '', is_example: row.is_example === true };
  };
  const read = () => supabase.from('items').select('*').eq('is_example', true).order('created_at', { ascending: false });
  const current = await read();
  const existing = (current.data ?? []).map(shown).filter((row): row is StarterRow => row !== null);
  if (gate.data?.open === false || existing.length > 0) return existing;
  const created = await supabase.from('items').insert([
    { user_id: user.id, title: 'Ejemplo 1', is_example: true },
    { user_id: user.id, title: 'Ejemplo 2', is_example: true },
    { user_id: user.id, title: 'Ejemplo 3', is_example: true },
    { user_id: user.id, title: 'Ejemplo 4', is_example: true },
  ]).select('*');
  if (created.data && created.data.length > 0) return created.data.map(shown).filter((row): row is StarterRow => row !== null);
  const again = await read();
  return (again.data ?? []).map(shown).filter((row): row is StarterRow => row !== null);
}

/** The app's own screens call this before they read, so the rows exist on the first paint after sign-in. Other tables are left alone. */
export async function ensureExampleRows(table: string): Promise<void> {
  if (table !== 'items') return;
  try { await loadExampleRows(); } catch { /* a failed seed must not hide the screen's own read */ }
}
