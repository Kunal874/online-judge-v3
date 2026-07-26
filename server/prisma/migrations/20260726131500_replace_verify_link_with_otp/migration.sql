-- Email verification moves from an emailed link to a 6-digit code typed
-- into the app. The link columns are dropped rather than kept alongside:
-- an in-flight link token is worthless once the endpoint that redeemed it
-- is gone, and leaving two parallel verification paths in the schema
-- invites one of them to rot unnoticed.
--
-- Dropping the columns also drops their unique indexes.
ALTER TABLE "User" DROP COLUMN "emailVerifyTokenHash";
ALTER TABLE "User" DROP COLUMN "emailVerifyExpires";

-- Not unique, unlike the link tokens it replaces: six digits is a small
-- space, so two users holding the same pending code is expected rather
-- than exceptional, and a unique index would reject the second one.
ALTER TABLE "User" ADD COLUMN "emailOtpHash" TEXT;
ALTER TABLE "User" ADD COLUMN "emailOtpExpires" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "emailOtpAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "emailOtpSentAt" TIMESTAMP(3);
