import { PrismaClient, UserRole, AccountType, AccountStatus } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@assanpay.com' },
    update: {},
    create: {
      email: 'admin@assanpay.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      phoneNumber: '+8801234567890',
      role: UserRole.ADMIN,
      accounts: {
        create: {
          accountNumber: 'ADM001',
          accountType: AccountType.CURRENT,
          balance: 0,
          currency: 'BDT',
          status: AccountStatus.ACTIVE,
        },
      },
    },
  });

  // Create staff user
  const staffPassword = await bcrypt.hash('Staff@123', 10);
  const staff = await prisma.user.upsert({
    where: { email: 'staff@assanpay.com' },
    update: {},
    create: {
      email: 'staff@assanpay.com',
      password: staffPassword,
      firstName: 'Staff',
      lastName: 'User',
      phoneNumber: '+8801234567891',
      role: UserRole.STAFF,
      accounts: {
        create: {
          accountNumber: 'STF001',
          accountType: AccountType.CURRENT,
          balance: 0,
          currency: 'BDT',
          status: AccountStatus.ACTIVE,
        },
      },
    },
  });

  // Create sample customer
  const customerPassword = await bcrypt.hash('Customer@123', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      password: customerPassword,
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+8801234567892',
      role: UserRole.CUSTOMER,
      accounts: {
        create: [
          {
            accountNumber: 'CUS001',
            accountType: AccountType.SAVINGS,
            balance: 10000,
            currency: 'BDT',
            status: AccountStatus.ACTIVE,
          },
          {
            accountNumber: 'CUS002',
            accountType: AccountType.CURRENT,
            balance: 5000,
            currency: 'BDT',
            status: AccountStatus.ACTIVE,
          },
        ],
      },
    },
  });

  console.log({ admin, staff, customer });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 