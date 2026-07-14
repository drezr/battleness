-- CreateTable
CREATE TABLE "OAuthLoginAttempt" (
    "stateHash" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "browserBindingHash" TEXT NOT NULL,
    "codeVerifier" TEXT NOT NULL,
    "returnTo" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "OAuthLoginAttempt_expiresAt_idx" ON "OAuthLoginAttempt"("expiresAt");
