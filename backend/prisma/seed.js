// prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const hash = (pw) => bcrypt.hashSync(pw, 10);

// Helper: random weighted timestamps
function randomDateInLastYearWeighted() {
    const now = new Date();
    const past = new Date(now);
    past.setFullYear(now.getFullYear() - 1);

    const spikes = [
        { month: 8, weight: 4 },  // Sept (frosh)
        { month: 11, weight: 3 }, // December
        { month: 3, weight: 2 }   // April
    ];

    if (Math.random() < 0.25) {
        const s = spikes[Math.floor(Math.random() * spikes.length)];
        return new Date(
            now.getFullYear(), s.month,
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

    // Reset DB (safe order)
    await prisma.eventGuest.deleteMany();
    await prisma.eventOrganizer.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.promotion.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    // ========================
    // USERS (50)
    // ========================
    const staticUsers = [
        { utorid: "super01", name: "Super Admin", email: "superuser@mail.utoronto.ca", password: hash("Password123!"), role: "superuser", verified: true },
        { utorid: "manag01", name: "Manager Jane", email: "manager@mail.utoronto.ca", password: hash("Password123!"), role: "manager", verified: true },
        { utorid: "cash001", name: "Cashier Bob", email: "cashier@mail.utoronto.ca", password: hash("Password123!"), role: "cashier", verified: true },
        { utorid: "regular1", name: "Regular One", email: "regular1@mail.utoronto.ca", password: hash("Password123!"), role: "regular", verified: true, points: 120 },
        { utorid: "regular2", name: "Regular Two", email: "regular2@mail.utoronto.ca", password: hash("Password123!"), role: "regular", verified: true, points: 80 },
    ];

    const autoUsers = Array.from({ length: 45 }, (_, i) => ({
        utorid: `u${String(i + 1).padStart(3, "0")}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@mail.utoronto.ca`,
        password: hash("Password123!"),
        role: "regular",
        verified: true,
        points: Math.floor(Math.random() * 200)
    }));

    const usersData = [...staticUsers, ...autoUsers];

    await prisma.user.createMany({ data: usersData });
    console.log("✔ Users created");

    const users = {};
    for (const u of usersData) {
        users[u.utorid] = await prisma.user.findUnique({ where: { utorid: u.utorid }});
    }

    const manager = users["manag01"];
    const superuser = users["super01"];
    const cashier = users["cash001"];

    // ========================
    // EVENTS
    // ========================
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
    console.log("✔ Events created");

    // Event guests
    const allUsersArr = Object.values(users);
    for (const e of events) {
        const guestCount = Math.floor(Math.random() * 10);
        const used = new Set();

        for (let j = 0; j < guestCount; j++) {
            let user;
            do {
                user = allUsersArr[Math.floor(Math.random() * allUsersArr.length)];
            } while (used.has(user.id));

            used.add(user.id);

            await prisma.eventGuest.create({
                data: { eventId: e.id, userId: user.id }
            });
        }
    }

    console.log("✔ Event guests assigned");

    // ========================
    // PROMOTIONS
    // ========================
    const promotionsData = [
        { name: "Welcome Bonus", description: "10 points for joining", type: "onetime", startTime: new Date(), endTime: new Date(Date.now() + 20 * 864e5), points: 10 },
        { name: "Holiday Double", description: "Earn 2× points in December", type: "automatic", startTime: new Date(Date.now() - 20 * 864e5), endTime: new Date(Date.now() + 20 * 864e5), rate: 1.0 },
        { name: "Exam Stress Relief", description: "Random 5 points during exam months", type: "onetime", startTime: new Date(), endTime: new Date(Date.now() + 40 * 864e5), points: 5 },
        { name: "Loyalty Booster", description: "Earn +5%", type: "automatic", startTime: new Date(), endTime: new Date(Date.now() + 200 * 864e5), rate: 0.05 },
        { name: "Event Plus", description: "Extra 3 points at events", type: "automatic", startTime: new Date(), endTime: new Date(Date.now() + 100 * 864e5), points: 3 },
        { name: "New Year Bonus", description: "5 points in Jan", type: "onetime", startTime: new Date(), endTime: new Date(Date.now() + 50 * 864e5), points: 5 },
        { name: "Frosh Week Special", description: "Frosh week bonus", type: "automatic", startTime: new Date(), endTime: new Date(Date.now() + 60 * 864e5) },
        { name: "Random Surprise", description: "Random tiny bonus", type: "onetime", startTime: new Date(), endTime: new Date(Date.now() + 15 * 864e5), points: 2 }
    ];

    await prisma.promotion.createMany({ data: promotionsData });
    console.log("✔ Promotions created");

    const allPromos = await prisma.promotion.findMany();

    // ========================
    // TRANSACTIONS (batched)
    // ========================
    const BATCH = 200;
    const SEED_TX_COUNT = 1500;
    let txBuffer = [];

    for (let i = 0; i < SEED_TX_COUNT; i++) {
        const r = Math.random();
        let actingUser =
            r < 0.05 ? manager :
            r < 0.10 ? cashier :
            r < 0.12 ? superuser :
            allUsersArr[Math.floor(Math.random() * allUsersArr.length)];

        const typeR = Math.random();
        const type =
            typeR < 0.6 ? "purchase" :
            typeR < 0.85 ? "redemption" : "event";

        const timestamp = randomDateInLastYearWeighted();
        let amount = 0;
        let eventId = null;

        if (type === "purchase") {
            amount = Math.floor(Math.random() * 41) + 10;
        } else if (type === "redemption") {
            amount = -(Math.floor(Math.random() * 36) + 5);
        } else {
            const ev = events[Math.floor(Math.random() * events.length)];
            eventId = ev.id;
            amount = ev.pointsAwarded;
        }

        const tx = {
            userId: actingUser.id,
            type,
            amount,
            eventId,
            remark: `Seed tx #${i + 1}`,
            createdBy: "seed",
            createdAt: timestamp,
            suspicious: maybeSuspicious(amount)
        };

        // 20% chance apply promo
        if (Math.random() < 0.2) {
            const promo = allPromos[Math.floor(Math.random() * allPromos.length)];
            tx.promotions = { connect: [{ id: promo.id }] };
        }

        // Add to buffer
        txBuffer.push(tx);

        // Flush batch
        if (txBuffer.length >= BATCH) {
            for (const t of txBuffer) {
                await prisma.transaction.create({ data: t });
            }
            txBuffer = [];
        }
    }

    // Flush remainder
    for (const t of txBuffer) {
        await prisma.transaction.create({ data: t });
    }

    console.log("✔ Transactions created");

    // ========================
    // RECALCULATE USER POINTS
    // ========================
    const allUsers = await prisma.user.findMany({ select: { id: true }});

    for (const u of allUsers) {
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

    