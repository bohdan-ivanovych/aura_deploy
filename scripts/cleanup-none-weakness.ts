import prisma from '../lib/db/prisma';

async function main() {
  const result = await prisma.grammarWeakness.deleteMany({
    where: {
      rule: { in: ['None', 'none', 'NONE', 'null', 'Null'] },
    },
  });
  console.log(`✅ Deleted ${result.count} invalid weakness entries`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
