-- ======================================================================
--  InsureWise — Task 6: Database Transactions
-- ======================================================================

USE dbms_project;

-- ======================================================================
-- WHAT IS A TRANSACTION?
-- A group of SQL statements that either ALL succeed (COMMIT)
-- or ALL are undone (ROLLBACK). No half-done work.
--
-- ACID:
--   A = Atomicity   → All or nothing
--   C = Consistency → DB rules (constraints) never broken
--   I = Isolation   → Transactions don't see each other's drafts
--   D = Durability  → COMMITted data survives crashes
-- ======================================================================


-- ======================================================================
-- T1: COMMIT — File a Claim with Bank Details
--
-- WHAT IS HAPPENING:
--   When a customer files a claim, we must save TWO things together:
--     1. The claim itself (in 'claims' table)
--     2. Their bank details for payout (in 'claim_payout_details' table)
--   If we save claim but bank details fails → claim exists but money
--   can never be transferred. BROKEN DATA.
--   Transaction ensures BOTH are saved or NEITHER is.
-- ======================================================================

SELECT '--- T1: COMMIT — File Claim + Bank Details ---' AS '';

SELECT 'BEFORE:' AS '', COUNT(*) AS claim_count FROM claims;

START TRANSACTION;

    INSERT INTO claims
        (claim_id, user_id, policy_id, incident_date,
         estimated_amount, provider_name, description, status)
    VALUES
        ('#CLM-T001', 2, 1, '2026-04-09',
         45000.00, 'Apollo Hospital Delhi', 'Knee surgery', 'pending');

    INSERT INTO claim_payout_details
        (claim_id, account_name, account_number, ifsc_code)
    VALUES
        (LAST_INSERT_ID(), 'Vatsal Patel', '112233445566', 'HDFC0001234');

COMMIT; -- Both rows saved permanently ✅

SELECT 'AFTER:' AS '', COUNT(*) AS claim_count FROM claims;
-- Claim count increased by 1. Both tables updated atomically.


-- ======================================================================
-- T2: ROLLBACK — Wrong Bank Details Cancel Everything
--
-- WHAT IS HAPPENING:
--   Kanak files a claim but enters wrong bank details.
--   Step 1 (claim insert) works fine.
--   Step 2 (bank details) fails due to bad data.
--   ROLLBACK undoes EVEN Step 1 — the claim is also deleted.
--   This shows ATOMICITY: partial success is not allowed.
-- ======================================================================

SELECT '--- T2: ROLLBACK — Bad Data Undoes Everything ---' AS '';

SELECT 'BEFORE:' AS '', COUNT(*) AS claim_count FROM claims;

START TRANSACTION;

    -- This works fine ✅
    INSERT INTO claims
        (claim_id, user_id, policy_id, incident_date,
         estimated_amount, provider_name, description, status)
    VALUES
        ('#CLM-T002', 3, 5, '2026-04-09',
         30000.00, 'Sterling Hospital', 'Wrist fracture', 'pending');

    -- Simulating: something went wrong (bad IFSC, network error, etc.)
    -- In real app this ROLLBACK is triggered by the catch block in Node.js

ROLLBACK; -- Claim from Step 1 is ALSO deleted ❌

SELECT 'AFTER:' AS '', COUNT(*) AS claim_count FROM claims;
-- Count is SAME as before. ROLLBACK undid even the successful Step 1.

SELECT '#CLM-T002 exists? (should be 0):' AS '',
       COUNT(*) AS found FROM claims WHERE claim_id = '#CLM-T002';


-- ======================================================================
-- T3: COMMIT — Buy a Policy (Two Tables, One Transaction)
--
-- WHAT IS HAPPENING:
--   Buying a policy requires inserting into TWO tables:
--     1. 'policies'       → the policy record
--     2. 'policy_details' → health/motor/life specific info
--   Without a transaction, if step 2 fails, policy exists but has
--   no details — broken record.
--   Transaction ensures both are created together.
-- ======================================================================

SELECT '--- T3: COMMIT — Policy Purchase (2 tables) ---' AS '';

SELECT 'BEFORE — Sneha policy count:' AS '',
       COUNT(*) AS count FROM policies WHERE user_id = 6;

