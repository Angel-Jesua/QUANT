import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create a sample user
  const user = await prisma.userAccount.create({
    data: {
      username: 'johndoe',
      email: 'john.doe@example.com',
      passwordHash: 'hashedpassword',
      fullName: 'John Doe',
    },
  })
  console.log({ user })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })