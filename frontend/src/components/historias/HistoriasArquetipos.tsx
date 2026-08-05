/**
 * HISTORIAS ARQUETIPOS — 3 Plots + Springboard Story (Made to Stick Cap. 6)
 * RFC-001: Capa Edge — Contenido estático SSG
 */

'use client';

interface Historia {
  titulo: string;
  protagonista: string;
  escenario: string;
  desarrollo: string;
  desenlace: string;
  cifras: string[];
  tipo: 'challenge' | 'connection' | 'creativity';
}

const HISTORIAS: readonly Historia[] = Object.freeze([
  {
    titulo: 'El Fin de Semana que Cambió Todo para Laura',
    protagonista: 'Laura, Gerente A&B de un gastrobar en Medellín',
    escenario: 'Llevaba 2 años queriendo agregar comida a la carta, pero los números nunca cerraban: necesitaba un chef ($2,800,000 COP/mes), equipamiento de cocina ($45,000,000 COP), y asumía 18% de merma.',
    desarrollo: 'En marzo agendó la Demo Phygital. El sábado a las 10 PM, Carlos (Head Bartender) tomó el primer Herbal Citrus Botanical Cone, rompió el elixir, lo vertió, lo sirvió junto a un Gin-Tonic. Tiempo total: 19 segundos.',
    desenlace: 'El domingo por la noche: 87 conos vendidos, $2,044,500 COP de utilidad neta. Cero merma. Cero dependencia de cocina. El lunes llamó: "No me quiten los conos. Queremos el contrato anual."',
    cifras: ['87 conos vendidos', '$2,044,500 COP utilidad', '19 segundos ensamble', '0% merma'],
    tipo: 'challenge',
  },
  {
    titulo: 'El Bartender que se Volvió Sommelier de Snacks',
    protagonista: 'Diego, Head Bartender de un rooftop en Bogotá',
    escenario: 'Hacía los mejores Old Fashioned de la ciudad, pero odiaba cuando los clientes pedían "algo para picar" — siempre terminaba mandándolos a la cocina, rompiendo el momento.',
    desarrollo: 'Cuando probó el Sweet & Salty Caramel Cone, empezó a recomendarlo con su Old Fashioned de bourbon ahumado: "El crujido de la sal rompe la dulzura pegajosa del bourbon, y el caramelo eleva las notas de vainilla del barril."',
    desenlace: 'Los clientes empezaron a pedirlo por su nombre. Diego dejó de ser "el que sirve tragos" y se convirtió en "el que diseña la experiencia completa". Sus propinas aumentaron 40% en el primer mes.',
    cifras: ['Sweet & Salty Caramel Cone', '+40% propinas', 'Old Fashioned + Caramelo'],
    tipo: 'connection',
  },
  {
    titulo: 'El Lunes de Basura Cero',
    protagonista: 'Andrés, Gerente A&B de un hotel boutique',
    escenario: 'Cada lunes revisaba la basura de la cocina del bar: aguacates oxidados, limones a medio usar, salsas caducadas. Perdía $380,000 COP por semana solo en merma de garnishes y snacks.',
    desarrollo: 'El bartender jefe propuso reemplazar los garnishes tradicionales con los 5 conos de SIGH_FOOD. El primer lunes, el caneco de basura de la prep-cocina estaba completamente vacío.',
    desenlace: 'El bartender jefe rediseñó el flujo de la barra: los kits RTA ahora viven en un cajón debajo de la estación de garnish, y el tiempo de "trago + snack" bajó de 8 minutos a 45 segundos. Andrés lo promovió a "Director de Experiencia de Barra".',
    cifras: ['$380,000 COP/semana merma eliminada', '8 min → 45 seg', '0% merma'],
    tipo: 'creativity',
  },
]);

const tipoLabels = {
  challenge: 'Challenge Plot',
  connection: 'Connection Plot',
  creativity: 'Creativity Plot',
};

const tipoColors = {
  challenge: 'bg-red-900/30 text-red-300 border-red-800',
  connection: 'bg-blue-900/30 text-blue-300 border-blue-800',
  creativity: 'bg-emerald-900/30 text-emerald-300 border-emerald-800',
};

export default function HistoriasArquetipos() {
  return (
    <div className="space-y-12">
      {HISTORIAS.map((historia) => (
        <article key={historia.titulo} className="bg-[#1f1f1f] border border-gray-800 rounded-lg p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-2xl md:text-3xl font-bold text-[#f5f5f5]">
              {historia.titulo}
            </h3>
            <span className={`text-xs px-2 py-1 rounded border ${tipoColors[historia.tipo]}`}>
              {tipoLabels[historia.tipo]}
            </span>
          </div>

          <div className="mb-6">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Protagonista:</div>
            <div className="text-lg text-[#d97325] font-semibold">{historia.protagonista}</div>
          </div>

          <div className="space-y-4 text-gray-300 leading-relaxed">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">El desafío:</div>
              <p>{historia.escenario}</p>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Lo que pasó:</div>
              <p>{historia.desarrollo}</p>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">El resultado:</div>
              <p className="text-[#f5f5f5] font-medium">{historia.desenlace}</p>
            </div>
          </div>

          <div className="mt-8 bg-[#0f0f0f] rounded-lg p-6 border border-gray-800">
            <div className="text-xs text-[#d97325] uppercase tracking-wider mb-4 font-semibold">
              Cifras verificadas:
            </div>
            <div className="flex flex-wrap gap-3">
              {historia.cifras.map((cifra, idx) => (
                <span key={idx} className="bg-[#1f1f1f] border border-gray-700 rounded px-3 py-1 text-sm text-[#f5f5f5]">
                  {cifra}
                </span>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}