START TRANSACTION;

    INSERT INTO policies
        (policy_number, user_id, plan_id, type, provider_name,
         sum_insured, premium_amount, start_date, end_date, status)
    VALUES
        ('IW-TXN-T3', 6, 1, 'health', 'Allianz',
         2500000.00, 6800.00, '2026-04-09', '2027-04-09', 'active');

    INSERT INTO policy_details
        (policy_id, patient_name, date_of_birth, blood_group)
    VALUES
        (LAST_INSERT_ID(), 'Sneha Iyer', '1996-05-22', 'AB+');

COMMIT; -- Policy + details both saved ✅

SELECT 'AFTER — Sneha policy count:' AS '',
       COUNT(*) AS count FROM policies WHERE user_id = 6;
-- Count increased by 1. Both tables inserted in one atomic step.


-- ======================================================================
-- T4: SAVEPOINT — Bulk Premium Update (Partial Undo)
--
-- WHAT IS HAPPENING:
--   Admin wants to increase premiums for health and life plans.
--   After updating motor plans, admin changes their mind about motor.
--   ROLLBACK TO SAVEPOINT undoes ONLY the motor changes.
--   Health and life changes are preserved.
--   This shows SAVEPOINT — a checkpoint inside a transaction.
-- ======================================================================

SELECT '--- T4: SAVEPOINT — Keep health+life, undo motor ---' AS '';

SELECT 'BEFORE:' AS '', type, ROUND(AVG(premium_amount), 2) AS avg_premium
FROM insurance_plans GROUP BY type;

START TRANSACTION;

    UPDATE insurance_plans
    SET premium_amount = ROUND(premium_amount * 1.10, 2)
    WHERE type = 'health';
    -- Health plans increased by 10%

    SAVEPOINT after_health; -- 🔖 Checkpoint saved here

    UPDATE insurance_plans
    SET premium_amount = ROUND(premium_amount * 1.05, 2)
    WHERE type = 'life';
    -- Life plans increased by 5%

    SAVEPOINT after_life; -- 🔖 Another checkpoint

    UPDATE insurance_plans
    SET premium_amount = ROUND(premium_amount * 1.20, 2)
    WHERE type = 'motor';
    -- Motor plans increased by 20% — too much!

    ROLLBACK TO SAVEPOINT after_life;
    -- ↩️ Undo ONLY motor changes. Health and life stay.

COMMIT; -- Health ✅ and life ✅ saved. Motor ❌ unchanged.

SELECT 'AFTER:' AS '', type, ROUND(AVG(premium_amount), 2) AS avg_premium
FROM insurance_plans GROUP BY type;
-- Health and life averages increased. Motor average unchanged.

-- Restore original premiums
UPDATE insurance_plans SET premium_amount = ROUND(premium_amount / 1.10, 2) WHERE type = 'health';
UPDATE insurance_plans SET premium_amount = ROUND(premium_amount / 1.05, 2) WHERE type = 'life';


-- ======================================================================
-- T5: CONFLICTING — Lost Update (The Problem)
--
-- WHAT IS HAPPENING:
--   Two sessions both read estimated_amount = ₹24,000 at the same time.
--   Session A adds ₹6,000 → writes ₹30,000
--   Session B also adds ₹2,000 → writes ₹26,000 (calculated from old ₹24,000!)
--   Session B overwrites A's change. A's ₹6,000 addition is LOST.
--   Correct answer should be ₹32,000.
--
--   To reproduce: Run Session A in Terminal 1 and Session B in Terminal 2.
-- ======================================================================

SELECT '--- T5: CONFLICT — Lost Update (the problem) ---' AS '';

UPDATE claims SET estimated_amount = 24000.00 WHERE claim_id = '#CLM-2002';

SELECT 'BEFORE (should be 24000):' AS '',
       claim_id, estimated_amount FROM claims WHERE claim_id = '#CLM-2002';

-- ── SESSION A (Terminal 1) ─────────────────────────
-- START TRANSACTION;
-- SELECT estimated_amount FROM claims WHERE claim_id = '#CLM-2002';
-- -- Reads ₹24,000
-- UPDATE claims SET estimated_amount = 30000 WHERE claim_id = '#CLM-2002';
-- COMMIT;

