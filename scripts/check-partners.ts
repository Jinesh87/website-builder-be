import { prisma } from "../src/config/prisma.js";

async function main() {
  const count = await prisma.partner.count();
  console.log("Partner count in DB:", count);
  if (count > 0) {
    const list = await prisma.partner.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        partnerNumber: true,
        applicationId: true,
        companyName: true,
        contactName: true,
        email: true,
        status: true,
        referralCode: true,
        commissionRate: true,
      },
    });
    console.log("Existing partners:", JSON.stringify(list, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

