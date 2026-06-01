-- AlterTable
ALTER TABLE "Caretaker" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Caretaker_userId_key" ON "Caretaker"("userId");

-- AddForeignKey
ALTER TABLE "Caretaker" ADD CONSTRAINT "Caretaker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
