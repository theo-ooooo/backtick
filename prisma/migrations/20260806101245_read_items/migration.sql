-- CreateTable
CREATE TABLE "read_items" (
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "read_items_pkey" PRIMARY KEY ("userId","url")
);

-- AddForeignKey
ALTER TABLE "read_items" ADD CONSTRAINT "read_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
