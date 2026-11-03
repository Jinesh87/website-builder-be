import { prisma } from "../src/config/prisma.js";

async function main() {
  console.log("Clearing partner records...");

  // Delete all partner commissions
  const comm = await prisma.partnerCommission.deleteMany({});
  console.log(`Deleted ${comm.count} partner commissions.`);

  // Delete all partner referrals
  const ref = await prisma.partnerReferral.deleteMany({});
  console.log(`Deleted ${ref.count} partner referrals.`);

  // Delete all partner activities
  const act = await prisma.partnerActivity.deleteMany({});
  console.log(`Deleted ${act.count} partner activities.`);

  // Reset any users who had PARTNER role back to CLIENT
  const users = await prisma.user.updateMany({
    where: { role: "PARTNER" },
    data: { role: "CLIENT" },
  });
  console.log(`Reset ${users.count} users from PARTNER to CLIENT role.`);

  // Delete all partners
  const partners = await prisma.partner.deleteMany({});
  console.log(`Deleted ${partners.count} partners.`);

  console.log("Partner data cleared successfully.");
}

main()
  .catch((err) => {
    console.error("Error clearing partner data:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

