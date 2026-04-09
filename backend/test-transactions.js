// ======================================================================
//  InsureWise — Task 6: Conflicting Transactions Demo (Node.js)
//  Run with: node test-transactions.js
//  This script uses Promise.all() to run two sessions SIMULTANEOUSLY
//  and shows real-time conflict behaviour in your terminal output.
// ======================================================================

require('dotenv').config();
const mysql = require('mysql2/promise');

// ── DB Connection Config (matches your db.js) ─────────────────────────
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'mridul',
    password: process.env.DB_PASSWORD || '1991',
    database: process.env.DB_NAME || 'dbms_project'
};

// ── Helper: Coloured log ───────────────────────────────────────────────
const log = {
    A:     (msg) => console.log(`\x1b[36m  [Session A] ${msg}\x1b[0m`),
    B:     (msg) => console.log(`\x1b[33m  [Session B] ${msg}\x1b[0m`),
    info:  (msg) => console.log(`\x1b[37m  ${msg}\x1b[0m`),
    title: (msg) => console.log(`\n\x1b[1m\x1b[35m${'═'.repeat(60)}\n  ${msg}\n${'═'.repeat(60)}\x1b[0m`),
    good:  (msg) => console.log(`\x1b[32m  ✅ ${msg}\x1b[0m`),
    bad:   (msg) => console.log(`\x1b[31m  ❌ ${msg}\x1b[0m`),
    wait:  (ms)  => new Promise(r => setTimeout(r, ms))
};

// ══════════════════════════════════════════════════════════════════════
// DEMO 1: LOST UPDATE — Without FOR UPDATE
// Shows how two concurrent read-calculate-write operations lose data
// ══════════════════════════════════════════════════════════════════════
async function demo_lostUpdate_without_fix() {
    log.title('DEMO 1: Lost Update — WITHOUT FOR UPDATE (shows the problem)');

    const connA = await mysql.createConnection(dbConfig);
    const connB = await mysql.createConnection(dbConfig);

    // Reset claim amount to known value
    await connA.query("UPDATE claims SET estimated_amount = 24000.00 WHERE claim_id = '#CLM-2002'");
    const [[before]] = await connA.query("SELECT estimated_amount FROM claims WHERE claim_id = '#CLM-2002'");
    log.info(`BEFORE: estimated_amount = ₹${before.estimated_amount}`);
    log.info(`Session A wants to ADD ₹6,000. Session B wants to ADD ₹2,000.`);
    log.info(`Expected final: ₹32,000. Let's see what actually happens...\n`);

    // Session A: reads, waits briefly (B sneaks in), then writes
    async function sessionA() {
        await connA.query('START TRANSACTION');
        const [[row]] = await connA.query("SELECT estimated_amount FROM claims WHERE claim_id = '#CLM-2002'");
        log.A(`READ estimated_amount = ₹${row.estimated_amount}`);

        await log.wait(200); // B reads the same value during this gap

        const newVal = parseFloat(row.estimated_amount) + 6000;
        await connA.query("UPDATE claims SET estimated_amount = ? WHERE claim_id = '#CLM-2002'", [newVal]);
        log.A(`WROTE ₹${newVal} (added ₹6,000)`);
        await connA.query('COMMIT');
        log.A(`COMMITTED`);
    }

    // Session B: reads SAME value, writes BASED ON IT — overwrites A
    async function sessionB() {
        await connB.query('START TRANSACTION');
        const [[row]] = await connB.query("SELECT estimated_amount FROM claims WHERE claim_id = '#CLM-2002'");
        log.B(`READ estimated_amount = ₹${row.estimated_amount}`);

        const newVal = parseFloat(row.estimated_amount) + 2000;
        await connB.query("UPDATE claims SET estimated_amount = ? WHERE claim_id = '#CLM-2002'", [newVal]);
        log.B(`WROTE ₹${newVal} (added ₹2,000)`);
        await connB.query('COMMIT');
        log.B(`COMMITTED`);
    }

    // Run both simultaneously
    await Promise.all([sessionA(), sessionB()]);

    const [[after]] = await connA.query("SELECT estimated_amount FROM claims WHERE claim_id = '#CLM-2002'");
    log.info(`\nFINAL in DB: ₹${after.estimated_amount}`);
    if (parseFloat(after.estimated_amount) < 32000) {
        log.bad(`Lost Update occurred! Expected ₹32,000 but got ₹${after.estimated_amount}`);
        log.bad(`Session A's ₹6,000 addition was overwritten by Session B!`);
    }

    await connA.end();
    await connB.end();
}

