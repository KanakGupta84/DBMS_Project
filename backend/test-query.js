const db = require('./db');

async function testQuery() {
    try {
        const query = `
            SELECT c.*, u.full_name, u.email, p.policy_number, p.type, ip.name as plan_name
            FROM claims c
            JOIN users u ON c.user_id = u.id
            JOIN policies p ON c.policy_id = p.id
            JOIN insurance_plans ip ON p.plan_id = ip.id
            ORDER BY c.created_at DESC
        `;
        const [rows] = await db.query(query);
        console.log("SUCCESS:", rows.length);
        process.exit(0);
    } catch (err) {
        console.error("SQL ERROR:", err.message);
        process.exit(1);
    }
}

testQuery();
