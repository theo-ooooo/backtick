-- AlterTable
ALTER TABLE "external_posts" ADD COLUMN     "likes" INTEGER,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "thumbnail" TEXT;
