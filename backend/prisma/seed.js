"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    // Create a sample user
    const user = await prisma.user.create({
        data: {
            name: 'John Doe',
            email: 'john.doe@example.com',
        },
    });
    console.log({ user });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
