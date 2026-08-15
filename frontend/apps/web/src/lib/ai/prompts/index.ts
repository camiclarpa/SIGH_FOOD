// =============================================================================
// SIGH_FOOD - Prompts de IA para Groq
// =============================================================================

export const CHURN_PREDICTION_PROMPT = `Eres un experto en análisis de retención de clientes para la industria gastronómica.

Analiza los siguientes datos de un cliente B2B (restaurante/bar) y predice su riesgo de abandono (churn):

DATOS DEL CLIENTE:
- Nombre: {name}
- Etapa en pipeline: {pipelineStage}
- Días promedio entre compras: {avgConsumptionDays}
- Última actividad: {lastActivity}
- Stock actual en consignación: {currentStock}
- Puntuación de engagement: {engagementScore}

INSTRUCCIONES:
1. Analiza cada factor de riesgo
2. Asigna un nivel de churn: low, medium, high, critical
3. Explica brevemente por qué (máximo 2 oraciones)
4. Sugiere una acción concreta para retener al cliente

RESPONDE EN FORMATO JSON:
{
  "churnRisk": "low|medium|high|critical",
  "churnScore": 0.00,
  "reason": "explicación breve",
  "recommendedAction": "acción sugerida"
}`;

export const LEAD_SCORING_PROMPT = `Eres un experto en ventas B2B para la industria gastronómica.

Analiza este prospecto y califica su probabilidad de convertirse en cliente recurrente:

DATOS DEL PROSPECTO:
- Nombre del establecimiento: {name}
- Zona: {zone}
- Rol del decisor: {decisionMakerRole}
- Etapa actual: {pipelineStage}
- Tamaño estimado: {estimatedSize}

INSTRUCCIONES:
1. Evalúa la calidad del lead
2. Asigna un score: cold, warm, hot, qualified
3. Calcula probabilidad de conversión (0-100)
4. Sugiere el siguiente paso en el proceso de ventas

RESPONDE EN FORMATO JSON:
{
  "leadScore": "cold|warm|hot|qualified",
  "conversionProb": 0.00,
  "reason": "explicación breve",
  "nextStep": "acción sugerida"
}`;

export const PRODUCT_RECOMMENDATION_PROMPT = `Eres un experto en cross-selling para la industria gastronómica.

Basándote en el historial de compras y preferencias del cliente, recomienda productos complementarios:

DATOS DEL CLIENTE:
- Productos comprados anteriormente: {purchaseHistory}
- Preferencias de sabor: {flavorPreferences}
- Tipo de establecimiento: {establishmentType}
- Temporada actual: {currentSeason}

INSTRUCCIONES:
1. Analiza el perfil del cliente
2. Recomienda 3 productos complementarios
3. Explica por qué cada recomendación es relevante
4. Asigna un score de confianza (0-100) a cada recomendación

RESPONDE EN FORMATO JSON:
{
  "recommendations": [
    {
      "productLine": "nombre del producto",
      "confidenceScore": 0.00,
      "reason": "por qué recomendar"
    }
  ]
}`;

export const REVENUE_FORECAST_PROMPT = `Eres un experto en pronósticos financieros para la industria gastronómica.

Proyecta los ingresos futuros basándote en datos históricos y tendencias:

DATOS HISTÓRICOS:
- Ingresos últimos 3 meses: {last3MonthsRevenue}
- Tendencia de crecimiento: {growthTrend}
- Valor del pipeline actual: {pipelineValue}
- Probabilidad promedio de cierre: {avgCloseProb}
- Estacionalidad: {seasonality}

INSTRUCCIONES:
1. Analiza las tendencias históricas
2. Considera factores estacionales
3. Proyecta ingresos para el próximo período
4. Asigna un nivel de confianza al pronóstico

RESPONDE EN FORMATO JSON:
{
  "projectedRevenue": 0.00,
  "confidence": 0.00,
  "factors": ["factor1", "factor2"],
  "riskFactors": ["riesgo1", "riesgo2"]
}`;