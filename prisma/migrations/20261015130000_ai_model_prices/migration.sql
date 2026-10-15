-- CreateTable
CREATE TABLE "ai_model_prices" (
    "modelId" VARCHAR(100) NOT NULL,
    "inputPerMillion" DECIMAL(12,4) NOT NULL,
    "outputPerMillion" DECIMAL(12,4) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ai_model_prices_pkey" PRIMARY KEY ("modelId")
);

ALTER TABLE "ai_model_prices" ADD CONSTRAINT "ai_model_prices_non_negative" CHECK ("inputPerMillion" >= 0 AND "outputPerMillion" >= 0);
