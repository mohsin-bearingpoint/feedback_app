-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_token_key" ON "UserSession"("token");

-- CreateIndex
CREATE INDEX "UserSession_userName_idx" ON "UserSession"("userName");

-- CreateIndex
CREATE INDEX "UserSession_token_idx" ON "UserSession"("token");
