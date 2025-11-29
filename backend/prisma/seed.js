// prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database...");

    // ---- Clean DB ----
    await prisma.eventGuest.deleteMany();
    await prisma.eventOrganizer.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.promotion.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    // ---- Hash passwords ----
    const hash = (pw) => bcrypt.hashSync(pw, 10);

    // ---- Test Users ----
    const users = await prisma.user.createMany({
        data: [
            {
                utorid: "regular1",
                name: "Regular User",
                email: "regular@mail.utoronto.ca",
                password: hash("Password123!"),
                role: "regular",
                verified: true
            },
            {
                utorid: "cash001",
                name: "Cashier User",
                email: "cashier@mail.utoronto.ca",
                password: hash("Password123!"),
                role: "cashier",
                verified: true
            },
            {
                utorid: "manag01",
                name: "Manager User",
                email: "manager@mail.utoronto.ca",
                password: hash("Password123!"),
                role: "manager",
                verified: true
            },
            {
                utorid: "super01",
                name: "Super Admin",
                email: "superuser@mail.utoronto.ca",
                password: hash("Password123!"),
                role: "superuser",
                verified: true
            }
        ]
    });

    console.log("✔ Users created");

    // ---- Fetch IDs ----
    const regular = await prisma.user.findUnique({ where: { email: "regular@mail.utoronto.ca" }});
    const manager = await prisma.user.findUnique({ where: { email: "manager@mail.utoronto.ca" }});

    // ---- Sample Event ----
    const event = await prisma.event.create({
        data: {
            name: "Welcome Event",
            description: "Sample event for testing",
            location: "Bahen 1130",
            startTime: new Date(Date.now() - 3600000), 
            endTime: new Date(Date.now() + 3600000),
            capacity: 50,
            pointsRemain: 200,
            pointsAwarded: 10,
            published: true,
            organizers: {
                create: {
                    userId: manager.id
                }
            }
        }
    });

    console.log("✔ Event created");

    // ---- Add regular user as guest ----
    await prisma.eventGuest.create({
        data: {
            userId: regular.id,
            eventId: event.id
        }
    });

    console.log("✔ Event guest added");

    // ---- Sample Promotion ----
    await prisma.promotion.create({
        data: {
            name: "Welcome Bonus",
            description: "Gives 10 points",
            type: "onetime",
            startTime: new Date(Date.now() - 3600000),
            endTime: new Date(Date.now() + 24 * 3600000),
            points: 10
        }
    });

    console.log("✔ Promotion created");

    // ---- Sample Transaction ----
    await prisma.transaction.create({
        data: {
            type: 'redemption',
            amount: 10,
            remark: 'Sample redemption from seed',
            createdBy: 'seed',
            userId: regular.id,
        }
    });

    console.log("✔ Sample transaction created");

    console.log("🌱 Seeding complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
