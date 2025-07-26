-- AlterTable
ALTER TABLE "movements" ADD COLUMN     "isLoan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "loanStatus" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "loanType" TEXT,
ADD COLUMN     "originalAmount" DOUBLE PRECISION,
ADD COLUMN     "participants" INTEGER,
ADD COLUMN     "pendingAmount" DOUBLE PRECISION,
ADD COLUMN     "relatedMovementId" TEXT,
ADD COLUMN     "relatedPeople" JSONB;

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "nickname" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
