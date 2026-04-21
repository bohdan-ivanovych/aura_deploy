-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "UserMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personaId" TEXT,
    "content" TEXT NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "embedding" vector(384),
    "fts" tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserMemory_userId_idx" ON "UserMemory"("userId");
CREATE INDEX "UserMemory_personaId_idx" ON "UserMemory"("personaId");

-- Create HNSW index for fast semantic matching
CREATE INDEX "UserMemory_embedding_idx" ON "UserMemory" USING hnsw ("embedding" vector_cosine_ops);

-- Create GIN index for full-text search
CREATE INDEX "UserMemory_fts_idx" ON "UserMemory" USING gin ("fts");

-- AddForeignKey
ALTER TABLE "UserMemory" ADD CONSTRAINT "UserMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserMemory" ADD CONSTRAINT "UserMemory_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create RPC function for Hybrid RAG match_memories
CREATE OR REPLACE FUNCTION match_memories(
    p_user_id TEXT,
    p_persona_id TEXT,
    query_embedding vector(384),
    query_text TEXT,
    match_count INT DEFAULT 3
) RETURNS TABLE (
    id TEXT,
    content TEXT,
    similarity FLOAT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        um.id,
        um.content,
        (
            0.7 * (1 - (um.embedding <=> query_embedding)) + 
            0.3 * coalesce(ts_rank(um.fts, websearch_to_tsquery('english', query_text)), 0)
        )::FLOAT as similarity
    FROM "UserMemory" um
    WHERE um."userId" = p_user_id 
      AND (um."isGlobal" = true OR um."personaId" = p_persona_id)
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;
