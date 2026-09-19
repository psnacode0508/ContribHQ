-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'MERGED');

-- CreateTable
CREATE TABLE "WorkspaceCard" (
    "id" TEXT NOT NULL,
    "githubIssueId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "labels" TEXT[],
    "category" TEXT,
    "language" TEXT,
    "status" "CardStatus" NOT NULL DEFAULT 'TODO',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceCard_userId_githubIssueId_key" ON "WorkspaceCard"("userId", "githubIssueId");

-- AddForeignKey
ALTER TABLE "WorkspaceCard" ADD CONSTRAINT "WorkspaceCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
