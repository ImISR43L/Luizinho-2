/*
  Warnings:

  - The `role` column on the `UserGroup` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."UserGroupRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."MembershipStatus" AS ENUM ('ACTIVE', 'PENDING');

-- AlterTable
ALTER TABLE "public"."UserGroup" ADD COLUMN     "status" "public"."MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
DROP COLUMN "role",
ADD COLUMN     "role" "public"."UserGroupRole" NOT NULL DEFAULT 'MEMBER';