// ══════════════════════════════════════════════════════════════════════
// DEMO 2: LOST UPDATE — WITH FOR UPDATE (the fix)
// Shows how FOR UPDATE forces sessions to queue properly
// ══════════════════════════════════════════════════════════════════════
async function demo_lostUpdate_with_fix() {
    log.title('DEMO 2: Lost Update — WITH FOR UPDATE (the fix)');

    const connA = await mysql.createConnection(dbConfig);
    const connB = await mysql.createConnection(dbConfig);

    // Reset
    await connA.query("UPDATE claims SET estimated_amount = 24000.00 WHERE claim_id = '#CLM-2002'");
    const [[before]] = await connA.query("SELECT estimated_amount FROM claims WHERE claim_id = '#CLM-2002'");
    log.info(`BEFORE: estimated_amount = ₹${before.estimated_amount}`);
    log.info(`Both sessions now use FOR UPDATE — B must wait for A to finish\n`);

    async function sessionA() {
        await connA.query('START TRANSACTION');
        const [[row]] = await connA.query("SELECT estimated_amount FROM claims WHERE claim_id = '#CLM-2002' FOR UPDATE");
        log.A(`READ (FOR UPDATE) = ₹${row.estimated_amount} — Row LOCKED 🔒`);

        await log.wait(300); // Hold lock briefly — B waits during this time

        const newVal = parseFloat(row.estimated_amount) + 6000;
        await connA.query("UPDATE claims SET estimated_amount = ? WHERE claim_id = '#CLM-2002'", [newVal]);
        log.A(`WROTE ₹${newVal}`);
        await connA.query('COMMIT');
        log.A(`COMMITTED — Lock released 🔓`);
    }

    async function sessionB() {
        await connB.query('START TRANSACTION');
        log.B(`Trying SELECT FOR UPDATE — waiting for A's lock...`);

        // B is blocked here until A commits
        const [[row]] = await connB.query("SELECT estimated_amount FROM claims WHERE claim_id = '#CLM-2002' FOR UPDATE");
        log.B(`WOKE UP — READ (FOR UPDATE) = ₹${row.estimated_amount} (A's committed value!)`);

        const newVal = parseFloat(row.estimated_amount) + 2000;
        await connB.query("UPDATE claims SET estimated_amount = ? WHERE claim_id = '#CLM-2002'", [newVal]);
        log.B(`WROTE ₹${newVal}`);
        await connB.query('COMMIT');
        log.B(`COMMITTED ✅`);
    }

    await Promise.all([sessionA(), sessionB()]);

    const [[after]] = await connA.query("SELECT estimated_amount FROM claims WHERE claim_id = '#CLM-2002'");
    log.info(`\nFINAL in DB: ₹${after.estimated_amount}`);
    if (parseFloat(after.estimated_amount) === 32000) {
        log.good(`No lost update! Both additions preserved — ₹${after.estimated_amount} ✅`);
    }

    // Reset back
    await connA.query("UPDATE claims SET estimated_amount = 24000.00 WHERE claim_id = '#CLM-2002'");
    await connA.end();
    await connB.end();
}

// ══════════════════════════════════════════════════════════════════════
// DEMO 3: DEADLOCK
// Session A locks policies→claims, Session B locks claims→policies
// MySQL auto-detects and kills one session
// ══════════════════════════════════════════════════════════════════════
async function demo_deadlock() {
    log.title('DEMO 3: Deadlock — Two Sessions Lock Rows in Opposite Order');

    const connA = await mysql.createConnection(dbConfig);
    const connB = await mysql.createConnection(dbConfig);

    log.info('Session A will lock: policies row 1 → then claims row 1');
    log.info('Session B will lock: claims row 1   → then policies row 1');
    log.info('This creates a circular wait → DEADLOCK\n');

    async function sessionA() {
        try {
            await connA.query('START TRANSACTION');
            await connA.query('SELECT * FROM policies WHERE id = 1 FOR UPDATE');
            log.A(`Locked policies row 1 🔒`);

            await log.wait(500); // Give B time to lock claims row 1

            log.A(`Trying to lock claims row 1... (B has it)`);
            await connA.query('SELECT * FROM claims WHERE id = 1 FOR UPDATE');
            log.A(`Got claims row 1`);

            await connA.query("UPDATE policies SET status = 'renew_soon' WHERE id = 1");
            await connA.query('COMMIT');
            log.A(`COMMITTED ✅`);

        } catch (err) {
            await connA.query('ROLLBACK');
            log.A(`DEADLOCK VICTIM — ROLLED BACK ❌`);
            log.A(`MySQL Error: ${err.message}`);
        }
    }

    async function sessionB() {
        await log.wait(100); // Start slightly after A to ensure A locks first

        try {
            await connB.query('START TRANSACTION');
            await connB.query('SELECT * FROM claims WHERE id = 1 FOR UPDATE');
            log.B(`Locked claims row 1 🔒`);

            await log.wait(500); // Give A time to lock policies row 1

            log.B(`Trying to lock policies row 1... (A has it)`);
            await connB.query('SELECT * FROM policies WHERE id = 1 FOR UPDATE');
            log.B(`Got policies row 1`);

            await connB.query("UPDATE claims SET status = 'approved' WHERE id = 1");
            await connB.query('COMMIT');
            log.B(`COMMITTED ✅`);

        } catch (err) {
            await connB.query('ROLLBACK');
            log.B(`DEADLOCK VICTIM — ROLLED BACK ❌`);
            log.B(`MySQL Error: ${err.message}`);
        }
    }

    await Promise.all([sessionA(), sessionB()]);

    log.info('\nFix: Always lock tables in the SAME order in all transactions.');
    log.good('policies first → then claims. Never the reverse.');

    await connA.end();
    await connB.end();
}

