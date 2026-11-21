import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { loadExampleRows, type StarterRow } from '../lib/starterData';

export default function ExampleRows() {
  const [rows, setRows] = useState<StarterRow[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!live) return;
      if (!data.session) { setReady(true); return; }
      setSignedIn(true);
      loadExampleRows().then(next => { if (live) { setRows(next); setReady(true); } });
    });
    return () => { live = false; };
  }, []);
  if (!ready) return null;
  if (!signedIn) return <p>Entra con una cuenta de prueba para ver los datos de ejemplo.</p>;
  if (!rows.length) return <p>No hay filas de ejemplo.</p>;
  return <ul>{rows.map(row => <li key={row.id}>{row.title}</li>)}</ul>;
}
