const db = require('./backend/db');

async function run() {
    try {
        await db.query(`DROP TRIGGER IF EXISTS trg_claim_within_limit`);
        await db.query(`
            CREATE TRIGGER trg_claim_within_limit
            BEFORE INSERT ON claims
            FOR EACH ROW
            BEGIN
                DECLARE v_sum DECIMAL(12,2);
                DECLARE v_claimed DECIMAL(12,2);

                SELECT sum_insured INTO v_sum FROM policies WHERE id = NEW.policy_id;

                SELECT COALESCE(SUM(estimated_amount), 0) INTO v_claimed
                FROM claims
                WHERE policy_id = NEW.policy_id AND status != 'declined' AND id != COALESCE(NEW.id, -1);

                IF (v_claimed + NEW.estimated_amount) > v_sum THEN
                    SIGNAL SQLSTATE '45000'
                        SET MESSAGE_TEXT = 'Claim amount exceeds the remaining sum insured.';
                END IF;
            END;
        `);
        console.log("Trigger updated successfully");
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
