// تشغيل ترحيل (migration) تطبيع قيم الدفع والأنواع من الإنجليزي للعربي.
// استخدم prisma client عشان مفيش psql على الجهاز.
// تشغيل: node sql/normalize.cjs

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('▶ بدء تطبيع القيم...');

  const statements = [
    // journal_entries.payment_method
    `UPDATE mazaya.journal_entries SET payment_method = 'نقدي' WHERE payment_method = 'cash'`,
    `UPDATE mazaya.journal_entries SET payment_method = 'تحويل' WHERE payment_method = 'transfer'`,
    `UPDATE mazaya.journal_entries SET payment_method = 'نقدي'
       WHERE payment_method IS NOT NULL
         AND payment_method NOT IN ('نقدي', 'تحويل')`,

    // journal_entries.entry_type
    `UPDATE mazaya.journal_entries SET entry_type = 'مشتريات'            WHERE entry_type = 'purchase'`,
    `UPDATE mazaya.journal_entries SET entry_type = 'دفعة واردة من معرض'  WHERE entry_type = 'incoming_from_branch'`,
    `UPDATE mazaya.journal_entries SET entry_type = 'دفعة صادرة لمورد'   WHERE entry_type = 'outgoing_to_supplier'`,
    `UPDATE mazaya.journal_entries SET entry_type = 'تحويل تمريري'       WHERE entry_type = 'transfer'`,
    `UPDATE mazaya.journal_entries SET entry_type = 'نثريات'             WHERE entry_type = 'overhead'`,

    // overhead_expenses.payment_method
    `UPDATE mazaya.overhead_expenses SET payment_method = 'نقدي' WHERE payment_method = 'cash'`,
    `UPDATE mazaya.overhead_expenses SET payment_method = 'تحويل' WHERE payment_method = 'transfer'`,
    `UPDATE mazaya.overhead_expenses SET payment_method = 'نقدي'
       WHERE payment_method IS NOT NULL
         AND payment_method NOT IN ('نقدي', 'تحويل')`,

    // suppliers.payment_type
    `UPDATE mazaya.suppliers SET payment_type = 'نقدي'   WHERE payment_type = 'cash'`,
    `UPDATE mazaya.suppliers SET payment_type = 'تحويل'  WHERE payment_type = 'transfer'`,
    `UPDATE mazaya.suppliers SET payment_type = 'كلاهما' WHERE payment_type = 'both'`,

    // orders.status
    `UPDATE mazaya.orders SET status = 'مفتوح'       WHERE status = 'open'`,
    `UPDATE mazaya.orders SET status = 'قيد التنفيذ'  WHERE status = 'in_progress'`,
    `UPDATE mazaya.orders SET status = 'مكتمل'        WHERE status = 'completed'`,
    `UPDATE mazaya.orders SET status = 'تم التسليم'   WHERE status = 'delivered'`,

    // orders.order_type
    `UPDATE mazaya.orders SET order_type = 'تصنيع جديد' WHERE order_type = 'new'`,
    `UPDATE mazaya.orders SET order_type = 'صيانة'      WHERE order_type = 'maintenance'`,
  ];

  // نجهّز تنفيذها كـ transaction كامل
  const txs = statements.map(sql => prisma.$executeRawUnsafe(sql));

  const results = await prisma.$transaction(txs);

  // مجموع الصفوف اللي اتعدّلت
  const totalUpdated = results.reduce((s, n) => s + Number(n || 0), 0);
  console.log(`✔ اكتمل. إجمالي الصفوف المعدّلة عبر كل الـ UPDATEs: ${totalUpdated}`);
  console.log('  (الرقم ده مجموع الـ row counts مش عدد سجلات فريد).');
}

main()
  .catch((e) => {
    console.error('✖ فشل الـ migration:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
