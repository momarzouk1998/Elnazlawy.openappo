const { PrismaClient } = require('/app/node_modules/.prisma/client');
const prisma = new PrismaClient();
async function main() {
  // List all model names from prisma
  const models = Object.keys(prisma).filter(k => k[0] !== '_' && typeof prisma[k]?.deleteMany === 'function');
  console.log('Available models:', models.join(', '));
  
  for (const m of models) {
    if (m === 'User' || m === 'Session') continue; // keep admin
    try {
      const r = await prisma[m].deleteMany();
      if (r.count > 0) console.log(m + ': deleted ' + r.count);
    } catch(e) { /* skip */ }
  }
  await prisma.$disconnect();
  console.log('DONE');
}
main();
