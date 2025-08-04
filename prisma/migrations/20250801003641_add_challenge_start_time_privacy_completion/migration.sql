-- CreateEnum
CREATE TYPE "public"."ChallengeStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED');

-- AlterTable
ALTER TABLE "public"."Challenge" ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startTime" TIMESTAMP(3),
ADD COLUMN     "status" "public"."ChallengeStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."UserChallenge" ADD COLUMN     "completionTime" INTEGER,
ADD COLUMN     "status" "public"."MembershipStatus" NOT NULL DEFAULT 'ACTIVE';
