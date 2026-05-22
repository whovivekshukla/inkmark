-- CreateEnum
CREATE TYPE "ClipSource" AS ENUM ('WEB', 'EXTENSION', 'MCP', 'CLAUDE', 'CHATGPT', 'CODEX', 'API');

-- DropIndex
DROP INDEX "clips_search_vector_idx";

-- AlterTable
ALTER TABLE "clips" ADD COLUMN     "source" "ClipSource" NOT NULL DEFAULT 'API',
ALTER COLUMN "url" DROP NOT NULL,
ALTER COLUMN "domain" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "clips_source_idx" ON "clips"("source");
