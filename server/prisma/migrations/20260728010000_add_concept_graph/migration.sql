-- A curriculum as a directed graph. Prerequisites are edges rather than an
-- ordering column, because the question worth answering ("what stands
-- between me and this concept") is a path query, and an ordering column
-- cannot express that two unrelated topics both gate a third.
CREATE TABLE "Concept" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "blurb" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Concept_slug_key" ON "Concept"("slug");
CREATE INDEX "Concept_slug_idx" ON "Concept"("slug");

CREATE TABLE "ConceptEdge" (
    "id" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,
    "dependentId" TEXT NOT NULL,

    CONSTRAINT "ConceptEdge_pkey" PRIMARY KEY ("id")
);

-- Stating the same prerequisite twice is the same statement, and every
-- route length is computed off this shape, so a duplicate would silently
-- distort the graph rather than fail.
CREATE UNIQUE INDEX "ConceptEdge_prerequisiteId_dependentId_key"
    ON "ConceptEdge"("prerequisiteId", "dependentId");
CREATE INDEX "ConceptEdge_dependentId_idx" ON "ConceptEdge"("dependentId");

ALTER TABLE "ConceptEdge" ADD CONSTRAINT "ConceptEdge_prerequisiteId_fkey"
    FOREIGN KEY ("prerequisiteId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConceptEdge" ADD CONSTRAINT "ConceptEdge_dependentId_fkey"
    FOREIGN KEY ("dependentId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
