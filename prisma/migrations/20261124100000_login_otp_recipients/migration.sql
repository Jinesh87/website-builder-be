-- Extra inboxes that receive the Super Admin login OTP.
CREATE TABLE "login_otp_recipients" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "label" VARCHAR(100),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_otp_recipients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "login_otp_recipients_email_key" ON "login_otp_recipients"("email");
