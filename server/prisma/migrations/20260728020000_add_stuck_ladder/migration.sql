-- Graded hints, and a record of who opened which.
--
-- Hints live in their own table rather than in the statement because the
-- mechanism depends on withholding them: a rung that ships to the browser
-- with the problem has already been given away, and the reveal log would
-- record nothing but who happened to click.
CREATE TABLE "ProblemHint" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "ProblemHint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProblemHint_problemId_orderIndex_key" ON "ProblemHint"("problemId", "orderIndex");
CREATE INDEX "ProblemHint_problemId_idx" ON "ProblemHint"("problemId");

CREATE TABLE "HintReveal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "revealedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HintReveal_pkey" PRIMARY KEY ("id")
);

-- Re-opening a rung already seen is not a second reveal, so the unique
-- index is what keeps the log a record of what was learned rather than a
-- click counter.
CREATE UNIQUE INDEX "HintReveal_userId_problemId_orderIndex_key"
    ON "HintReveal"("userId", "problemId", "orderIndex");
CREATE INDEX "HintReveal_userId_problemId_idx" ON "HintReveal"("userId", "problemId");

ALTER TABLE "ProblemHint" ADD CONSTRAINT "ProblemHint_problemId_fkey"
    FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HintReveal" ADD CONSTRAINT "HintReveal_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HintReveal" ADD CONSTRAINT "HintReveal_problemId_fkey"
    FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
