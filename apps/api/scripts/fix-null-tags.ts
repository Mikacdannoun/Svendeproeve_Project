import prisma from "../src/prisma"; // adjust path if needed

async function main() {
  // 1) set category for athlete-owned tags that are null
  const updated = await prisma.tag.updateMany({
    where: {
      athleteId: { not: null },
      category: null,
    },
    data: {
      category: "TECHNICAL_ERROR",
      outcome: null,
    },
  });

  console.log("Updated tags with NULL category:", updated.count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });