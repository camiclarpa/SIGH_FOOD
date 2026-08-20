-- =============================================================================
-- Workers AI como proveedor de embeddings: de 1536 a 1024 dimensiones
-- =============================================================================
--
-- Las columnas se declararon vector(1536) pensando en text-embedding-3 de
-- OpenAI. El proveedor pasa a ser Workers AI con @cf/baai/bge-m3, que produce
-- 1024 y es multilingüe — necesario aquí, porque los textos que se indexan
-- (nombres de bares, perfiles sensoriales, descripciones de incidencias) están
-- en español y los modelos bge-*-en-* son solo inglés.
--
-- La dimensión de una columna vector no se puede cambiar con ALTER TYPE
-- conservando los datos: pgvector la trata como parte del tipo. Se vacían las
-- columnas y se recrean.
--
-- Vaciarlas es seguro AQUÍ y solo aquí: las tres tablas están vacías (los
-- embeddings anteriores eran los vectores aleatorios de Math.random(), que no
-- significaban nada y ya se borraron). Si en el futuro hubiera datos reales,
-- este mismo cambio exige reindexar desde el texto de origen, no migrar los
-- vectores: un vector de otro modelo no es convertible al espacio del nuevo.

-- Los índices HNSW dependen del tipo de la columna: hay que quitarlos antes.
DROP INDEX IF EXISTS idx_embedding_hnsw;--> statement-breakpoint
DROP INDEX IF EXISTS idx_episodios_problema_hnsw;--> statement-breakpoint
DROP INDEX IF EXISTS idx_episodios_solucion_hnsw;--> statement-breakpoint

ALTER TABLE embedding_index
  ALTER COLUMN embedding TYPE vector(1024) USING NULL;--> statement-breakpoint

ALTER TABLE crm_learning_episodes
  ALTER COLUMN problem_embedding TYPE vector(1024) USING NULL;--> statement-breakpoint

ALTER TABLE crm_learning_episodes
  ALTER COLUMN solution_embedding TYPE vector(1024) USING NULL;--> statement-breakpoint

-- Nuevo valor del enum de modelos. ADD VALUE no admite IF NOT EXISTS en todas
-- las versiones y no es transaccional, así que se comprueba antes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'embedding_model' AND e.enumlabel = 'workers_ai_bge_m3'
  ) THEN
    ALTER TYPE embedding_model ADD VALUE 'workers_ai_bge_m3' BEFORE 'openai_text_3_small';
  END IF;
END$$;--> statement-breakpoint

-- Se recrean los índices sobre las columnas ya redimensionadas.
-- `vector_cosine_ops` porque las consultas usan <=>; con otra clase de operador
-- el índice existe pero no se usa y la búsqueda vuelve al recorrido secuencial.
CREATE INDEX IF NOT EXISTS idx_embedding_hnsw
  ON embedding_index
  USING hnsw (embedding vector_cosine_ops);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_episodios_problema_hnsw
  ON crm_learning_episodes
  USING hnsw (problem_embedding vector_cosine_ops);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_episodios_solucion_hnsw
  ON crm_learning_episodes
  USING hnsw (solution_embedding vector_cosine_ops);