// ══════════════════════════════════════════════════════════════════════
// DEMO 4: DIRTY READ PREVENTION
// Session A updates but doesn't commit
// Session B reads — sees clean (old) value due to MySQL's REPEATABLE READ
// ══════════════════════════════════════════════════════════════════════
async function demo_dirtyRead() {
    log.title('DEMO 4: Dirty Read Prevention (MySQL REPEATABLE READ)');

    const connA = await mysql.createConnection(dbConfig);
    const connB = await mysql.createConnection(dbConfig);

    const [[before]] = await connA.query("SELECT status FROM claims WHERE claim_id = '#CLM-2001'");
    log.info(`BEFORE: claim #CLM-2001 status = '${before.status}'`);
    log.info(`Session A will update to 'declined' but NOT commit.`);
    log.info(`Session B will read during A's uncommitted change.\n`);

    let aFinished = false;

    async function sessionA() {
        await connA.query('START TRANSACTION');
        await connA.query("UPDATE claims SET status = 'declined' WHERE claim_id = '#CLM-2001'");
        log.A(`Updated status to 'declined' — NOT committed yet`);

        await log.wait(1000); // Sit here without committing — B reads during this time

        await connA.query('ROLLBACK'); // Changed mind
        log.A(`ROLLED BACK — status was NEVER officially 'declined'`);
        aFinished = true;
    }

    async function sessionB() {
        await log.wait(300); // Wait for A to make its change first

        await connB.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        await connB.query('START TRANSACTION');
        const [[row]] = await connB.query("SELECT status FROM claims WHERE claim_id = '#CLM-2001'");
        log.B(`READ status = '${row.status}' (while A's change is uncommitted)`);

        if (row.status === before.status) {
            log.good(`Dirty Read PREVENTED ✅ — Saw '${row.status}' not A's uncommitted 'declined'`);
        } else {
            log.bad(`Dirty Read occurred! Saw '${row.status}' which A hasn't committed yet`);
        }

        await connB.query('COMMIT');
    }

    await Promise.all([sessionA(), sessionB()]);

    const [[after]] = await connA.query("SELECT status FROM claims WHERE claim_id = '#CLM-2001'");
    log.info(`\nFINAL status: '${after.status}' — unchanged, as expected ✅`);
    log.info(`MySQL's default REPEATABLE READ isolation prevented Session B from`);
    log.info(`seeing A's uncommitted (and later rolled back) change.`);

    await connA.end();
    await connB.end();
}

// ══════════════════════════════════════════════════════════════════════
// MAIN — Run all demos in sequence
// ══════════════════════════════════════════════════════════════════════
async function main() {
    console.log('\n\x1b[1m\x1b[35m');
    console.log('██████████████████████████████████████████████████████');
    console.log('   InsureWise — Task 6: Conflicting Transactions Demo  ');
    console.log('██████████████████████████████████████████████████████');
    console.log('\x1b[0m');

    try {
        await demo_lostUpdate_without_fix();
        await log.wait(500);

        await demo_lostUpdate_with_fix();
        await log.wait(500);

        await demo_deadlock();
        await log.wait(500);

        await demo_dirtyRead();

        console.log('\n\x1b[1m\x1b[32m');
        console.log('══════════════════════════════════════════════════════');
        console.log('  All conflict demos complete!');
        console.log('  Check transactions.sql for the full SQL submission.');
        console.log('══════════════════════════════════════════════════════');
        console.log('\x1b[0m');

    } catch (err) {
        console.error('\x1b[31mUnexpected error:\x1b[0m', err.message);
    }

    process.exit(0);
}

main();
