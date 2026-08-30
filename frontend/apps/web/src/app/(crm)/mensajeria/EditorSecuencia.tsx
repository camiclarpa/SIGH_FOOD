'use client';

// =============================================================================
// Editor de secuencias con vista previa real
// =============================================================================
//
// La vista previa usa un comensal de verdad, no valores de relleno: es la única
// forma de ver que "{{bar}}" acaba diciendo "Bar La Esquina" y no un hueco.
//
// Y hay dos plantillas, no una. El texto de arriba es el del CRM, con
// {{nombre}} y {{puntos}}; es lo que se ve en la previa y lo que se manda dentro
// de la ventana de 24 h. Fuera de ella WhatsApp solo entrega una plantilla
// aprobada en Meta, con huecos NUMERADOS. Por eso el editor pide su nombre y en
// qué orden van sus huecos: sin eso, la campaña se guarda y no envía nada.

import { useRef, useState, useTransition } from 'react';
import { guardarSecuencia, previsualizar } from '@/lib/acciones/campanas';
import { enviarPrueba } from '@/lib/acciones/whatsapp';
import { VARIABLES } from '@/lib/plantillas';

interface Secuencia {
  id: string;
  name: string;
  trigger: string;
  channel: string;
  template: string;
  delayHours: number;
  targetSegment: string | null;
  metaTemplateName?: string | null;
  metaTemplateLang?: string | null;
  metaTemplateVars?: string[] | null;
}

const DISPARADORES = [
  { valor: 'signup', texto: 'Al registrarse' },
  { valor: 'first_purchase', texto: 'Tras el primer pedido entregado' },
  // Distinto de "first_purchase": este es al ESCANEAR, no al comprar. Puede
  // pasar en un bar o desde una bolsa comprada, sin que haya pedido de por medio.
  { valor: 'first_scan', texto: 'Al primer escaneo del QR' },
  { valor: 'inactive_30_days', texto: 'Sin comprar hace 30 días' },
  { valor: 'inactive_21_days', texto: 'Sin escanear hace 21 días' },
  { valor: 'churn_risk', texto: 'Riesgo de abandono' },
  { valor: 'birthday', texto: 'Cumpleaños' },
  { valor: 'referral_conversion', texto: 'Referido convertido' },
  { valor: 'abandoned_cart', texto: 'Flujo abandonado' },
];

const CANALES = [
  { valor: 'whatsapp', texto: 'WhatsApp' },
  { valor: 'email', texto: 'Email' },
  { valor: 'sms', texto: 'SMS' },
  { valor: 'push', texto: 'Push' },
];

