import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from './lib/supabase';
import { AlertCircle, ArrowDownRight, ArrowUpRight, CircleDollarSign, LogOut, Plus, ReceiptText, TrendingUp, X } from 'lucide-react';

type Sale = { id: string; user_id: string; customer_name: string; description: string; amount: number; status: 'pagada' | 'pendiente' | 'reembolsada'; sold_at: string; created_at: string };
type SaleDraft = { customer_name: string; description: string; amount: string; status: Sale['status']; sold_at: string };
const emptyDraft = (): SaleDraft => ({ customer_name: '', description: '', amount: '', status: 'pagada', sold_at: new Date().toISOString().slice(0, 10) });
const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0);
const dateLabel = (value: string) => new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`));

export default function App() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [sessionReady, setSessionReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [draft, setDraft] = useState<SaleDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUserId(data.session?.user.id ?? null); setSessionReady(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadSales() {
    setLoading(true); setLoadError('');
    const { data, error } = await supabase.from('sales').select('*').order('sold_at', { ascending: false });
    if (error) { setLoadError('Los datos todavía no están disponibles. Verifica que la tabla de ventas esté creada y que tu cuenta tenga acceso.'); setSales([]); }
    else setSales((data ?? []) as Sale[]);
    setLoading(false);
  }

  useEffect(() => { if (userId) void loadSales(); else setSales([]); }, [userId]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthBusy(true); setAuthMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthBusy(false);
    if (error) setAuthMessage('No se pudo iniciar sesión. Revisa tu correo y contraseña e inténtalo de nuevo.');
  }
  async function signUp() {
    if (!email || password.length < 6) { setAuthMessage('Escribe tu correo y una contraseña de al menos 6 caracteres.'); return; }
    setAuthBusy(true); setAuthMessage('');
    const { error } = await supabase.auth.signUp({ email, password });
    setAuthBusy(false);
    setAuthMessage(error ? 'No se pudo crear la cuenta. Revisa los datos e inténtalo de nuevo.' : 'Cuenta creada. Revisa tu correo para confirmar el registro y luego inicia sesión.');
  }
  async function signOut() { await supabase.auth.signOut(); }

  function openCreate() { setEditing(null); setDraft(emptyDraft()); setModal(true); setNotice(''); }
  function openEdit(sale: Sale) { setEditing(sale); setDraft({ customer_name: sale.customer_name, description: sale.description, amount: String(sale.amount), status: sale.status, sold_at: sale.sold_at.slice(0, 10) }); setModal(true); setNotice(''); }
  async function saveSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) { setNotice('Ingresa un importe mayor que cero.'); return; }
    setSaving(true); setNotice('');
    const payload = { customer_name: draft.customer_name.trim(), description: draft.description.trim(), amount, status: draft.status, sold_at: draft.sold_at, user_id: userId };
    const result = editing ? await supabase.from('sales').update(payload).eq('id', editing.id).select().single() : await supabase.from('sales').insert(payload).select().single();
    setSaving(false);
    if (result.error) { setNotice('No se pudo guardar la venta. Comprueba los datos y vuelve a intentarlo.'); return; }
    setModal(false); setNotice(editing ? 'Venta actualizada.' : 'Venta registrada.'); await loadSales();
  }

  const stats = useMemo(() => {
    const paid = sales.filter(s => s.status === 'pagada').reduce((sum, s) => sum + Number(s.amount), 0);
    const pending = sales.filter(s => s.status === 'pendiente').reduce((sum, s) => sum + Number(s.amount), 0);
    return { paid, pending, count: sales.length, average: sales.length ? sales.reduce((sum, s) => sum + Number(s.amount), 0) / sales.length : 0 };
  }, [sales]);

  if (!sessionReady) return <main className="min-h-screen grid place-items-center bg-[var(--bg)]"><p className="text-[var(--muted)]">Cargando panel…</p></main>;
  if (!userId) return <main className="min-h-screen bg-[var(--bg)] px-5 py-10 flex items-center justify-center"><div className="w-full max-w-md rounded-3xl bg-[var(--surface)] p-8 shadow-xl shadow-slate-900/5 border border-[var(--border)]"><div className="mb-8 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--primary)] text-white"><CircleDollarSign size={26}/></div><div><p className="text-sm font-semibold uppercase tracking-[.14em] text-[var(--primary)]">Panel de ventas</p><h1 className="text-2xl font-bold text-[var(--text)]">Inicia sesión</h1></div></div><form onSubmit={handleAuth} className="space-y-5"><div><label htmlFor="email" className="mb-2 block font-medium text-[var(--text)]">Correo electrónico</label><input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"/></div><div><label htmlFor="password" className="mb-2 block font-medium text-[var(--text)]">Contraseña</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"/></div>{authMessage && <p role="status" className="text-sm text-[var(--primary)]">{authMessage}</p>}<button disabled={authBusy} className="h-12 w-full rounded-xl bg-[var(--primary)] font-semibold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">{authBusy ? 'Procesando…' : 'Entrar'}</button><button type="button" disabled={authBusy} onClick={signUp} className="h-12 w-full rounded-xl border border-[var(--border)] font-semibold text-[var(--text)] hover:bg-[var(--bg)] disabled:opacity-60">Crear cuenta</button></form><p className="mt-6 text-sm leading-6 text-[var(--muted)]">Tus ventas se guardan de forma privada en Supabase y solo tú puedes verlas.</p></div></main>;

  return <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]"><header className="border-b border-[var(--border)] bg-[var(--surface)]"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--primary)] text-white"><ReceiptText size={23}/></div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--primary)]">Control comercial</p><h1 className="text-2xl font-bold">Panel de ventas</h1></div></div><div className="flex items-center gap-3"><span className="hidden max-w-52 truncate text-sm text-[var(--muted)] sm:block" title={email}>{email}</span><button onClick={signOut} className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 font-medium hover:bg-[var(--bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"><LogOut size={18}/>Salir</button></div></div></header><div className="mx-auto max-w-6xl px-5 py-8 sm:py-10"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-sm font-semibold text-[var(--muted)]">RESUMEN</p><h2 className="text-3xl font-bold tracking-tight">Tu negocio, de un vistazo</h2><p className="mt-2 max-w-2xl leading-6 text-[var(--muted)]">Revisa ingresos, pagos pendientes y el historial de ventas.</p></div><button onClick={openCreate} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 font-semibold text-white shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><Plus size={20}/>Registrar venta</button></div>{notice && <p role="status" className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)]">{notice}</p>}
    {loadError && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"><span className="flex items-center gap-2"><AlertCircle size={20}/>{loadError}</span><button onClick={() => void loadSales()} className="min-h-11 rounded-lg border border-amber-700 px-4 font-semibold">Reintentar</button></div>}
    <section aria-label="Resumen de ventas" className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{label:'Ingresos cobrados',value:money(stats.paid),icon:ArrowUpRight,detail:'Ventas pagadas'},{label:'Por cobrar',value:money(stats.pending),icon:ArrowDownRight,detail:'Ventas pendientes'},{label:'Ventas registradas',value:String(stats.count),icon:ReceiptText,detail:'Todos los estados'},{label:'Promedio por venta',value:money(stats.average),icon:TrendingUp,detail:'Importe promedio'}].map(card => <article key={card.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-center justify-between gap-3"><p className="font-medium text-[var(--muted)]">{card.label}</p><card.icon size={20} className="shrink-0 text-[var(--primary)]"/></div><p className="mt-4 break-words text-2xl font-bold tracking-tight">{card.value}</p><p className="mt-1 text-sm text-[var(--muted)]">{card.detail}</p></article>)}</section>
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-5"><div><h3 className="text-xl font-bold">Ventas recientes</h3><p className="mt-1 text-sm text-[var(--muted)]">Consulta y actualiza tus registros.</p></div><button onClick={() => void loadSales()} disabled={loading} className="min-h-11 rounded-xl border border-[var(--border)] px-4 font-medium hover:bg-[var(--bg)] disabled:opacity-60">{loading ? 'Actualizando…' : 'Actualizar'}</button></div>{loading && sales.length === 0 ? <div className="space-y-3 p-5" aria-label="Cargando ventas"><div className="h-12 animate-pulse rounded-lg bg-[var(--bg)]"/><div className="h-12 animate-pulse rounded-lg bg-[var(--bg)]"/><div className="h-12 animate-pulse rounded-lg bg-[var(--bg)]"/></div> : sales.length === 0 ? <div className="px-6 py-14 text-center"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--bg)] text-[var(--primary)]"><ReceiptText size={27}/></div><h4 className="text-lg font-semibold">Aún no hay ventas</h4><p className="mx-auto mt-2 max-w-md leading-6 text-[var(--muted)]">Registra tu primera venta para empezar a ver aquí tus ingresos y pagos pendientes.</p><button onClick={openCreate} className="mt-5 min-h-11 rounded-xl bg-[var(--primary)] px-5 font-semibold text-white">Registrar primera venta</button></div> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr className="bg-[var(--bg)] text-sm text-[var(--muted)]"><th className="px-5 py-3 font-semibold">Cliente</th><th className="px-5 py-3 font-semibold">Concepto</th><th className="px-5 py-3 font-semibold">Fecha</th><th className="px-5 py-3 font-semibold">Estado</th><th className="px-5 py-3 text-right font-semibold">Importe</th><th className="px-5 py-3"><span className="sr-only">Acciones</span></th></tr></thead><tbody>{sales.map(sale => <tr key={sale.id} className="border-t border-[var(--border)]"><td className="max-w-52 truncate px-5 py-4 font-medium" title={sale.customer_name}>{sale.customer_name}</td><td className="max-w-64 truncate px-5 py-4 text-[var(--muted)]" title={sale.description}>{sale.description}</td><td className="whitespace-nowrap px-5 py-4 text-[var(--muted)]">{dateLabel(sale.sold_at)}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${sale.status === 'pagada' ? 'bg-emerald-100 text-emerald-900' : sale.status === 'pendiente' ? 'bg-amber-100 text-amber-950' : 'bg-rose-100 text-rose-900'}`}>{sale.status === 'pagada' ? 'Pagada' : sale.status === 'pendiente' ? 'Pendiente' : 'Reembolsada'}</span></td><td className="whitespace-nowrap px-5 py-4 text-right font-semibold">{money(Number(sale.amount))}</td><td className="px-5 py-4"><button onClick={() => openEdit(sale)} className="min-h-10 rounded-lg px-3 font-semibold text-[var(--primary)] hover:bg-[var(--bg)] focus-visible:outline focus-visible:outline-2">Editar</button></td></tr>)}</tbody></table></div>}</section><p className="mt-5 text-sm text-[var(--muted)]">Importes en pesos mexicanos (MXN).</p></div>
    {modal && <div className="fixed inset-0 z-20 grid place-items-center overflow-y-auto bg-slate-950/50 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="sale-modal-title" className="my-auto w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="sale-modal-title" className="text-2xl font-bold">{editing ? 'Editar venta' : 'Registrar venta'}</h2><p className="mt-1 text-[var(--muted)]">Completa los datos de la operación.</p></div><button onClick={() => setModal(false)} aria-label="Cerrar" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-[var(--bg)] focus-visible:outline focus-visible:outline-2"><X size={20}/></button></div><form onSubmit={saveSale} className="space-y-4"><div><label htmlFor="customer" className="mb-1.5 block font-medium">Cliente</label><input id="customer" required maxLength={120} value={draft.customer_name} onChange={e => setDraft({...draft, customer_name:e.target.value})} className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"/></div><div><label htmlFor="description" className="mb-1.5 block font-medium">Concepto</label><input id="description" required maxLength={180} value={draft.description} onChange={e => setDraft({...draft, description:e.target.value})} className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"/></div><div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="amount" className="mb-1.5 block font-medium">Importe (MXN)</label><input id="amount" type="number" min="0.01" step="0.01" required value={draft.amount} onChange={e => setDraft({...draft, amount:e.target.value})} className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"/></div><div><label htmlFor="sold-at" className="mb-1.5 block font-medium">Fecha</label><input id="sold-at" type="date" required value={draft.sold_at} onChange={e => setDraft({...draft, sold_at:e.target.value})} className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"/></div></div><div><label htmlFor="status" className="mb-1.5 block font-medium">Estado</label><select id="status" value={draft.status} onChange={e => setDraft({...draft, status:e.target.value as Sale['status']})} className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"><option value="pagada">Pagada</option><option value="pendiente">Pendiente</option><option value="reembolsada">Reembolsada</option></select></div>{notice && <p role="alert" className="text-sm text-rose-800">{notice}</p>}<button disabled={saving} className="min-h-12 w-full rounded-xl bg-[var(--primary)] px-5 font-semibold text-white disabled:opacity-60">{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar venta'}</button></form></section></div>}
  </main>;
}
