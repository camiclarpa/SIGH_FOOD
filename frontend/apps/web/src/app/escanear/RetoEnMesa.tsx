'use client';

// =============================================================================
// Desafío en mesa
// =============================================================================
//
// Aparece después de registrar el momento, no antes: primero se le confirma al
// comensal que ganó sus puntos —que es a lo que vino— y solo entonces se le
// ofrece algo más. Puesto antes, el desafío sería un peaje entre él y su
// recompensa, y la mitad abandonaría el formulario.
//
// Se puede saltar en cualquier momento y sin penalización. Es una propuesta,
// no un trámite.

import { useEffect, useState } from 'react';

interface Desafio {
  id: string;
  titulo: string;
  descripcion: string | null;
  puntosPremio: number;
  premioDescripcion: string | null;
  preguntas: Array<{ pregunta: string; opciones: string[] }>;
}

interface Resultado {
  acertadas: number | null;
  total: number;
  puntosGanados: number;
  premioDescripcion: string | null;
  solucion: Array<{ correcta: number | null; elegida: number }>;
  repetida: boolean;
}

type Fase =
  | { fase: 'buscando' }
  | { fase: 'nada' }
  | { fase: 'ofrecido'; desafio: Desafio }
  | { fase: 'jugando'; desafio: Desafio; elegidas: Array<number | null>; enviando: boolean; error: string | null }
  | { fase: 'hecho'; desafio: Desafio; resultado: Resultado };