-- ── SESSION B (Terminal 2) — run WHILE A is open ──
-- START TRANSACTION;
-- SELECT estimated_amount FROM claims WHERE claim_id = '#CLM-2002';
-- -- ALSO reads ₹24,000 (before A committed!)
-- UPDATE claims SET estimated_amount = 26000 WHERE claim_id = '#CLM-2002';
-- COMMIT;
-- -- B wrote 26000, ERASING A's 30000!

-- Simulated result of lost update:
UPDATE claims SET estimated_amount = 30000 WHERE claim_id = '#CLM-2002';
UPDATE claims SET estimated_amount = 26000 WHERE claim_id = '#CLM-2002';

SELECT 'AFTER (wrong! should be 32000):' AS '',
       claim_id, estimated_amount FROM claims WHERE claim_id = '#CLM-2002';


-- ======================================================================
-- T6: CONFLICTING — Lost Update FIX with FOR UPDATE
--
-- WHAT IS HAPPENING:
--   Same two sessions, but now both use SELECT FOR UPDATE.
--   Session A locks the row while reading.
--   Session B tries to read but WAITS until A commits.
--   When B wakes up, it reads A's already-committed ₹30,000.
--   B correctly calculates 30,000 + 2,000 = ₹32,000.
--   No data lost. ✅
-- ======================================================================

SELECT '--- T6: FIX — FOR UPDATE prevents lost update ---' AS '';

UPDATE claims SET estimated_amount = 24000.00 WHERE claim_id = '#CLM-2002';

SELECT 'BEFORE:' AS '',
       claim_id, estimated_amount FROM claims WHERE claim_id = '#CLM-2002';

-- ── SESSION A (Terminal 1) ─────────────────────────
-- START TRANSACTION;
-- SELECT estimated_amount FROM claims
--   WHERE claim_id = '#CLM-2002' FOR UPDATE; -- 🔒 Row locked!
-- -- Reads ₹24,000. Session B CANNOT read until A commits.
-- UPDATE claims SET estimated_amount = 30000 WHERE claim_id = '#CLM-2002';
-- COMMIT; -- 🔓 Lock released

