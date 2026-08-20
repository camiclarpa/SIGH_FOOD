-- =============================================================================
-- Índices vectoriales para pgvector
-- =============================================================================
--
-- Sin ellos, cada búsqueda por similitud recorre la tabla entera y calcula la
-- distancia contra todas las filas. Con unas decenas de vectores da igual; con
-- los de 1000 clientes y sus comensales, cada consulta pasa a costar segundos.
--
-- HNSW y no IVFFlat: IVFFlat necesita que la tabla ya tenga datos representativos
-- cuando se construye (agrupa en listas) y hay que reconstruirlo al crecer.
-- HNSW se puede crear sobre una tabla vacía y mantiene su calidad a medida que
-- se insertan filas, que es justo el caso aquí.
--
-- `vector_cosine_ops` porque las consultas usan el operador <=> (distancia
-- coseno). Un índice creado con otra clase de operador simplemente no se usa:
-- la consulta sigue funcionando, pero vuelve al recorrido secuencial sin avisar.

CREATE INDEX IF NOT EXISTS idx_embedding_hnsw
  ON embedding_index
  USING hnsw (embedding vector_cosine_ops);
--> statement-breakpoint

-- Los embeddings de los episodios de aprendizaje se consultan igual: buscar
-- problemas parecidos al actual.
CREATE INDEX IF NOT EXISTS idx_episodios_problema_hnsw
  ON crm_learning_episodes
  USING hnsw (problem_embedding vector_cosine_ops);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_episodios_solucion_hnsw
  ON crm_learning_episodes
  USING hnsw (solution_embedding vector_cosine_ops);
--> statement-breakpoint

-- La búsqueda siempre filtra por entity_type antes de ordenar por distancia.
-- Con el índice compuesto, Postgres descarta primero los tipos que no aplican.
CREATE INDEX IF NOT EXISTS idx_embedding_tipo_modelo
  ON embedding_index (entity_type, model);
