# Landing Page BOCAZO - Guía de Uso

## Estructura de Archivos

\\\
src/
├── components/
│   ── landing/
│       └── B2B/
│           ├── LandingB2B.tsx          # Componente principal
│           ├── MarginCalculator.tsx    # Calculadora de margen
│           └── PilotKitForm.tsx        # Formulario de kit piloto
└── app/
    └── b2b/
        └── page.tsx                    # Página principal
\\\

## Características

### Diseño Visual
- **Tema oscuro**: Fondo #1a1a1a y #1f1f1f
- **Color primario**: Naranja #d97325
- **Tipografía**: Sistema con pesos bold para títulos
- **Responsive**: Adaptativo a móvil y desktop

### Componentes

1. **Hero Section**
   - Título principal impactante
   - Propuesta de valor clara
   - CTA button que hace scroll al formulario

2. **Galería de Imágenes**
   - 3 placeholders para fotos del producto
   - Bordes punteados con hover effect
   - Aspect ratio 3:4

3. **Calculadora de Margen**
   - Slider interactivo (1-50 mesas)
   - Cálculo automático de ganancia mensual
   - Formato de moneda COP
   - Fórmula editable en MarginCalculator.tsx

4. **Formulario de Kit Piloto**
   - 3 campos: Nombre del bar, Ciudad, WhatsApp
   - Validación de campos requeridos
   - Estado de carga y éxito
   - Integración con API (pendiente)

## Personalización

### Cambiar la fórmula de cálculo
Edita \src/components/landing/B2B/MarginCalculator.tsx\:

\\\	ypescript
// Línea 11 - Ajusta el valor según tu modelo
const monthlyProfit = Math.round(activeTables * 318150);
\\\

### Agregar imágenes reales
Reemplaza los placeholders en \LandingB2B.tsx\ con componentes \<Image />\ de Next.js:

\\\	sx
import Image from 'next/image';

// Reemplaza el div con:
<Image 
  src="/tu-imagen.jpg" 
  alt="Descripción" 
  width={400} 
  height={500}
  className="rounded-lg object-cover"
/>
\\\

### Integrar con backend
En \PilotKitForm.tsx\, reemplaza el setTimeout con una llamada real a tu API:

\\\	ypescript
const response = await fetch('/api/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData),
});
\\\

## Rutas

- **Landing B2B**: http://localhost:3000/b2b
- **Dashboard Aliado**: (pendiente crear)
- **El Llamado (QR)**: (pendiente crear)

## Próximos Pasos

1. [ ] Agregar imágenes reales del producto
2. [ ] Integrar formulario con API de leads
3. [ ] Crear página de Dashboard Aliado
4. [ ] Crear página de El Llamado (QR)
5. [ ] Agregar analytics y tracking
6. [ ] Optimizar SEO y meta tags

════════════════════════════════════════════════════════════