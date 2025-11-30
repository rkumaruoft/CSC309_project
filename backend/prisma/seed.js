// prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database...");

    // ---- Clear DB in correct order ----
    await prisma.eventGuest.deleteMany();
    await prisma.eventOrganizer.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.promotion.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    const hash = (pw) => bcrypt.hashSync(pw, 10);

    // ---- Create 10+ Users ----
    const usersData = [
        // Regulars
        {
            utorid: "regular1",
            name: "Regular One",
            email: "regular1@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "regular",
            verified: true,
            points: 50
        },
        {
            utorid: "regular2",
            name: "Regular Two",
            email: "regular2@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "regular",
            verified: true,
            points: 75
        },
        {
            utorid: "regular3",
            name: "Regular Three",
            email: "regular3@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "regular",
            verified: true
        },
        {
            utorid: "regular4",
            name: "Regular Four",
            email: "regular4@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "regular",
            verified: true
        },
        {
            utorid: "regular5",
            name: "Regular Five",
            email: "regular5@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "regular",
            verified: true
        },

        // Cashier
        {
            utorid: "cash001",
            name: "Cashier User",
            email: "cashier@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "cashier",
            verified: true
        },

        // Manager
        {
            utorid: "manag01",
            name: "Manager User",
            email: "manager@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "manager",
            verified: true
        },

        // Superuser
        {
            utorid: "super01",
            name: "Super Admin",
            email: "superuser@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "superuser",
            verified: true
        },

        // Additional filler users
        {
            utorid: "test001",
            name: "Test User 1",
            email: "test1@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "regular",
            verified: true
        },
        {
            utorid: "test002",
            name: "Test User 2",
            email: "test2@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "regular",
            verified: true
        }
    ];

    await prisma.user.createMany({ data: usersData });
    console.log("✔ 10 Users created");

    // ---- Fetch Users ----
    const users = {};
    for (const u of usersData) {
        users[u.utorid] = await prisma.user.findUnique({ where: { utorid: u.utorid } });
    }

    // Primary referenced users
    const regular1 = users["regular1"];
    const regular2 = users["regular2"];
    const regular3 = users["regular3"];
    const regular4 = users["regular4"];
    const regular5 = users["regular5"];
    const manager = users["manag01"];
    const cashier = users["cash001"];
    const superuser = users["super01"];
    // ---- Create 5 Events ----
    const createdEvents = [];
    const baseTime = Date.now();

    for (let i = 1; i <= 5; i++) {
        const event = await prisma.event.create({
            data: {
                name: `Sample Event ${i}`,
                description: `Event #${i} description`,
                location: "Bahen Centre",
                startTime: new Date(baseTime + i * 3600000),
                endTime: new Date(baseTime + (i * 3600000) + 7200000),
                capacity: 100,
                pointsRemain: 200,
                pointsAwarded: 5 + i,
                published: true,
                organizers: {
                    create: [
                        { userId: manager.id },
                        { userId: superuser.id }
                    ]
                }
            }
        });

        createdEvents.push(event);
    }

    console.log("✔ 5 Events created");

    // ---- Event Guests ----
    await prisma.eventGuest.createMany({
        data: [
            { userId: regular1.id, eventId: createdEvents[0].id },
            { userId: regular2.id, eventId: createdEvents[0].id },
            { userId: cashier.id, eventId: createdEvents[1].id },
            { userId: regular1.id, eventId: createdEvents[2].id },
            { userId: regular3.id, eventId: createdEvents[3].id }
        ]
    });

    console.log("✔ Event guests added");

    // ---- Create 5 Promotions ----
    await prisma.promotion.createMany({
        data: [
            {
                name: "Welcome Bonus",
                description: "Gives 10 points",
                type: "onetime",
                startTime: new Date(),
                endTime: new Date(Date.now() + 7 * 86400000),
                points: 10
            },
            {
                name: "Purchase Booster",
                description: "Earn +5% points",
                type: "automatic",
                startTime: new Date(),
                endTime: new Date(Date.now() + 30 * 86400000),
                rate: 0.05
            },
            {
                name: "Event Bonus",
                description: "Attend and earn +3 points",
                type: "automatic",
                startTime: new Date(),
                endTime: new Date(Date.now() + 14 * 86400000),
                points: 3
            },
            {
                name: "Holiday 2x",
                description: "Double event points",
                type: "automatic",
                startTime: new Date(),
                endTime: new Date(Date.now() + 10 * 86400000),
                rate: 1.0
            },
            {
                name: "Winter Reward",
                description: "5 points for winter tasks",
                type: "onetime",
                startTime: new Date(),
                endTime: new Date(Date.now() + 21 * 86400000),
                points: 5
            }
        ]
    });

    console.log("✔ 5 Promotions created");

    // ---- Create 30 Transactions ----
    const transactionTypes = ["purchase", "redemption", "event"];

    const allUsersArr = Object.values(users);
    let txCount = 0;

    for (let i = 0; i < 30; i++) {
        const user = allUsersArr[i % allUsersArr.length];
        const type = transactionTypes[i % 3];

        const txData = {
            type,
            amount: type === "redemption" ? -10 : 10,
            remark: `Seed transaction #${i + 1}`,
            createdBy: "seed",
            userId: user.id
        };

        // Event transaction linkage for every 3rd
        if (type === "event") {
            const eventIdx = i % createdEvents.length;
            txData.eventId = createdEvents[eventIdx].id;
            txData.amount = createdEvents[eventIdx].pointsAwarded;
        }

        await prisma.transaction.create({ data: txData });
        txCount++;
    }

    console.log(`✔ ${txCount} Transactions created`);

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
