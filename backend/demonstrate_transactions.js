const db = require('./db');

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Demonstration 1: Handling "Lost Update" using FOR UPDATE (Row-level Locking)
// ============================================================================
async function demonstrateLostUpdateLocking() {
    console.log('\n--- DEMONSTRATION 1: Concurrency Control (Row Locking) ---');
    console.log('Scenario: Two transactions try to update the premium_amount of the same policy concurrently.');
    console.log('Without FOR UPDATE, one transaction would overwrite the other (Lost Update).');
    console.log('With FOR UPDATE, Transaction 2 waits for Transaction 1 to complete.\n');

    const policyId = 1; // Assuming policy 1 exists

    // We will use two separate connections from the pool to simulate two concurrent users
    const conn1 = await db.getConnection();
    const conn2 = await db.getConnection();

    try {
        console.log('[Tx 1] Starting Transaction 1...');
        await conn1.beginTransaction();
        console.log('[Tx 2] Starting Transaction 2...');
        await conn2.beginTransaction();

        // Transaction 1 locks the row
        console.log(`[Tx 1] Executing SELECT ... FOR UPDATE on Policy ${policyId}`);
        const [rows1] = await conn1.query('SELECT premium_amount FROM policies WHERE id = ? FOR UPDATE', [policyId]);
        let currentPremium = rows1[0].premium_amount;
        console.log(`[Tx 1] Read premium_amount: ₹${currentPremium}. Simulating some processing time (3 seconds)...`);

        // Transaction 2 tries to read the same row with FOR UPDATE
        // This will block and wait because Transaction 1 holds the lock!
        console.log(`[Tx 2] Executing SELECT ... FOR UPDATE on Policy ${policyId}. (THIS WILL WAITING FOR Tx 1 TO FINISH)`);
        
        const tx2Promise = conn2.query('SELECT premium_amount FROM policies WHERE id = ? FOR UPDATE', [policyId])
            .then(async ([rows2]) => {
                console.log(`[Tx 2] Lock acquired! Read premium_amount: ₹${rows2[0].premium_amount}`);
                let updatedPremium2 = parseFloat(rows2[0].premium_amount) + 500;
                console.log(`[Tx 2] Updating premium to ₹${updatedPremium2}`);
                await conn2.query('UPDATE policies SET premium_amount = ? WHERE id = ?', [updatedPremium2, policyId]);
                await conn2.commit();
                console.log('[Tx 2] Transaction 2 Committed successfully.');
            });

        // Simulate some processing delay for Tx 1
        await delay(3000);

        // Transaction 1 updates and commits
        let updatedPremium1 = parseFloat(currentPremium) + 1000;
        console.log(`[Tx 1] Updating premium to ₹${updatedPremium1}`);
        await conn1.query('UPDATE policies SET premium_amount = ? WHERE id = ?', [updatedPremium1, policyId]);
        await conn1.commit();
        console.log('[Tx 1] Transaction 1 Committed. Released lock.');

        // Wait for Tx 2 to finish
        await tx2Promise;

        // Verify final state
        const [finalRows] = await db.query('SELECT premium_amount FROM policies WHERE id = ?', [policyId]);
        console.log(`\n[Result] Final premium_amount in database: ₹${finalRows[0].premium_amount} (Both updates applied sequentially thanks to locking)`);

    } catch (error) {
        console.error('Error in Demonstration 1:', error);
        await conn1.rollback();
        await conn2.rollback();
    } finally {
        conn1.release();
        conn2.release();
    }
}


// ============================================================================
// Demonstration 2: Intentional Deadlock Handling
// ============================================================================
async function demonstrateDeadlock() {
    console.log('\n--- DEMONSTRATION 2: Deadlock Handling ---');
    console.log('Scenario: Tx1 locks Policy 1, Tx2 locks Policy 2.');
    console.log('Then Tx1 tries to lock Policy 2 (waits for Tx2).');
    console.log('Then Tx2 tries to lock Policy 1 (waits for Tx1).');
    console.log('MySQL detects this circular wait and kills one transaction (Deadlock).\n');

    const policyIdA = 2; // Assuming policy 2 exists
    const policyIdB = 3; // Assuming policy 3 exists

    const conn1 = await db.getConnection();
    const conn2 = await db.getConnection();

    try {
        console.log('[Tx 1] Starting Transaction 1...');
        await conn1.beginTransaction();
        console.log('[Tx 2] Starting Transaction 2...');
        await conn2.beginTransaction();

        // Step 1: Both get their first lock
        console.log(`[Tx 1] Locking Policy ${policyIdA}...`);
        await conn1.query('SELECT * FROM policies WHERE id = ? FOR UPDATE', [policyIdA]);
        
        console.log(`[Tx 2] Locking Policy ${policyIdB}...`);
        await conn2.query('SELECT * FROM policies WHERE id = ? FOR UPDATE', [policyIdB]);

        // Small delay to ensure both have their first locks
        await delay(1000);

        // Step 2: Create deadlock
        console.log(`[Tx 1] Trying to lock Policy ${policyIdB} (will wait for Tx 2)...`);
        const p1 = conn1.query('SELECT * FROM policies WHERE id = ? FOR UPDATE', [policyIdB])
            .then(async () => {
                console.log('[Tx 1] Got second lock. Committing.');
                await conn1.commit();
            })
            .catch(async (err) => {
                console.error(`[Tx 1] Error caught: ${err.message}`);
                console.log('[Tx 1] Rolling back due to deadlock.');
                await conn1.rollback();
            });

        // Small delay to ensure Tx 1 is waiting
        await delay(500);

        console.log(`[Tx 2] Trying to lock Policy ${policyIdA} (will wait for Tx 1 -> BOOM! DEADLOCK)...`);
        const p2 = conn2.query('SELECT * FROM policies WHERE id = ? FOR UPDATE', [policyIdA])
            .then(async () => {
                console.log('[Tx 2] Got second lock. Committing.');
                await conn2.commit();
            })
            .catch(async (err) => {
                console.error(`\n[Tx 2] Error caught: ${err.message}`);
                console.log('[Tx 2] Rolling back due to deadlock.');
                await conn2.rollback();
            });

        await Promise.all([p1, p2]);

    } catch (error) {
        console.error('Unexpected error:', error);
    } finally {
        conn1.release();
        conn2.release();
    }
}

async function run() {
    console.log("==========================================================");
    console.log("    DATABASE TRANSACTIONS & CONCURRENCY DEMONSTRATION     ");
    console.log("==========================================================\n");
    
    await demonstrateLostUpdateLocking();
    await delay(2000);
    await demonstrateDeadlock();

    console.log('\nDemonstration complete. Exiting...');
    process.exit(0);
}

run();
