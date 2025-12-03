// prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
await prisma.eventGuest.deleteMany();
await prisma.eventOrganizer.deleteMany();
await prisma.transaction.deleteMany();
await prisma.promotion.deleteMany();
await prisma.event.deleteMany();
await prisma.user.deleteMany();

// Utility helpers
const hash = (pw) => bcrypt.hashSync(pw, 10);

function randomDateInLastYearWeighted() {
    const now = new Date();
    const past = new Date(now);
    past.setFullYear(past.getFullYear() - 1);

    // seasonal weighting spikes
    const spikes = [
        { month: 8, weight: 4 },  // Frosh week (Sept)
        { month: 11, weight: 3 }, // Holidays (Dec)
        { month: 3, weight: 2 },  // April midterms
    ];

    if (Math.random() < 0.25) {
        const s = spikes[Math.floor(Math.random() * spikes.length)];
        return new Date(
            now.getFullYear(),
            s.month,
            Math.floor(Math.random() * 28) + 1,
            Math.floor(Math.random() * 24),
            Math.floor(Math.random() * 60)
        );
    }

    return new Date(
        past.getTime() + Math.random() * (now.getTime() - past.getTime())
    );
}

function maybeSuspicious(amount) {
    if (amount < -40 && Math.random() < 0.3) return true;
    if (amount < 0 && Math.random() < 0.05) return true;
    if (Math.random() < 0.02) return true;
    return false;
}