export function EditorSecuencia({
  secuencia,
  puedeProbar = false,
}: {
  secuencia?: Secuencia;
  /** Enviar de verdad gasta una conversación de Meta: lo cubre campanas.activar. */
  puedeProbar?: boolean;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const areaTexto = useRef<HTMLTextAreaElement>(null);

  const [plantilla, setPlantilla] = useState(secuencia?.template ?? '');
  const [canal, setCanal] = useState(secuencia?.channel ?? 'whatsapp');
  const [huecos, setHuecos] = useState<string[]>(secuencia?.metaTemplateVars ?? []);
  const [telPrueba, setTelPrueba] = useState('');
  const [prueba, setPrueba] = useState<{ ok: boolean; texto: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<{ mensaje: string; comensal: string; avisos: string[] } | null>(null);
  const [enCurso, iniciar] = useTransition();

  const editando = Boolean(secuencia);
  const esWhatsApp = canal === 'whatsapp';

  /** Inserta la variable donde está el cursor, no al final. */
  function insertar(clave: string) {
    const area = areaTexto.current;
    if (!area) return;
    const marca = `{{${clave}}}`;
    const antes = plantilla.slice(0, area.selectionStart);
    const despues = plantilla.slice(area.selectionEnd);
    setPlantilla(antes + marca + despues);
    // Devolver el foco y colocar el cursor tras la variable evita tener que
    // volver a hacer clic para seguir escribiendo.
    queueMicrotask(() => {
      area.focus();
      const pos = antes.length + marca.length;
      area.setSelectionRange(pos, pos);
    });
  }

  function verPrevia() {
    iniciar(async () => {
      const r = await previsualizar({ plantilla });
      if (r.ok && r.datos) { setVista(r.datos); setError(null); }
      else setError(r.error ?? 'No se pudo previsualizar');
    });
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    iniciar(async () => {
      const r = await guardarSecuencia({
        id: secuencia?.id,
        name: String(f.get('name') ?? ''),
        trigger: String(f.get('trigger') ?? 'signup'),
        channel: canal,
        template: plantilla,
        delayHours: Number(f.get('delayHours') ?? 0),
        targetSegment: String(f.get('targetSegment') ?? '') || null,
        metaTemplateName: esWhatsApp ? String(f.get('metaTemplateName') ?? '') || null : null,
        metaTemplateLang: esWhatsApp ? String(f.get('metaTemplateLang') ?? '') || null : null,
        metaTemplateVars: esWhatsApp ? huecos : null,
      });
      if (r.ok) { setError(null); setVista(null); setPrueba(null); dialogo.current?.close(); }
      else setError(r.error ?? 'No se pudo guardar');
    });
  }

  /**
   * Manda la plantilla de Meta a un número suelto.
   *
   * Va por plantilla y no por texto libre porque un móvil de prueba casi nunca
   * tiene la ventana de 24 h abierta: con texto libre daría el error 131047 y
   * parecería un fallo de la pasarela cuando es la regla de Meta.
   */
  function probarEnvio() {
    const nombre = (
      dialogo.current?.querySelector<HTMLInputElement>('#metaTemplateName')?.value ?? ''
    ).trim();
    const idioma = (
      dialogo.current?.querySelector<HTMLInputElement>('#metaTemplateLang')?.value ?? ''
    ).trim();

    if (!nombre) { setPrueba({ ok: false, texto: 'Falta el nombre de la plantilla de Meta' }); return; }
    if (!telPrueba.trim()) { setPrueba({ ok: false, texto: 'Escribe un número de prueba' }); return; }

    iniciar(async () => {
      const r = await enviarPrueba({
        telefono: telPrueba,
        templateName: nombre,
        languageCode: idioma || 'es',
      });
      setPrueba(
        r.ok
          ? { ok: true, texto: `Enviado. Si no llega en un minuto, revisa que la plantilla "${nombre}" esté aprobada.` }
          : { ok: false, texto: r.error ?? 'No se pudo enviar' }
      );
    });
  }

  const campo = 'superficie w-full rounded-md border borde-tema px-3 py-2 text-sm';
  const etiqueta = 'texto-suave mb-1 block text-xs font-medium';

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setVista(null); dialogo.current?.showModal(); }}
        className={
          editando
            ? 'texto-suave text-xs hover:underline'
            : 'rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-500'
        }
      >
        {editando ? 'Editar' : 'Nueva secuencia'}
      </button>

      <dialog
        ref={dialogo}
        className="superficie w-[min(40rem,94vw)] rounded-xl border borde-tema p-0 backdrop:bg-black/60"
        onClose={() => { setError(null); setVista(null); }}
      >
        <form onSubmit={enviar} className="max-h-[85vh] overflow-y-auto p-5">
          <h2 className="mb-4 text-base font-semibold">
            {editando ? 'Editar secuencia' : 'Nueva secuencia'}
          </h2>

          <div className="space-y-3">
            <div>
              <label className={etiqueta} htmlFor="name">Nombre</label>
              <input id="name" name="name" required defaultValue={secuencia?.name} className={campo} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta} htmlFor="trigger">Cuándo se envía</label>
                <select id="trigger" name="trigger" defaultValue={secuencia?.trigger ?? 'signup'} className={campo}>
                  {DISPARADORES.map((d) => <option key={d.valor} value={d.valor}>{d.texto}</option>)}
                </select>
              </div>
              <div>
                <label className={etiqueta} htmlFor="channel">Canal</label>
                <select
                  id="channel" name="channel" value={canal}
                  onChange={(e) => { setCanal(e.target.value); setPrueba(null); }}
                  className={campo}
                >
                  {CANALES.map((c) => <option key={c.valor} value={c.valor}>{c.texto}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta} htmlFor="delayHours">Espera (horas)</label>
                <input
                  id="delayHours" name="delayHours" type="number" min={0}
                  defaultValue={secuencia?.delayHours ?? 0} className={campo}
                />
                <p className="texto-suave mt-1 text-xs">0 = inmediato</p>
              </div>
              <div>
                <label className={etiqueta} htmlFor="targetSegment">Segmento (opcional)</label>
                <input
                  id="targetSegment" name="targetSegment"
                  defaultValue={secuencia?.targetSegment ?? ''} placeholder="Todos" className={campo}
                />
              </div>
            </div>

            <div>
              <label className={etiqueta} htmlFor="template">Mensaje</label>
              <textarea
                id="template" ref={areaTexto} value={plantilla}
                onChange={(e) => { setPlantilla(e.target.value); setVista(null); }}
                rows={4} required className={`${campo} resize-y`}
              />

              <div className="mt-2 flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <button
                    key={v.clave}
                    type="button"
                    onClick={() => insertar(v.clave)}
                    title={v.descripcion}
                    className="texto-suave cifras rounded border borde-tema px-2 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {`{{${v.clave}}}`}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={verPrevia}
              disabled={enCurso || !plantilla.trim()}
              className="rounded-md border borde-tema px-3 py-1.5 text-xs hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
            >
              {enCurso ? 'Calculando…' : 'Ver cómo queda'}
            </button>

            {vista && (
              <div className="rounded-md border borde-tema p-3">
                <p className="texto-suave text-xs">Con los datos de {vista.comensal}:</p>
                <p className="mt-2 rounded bg-green-950/30 px-3 py-2 text-sm text-green-100">
                  {vista.mensaje}
                </p>
                {vista.avisos.map((a) => (
                  <p key={a} className="mt-1.5 text-xs text-amber-400">· {a}</p>
                ))}
              </div>
            )}

            {/* --- Plantilla aprobada en Meta --- */}
            {esWhatsApp && (
              <fieldset className="rounded-md border borde-tema p-3">
                <legend className="texto-suave px-1 text-xs font-medium">
                  Plantilla aprobada en Meta
                </legend>

                <p className="texto-suave mb-3 text-xs">
                  Pasadas 24 h desde el último mensaje del comensal, WhatsApp solo entrega
                  plantillas aprobadas. El texto de arriba se usa dentro de esa ventana; esto
                  es lo que sale fuera de ella.
                </p>

                <div className="grid grid-cols-[1fr_7rem] gap-3">
                  <div>
                    <label className={etiqueta} htmlFor="metaTemplateName">Nombre en Meta</label>
                    <input
                      id="metaTemplateName" name="metaTemplateName"
                      defaultValue={secuencia?.metaTemplateName ?? ''}
                      placeholder="bocazo_recordatorio_puntos"
                      className={`${campo} cifras`}
                    />
                  </div>
                  <div>
                    <label className={etiqueta} htmlFor="metaTemplateLang">Idioma</label>
                    <input
                      id="metaTemplateLang" name="metaTemplateLang"
                      defaultValue={secuencia?.metaTemplateLang ?? 'es'}
                      placeholder="es"
                      className={`${campo} cifras`}
                    />
                  </div>
                </div>

                {/*
                  Meta numera los huecos, no los nombra: el orden ES el dato. Por
                  eso se editan como una lista ordenada y no como un formulario
                  de pares clave/valor.
                */}
                <p className={`${etiqueta} mt-3`}>Huecos de la plantilla, en orden</p>

                {huecos.length === 0 ? (
                  <p className="texto-suave text-xs">
                    Sin huecos: la plantilla de Meta se envía tal cual, sin personalizar.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {huecos.map((h, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="cifras texto-suave w-10 shrink-0 text-xs">{`{{${i + 1}}}`}</span>
                        <select
                          value={h}
                          onChange={(e) => {
                            const copia = [...huecos];
                            copia[i] = e.target.value;
                            setHuecos(copia);
                          }}
                          className={campo}
                        >
                          {VARIABLES.map((v) => (
                            <option key={v.clave} value={v.clave}>
                              {v.clave} — {v.descripcion}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setHuecos(huecos.filter((_, j) => j !== i))}
                          aria-label={`Quitar el hueco ${i + 1}`}
                          className="texto-suave shrink-0 rounded border borde-tema px-2 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  onClick={() => setHuecos([...huecos, VARIABLES[0]!.clave])}
                  className="texto-suave mt-2 rounded border borde-tema px-2 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Añadir hueco {`{{${huecos.length + 1}}}`}
                </button>

                {/* --- Prueba real --- */}
                {puedeProbar && (
                  <div className="mt-4 border-t borde-tema pt-3">
                    <label className={etiqueta} htmlFor="telPrueba">
                      Enviar una prueba de verdad
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="telPrueba" type="tel" value={telPrueba}
                        onChange={(e) => { setTelPrueba(e.target.value); setPrueba(null); }}
                        placeholder="300 123 4567"
                        className={`${campo} cifras`}
                      />
                      <button
                        type="button"
                        onClick={probarEnvio}
                        disabled={enCurso}
                        className="shrink-0 rounded-md border borde-tema px-3 py-2 text-xs hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
                      >
                        {enCurso ? 'Enviando…' : 'Enviar prueba'}
                      </button>
                    </div>
                    <p className="texto-suave mt-1 text-xs">
                      Sale a un móvil real y gasta una conversación de Meta. Sin prefijo se
                      asume Colombia (+57).
                    </p>

                    {prueba && (
                      <p
                        role="status"
                        className={`mt-2 rounded-md px-3 py-2 text-xs ${
                          prueba.ok
                            ? 'bg-green-950/30 text-green-200'
                            : 'border border-red-700/50 bg-red-950/30 text-red-200'
                        }`}
                      >
                        {prueba.texto}
                      </p>
                    )}
                  </div>
                )}
              </fieldset>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-md border border-red-700/50 bg-red-950/30 px-3 py-2 text-xs text-red-200">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogo.current?.close()}
              className="rounded-md border borde-tema px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enCurso}
              className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
            >
              {enCurso ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