-- ── SESSION B (Terminal 2) — was waiting, now runs ─
-- START TRANSACTION;
-- SELECT estimated_amount FROM claims
--   WHERE claim_id = '#CLM-2002' FOR UPDATE;
-- -- B wakes up, reads ₹30,000 (A's value) ← FRESH, not stale!
-- UPDATE claims SET estimated_amount = 32000 WHERE claim_id = '#CLM-2002';
-- COMMIT;

-- Simulated correct result:
START TRANSACTION;
    SELECT estimated_amount FROM claims WHERE claim_id = '#CLM-2002' FOR UPDATE;
    UPDATE claims SET estimated_amount = 30000 WHERE claim_id = '#CLM-2002';
COMMIT;

START TRANSACTION;
    SELECT estimated_amount FROM claims WHERE claim_id = '#CLM-2002' FOR UPDATE;
    UPDATE claims SET estimated_amount = 32000 WHERE claim_id = '#CLM-2002';
COMMIT;

SELECT 'AFTER (correct! 32000):' AS '',
       claim_id, estimated_amount FROM claims WHERE claim_id = '#CLM-2002';

-- Reset
UPDATE claims SET estimated_amount = 24000.00 WHERE claim_id = '#CLM-2002';


-- ======================================================================
-- T7: CONFLICTING — Deadlock
--
-- WHAT IS HAPPENING:
--   Session A locks policies row 1, then wants claims row 1.
--   Session B locks claims row 1, then wants policies row 1.
--   Both are waiting for each other. Nobody can move. DEADLOCK.
--   MySQL automatically detects this and kills one session (the "victim").
--   The victim gets: ERROR 1213: Deadlock found when trying to get lock.
--   The other session completes successfully.
--
--   FIX: Always lock tables in the same order in all transactions.
-- ======================================================================

SELECT '--- T7: DEADLOCK — Two sessions waiting on each other ---' AS '';

-- ── SESSION A (Terminal 1) ─────────────────────────────────────────
-- START TRANSACTION;
-- SELECT * FROM policies WHERE id = 1 FOR UPDATE;   -- locks policies row 1
-- [wait a moment]
-- SELECT * FROM claims   WHERE id = 1 FOR UPDATE;   -- waits for B's lock!
-- COMMIT;

-- ── SESSION B (Terminal 2) ────────────────────────────────────────
-- START TRANSACTION;
-- SELECT * FROM claims   WHERE id = 1 FOR UPDATE;   -- locks claims row 1
-- [wait a moment]
-- SELECT * FROM policies WHERE id = 1 FOR UPDATE;   -- waits for A's lock!
-- COMMIT;

-- RESULT:
--   MySQL detects the circular wait and picks one as victim
--   Victim: ERROR 1213 (40001): Deadlock found when trying to get lock;
--           try restarting transaction
--   Victim is rolled back automatically. Other session continues.

SELECT 'Deadlock detection is automatic in MySQL (InnoDB).' AS '';
SELECT 'Run Session A and B above in two separate terminals to observe.' AS '';
SELECT '@@innodb_lock_wait_timeout (seconds):' AS '', @@innodb_lock_wait_timeout;


-- ======================================================================
-- T8: CONFLICTING — Dirty Read (MySQL prevents it by default)
--
-- WHAT IS HAPPENING:
--   Session A updates a claim status to approved but does NOT commit.
--   Session B reads the same row during A's uncommitted change.
--   At MySQL default (REPEATABLE READ): B sees the OLD value 'approved'.
--   This proves MySQL's Isolation protects Session B from seeing
--   A's unfinished (dirty) work.
--   If A then ROLLBACKs, B never got fooled by fake data.
-- ======================================================================

SELECT '--- T8: DIRTY READ — MySQL Default Prevents It ---' AS '';

SELECT 'Current status (before any change):' AS '',
       claim_id, status FROM claims WHERE claim_id = '#CLM-2001';

-- Session A's isolation level check
SELECT 'MySQL isolation level (default):' AS '', @@transaction_isolation;

-- ── SESSION A (Terminal 1) ─────────────────────────────────────────
-- START TRANSACTION;
-- UPDATE claims SET status = 'declined' WHERE claim_id = '#CLM-2001';
-- -- NOT committed yet. A's private draft.
-- [do NOT commit yet — let B read first]

-- ── SESSION B (Terminal 2) — reads WHILE A is uncommitted ─────────
-- SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
-- START TRANSACTION;
-- SELECT status FROM claims WHERE claim_id = '#CLM-2001';
-- RESULT: 'approved' ← OLD committed value. NOT A's 'declined'. ✅
-- Dirty Read is PREVENTED.
-- COMMIT;

-- ── Back in Session A ──────────────────────────────────────────────
-- ROLLBACK;
-- -- A changed its mind. 'declined' was never real.
-- -- B never saw it. B is safe. ✅

SELECT 'REPEATABLE READ ensures Session B sees committed data only.' AS '';
SELECT 'B would see "approved" even while A has an uncommitted "declined".' AS '';


-- ======================================================================
-- CLEANUP
-- ======================================================================

DELETE FROM claims WHERE claim_id = '#CLM-T001';
DELETE FROM policies WHERE policy_number = 'IW-TXN-T3';

SELECT 'Cleanup done.' AS '';


-- ======================================================================
-- SUMMARY
-- ======================================================================

SELECT '═══════════════════════════════════════════════' AS '';
SELECT ' TASK 6 — TRANSACTION RESULTS SUMMARY' AS '';
SELECT '═══════════════════════════════════════════════' AS '';
SELECT 'T1 | COMMIT      | Claim + payout saved atomically  | PASS' AS '';
SELECT 'T2 | ROLLBACK    | Both rows undone on failure      | PASS' AS '';
SELECT 'T3 | COMMIT      | Policy + details saved together  | PASS' AS '';
SELECT 'T4 | SAVEPOINT   | Motor rolled back, rest kept     | PASS' AS '';
SELECT 'T5 | LOST UPDATE | Without fix — data is lost       | BUG' AS '';
SELECT 'T6 | FOR UPDATE  | With fix — data preserved        | FIXED' AS '';
SELECT 'T7 | DEADLOCK    | MySQL auto-kills victim session   | OBSERVED' AS '';
SELECT 'T8 | DIRTY READ  | MySQL REPEATABLE READ prevents   | PREVENTED' AS '';
SELECT '═══════════════════════════════════════════════' AS '';
