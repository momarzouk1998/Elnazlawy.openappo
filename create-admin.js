const { PrismaClient } = require('/app/node_modules/.prisma/client');
const prisma = new PrismaClient();
prisma.users.create({
  data: {
    username: 'admin',
    full_name: 'مدير المصنع',
    password_hash: '$2a$10$iqWSLzgTRye14Wg1E1KG1.sIBHpH2xBfNAEb3UO4bLiaAjPPYY7r.',
    role: 'admin'
  }
}).then(u => {
  console.log('Admin created: id=' + u.id + ' username=' + u.username);
  prisma.$disconnect();
});
