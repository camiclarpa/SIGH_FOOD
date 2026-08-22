'use client';

/**
 * ============================================================================
 * Cuestionario de paladar
 * ============================================================================
 *
 * Tres preguntas para quien nunca ha probado esto y se queda paralizado ante
 * cinco nombres que no le dicen nada. Compite contra "leer el catálogo entero",
 * así que tiene que ser más rápido que eso — de ahí que no haya botón de
 * siguiente: se toca una opción y avanza.
 *
 * Se puede saltar en cualquier momento y sin coste. Quien ya sabe lo que
 * quiere no debería tener que pasar por aquí.
 *
 * El resultado se guarda en el navegador y se manda al servidor cuando la
 * persona pide, no antes: preguntarle el gusto a alguien y mandarlo a un
 * servidor sin que haya comprado nada es recoger datos sin motivo.
 */

import Link from 'next/link';
import { useState } from 'react';
import { PREGUNTAS, recomendar, type Perfil } from '@/lib/paladar';
import { escribir } from '@/lib/almacen';

export const ALMACEN_PALADAR = 'bocazo:paladar:v1';

interface ConoMinimo {
  slug: string;
  nombre: string;
  gancho: string | null;
  familia: string | null;
  intensidad: number;
  disponible: boolean;
}

export default function Paladar({
  conos,
  alCerrar,
}: {
  conos: ConoMinimo[];
  alCerrar: () => void;
}) {
  const [paso, setPaso] = useState(0);
  const [perfil, setPerfil] = useState<Perfil>({});

  const pregunta = PREGUNTAS[paso];
  const terminado = paso >= PREGUNTAS.length;

  function responder(valor: string) {
    const siguiente = { ...perfil, [pregunta.id]: valor };
    setPerfil(siguiente);
    setPaso((p) => p + 1);

    // Al terminar se guarda, para que el checkout pueda mandarlo con el pedido
    // y para no volver a preguntar en la siguiente visita.
    if (paso + 1 >= PREGUNTAS.length) escribir(ALMACEN_PALADAR, siguiente);
  }

  if (terminado) {
    const r = recomendar(perfil, conos);
    const cono = r ? conos.find((c) => c.slug === r.slug) : null;

    return (
      <section className="rounded-2xl border border-[#d97325]/40 bg-gradient-to-br from-[#d97325]/12 to-transparent p-6 text-center">
        {cono ? (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#d97325]">
              Empieza por este
            </p>
            <h2 className="font-display mt-3 text-2xl font-bold text-[#f5f1ea]">{cono.nombre}</h2>
            {cono.gancho && <p className="mt-1 text-[#c9bfb2]">{cono.gancho}</p>}
            <p className="mt-3 text-sm text-[#8f8479]">{r!.motivo}</p>

            <Link
              href={`/producto/${cono.slug}`}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#d97325] px-8 font-semibold text-[#12100e]"
            >
              Verlo
            </Link>
          </>
        ) : (
          /* Sin recomendación posible —todo agotado— no se finge una: se dice y
             se manda al catálogo, que al menos enseña lo que sí hay. */
          <p className="text-[#c9bfb2]">
            Ahora mismo no tenemos nada que encaje. Mira el catálogo completo.
          </p>
        )}

        <button
          type="button"
          onClick={alCerrar}
          className="mt-4 w-full text-sm text-[#8f8479] underline underline-offset-4"
        >
          Ver los cinco de todas formas
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#1c1812] p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8f8479]">
          {paso + 1} de {PREGUNTAS.length}
        </p>
        <button
          type="button"
          onClick={alCerrar}
          className="text-sm text-[#8f8479] underline underline-offset-4"
        >
          Saltar
        </button>
      </div>

      <h2 className="font-display mt-4 text-xl font-bold text-[#f5f1ea]">{pregunta.texto}</h2>

      <div className="mt-5 space-y-2">
        {pregunta.opciones.map((o) => (
          <button
            key={o.valor}
            type="button"
            onClick={() => responder(o.valor)}
            className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-white/12 px-4 text-left text-[#f5f1ea] transition-colors active:border-[#d97325] active:bg-[#d97325]/12"
          >
            <span aria-hidden className="text-2xl">
              {o.emoji}
            </span>
            {o.etiqueta}
          </button>
        ))}
      </div>

      {/* Barra de avance: tres preguntas se sienten pocas si se ve el final. */}
      <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#d97325] transition-[width] duration-300"
          style={{ width: `${(paso / PREGUNTAS.length) * 100}%` }}
        />
      </div>
    </section>
  );
}
