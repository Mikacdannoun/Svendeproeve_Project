import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.tag.deleteMany({
    where: {
      athleteId: null,
    },
  });

  console.log(`Deleted ${deleted.count} global tags`);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
