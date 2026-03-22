const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.systemSetting.findUnique({where:{id:'global'}}).then(s => {
  console.log('DB Config:', s);
  process.exit(0);
});
