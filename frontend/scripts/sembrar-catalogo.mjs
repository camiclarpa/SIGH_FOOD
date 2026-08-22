// =============================================================================
// Siembra el catálogo de la tienda
// =============================================================================
//
// Pasa los cinco conos de la landing a la tabla `productos`, para que la tienda
// y el CRM lean de la base en vez de tenerlos escritos en el código.
//
// Es idempotente: se puede ejecutar las veces que haga falta. Actualiza por
// slug en lugar de insertar de nuevo, así que no duplica ni pisa los pedidos
// que ya apunten a un producto.
//
// Uso:
//   node scripts/sembrar-catalogo.mjs

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(import.meta.dirname, '..');
const postgres = createRequire(path.join(RAIZ, 'package.json'))('postgres');

function urlBaseDeDatos() {
  for (const f of ['apps/web/.env.local', '.env.local', '.env']) {
    const p = path.join(RAIZ, f);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(/^DATABASE_URL=(.+)$/m);
    if (m) return m[1].trim();
  }
  throw new Error('No se encontró DATABASE_URL en ningún .env');
}

const sql = postgres(urlBaseDeDatos(), { max: 1, connect_timeout: 30 });

/**
 * Opciones de personalización.
 *
 * Suben el ticket medio y, más importante, hacen que el pedido sea suyo: quien
 * elige el nivel de picante siente que pidió algo hecho para él, no un producto
 * de catálogo. El sobreprecio de los extras es lo que paga la diferencia.
 */
const OPCIONES_COMUNES = [
  { grupo: 'Nivel de picante', etiqueta: 'Suave', sobreprecio: 0, porDefecto: false, orden: 1 },
  { grupo: 'Nivel de picante', etiqueta: 'Medio', sobreprecio: 0, porDefecto: true, orden: 2 },
  { grupo: 'Nivel de picante', etiqueta: 'Intenso', sobreprecio: 0, porDefecto: false, orden: 3 },
  { grupo: 'Extras', etiqueta: 'Queso extra', sobreprecio: 4_000, multiple: true, orden: 1 },
  { grupo: 'Extras', etiqueta: 'Doble salsa', sobreprecio: 3_000, multiple: true, orden: 2 },
  { grupo: 'Extras', etiqueta: 'Topping adicional', sobreprecio: 4_000, multiple: true, orden: 3 },
];

/** Solo los salados llevan escala de picante; en un cono de caramelo no pinta nada. */
const SIN_PICANTE = ['sweet-salty-caramel', 'tropical-anise', 'herbal-citrus'];

const PRECIO = 32_000;

const CONOS = [
  {
    slug: 'spicy-volcano',
    nombre: 'Spicy Volcano',
    gancho: 'Arde. Y vas a querer otro.',
    descripcion:
      'Elixir de chile y limón sobre una base crujiente que se rompe al primer mordisco. ' +
      'El picante llega tarde, se queda un momento y se va limpio.',
    notas: ['Crujido', 'Chile ahumado', 'Limón', 'Calor que sube'],
    ingredientes: ['Base crujiente de maíz', 'Crema de queso', 'Elixir de chile', 'Limón', 'Sal en escamas'],
    maridaje: ['Mezcal', 'Tequila'],
    familia: 'salado',
    lineaProducto: 'spicy_volcano',
    intensidad: 3,
    vegetariano: false,
    destacado: true,
    orden: 1,
  },
  {
    slug: 'smoked-cheese-truffle',
    nombre: 'Smoked Cheese & Truffle',
    gancho: 'El que convence a los que dicen que no tienen hambre.',
    descripcion:
      'Queso ahumado y trufa negra sobre una crema densa, servido tibio. ' +
      'Umami profundo, del tipo que no se olvida.',
    notas: ['Humo', 'Trufa negra', 'Queso curado', 'Sal en escamas'],
    ingredientes: ['Base crujiente', 'Crema de queso ahumado', 'Trufa negra', 'Tierra de aceituna', 'Sal en escamas'],
    maridaje: ['Vino tinto', 'Espumoso'],
    familia: 'salado',
    lineaProducto: 'umami_boost',
    intensidad: 2,
    vegetariano: false,
    destacado: true,
    orden: 2,
  },
  {
    slug: 'sweet-salty-caramel',
    nombre: 'Sweet & Salty Caramel',
    gancho: 'Dulce, salado, y un problema para tu autocontrol.',
    descripcion:
      'Caramelo salado que cae por el borde, nueces garrapiñadas y escamas de sal. ' +
      'El contraste es el punto: cada bocado alterna entre los dos.',
    notas: ['Caramelo tibio', 'Nuez tostada', 'Sal marina', 'Vainilla'],
    ingredientes: ['Base dulce', 'Caramelo salado', 'Nueces garrapiñadas', 'Sal marina', 'Hilo de azúcar'],
    maridaje: ['Bourbon', 'Whisky'],
    familia: 'dulce',
    lineaProducto: 'sweet_craft',
    intensidad: 1,
    vegetariano: true,
    orden: 3,
  },
  {
    slug: 'tropical-anise',
    nombre: 'Tropical Anise',
    gancho: 'Maracuyá con anís estrellado. Suena raro. Funciona.',
    descripcion:
      'Maracuyá fresco, coco tostado y anís estrellado. ' +
      'Ácido al principio, dulce al final, con un fondo especiado que no esperas.',
    notas: ['Maracuyá', 'Coco tostado', 'Anís estrellado', 'Cítrico'],
    ingredientes: ['Base crujiente', 'Crema de maracuyá', 'Coco tostado', 'Anís estrellado', 'Azúcar cristalizada'],
    maridaje: ['Ron añejo'],
    familia: 'dulce',
    lineaProducto: 'flavor_switch',
    intensidad: 1,
    vegetariano: true,
    orden: 4,
  },
  {
    slug: 'herbal-citrus',
    nombre: 'Herbal Citrus',
    gancho: 'El que pides cuando ya probaste los otros cuatro.',
    descripcion:
      'Crema de limón, ralladura confitada y albahaca fresca sobre una base con hierbas. ' +
      'Limpio, ligero, y sorprendentemente difícil de dejar.',
    notas: ['Limón', 'Albahaca', 'Hierbas frescas', 'Azúcar cristalizada'],
    ingredientes: ['Base de hierbas', 'Crema de limón', 'Ralladura confitada', 'Albahaca fresca'],
    maridaje: ['Gin-tonic'],
    familia: 'fresco',
    lineaProducto: 'taste_shock',
    intensidad: 1,
    vegetariano: true,
    orden: 5,
  },
];

