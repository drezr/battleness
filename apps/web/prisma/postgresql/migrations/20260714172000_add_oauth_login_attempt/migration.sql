-- CreateTable
CREATE TABLE "OAuthLoginAttempt" (
    "stateHash" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "browserBindingHash" TEXT NOT NULL,
    "codeVerifier" TEXT NOT NULL,
    "returnTo" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthLoginAttempt_pkey" PRIMARY KEY ("stateHash")
);

-- CreateIndex
CREATE INDEX "OAuthLoginAttempt_expiresAt_idx" ON "OAuthLoginAttempt"("expiresAt");
