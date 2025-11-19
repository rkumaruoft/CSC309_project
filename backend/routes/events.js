const express = require("express");
const router = express.Router();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const authenticate = require("../middleware/authenticate");
const requireClearance = require("../middleware/requireClearance");

// ---------------- VALIDATORS ----------------


function isValidUofTEmail(email) {
    return /^[A-Za-z0-9._%+-]+@mail\.utoronto\.ca$/.test(email);
}
function isValidUtorid(id) {
    return /^[A-Za-z0-9]{7,8}$/.test(id);
}


// ---------------- /events (GET) ----------------
// Clearance: Regular+
router.get(
    "/events",
    authenticate,
    requireClearance(["regular", "cashier", "manager", "superuser"]),
    async (req, res) => {
        try {
            const {
                name,
                location,
                started,
                ended,
                showFull,
                published,
                page = 1,
                limit = 10
            } = req.query;

            const pageNum = Number(page);
            const limitNum = Number(limit);

            if (
                !Number.isInteger(pageNum) || pageNum < 1 ||
                !Number.isInteger(limitNum) || limitNum < 1
            ) {
                return res.status(400).json({ error: "Invalid pagination" });
            }

            if (started !== undefined && ended !== undefined) {
                return res.status(400).json({
                    error: "Specify either started or ended, not both"
                });
            }

            const filters = {};
            const isManager = ["manager", "superuser"].includes(req.user.role);
            const isBasic = ["regular", "cashier"].includes(req.user.role);

            if (isBasic) filters.published = true;

            if (isManager && published !== undefined) {
                filters.published = (published === "true");
            }

            if (name) filters.name = { contains: name };
            if (location) filters.location = { contains: location };

            const now = new Date();

            if (started !== undefined) {
                filters.startTime = (started === "true")
                    ? { lte: now }
                    : { gt: now };
            }

            if (ended !== undefined) {
                filters.endTime = (ended === "true")
                    ? { lt: now }
                    : { gte: now };
            }

            // -------- Fetch with organizers and guests (full relation) --------
            const allMatchingEvents = await prisma.event.findMany({
                where: filters,
                include: {
                    guests: { include: { user: true } },
                    organizers: { include: { user: true } }
                },
                orderBy: { id: "asc" }
            });

            // -------- Filter out full events for regular/cashier --------
            let filtered = allMatchingEvents;

            if (!isManager) {
                const hideFull = showFull === undefined || showFull === "false";
                if (hideFull) {
                    filtered = filtered.filter(e =>
                        e.capacity == null || e.guests.length < e.capacity
                    );
                }
            }

            // -------- Pagination --------
            const total = filtered.length;
            const startIdx = (pageNum - 1) * limitNum;
            const paged = filtered.slice(startIdx, startIdx + limitNum);

            // -------- Format response (MUST include guests + organizers) --------
            const results = paged.map(e => {
                const obj = {
                    id: e.id,
                    name: e.name,
                    location: e.location,
                    startTime: e.startTime,
                    endTime: e.endTime,
                    capacity: e.capacity,
                    numGuests: e.guests.length,
                    organizers: e.organizers.map(o => ({
                        id: o.user.id,
                        utorid: o.user.utorid,
                        name: o.user.name
                    })),
                    guests: e.guests.map(g => ({
                        id: g.user.id,
                        utorid: g.user.utorid,
                        name: g.user.name
                    }))
                };

                if (isManager) {
                    obj.pointsRemain = e.pointsRemain;
                    obj.pointsAwarded = e.pointsAwarded;
                    obj.published = e.published;
                }

                return obj;
            });

            return res.json({
                count: total,
                results
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);


// ---------------- /events (POST) ----------------
// Clearance: Manager+
router.post(
    "/events",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {

            // ---------------- VALIDATE FIELDS ----------------
            const allowed = [
                "name",
                "description",
                "location",
                "startTime",
                "endTime",
                "capacity",
                "points"
            ];

            const keys = Object.keys(req.body);
            if (keys.some(k => !allowed.includes(k))) {
                return res.status(400).json({ error: "Invalid fields in request" });
            }

            const {
                name,
                description,
                location,
                startTime,
                endTime,
                capacity,
                points
            } = req.body;

            if (!name || !description || !location || !startTime || !endTime || points === undefined || capacity === undefined) {
                return res.status(400).json({ error: "Missing fields" });
            }

            // ---------------- DATE VALIDATION ----------------
            const start = new Date(startTime);
            const end = new Date(endTime);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({ error: "Invalid date format" });
            }

            const now = Date.now();

            // Compare using UTC timestamps
            if (start.getTime() < now || end.getTime() < now) {
                return res.status(400).json({ error: "Event time cannot be in the past" });
            }

            if (end.getTime() <= start.getTime()) {
                return res.status(400).json({ error: "endTime must be after startTime" });
            }


            // capacity may be null OR a positive integer
            if (capacity !== null) {
                if (!Number.isInteger(capacity) || capacity <= 0) {
                    return res.status(400).json({ error: "Invalid capacity" });
                }
            }


            // ---------------- POINTS VALIDATION ----------------
            if (!Number.isInteger(points) || points <= 0) {
                return res.status(400).json({ error: "Invalid points" });
            }

            // ---------------- CREATE EVENT ----------------
            const event = await prisma.event.create({
                data: {
                    name,
                    description,
                    location,
                    startTime: start,
                    endTime: end,
                    capacity,
                    pointsRemain: points,
                    pointsAwarded: 0,
                    published: false
                }
            });

            // ---------------- RESPONSE FORMAT ----------------
            return res.status(201).json({
                id: event.id,
                name: event.name,
                description: event.description,
                location: event.location,
                startTime: event.startTime,
                endTime: event.endTime,
                capacity: event.capacity,
                pointsRemain: event.pointsRemain,
                pointsAwarded: event.pointsAwarded,
                published: event.published,
                organizers: [],
                guests: []
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);


// ---------------- /events/:eventId (GET) ----------------
// Clearance: Regular+
router.get(
    "/events/:eventId",
    authenticate,
    requireClearance(["regular", "cashier", "manager", "superuser"]),
    async (req, res) => {
        try {
            const eventId = Number(req.params.eventId);
            if (isNaN(eventId) || eventId <= 0) {
                return res.status(400).json({ error: "Invalid eventId" });
            }

            // Load full event with relations
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    organizers: { include: { user: true } },
                    guests: { include: { user: true } }
                }
            });

            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            const isRegular = req.user.role === "regular";

            if (isRegular && !event.published) {
                return res.status(404).json({ error: "Event not found" });
            }

            const numGuests = event.guests.length;

            // Build guests array in required format
            const guests = event.guests.map(g => ({
                id: g.user.id,
                utorid: g.user.utorid,
                name: g.user.name
            }));

            // -------------------------
            // Regular users → limited view
            // -------------------------
            if (isRegular) {
                return res.json({
                    id: event.id,
                    name: event.name,
                    description: event.description,
                    location: event.location,
                    startTime: event.startTime,
                    endTime: event.endTime,
                    capacity: event.capacity,
                    organizers: event.organizers.map(o => ({
                        id: o.user.id,
                        utorid: o.user.utorid,
                        name: o.user.name
                    })),
                    guests,     // REQUIRED
                    numGuests
                });
            }

            // -------------------------
            // Manager/Cashier/Superuser → full view
            // -------------------------
            return res.json({
                id: event.id,
                name: event.name,
                description: event.description,
                location: event.location,
                startTime: event.startTime,
                endTime: event.endTime,
                capacity: event.capacity,
                pointsRemain: event.pointsRemain,
                pointsAwarded: event.pointsAwarded,
                published: event.published,
                organizers: event.organizers.map(o => ({
                    id: o.user.id,
                    utorid: o.user.utorid,
                    name: o.user.name
                })),
                guests,     // REQUIRED
                numGuests
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);


// ---------------- /events/:eventId (PATCH) ----------------
// Clearance: Regular+
router.patch(
    "/events/:eventId",
    authenticate,
    requireClearance(["regular", "cashier", "manager", "superuser"]),
    async (req, res) => {
        try {
            const eventId = Number(req.params.eventId);
            if (isNaN(eventId)) return res.status(400).json({ error: "Invalid eventId" });

            // ------------------ Load event ------------------
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    guests: true,
                    organizers: { include: { user: true } }
                }
            });

            if (!event) return res.status(404).json({ error: "Event not found" });

            const now = new Date();
            const isManager = ["manager", "superuser"].includes(req.user.role);

            const isOrganizer = await prisma.eventOrganizer.findFirst({
                where: { userId: req.user.id, eventId }
            });

            if (!isManager && !isOrganizer) {
                return res.status(403).json({ error: "Forbidden" });
            }

            // ------------------ Prevent ALL edits after event ended ------------------
            if (now > event.endTime) {
                const forbidden = ["name", "description", "location", "startTime", "endTime", "capacity"];
                for (const f of forbidden) {
                    if (req.body[f] !== undefined) {
                        return res.status(400).json({ error: "Event already ended; cannot modify " + f });
                    }
                }
            }


            // ------------------ Allowed fields ------------------
            const allowed = [
                "name", "description", "location",
                "startTime", "endTime", "capacity",
                "points", "published"
            ];

            const keys = Object.keys(req.body);
            if (keys.some(k => !allowed.includes(k))) {
                return res.status(400).json({ error: "Invalid fields in request" });
            }

            // ------------------ IGNORE NULL FIELDS ------------------
            for (const k of keys) {
                if (req.body[k] === null) {
                    delete req.body[k];
                }
            }

            // Recompute keys after removing nulls
            const cleanKeys = Object.keys(req.body);

            if (cleanKeys.length === 0) {
                return res.status(400).json({ error: "Missing fields" });
            }

            const updates = {};
            const oldCapacity = event.capacity;

            // ------------------ Time freeze rules ------------------
            const eventStarted = now > event.startTime;
            const eventEnded = now > event.endTime;

            const freezeFields = ["name", "description", "location", "startTime", "capacity"];

            if (!isManager) {
                for (const f of freezeFields) {
                    if (req.body[f] !== undefined && eventStarted) {
                        return res.status(400).json({ error: "Event already started; cannot modify " + f });
                    }
                }

                if (req.body.endTime !== undefined && eventEnded) {
                    return res.status(400).json({ error: "Event already ended; cannot modify endTime" });
                }
            }

            // ------------------ startTime / endTime validation ------------------
            if (req.body.startTime !== undefined) {
                const st = new Date(req.body.startTime);
                if (isNaN(st)) return res.status(400).json({ error: "Invalid startTime" });
                if (st < now) return res.status(400).json({ error: "startTime cannot be in the past" });
                updates.startTime = st;

                // Validate relative ordering if also providing endTime
                if (req.body.endTime !== undefined) {
                    const et = new Date(req.body.endTime);
                    if (!isNaN(et) && et <= st) {
                        return res.status(400).json({ error: "endTime must be after startTime" });
                    }
                }
            }

            if (req.body.endTime !== undefined) {
                const et = new Date(req.body.endTime);
                if (isNaN(et)) return res.status(400).json({ error: "Invalid endTime" });
                if (et < now) return res.status(400).json({ error: "endTime cannot be in the past" });

                // Validate relative ordering
                if (req.body.startTime !== undefined) {
                    const st = new Date(req.body.startTime);
                    if (et <= st) {
                        return res.status(400).json({ error: "endTime must be after startTime" });
                    }
                } else {
                    if (et <= event.startTime) {
                        return res.status(400).json({ error: "endTime must be after startTime" });
                    }
                }

                updates.endTime = et;
            }

            // ------------------ capacity ------------------
            if (req.body.capacity !== undefined) {
                const cap = req.body.capacity;

                if (cap !== null && (typeof cap !== "number" || cap <= 0)) {
                    return res.status(400).json({ error: "Invalid capacity" });
                }

                // Changing finite -> unlimited not allowed
                if (oldCapacity !== null && cap === null) {
                    return res.status(400).json({ error: "Cannot change capacity to unlimited" });
                }

                if (cap !== null && event.guests.length > cap) {
                    return res.status(400).json({ error: "Capacity too small for existing guests" });
                }

                updates.capacity = cap;
            }

            // ------------------ points (manager only) ------------------
            if (req.body.points !== undefined) {
                if (!isManager) {
                    return res.status(403).json({ error: "Only managers may modify points" });
                }

                if (!Number.isInteger(req.body.points) || req.body.points <= 0) {
                    return res.status(400).json({ error: "Invalid points amount" });
                }

                const totalAwarded = event.pointsAwarded;
                const newTotal = req.body.points;

                if (newTotal < totalAwarded) {
                    return res.status(400).json({ error: "Cannot reduce points below awarded amount" });
                }

                // Update pointsRemain only
                updates.pointsRemain = newTotal - totalAwarded;
            }

            // ------------------ published ------------------
            if (req.body.published !== undefined) {
                if (!isManager) {
                    return res.status(403).json({ error: "Only managers may publish events" });
                }
                if (req.body.published !== true) {
                    return res.status(400).json({ error: "published can only be set to true" });
                }
                updates.published = true;
            }

            // ------------------ Basic fields ------------------
            if (req.body.name !== undefined) updates.name = req.body.name;
            if (req.body.description !== undefined) updates.description = req.body.description;
            if (req.body.location !== undefined) updates.location = req.body.location;

            // ------------------ Perform update ------------------
            const updated = await prisma.event.update({
                where: { id: eventId },
                data: updates
            });

            // -------- Response format (spec-compliant) --------
            const response = {
                id: updated.id,
                name: updated.name,
                location: updated.location
            };

            for (const k of cleanKeys) {
                if (k === "points") {
                    response.pointsRemain = updated.pointsRemain;
                    response.pointsAwarded = updated.pointsAwarded;
                } else {
                    response[k] = updated[k];
                }
            }

            return res.json(response);

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);


// ---------------- /events/:eventId (DELETE) ----------------
// Clearance: Manager+
router.delete(
    "/events/:eventId",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            const id = Number(req.params.eventId);
            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({ error: "Invalid eventId" });
            }

            // Fetch event
            const event = await prisma.event.findUnique({ where: { id } });
            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            // Cannot delete published events
            if (event.published) {
                return res.status(400).json({ error: "Cannot delete published event" });
            }

            // ------------------------------------
            // CASCADE DELETE (MANUAL — REQUIRED)
            // ------------------------------------

            // 1. Delete guests for this event
            await prisma.eventGuest.deleteMany({
                where: { eventId: id }
            });

            // 2. Delete organizers for this event
            await prisma.eventOrganizer.deleteMany({
                where: { eventId: id }
            });

            // 3. Fetch all transactions for this event
            const txs = await prisma.transaction.findMany({
                where: { eventId: id },
                select: { id: true }
            });

            const txIds = txs.map(t => t.id);

            // 4. Delete promotion links for those transactions
            if (txIds.length > 0) {
                await prisma.transactionPromotions.deleteMany({
                    where: { transactionId: { in: txIds } }
                });
            }

            // 5. Delete transactions for this event
            await prisma.transaction.deleteMany({
                where: { eventId: id }
            });

            // 6. Finally delete the event itself
            await prisma.event.delete({
                where: { id }
            });

            return res.status(204).send();

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);


//---------------------------------------------
// ---------------- /events/:eventId/organizers (POST) ----------------
// Clearance: Manager+
router.post(
    "/events/:eventId/organizers",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            const eventId = Number(req.params.eventId);
            if (isNaN(eventId) || eventId <= 0) {
                return res.status(400).json({ error: "Invalid eventId" });
            }

            const allowed = ["utorid"];
            const keys = Object.keys(req.body);
            if (keys.some(k => !allowed.includes(k))) {
                return res.status(400).json({ error: "Invalid fields in request" });
            }

            const { utorid } = req.body;
            if (!utorid || typeof utorid !== "string") {
                return res.status(400).json({ error: "Missing or invalid utorid" });
            }

            // Load event with guests & organizers
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    guests: true,
                    organizers: { include: { user: true } }
                }
            });

            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            const now = new Date();
            if (now > event.endTime) {
                return res.status(410).json({ error: "Event has ended" });
            }

            // Load user
            const user = await prisma.user.findUnique({ where: { utorid } });
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            // 400 if already guest
            const isGuest = event.guests.some(g => g.userId === user.id);
            if (isGuest) {
                return res.status(400).json({
                    error: "User is registered as a guest; remove as guest first"
                });
            }

            // Avoid duplicate organizers
            const isOrganizer = event.organizers.some(o => o.userId === user.id);
            if (!isOrganizer) {
                await prisma.eventOrganizer.create({
                    data: {
                        eventId,
                        userId: user.id
                    }
                });
            }

            // Reload organizers
            const updated = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    organizers: { include: { user: true } }
                }
            });

            return res.status(201).json({
                id: updated.id,
                name: updated.name,
                location: updated.location,
                organizers: updated.organizers.map(o => ({
                    id: o.user.id,
                    utorid: o.user.utorid,
                    name: o.user.name
                }))
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /events/:eventId/organizers/:userId (DELETE) ----------------
// Clearance: Manager+
router.delete(
    "/events/:eventId/organizers/:userId",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            const eventId = Number(req.params.eventId);
            const userId = Number(req.params.userId);

            if (isNaN(eventId) || eventId <= 0 || isNaN(userId) || userId <= 0) {
                return res.status(400).json({ error: "Invalid eventId or userId" });
            }

            // Ensure event exists
            const event = await prisma.event.findUnique({ where: { id: eventId } });
            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            // Find organizer record
            const organizer = await prisma.eventOrganizer.findFirst({
                where: { eventId, userId }
            });

            if (!organizer) {
                return res.status(404).json({ error: "Organizer not found for this event" });
            }

            await prisma.eventOrganizer.delete({
                where: { id: organizer.id }
            });

            return res.status(204).send();
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /events/:eventId/guests (POST) ----------------
// Clearance: Manager+ OR organizer for this event
router.post(
    "/events/:eventId/guests",
    authenticate,
    requireClearance(["regular", "cashier", "manager", "superuser"]),
    async (req, res) => {
        try {
            const eventId = Number(req.params.eventId);
            if (isNaN(eventId) || eventId <= 0) {
                return res.status(400).json({ error: "Invalid eventId" });
            }

            const allowed = ["utorid"];
            const keys = Object.keys(req.body);
            if (keys.some(k => !allowed.includes(k))) {
                return res.status(400).json({ error: "Invalid fields in request" });
            }

            const { utorid } = req.body;
            if (!utorid || typeof utorid !== "string") {
                return res.status(400).json({ error: "Missing or invalid utorid" });
            }

            // Load event with relations
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    organizers: { include: { user: true } },
                    guests: { include: { user: true } }
                }
            });

            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            const now = new Date();

            // Access control: manager/superuser OR organizer for this event
            const isManager = ["manager", "superuser"].includes(req.user.role);
            const organizerRecord = await prisma.eventOrganizer.findFirst({
                where: { eventId, userId: req.user.id }
            });
            const isOrganizer = !!organizerRecord;

            if (!isManager && !isOrganizer) {
                return res.status(403).json({ error: "Forbidden" });
            }

            // If caller is organizer and event is not yet published -> 404 (not visible)
            if (isOrganizer && !event.published) {
                return res.status(404).json({ error: "Event not found" });
            }

            // 410 Gone if full or ended
            const full =
                event.capacity !== null &&
                event.guests.length >= event.capacity;

            if (full || now > event.endTime) {
                return res.status(410).json({ error: "Event is full or has ended" });
            }

            // Load target user
            const user = await prisma.user.findUnique({ where: { utorid } });
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            // 400 if user is organizer
            const isUserOrganizer = event.organizers.some(o => o.userId === user.id);
            if (isUserOrganizer) {
                return res.status(400).json({
                    error: "User is registered as an organizer; remove as organizer first"
                });
            }

            // 400 if already guest
            const isUserGuest = event.guests.some(g => g.userId === user.id);
            if (isUserGuest) {
                return res.status(400).json({ error: "User already on guest list" });
            }

            // Add guest
            await prisma.eventGuest.create({
                data: {
                    eventId,
                    userId: user.id
                }
            });

            // Reload guest list to get updated count
            const updated = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    guests: { include: { user: true } }
                }
            });

            return res.status(201).json({
                id: updated.id,
                name: updated.name,
                location: updated.location,
                guestAdded: {
                    id: user.id,
                    utorid: user.utorid,
                    name: user.name
                },
                numGuests: updated.guests.length
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /events/:eventId/guests/:userId (DELETE) ----------------
// Clearance: Manager+
router.delete(
    "/events/:eventId/guests/:userId",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            const eventId = Number(req.params.eventId);
            const userId = Number(req.params.userId);

            if (isNaN(eventId) || eventId <= 0 || isNaN(userId) || userId <= 0) {
                return res.status(400).json({ error: "Invalid eventId or userId" });
            }

            const event = await prisma.event.findUnique({ where: { id: eventId } });
            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            const guest = await prisma.eventGuest.findFirst({
                where: { eventId, userId }
            });

            if (!guest) {
                return res.status(404).json({ error: "Guest not found for this event" });
            }

            await prisma.eventGuest.delete({ where: { id: guest.id } });

            return res.status(204).send();
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /events/:eventId/guests/me (POST) ----------------
// Clearance: Regular or higher
router.post(
    "/events/:eventId/guests/me",
    authenticate,
    async (req, res) => {
        try {
            const eventId = Number(req.params.eventId);
            if (isNaN(eventId) || eventId <= 0) {
                return res.status(400).json({ error: "Invalid eventId" });
            }

            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: { guests: { include: { user: true } } }
            });

            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            const now = new Date();

            // For regular users, unpublished events should behave as 404
            if (req.user.role === "regular" && !event.published) {
                return res.status(404).json({ error: "Event not found" });
            }

            const full =
                event.capacity !== null &&
                event.guests.length >= event.capacity;

            if (full || now > event.endTime) {
                return res.status(410).json({ error: "Event is full or has ended" });
            }

            const userId = req.user.id;

            const isGuest = event.guests.some(g => g.userId === userId);
            if (isGuest) {
                return res.status(400).json({ error: "Already on guest list" });
            }

            await prisma.eventGuest.create({
                data: {
                    eventId,
                    userId
                }
            });

            const updated = await prisma.event.findUnique({
                where: { id: eventId },
                include: { guests: true }
            });

            return res.status(201).json({
                id: event.id,
                name: event.name,
                location: event.location,
                guestAdded: {
                    id: req.user.id,
                    utorid: req.user.utorid,
                    name: req.user.name
                },
                numGuests: updated.guests.length
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /events/:eventId/guests/me (DELETE) ----------------
// Clearance: Regular or higher
router.delete(
    "/events/:eventId/guests/me",
    authenticate,
    async (req, res) => {
        try {
            const eventId = Number(req.params.eventId);
            if (!Number.isInteger(eventId) || eventId <= 0) {
                return res.status(400).json({ error: "Invalid eventId" });
            }

            // Load event WITH guests (needed later)
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    guests: true
                }
            });

            // ---- Event does not exist ----
            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            const isRegular = req.user.role === "regular";

            // ---- Regular users must not see unpublished events ----
            if (isRegular && !event.published) {
                return res.status(404).json({ error: "Event not found" });
            }

            const now = new Date();

            // ---- If event ended, cannot un-RSVP → 410 Gone ----
            if (now > event.endTime) {
                return res.status(410).json({ error: "Event has ended" });
            }

            // ---- Check if user is a guest ----
            const guest = await prisma.eventGuest.findUnique({
                where: {
                    userId_eventId: {
                        userId: req.user.id,
                        eventId
                    }
                }
            });

            // ---- If user is NOT guest → 410 Gone ----
            if (!guest) {
                return res.status(410).json({ error: "User already removed or never RSVPed" });
            }

            // ---- Delete guest entry ----
            await prisma.eventGuest.delete({
                where: {
                    userId_eventId: {
                        userId: req.user.id,
                        eventId
                    }
                }
            });


            return res.status(204).send();

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);


// ---------------- /events/:eventId/transactions (POST) ----------------
// Clearance: Manager+ OR organizer for this event
router.post(
    "/events/:eventId/transactions",
    authenticate,
    requireClearance(["regular", "cashier", "manager", "superuser"]),
    async (req, res) => {
        try {
            const eventId = Number(req.params.eventId);
            if (isNaN(eventId) || eventId <= 0) {
                return res.status(400).json({ error: "Invalid eventId" });
            }

            // Allowed fields
            const allowed = ["type", "utorid", "amount"];
            const keys = Object.keys(req.body);
            if (keys.some(k => !allowed.includes(k))) {
                return res.status(400).json({ error: "Invalid fields in request" });
            }

            const { type, utorid, amount } = req.body;

            if (type !== "event") {
                return res.status(400).json({ error: "type must be 'event'" });
            }

            if (!Number.isInteger(amount) || amount <= 0) {
                return res.status(400).json({ error: "Invalid amount" });
            }

            // Load event + guests
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    guests: { include: { user: true } }
                }
            });

            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            // Access control: manager/superuser OR organizer
            const isManager = ["manager", "superuser"].includes(req.user.role);
            const organizerRecord = await prisma.eventOrganizer.findFirst({
                where: { eventId, userId: req.user.id }
            });

            if (!isManager && !organizerRecord) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const creatorUtorid = req.user.utorid;

            // ========== CASE 1: Award a single guest ==========
            if (utorid) {
                const guestUser = event.guests
                    .map(g => g.user)
                    .find(u => u.utorid === utorid);

                if (!guestUser) {
                    return res.status(400).json({
                        error: "User is not on the guest list for this event"
                    });
                }

                if (event.pointsRemain < amount) {
                    return res.status(400).json({
                        error: "Not enough remaining points for this event"
                    });
                }

                const txRecord = await prisma.$transaction(async (tx) => {
                    // Update event pool
                    await tx.event.update({
                        where: { id: eventId },
                        data: {
                            pointsRemain: { decrement: amount },
                            pointsAwarded: { increment: amount }
                        }
                    });

                    // Update user points
                    await tx.user.update({
                        where: { id: guestUser.id },
                        data: { points: { increment: amount } }
                    });

                    // Create transaction
                    const t = await tx.transaction.create({
                        data: {
                            type: "event",
                            amount,
                            spent: null,
                            createdBy: creatorUtorid,
                            relatedId: eventId,
                            user: { connect: { id: guestUser.id } }
                        }
                    });

                    return t;
                });

                return res.status(201).json({
                    id: txRecord.id,
                    recipient: guestUser.utorid,
                    awarded: amount,
                    type: "event",
                    remark: txRecord.remark,
                    relatedId: eventId,
                    createdBy: creatorUtorid
                });
            }

            // ========== CASE 2: Award all guests ==========
            const guestUsers = event.guests.map(g => g.user);
            if (guestUsers.length === 0) {
                return res.status(201).json([]);
            }

            const totalNeeded = amount * guestUsers.length;

            if (event.pointsRemain < totalNeeded) {
                return res.status(400).json({
                    error: "Not enough remaining points for this event"
                });
            }

            const createdTxs = await prisma.$transaction(async (tx) => {
                // Update event pool
                await tx.event.update({
                    where: { id: eventId },
                    data: {
                        pointsRemain: { decrement: totalNeeded },
                        pointsAwarded: { increment: totalNeeded }
                    }
                });

                const results = [];

                for (const user of guestUsers) {
                    await tx.user.update({
                        where: { id: user.id },
                        data: { points: { increment: amount } }
                    });

                    const t = await tx.transaction.create({
                        data: {
                            type: "event",
                            amount,
                            spent: null,
                            createdBy: creatorUtorid,
                            relatedId: eventId,
                            user: { connect: { id: user.id } }
                        }
                    });

                    results.push({
                        id: t.id,
                        recipient: user.utorid,
                        awarded: amount,
                        type: "event",
                        relatedId: eventId,
                        remark: t.remark,
                        createdBy: creatorUtorid
                    });
                }

                return results;
            });

            return res.status(201).json(createdTxs);

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);
