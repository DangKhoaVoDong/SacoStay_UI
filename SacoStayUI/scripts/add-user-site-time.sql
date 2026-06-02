-- Thời gian sử dụng web theo user (tenant + landlord).
CREATE TABLE IF NOT EXISTS "UserSiteTimes" (
    "UserId" uuid NOT NULL PRIMARY KEY,
    "TotalSeconds" bigint NOT NULL DEFAULT 0,
    "LastSeenAt" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "FK_UserSiteTimes_Accounts_UserId" FOREIGN KEY ("UserId") REFERENCES "Accounts" ("Id") ON DELETE CASCADE
);
