// تشغيل ترحيل (migration) لتطبيع قيم material_type وحذف المسافات الزائدة
// تشغيل: node sql/normalize-materials.cjs

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('▶ بدء تطبيع الخامات...');

  // نستخدم SQL مباشر لتحديث الخامات بحذف المسافات من الأطراف
  const statements = [
    `UPDATE mazaya.boards_inventory SET material_type = TRIM(material_type) WHERE material_type IS NOT NULL AND material_type != TRIM(material_type)`,
    `UPDATE mazaya.accessories_inventory SET material_type = TRIM(material_type) WHERE material_type IS NOT NULL AND material_type != TRIM(material_type)`,
  ];

  // نجهّز تنفيذها كـ transaction كامل
  const txs = statements.map(sql => prisma.$executeRawUnsafe(sql));

  const results = await prisma.$transaction(txs);

  // مجموع الصفوف اللي اتعدّلت
  const totalUpdated = results.reduce((s, n) => s + Number(n || 0), 0);
  console.log(`✔ اكتمل. إجمالي الصفوف المعدّلة عبر كل الـ UPDATEs: ${totalUpdated}`);
}

main()
  .catch((e) => {
    console.error('✖ فشل الـ migration:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