try {
  let creados = 0;
  let actualizados = 0;

  for (const c of CONOS) {
    const [existente] = await sql`SELECT id FROM productos WHERE slug = ${c.slug}`;

    const valores = {
      nombre: c.nombre,
      gancho: c.gancho,
      descripcion: c.descripcion,
      precio_cop: PRECIO,
      // La ruta base sin ancho: el cargador de imágenes elige la variante.
      imagen: `/conos/${c.slug}.webp`,
      familia: c.familia,
      linea_producto: c.lineaProducto,
      intensidad: c.intensidad,
      peso_gramos: 180,
      vegetariano: c.vegetariano,
      destacado: c.destacado ?? false,
      orden: c.orden,
      updated_at: new Date(),
    };

    let id;
    if (existente) {
      await sql`
        UPDATE productos SET ${sql(valores)},
          notas = ${sql.json(c.notas)},
          ingredientes = ${sql.json(c.ingredientes)},
          maridaje = ${sql.json(c.maridaje)}
        WHERE id = ${existente.id}`;
      id = existente.id;
      actualizados++;
    } else {
      const [fila] = await sql`
        INSERT INTO productos ${sql({ slug: c.slug, ...valores })}
        RETURNING id`;
      await sql`
        UPDATE productos SET
          notas = ${sql.json(c.notas)},
          ingredientes = ${sql.json(c.ingredientes)},
          maridaje = ${sql.json(c.maridaje)}
        WHERE id = ${fila.id}`;
      id = fila.id;
      creados++;
    }

    // Las opciones se reescriben enteras: son configuración, no historial. Lo
    // que ya se pidió quedó congelado en pedido_items y no se toca.
    await sql`DELETE FROM producto_opciones WHERE producto_id = ${id}`;

    const aplicables = SIN_PICANTE.includes(c.slug)
      ? OPCIONES_COMUNES.filter((o) => o.grupo !== 'Nivel de picante')
      : OPCIONES_COMUNES;

    for (const o of aplicables) {
      await sql`
        INSERT INTO producto_opciones
          (producto_id, grupo, etiqueta, sobreprecio_cop, seleccion_multiple, por_defecto, orden)
        VALUES (${id}, ${o.grupo}, ${o.etiqueta}, ${o.sobreprecio},
                ${o.multiple ?? false}, ${o.porDefecto ?? false}, ${o.orden})`;
    }

    console.log(`  ${existente ? 'actualizado' : 'creado    '}  ${c.slug}  (${aplicables.length} opciones)`);
  }

  console.log(`\n  ${creados} creados, ${actualizados} actualizados`);

  const [{ n }] = await sql`SELECT count(*)::int n FROM productos WHERE activo = true`;
  console.log(`  productos activos en el catálogo: ${n}`);
} finally {
  await sql.end({ timeout: 10 });
}
