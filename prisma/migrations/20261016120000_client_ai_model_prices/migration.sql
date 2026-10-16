-- CreateTable
CREATE TABLE "client_ai_model_prices" (
    "clientId" UUID NOT NULL,
    "modelId" VARCHAR(100) NOT NULL,
    "inputPerMillion" DECIMAL(12,4) NOT NULL,
    "outputPerMillion" DECIMAL(12,4) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "client_ai_model_prices_pkey" PRIMARY KEY ("clientId","modelId")
);

ALTER TABLE "client_ai_model_prices" ADD CONSTRAINT "client_ai_model_prices_non_negative" CHECK ("inputPerMillion" >= 0 AND "outputPerMillion" >= 0);

ALTER TABLE "client_ai_model_prices" ADD CONSTRAINT "client_ai_model_prices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
