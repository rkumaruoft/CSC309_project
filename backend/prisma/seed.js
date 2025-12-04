// prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const hash = (pw) => bcrypt.hashSync(pw, 10);

// Random timestamp helper
function randomDateInLastYear() {
    const now = new Date();
    const past = new Date(now);
    past.setFullYear(past.getFullYear() - 1);
    return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

function maybeSuspicious(amount) {
    if (amount < -40 && Math.random() < 0.3) return true;
    if (amount < 0 && Math.random() < 0.05) return true;
    if (Math.random() < 0.02) return true;
    return false;
}

async function main() {
    console.log("Seeding DB...");

    // Reset DB (safe order)
    await prisma.eventGuest.deleteMany();
    await prisma.eventOrganizer.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.promotion.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    // ============================================================
    // USERS (50) — ALL START WITH 100 POINTS
    // ============================================================
    const staticUsers = [
        {
            utorid: "super01",
            name: "Super Admin",
            email: "superuser@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "superuser",
            verified: true,
            points: 100
        },
        {
            utorid: "manag01",
            name: "Manager Jane",
            email: "manager@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "manager",
            verified: true,
            points: 100
        },
        {
            utorid: "cash001",
            name: "Cashier Bob",
            email: "cashier@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "cashier",
            verified: true,
            points: 100
        },
        {
            utorid: "regular1",
            name: "Regular One",
            email: "regular1@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "regular",
            verified: true,
            points: 100
        },
        {
            utorid: "regular2",
            name: "Regular Two",
            email: "regular2@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "regular",
            verified: true,
            points: 100
        },
    ];

    const autoUsers = [];
    for (let i = 1; i <= 45; i++) {
        autoUsers.push({
            utorid: `u${i.toString().padStart(3, "0")}`,
            name: `User ${i}`,
            email: `user${i}@mail.utoronto.ca`,
            password: hash("Password123!"),
            role: "regular",
            verified: true,
            points: 100
        });
    }

    const usersData = [...staticUsers, ...autoUsers];
    await prisma.user.createMany({ data: usersData });

    console.log("✔ 50 users created (all start with 100 points)");

    // Lookup table for actual DB user records
    const users = {};
    for (const u of usersData) {
        users[u.utorid] = await prisma.user.findUnique({ where: { utorid: u.utorid }});
    }

    const manager = users["manag01"];
    const superuser = users["super01"];
    const cashier = users["cash001"];
    const allUsersArr = Object.values(users);

    // ============================================================
    // EVENTS (20)
    // ============================================================
    const events = [];
    for (let i = 1; i <= 20; i++) {
        const start = randomDateInLastYear();
        const end = new Date(start.getTime() + 2 * 3600000);

        const event = await prisma.event.create({
            data: {
                name: `Campus Event ${i}`,
                description: `Auto generated event ${i}`,
                location: "Bahen Centre",
                startTime: start,
                endTime: end,
                capacity: 100,
                pointsRemain: 200,
                pointsAwarded: 5 + (i % 6),
                published: true,
                organizers: {
                    create: [
                        { userId: manager.id },
                        { userId: superuser.id }
                    ]
                }
            }
        });

        events.push(event);
    }
    console.log("✔ Events created");

    console.log("✔ 20 events created");

    // ============================================================
    // PROMOTIONS (8)
    // ============================================================
    const promos = [
        {
            name: "Welcome Bonus", type: "onetime", points: 10,
            startTime: new Date(), endTime: new Date(Date.now() + 86400000 * 20)
        },

        {
            name: "Holiday Double", type: "automatic", rate: 1.0,
            startTime: new Date(Date.now() - 86400000 * 20), endTime: new Date(Date.now() + 86400000 * 20)
        },

        {
            name: "Exam Stress Relief", type: "onetime", points: 5,
            startTime: new Date(), endTime: new Date(Date.now() + 86400000 * 40)
        },

        {
            name: "Loyalty Booster", type: "automatic", rate: 0.05,
            startTime: new Date(), endTime: new Date(Date.now() + 86400000 * 200)
        },

        {
            name: "Event Plus", type: "automatic", points: 3,
            startTime: new Date(), endTime: new Date(Date.now() + 86400000 * 100)
        },

        {
            name: "New Year Bonus", type: "onetime", points: 5,
            startTime: new Date(), endTime: new Date(Date.now() + 86400000 * 50)
        },

        {
            name: "Frosh Week special", type: "automatic",
            startTime: new Date(), endTime: new Date(Date.now() + 86400000 * 60)
        },

        {
            name: "Random Surprise", type: "onetime", points: 2,
            startTime: new Date(), endTime: new Date(Date.now() + 86400000 * 15)
        }
    ];

    await prisma.promotion.createMany({ data: promos });
    const allPromos = await prisma.promotion.findMany();

    console.log("✔ 8 promotions created");

    // ============================================================
    // TRANSACTIONS (200)
    // ============================================================
    const TX_COUNT = 200;

    for (let i = 0; i < TX_COUNT; i++) {
        const timestamp = randomDateInLastYear();

        // choose user
        const user = allUsersArr[Math.floor(Math.random() * allUsersArr.length)];
        const typeRoll = Math.random();

        let type = "purchase";
        if (typeRoll > 0.6) type = "redemption";
        if (typeRoll > 0.85) type = "event";

        let amount = 0;
        let eventId = null;

        if (type === "purchase") {
            amount = Math.floor(Math.random() * 41) + 10;
        } else if (type === "redemption") {
            amount = -(Math.floor(Math.random() * 36) + 5);
        } else if (type === "event") {
            const ev = events[Math.floor(Math.random() * events.length)];
            eventId = ev.id;
            amount = ev.pointsAwarded;
        }

        const txData = {
            userId: user.id,
            type,
            amount,
            eventId,
            processed: true,
            remark: `Seed tx #${i + 1}`,
            createdBy: "seed",
            createdAt: timestamp,
            suspicious: false
        };

        // 20% chance apply promo
        if (Math.random() < 0.2) {
            const promo = allPromos[Math.floor(Math.random() * allPromos.length)];
            txData.promotions = { connect: [{ id: promo.id }] };
        }

        await prisma.transaction.create({ data: txData });
    }

    console.log(`✔ ${TX_COUNT} transactions created`);

    // ============================================================
    // RECALCULATE USER POINT BALANCES (KEEP THIS!)
    // ============================================================

    console.log("🔄 Recalculating user point balances...");

    const allUsersAfter = await prisma.user.findMany({
        select: { id: true }
    });

    for (const u of allUsersAfter) {
        const txSum = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { userId: u.id }
        });

        await prisma.user.update({
            where: { id: u.id },
            data: { points: txSum._sum.amount || 0 }
        });
    }

    console.log("✔ User point totals updated");

    console.log("🌱 Seed complete!");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

    