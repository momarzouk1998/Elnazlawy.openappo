import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function readCSVFile(filePath: string): any[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

function parseDate(dateStr: string): Date {
  if (!dateStr || dateStr.trim() === '') return new Date();
  try {
    const [datePart] = dateStr.split(' ');
    const [month, day, year] = datePart.split('/').map(Number);
    return new Date(year, month - 1, day);
  } catch {
    return new Date();
  }
}

async function clearData() {
  console.log('🗑️  Clearing existing data (keeping users)...');
  
  await prisma.product_price_history.deleteMany({});
  await prisma.sale_invoice_items.deleteMany({});
  await prisma.purchase_invoice_items.deleteMany({});
  await prisma.sale_invoices.deleteMany({});
  await prisma.purchase_invoices.deleteMany({});
  await prisma.customer_payments.deleteMany({});
  await prisma.supplier_payments.deleteMany({});
  await prisma.checks.deleteMany({});
  await prisma.inventory_transfers.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.expenses.deleteMany({});
  await prisma.products.deleteMany({});
  await prisma.customers.deleteMany({});
  await prisma.suppliers.deleteMany({});
  await prisma.treasury.deleteMany({});
  await prisma.stores.deleteMany({});
  
  console.log('✅ Data cleared successfully');
}

async function importData() {
  const dataDir = path.join(__dirname, '..', 'data');
  
  try {
    await clearData();
    
    // Create default treasury
    console.log('💰 Creating default treasury...');
    const treasury = await prisma.treasury.create({
      data: {
        id: 'c2f3df96',
        name: 'الخزينة الرئيسية',
        balance: 0,
        is_active: true,
      },
    });
    
    // Create default store
    console.log('🏢 Creating default store...');
    const store = await prisma.stores.create({
      data: {
        id: 'ef898402',
        name: 'المخزن الرئيسي',
        location: 'الفيوم',
        is_active: true,
      },
    });
    
    // Import Products
    console.log('📦 Importing products...');
    const products = readCSVFile(path.join(dataDir, 'Product.csv'));
    let productCount = 0;
    
    for (const row of products) {
      const id = row['Product_Id P'];
      const name = row['Name P'];
      
      if (!id || !name) continue;
      
      const openingBalance = parseFloat(row['Opening_Balance P']) || 0;
      const purchasePrice = parseFloat(row['Initial_Purchase_Price']) || 0;
      
      await prisma.products.create({
        data: {
          id,
          name,
          description: row['Description P'] || null,
          category: row['Category P'] || null,
          unit: row['Unit_Of_Measure P'] || 'قطعة',
          units_per_carton: parseInt(row['Units_Per_Carton P']) || 1,
          default_sale_price: purchasePrice * 1.3,
          last_purchase_price: purchasePrice,
          reorder_level: 5,
          is_active: true,
        },
      });
      
      if (openingBalance > 0) {
        await prisma.inventory.create({
          data: {
            product_id: id,
            store_id: store.id,
            current_stock: openingBalance,
          },
        });
      }
      
      productCount++;
    }
    console.log(`✅ Imported ${productCount} products`);
    
    // Import Customers
    console.log('👥 Importing customers...');
    const customers = readCSVFile(path.join(dataDir, 'Customer.csv'));
    let customerCount = 0;
    
    for (const row of customers) {
      const id = row['Customer_Id C'];
      const name = row['Customer_NAM e C'];
      
      if (!id || !name) continue;
      
      const openingBalance = parseFloat(row['Opening_Balance C']) || 0;
      const currentBalance = parseFloat(row['Customer_Balance']) || openingBalance;
      
      let routeDays: string[] = [];
      if (row['Route_Days']) {
        routeDays = row['Route_Days'].split(',').map((d: string) => d.trim()).filter((d: string) => d);
      }
      
      await prisma.customers.create({
        data: {
          id,
          name,
          phone: row['Phone C'] || null,
          whatsapp: row['Whatsapp C'] || null,
          address: row['Address C'] || null,
          opening_balance: openingBalance,
          balance: currentBalance,
          route_days: routeDays,
          is_active: true,
        },
      });
      
      customerCount++;
    }
    console.log(`✅ Imported ${customerCount} customers`);
    
    // Import Suppliers
    console.log('🏭 Importing suppliers...');
    const suppliers = readCSVFile(path.join(dataDir, 'Supplier.csv'));
    let supplierCount = 0;
    
    for (const row of suppliers) {
      const id = row['Supplier_Id SU'];
      const name = row['Supplier_NAM e SU'];
      
      if (!id || !name) continue;
      
      const openingBalance = parseFloat(row['Opening_Balance S']) || 0;
      const currentBalance = parseFloat(row['Supplier_Balance']) || openingBalance;
      
      await prisma.suppliers.create({
        data: {
          id,
          name,
          phone: row['Phone SU'] || null,
          address: row['Address SU'] || null,
          opening_balance: openingBalance,
          balance: currentBalance,
          is_active: true,
        },
      });
      
      supplierCount++;
    }
    console.log(`✅ Imported ${supplierCount} suppliers`);
    
    // Import Customer Payments
    console.log('💰 Importing customer payments...');
    const customerPayments = readCSVFile(path.join(dataDir, 'CustomerPayment.csv'));
    let customerPaymentCount = 0;
    
    for (const row of customerPayments) {
      const id = row['Payment_Id CP'];
      const customerId = row['Customer_Id CP'];
      
      if (!id || !customerId) continue;
      
      const amount = parseFloat(row['AM ount CP']) || 0;
      if (amount <= 0) continue;
      
      const date = parseDate(row['Date CP']);
      
      await prisma.customer_payments.create({
        data: {
          id,
          customer_id: customerId,
          amount,
          payment_method: row['Payment_Method CP'] || 'نقدي',
          payment_date: date,
          treasury_id: row['Treasury_Id CP'] || treasury.id,
          notes: row['Notes CP'] || null,
        },
      });
      
      customerPaymentCount++;
    }
    console.log(`✅ Imported ${customerPaymentCount} customer payments`);
    
    // Import Supplier Payments
    console.log('💸 Importing supplier payments...');
    const supplierPayments = readCSVFile(path.join(dataDir, 'SupplierPayment.csv'));
    let supplierPaymentCount = 0;
    
    for (const row of supplierPayments) {
      const id = row['Payment_Id SP'];
      const supplierId = row['Supplier_Id SP'];
      
      if (!id || !supplierId) continue;
      
      const amount = parseFloat(row['AM ount SP']) || 0;
      if (amount <= 0) continue;
      
      const date = parseDate(row['Date SP']);
      
      await prisma.supplier_payments.create({
        data: {
          id,
          supplier_id: supplierId,
          amount,
          payment_method: row['Payment_Method SP'] || 'نقدي',
          payment_date: date,
          treasury_id: row['Treasury_Id SP'] || treasury.id,
          notes: row['Notes SP'] || null,
        },
      });
      
      supplierPaymentCount++;
    }
    console.log(`✅ Imported ${supplierPaymentCount} supplier payments`);
    
    console.log('\n🎉 Data import completed successfully!');
  } catch (error) {
    console.error('❌ Error importing data:', error);
    throw error;
  }
}

async function main() {
  try {
    await importData();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