async function main() {
    console.log("🌱 Seeding BananaCreds database...");

    // Reset DB in correct order
    await prisma.eventGuest.deleteMany();
    await prisma.eventOrganizer.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.promotion.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    // ============================================================
    // USERS (50)
    // ============================================================

    const staticUsers = [
        // default admin roles
        {
            utorid: "super01",
            name: "Super Admin",
            email: "superuser@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "superuser",
            verified: true
        },
        {
            utorid: "manag01",
            name: "Manager Jane",
            email: "manager@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "manager",
            verified: true
        },
        {
            utorid: "cash001",
            name: "Cashier Bob",
            email: "cashier@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "cashier",
            verified: true
        },
        // a few regulars
        {
            utorid: "regular1",
            name: "Regular One",
            email: "regular1@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "regular",
            verified: true,
            points: 120
        },
        {
            utorid: "regular2",
            name: "Regular Two",
            email: "regular2@mail.utoronto.ca",
            password: hash("Password123!"),
            role: "regular",
            verified: true,
            points: 80
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
            points: Math.floor(Math.random() * 200)
        });
    }

    const usersData = [...staticUsers, ...autoUsers];

    await prisma.user.createMany({ data: usersData });
    console.log("✔ 50 users created");

    // Fetch users map
    const users = {};
    for (const u of usersData) {
        users[u.utorid] = await prisma.user.findUnique({ where: { utorid: u.utorid } });
    }

    const manager = users["manag01"];
    const superuser = users["super01"];
    const cashier = users["cash001"];

    // ============================================================
    // EVENTS (20 yearly distributed)
    // ============================================================

    const events = [];
    for (let i = 1; i <= 20; i++) {
        const start = randomDateInLastYearWeighted();
        const end = new Date(start.getTime() + 2 * 3600000);

        const e = await prisma.event.create({
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

        events.push(e);
    }

    console.log("✔ 20 events created");

    // randomly add guests
    const allUsersArr = Object.values(users);
    for (const e of events) {
        const guestCount = Math.floor(Math.random() * 10);
        const usedUserIds = new Set();

        for (let j = 0; j < guestCount; j++) {
            let user;

            // keep picking until finding a unique user
            do {
                user = allUsersArr[Math.floor(Math.random() * allUsersArr.length)];
            } while (usedUserIds.has(user.id));

            usedUserIds.add(user.id);

            await prisma.eventGuest.create({
                data: {
                    eventId: e.id,
                    userId: user.id
                }
            });
        }
    }


    console.log("✔ Event guests assigned");

    // ============================================================
    // PROMOTIONS (8)
    // ============================================================

    const promotionsData = [
        {
            name: "Welcome Bonus",
            description: "10 points for joining",
            type: "onetime",
            startTime: new Date(),
            endTime: new Date(Date.now() + 20 * 86400000),
            points: 10
        },
        {
            name: "Holiday Double",
            description: "Earn 2× points in December",
            type: "automatic",
            startTime: new Date(Date.now() - 20 * 86400000),
            endTime: new Date(Date.now() + 20 * 86400000),
            rate: 1.0
        },
        {
            name: "Exam Stress Relief",
            description: "Random 5 points during exam months",
            type: "onetime",
            startTime: new Date(),
            endTime: new Date(Date.now() + 40 * 86400000),
            points: 5
        },
        {
            name: "Loyalty Booster",
            description: "Earn +5%",
            type: "automatic",
            startTime: new Date(),
            endTime: new Date(Date.now() + 200 * 86400000),
            rate: 0.05
        },
        {
            name: "Event Plus",
            description: "Extra 3 points at events",
            type: "automatic",
            startTime: new Date(),
            endTime: new Date(Date.now() + 100 * 86400000),
            points: 3
        },
        {
            name: "New Year Bonus",
            description: "5 points in Jan",
            type: "onetime",
            startTime: new Date(),
            endTime: new Date(Date.now() + 50 * 86400000),
            points: 5
        },
        {
            name: "Frosh Week Special",
            description: "Frosh week bonus",
            type: "automatic",
            startTime: new Date(),
            endTime: new Date(Date.now() + 60 * 86400000),
        },
        {
            name: "Random Surprise",
            description: "Random tiny bonus",
            type: "onetime",
            startTime: new Date(),
            endTime: new Date(Date.now() + 15 * 86400000),
            points: 2
        }
    ];

    await prisma.promotion.createMany({ data: promotionsData });
    console.log("✔ 8 promotions created");

    const allPromos = await prisma.promotion.findMany();

    // ============================================================
    // TRANSACTIONS
    // ============================================================

    const SEED_TX_COUNT = 1500;
    const transactionTypes = ["purchase", "redemption", "event"];

    let txCount = 0;

    for (let i = 0; i < SEED_TX_COUNT; i++) {
        // weighted role activity distribution
        let actingUser;
        const r = Math.random();

        if (r < 0.05) actingUser = manager;
        else if (r < 0.10) actingUser = cashier;
        else if (r < 0.12) actingUser = superuser;
        else actingUser = allUsersArr[Math.floor(Math.random() * allUsersArr.length)];

        const typeR = Math.random();
        let type;
        if (typeR < 0.6) type = "purchase";
        else if (typeR < 0.85) type = "redemption";
        else type = "event";

        const timestamp = randomDateInLastYearWeighted();

        let amount = 0;
        let eventId = null;

        if (type === "purchase") {
            amount = Math.floor(Math.random() * 41) + 10; // 10–50
        } else if (type === "redemption") {
            amount = -(Math.floor(Math.random() * 36) + 5); // -5 to -40
        } else if (type === "event") {
            const ev = events[Math.floor(Math.random() * events.length)];
            eventId = ev.id;
            amount = ev.pointsAwarded;
        }

        let txData = {
            userId: actingUser.id,
            type,
            amount,
            eventId,
            remark: `Advanced auto-seed #${i + 1}`,
            createdBy: "seed",
            createdAt: timestamp,
            suspicious: maybeSuspicious(amount)
        };

        // 20% chance attach promo
        if (Math.random() < 0.2) {
            const promo = allPromos[Math.floor(Math.random() * allPromos.length)];
            if (promo) {
                txData.promotions = { connect: [{ id: promo.id }] };
            }
        }

        await prisma.transaction.create({ data: txData });
        txCount++;
    }

    console.log(`✔ ${txCount} transactions created`);
    console.log("🌱 Seeding complete!");
}

// Run seed
main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