export function RetoEnMesa({
  consumerId,
  accountId,
  lineaProducto,
}: {
  consumerId: string;
  accountId: string | null;
  lineaProducto: string | null;
}) {
  const [estado, setEstado] = useState<Fase>({ fase: 'buscando' });
  // Sirve para medir cuánto tarda en responder, que alimenta las dinámicas
  // "express". Se marca al empezar a jugar, no al cargar la pantalla.
  const [empezado, setEmpezado] = useState<number | null>(null);

  useEffect(() => {
    let vigente = true;

    const params = new URLSearchParams({ consumer_id: consumerId });
    if (lineaProducto) params.set('product_line', lineaProducto);

    fetch(`/api/challenges?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (!vigente) return;
        const desafio = d?.data?.desafio as Desafio | null | undefined;
        setEstado(desafio ? { fase: 'ofrecido', desafio } : { fase: 'nada' });
      })
      // Que no haya desafío es lo normal; que falle la consulta no debe
      // estropear una pantalla que acaba de celebrar puntos.
      .catch(() => { if (vigente) setEstado({ fase: 'nada' }); });

    // El comensal puede cerrar la pantalla en cualquier momento: sin esto, la
    // respuesta tardía intentaría pintar sobre un componente ya desmontado.
    return () => { vigente = false; };
  }, [consumerId, lineaProducto]);

  async function enviar() {
    if (estado.fase !== 'jugando') return;
    const elegidas = estado.elegidas;
    if (elegidas.some((e) => e === null)) {
      setEstado({ ...estado, error: 'Te falta alguna pregunta por responder' });
      return;
    }

    setEstado({ ...estado, enviando: true, error: null });

    try {
      const r = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          challenge_id: estado.desafio.id,
          consumer_id: consumerId,
          ...(accountId ? { account_id: accountId } : {}),
          elegidas,
          ...(empezado ? { segundos: Math.round((Date.now() - empezado) / 1000) } : {}),
        }),
      });
      const d = await r.json();

      if (!r.ok || !d.success) {
        setEstado({ ...estado, enviando: false, error: d.error ?? 'No pudimos registrar tu respuesta' });
        return;
      }

      setEstado({ fase: 'hecho', desafio: estado.desafio, resultado: d.data as Resultado });
    } catch {
      setEstado({ ...estado, enviando: false, error: 'Sin conexión. Inténtalo otra vez.' });
    }
  }

  // --- Nada que ofrecer ------------------------------------------------------
  // Sin desafío no se pinta nada: un hueco que diga "no hay desafíos" solo
  // ocupa sitio en una pantalla que se ve de pie.
  if (estado.fase === 'buscando' || estado.fase === 'nada') return null;

  // --- Resultado -------------------------------------------------------------
  if (estado.fase === 'hecho') {
    const { resultado: r } = estado;
    return (
      <section className="mt-8 rounded-xl border border-orange-500/40 bg-orange-500/5 p-5 text-center">
        <h3 className="text-lg font-semibold">{estado.desafio.titulo}</h3>

        {r.repetida ? (
          <p className="texto-suave mt-2 text-sm">
            Ya habías respondido este desafío, así que los puntos no se cuentan otra vez.
          </p>
        ) : (
          <>
            <p className="cifras mt-3 text-4xl font-bold text-orange-500">+{r.puntosGanados}</p>
            <p className="texto-suave text-sm">puntos ganados</p>
          </>
        )}

        {r.acertadas !== null && (
          <p className="mt-3 text-sm">
            Acertaste {r.acertadas} de {r.total}.
          </p>
        )}

        {/* La solución se enseña ahora, no antes: es la parte divertida y la
            única que justifica haber respondido. */}
        <ul className="mt-4 space-y-2 text-left">
          {estado.desafio.preguntas.map((p, i) => {
            const s = r.solucion[i];
            const acerto = s?.correcta === null || s?.correcta === s?.elegida;
            return (
              <li key={i} className="text-xs">
                <p className="font-medium">{p.pregunta}</p>
                <p className={acerto ? 'text-green-500' : 'text-red-400'}>
                  {acerto ? '✓' : '✗'} {p.opciones[s?.elegida ?? 0]}
                  {!acerto && s?.correcta !== null && s?.correcta !== undefined && (
                    <span className="texto-suave"> · era: {p.opciones[s.correcta]}</span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>

        {r.premioDescripcion && !r.repetida && (
          <p className="mt-4 rounded-lg border border-orange-500/50 bg-orange-500/10 px-3 py-2 text-sm">
            Enséñale esto a tu mesero: <strong>{r.premioDescripcion}</strong>
          </p>
        )}
      </section>
    );
  }

  // --- Invitación ------------------------------------------------------------
  if (estado.fase === 'ofrecido') {
    const d = estado.desafio;
    return (
      <section className="mt-8 rounded-xl border border-orange-500/40 bg-orange-500/5 p-5 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">
          Desafío en tu mesa
        </p>
        <h3 className="mt-2 text-lg font-semibold">{d.titulo}</h3>
        {d.descripcion && <p className="texto-suave mt-1 text-sm">{d.descripcion}</p>}

        <p className="texto-suave mt-3 text-sm">
          {d.preguntas.length} pregunta{d.preguntas.length === 1 ? '' : 's'}
          {d.puntosPremio > 0 && ` · hasta ${d.puntosPremio} puntos`}
          {d.premioDescripcion && ` · ${d.premioDescripcion}`}
        </p>

        <button
          type="button"
          onClick={() => {
            setEmpezado(Date.now());
            setEstado({
              fase: 'jugando',
              desafio: d,
              elegidas: d.preguntas.map(() => null),
              enviando: false,
              error: null,
            });
          }}
          className="mt-4 w-full rounded-lg bg-orange-600 px-4 py-3 font-medium text-white hover:bg-orange-500"
        >
          Jugar
        </button>
        <button
          type="button"
          onClick={() => setEstado({ fase: 'nada' })}
          className="texto-suave mt-2 text-xs hover:underline"
        >
          Ahora no
        </button>
      </section>
    );
  }

  // --- Jugando ---------------------------------------------------------------
  const d = estado.desafio;
  return (
    <section className="mt-8 rounded-xl border border-orange-500/40 bg-orange-500/5 p-5">
      <h3 className="text-center text-lg font-semibold">{d.titulo}</h3>

      <ol className="mt-4 space-y-5">
        {d.preguntas.map((p, i) => (
          <li key={i}>
            <p className="text-sm font-medium">
              {i + 1}. {p.pregunta}
            </p>
            <div className="mt-2 space-y-1.5">
              {p.opciones.map((o, j) => {
                const elegida = estado.elegidas[i] === j;
                return (
                  <label
                    key={j}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
                      elegida
                        ? 'border-orange-500 bg-orange-500/15'
                        : 'borde-tema superficie'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`p${i}`}
                      checked={elegida}
                      onChange={() => {
                        const copia = [...estado.elegidas];
                        copia[i] = j;
                        setEstado({ ...estado, elegidas: copia, error: null });
                      }}
                      // Los objetivos táctiles grandes son toda la etiqueta: en
                      // la mesa se responde con el pulgar y sin mirar mucho.
                      className="h-4 w-4 shrink-0 accent-orange-600"
                    />
                    <span>{o}</span>
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      {estado.error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-950/40 px-3 py-2 text-center text-sm text-red-200">
          {estado.error}
        </p>
      )}

      <button
        type="button"
        onClick={enviar}
        disabled={estado.enviando}
        className="mt-5 w-full rounded-lg bg-orange-600 px-4 py-3 font-medium text-white hover:bg-orange-500 disabled:opacity-50"
      >
        {estado.enviando ? 'Enviando…' : 'Enviar respuestas'}
      </button>
    </section>
  );
}
