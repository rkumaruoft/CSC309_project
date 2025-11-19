/*
 * Complete this script so that it is able to add a superuser to the database
 * Usage example: 
 *   node prisma/createsu.js clive123 clive.su@mail.utoronto.ca SuperUser123!
 */
'use strict';

async function main() {
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcrypt');
    const prisma = new PrismaClient();
    const args = process.argv.slice(2);
    if (args.length !== 3) {
        console.error('Usage: node prisma/createsu.js <utorid> <email> <password>');
        process.exit(1);
    }
    const [utorid, email, password] = args;

    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const user = await prisma.user.create({
            data: {
                utorid: utorid,
                name: 'Super User',
                email: email,
                password: hashedPassword,
                role: 'superuser',
            },
        });
        console.log('Superuser created:', user);
    } catch (error) {
        console.error('Error creating superuser:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();