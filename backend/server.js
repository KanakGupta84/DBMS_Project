require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow requests from frontend
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// --- API ENDPOINTS ---

// 1. Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', time: new Date() });
});

// 2. Auth: Register (Example)
app.post('/api/auth/register', async (req, res) => {
    const { full_name, email, password } = req.body;
    
    if (!full_name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
        
        const [result] = await db.query(
            "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)",
            [full_name, email, passwordHash]
        );
        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ error: 'Email already exists' });
        } else {
            console.error(err);
            res.status(500).json({ error: 'Database error' });
        }
    }
});

// 3. Auth: Login (Example)
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    try {
        const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
        const [rows] = await db.query("SELECT id, full_name, email, role FROM users WHERE email = ? AND password_hash = ?", [email, passwordHash]);
        
        if (rows.length > 0) {
            // Respond with user data (In a real app, generate a JWT token here)
            res.json({ message: 'Login successful', user: rows[0] });
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});


// 5. Plans: Get all plans (with avg rating and pagination)
app.get('/api/plans', async (req, res) => {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 4;
    const search = req.query.search || '';
    const type   = req.query.type   || '';
    const offset = (page - 1) * limit;

    try {
        const conditions  = [];
        const baseParams  = [];

        if (search) {
            conditions.push(`(p.name LIKE ? OR p.provider_name LIKE ? OR p.type LIKE ?)`);
            baseParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (type) {
            conditions.push(`p.type = ?`);
            baseParams.push(type);
        }

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

        const [rows] = await db.query(
            `SELECT p.*, COALESCE(AVG(f.rating), 0) as avg_rating, COUNT(f.id) as feedback_count
             FROM insurance_plans p
             LEFT JOIN policy_feedback f ON p.id = f.plan_id
             ${where}
             GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
            [...baseParams, limit, offset]
        );

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) as total FROM insurance_plans p ${where}`,
            baseParams
        );

        res.json({
            plans: rows,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 6. Plans: Create a new plan (Admin)
app.post('/api/admin/plans', async (req, res) => {
    const { name, type, provider_name, description, coverage_limit, network, premium_amount, icon_type, duration_days, renew_warning_days } = req.body;
    
    if (!name || !type || !premium_amount) {
        return res.status(400).json({ error: 'Required fields missing' });
    }

    const dDays = duration_days ? parseInt(duration_days) : 365;
    const rwDays = renew_warning_days !== undefined ? parseInt(renew_warning_days) : 30;
    
    if (dDays <= 0) return res.status(400).json({ error: 'Duration must be greater than 0.' });
    if (rwDays < 0 || rwDays >= dDays) return res.status(400).json({ error: 'Renew warning must be >= 0 and less than duration.' });

    try {
        const [result] = await db.query(
            "INSERT INTO insurance_plans (name, type, provider_name, description, coverage_limit, network, premium_amount, icon_type, duration_days, renew_warning_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [name, type, provider_name || 'Generic Provider', description || '', coverage_limit || '', network || '', premium_amount, icon_type || 'shield', dDays, rwDays]
        );
        res.status(201).json({ message: 'Plan added', planId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin: List all plans with active policy counts
app.get('/api/admin/plans', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT ip.*,
                   COUNT(CASE WHEN p.status IN ('active', 'renew_soon') THEN 1 END) AS active_count,
                   COUNT(p.id) AS total_policy_count
            FROM insurance_plans ip
            LEFT JOIN policies p ON ip.id = p.plan_id
            GROUP BY ip.id
            ORDER BY ip.type, ip.name
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin: Delete a plan (blocked if any active/renew_soon policies)
app.delete('/api/admin/plans/:id', async (req, res) => {
    const planId = req.params.id;
    try {
        const [[{ active_count }]] = await db.query(
            `SELECT COUNT(*) AS active_count FROM policies
             WHERE plan_id = ? AND status IN ('active', 'renew_soon')`,
            [planId]
        );
        if (active_count > 0) {
            return res.status(409).json({
                error: `Cannot remove: ${active_count} active ${active_count === 1 ? 'policy is' : 'policies are'} currently using this plan.`
            });
        }
        const [result] = await db.query('DELETE FROM insurance_plans WHERE id = ?', [planId]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Plan not found.' });
        res.json({ message: 'Plan removed successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 7. Feedback: Add new feedback (UPSERT for single user-plan review)
app.post('/api/feedback', async (req, res) => {
    const { plan_id, rating, feedbackText, userId } = req.body;
    
    if (!plan_id || !rating || !feedbackText || !userId) {
        return res.status(400).json({ error: 'All fields required' });
    }

    try {
        const [existing] = await db.query("SELECT id FROM policy_feedback WHERE user_id = ? AND plan_id = ?", [userId, plan_id]);
        
        if (existing.length > 0) {
            await db.query(
                "UPDATE policy_feedback SET rating = ?, feedback_text = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?",
                [rating, feedbackText, existing[0].id]
            );
            res.status(200).json({ message: 'Feedback updated' });
        } else {
            await db.query(
                "INSERT INTO policy_feedback (user_id, plan_id, rating, feedback_text) VALUES (?, ?, ?, ?)",
                [userId, plan_id, rating, feedbackText]
            );
            res.status(201).json({ message: 'Feedback added' });
        }
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            res.status(400).json({ error: 'Invalid Plan ID. This plan might not exist in the database yet.'});
        } else {
            res.status(500).json({ error: 'Database error' });
        }
    }
});

// 7b. Feedback: Get a specific user's feedback for a plan
app.get('/api/feedback/me', async (req, res) => {
    const { user_id, plan_id } = req.query;
    if (!user_id || !plan_id) return res.status(400).json({ error: 'Missing parameters' });
    
    try {
        const [rows] = await db.query(
            "SELECT * FROM policy_feedback WHERE user_id = ? AND plan_id = ?",
            [user_id, plan_id]
        );
        if (rows.length > 0) res.json(rows[0]);
        else res.json(null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 8. Feedback: Get feedback for a specific plan
app.get('/api/feedback', async (req, res) => {
    const plan_id = req.query.plan_id;
    
    if (!plan_id) return res.status(400).json({ error: 'Missing plan_id parameter' });

    try {
        const [rows] = await db.query(
            "SELECT f.rating, f.feedback_text, f.created_at, u.full_name as user_name FROM policy_feedback f JOIN users u ON f.user_id = u.id WHERE f.plan_id = ? ORDER BY f.created_at DESC",
            [plan_id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 9. My Policies: Purchase a plan (Select Plan)
app.post('/api/my-policies', async (req, res) => {
    const { user_id, plan_id, details, force_motor } = req.body;

    if (!user_id || !plan_id) {
        return res.status(400).json({ error: 'user_id and plan_id are required' });
    }

    try {
        // Fetch plan first so we know the type before duplicate checks
        const [[plan]] = await db.query("SELECT * FROM insurance_plans WHERE id = ?", [plan_id]);
        if (!plan) return res.status(404).json({ error: 'Plan not found' });

        if (plan.type !== 'motor') {
            // Non-motor: one policy per plan per user
            const [existing] = await db.query(
                "SELECT id FROM policies WHERE user_id = ? AND plan_id = ?", [user_id, plan_id]
            );
            if (existing.length > 0) {
                return res.status(409).json({ error: 'You have already purchased this plan.' });
            }
        } else {
            // Motor: allow multiple cars, but warn if same vehicle_number already covered
            if (details && details.vehicle_number && !force_motor) {
                const [vehExisting] = await db.query(
                    `SELECT pd.id FROM policy_details pd
                     JOIN policies p ON pd.policy_id = p.id
                     WHERE p.user_id = ? AND pd.vehicle_number = ?`,
                    [user_id, details.vehicle_number.trim().toUpperCase()]
                );
                if (vehExisting.length > 0) {
                    return res.status(409).json({
                        error: `Vehicle ${details.vehicle_number.toUpperCase()} is already insured under another policy.`,
                        vehicle_duplicate: true
                    });
                }
            }
        }

        // Generate unique policy number; compute end_date from plan.duration_days
        const policyNumber = 'IW-' + Date.now().toString(36).toUpperCase();
        const startDate    = new Date().toISOString().split('T')[0];
        const endDate      = new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [result] = await db.query(
            "INSERT INTO policies (policy_number, user_id, plan_id, type, provider_name, sum_insured, premium_amount, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')",
            [policyNumber, user_id, plan_id, plan.type, plan.provider_name, parseFloat(plan.premium_amount) * 100, plan.premium_amount, startDate, endDate]
        );

        const policyId = result.insertId;

        // Insert type-specific details
        if (details) {
            if (plan.type === 'health') {
                await db.query(
                    "INSERT INTO policy_details (policy_id, patient_name, date_of_birth, blood_group, pre_existing_conditions) VALUES (?, ?, ?, ?, ?)",
                    [policyId, details.patient_name, details.date_of_birth, details.blood_group, details.pre_existing_conditions || null]
                );
            } else if (plan.type === 'motor') {
                await db.query(
                    "INSERT INTO policy_details (policy_id, vehicle_number, vehicle_model, registration_year) VALUES (?, ?, ?, ?)",
                    [policyId, (details.vehicle_number || '').toUpperCase(), details.vehicle_model, details.registration_year]
                );
            } else if (plan.type === 'life') {
                await db.query(
                    "INSERT INTO policy_details (policy_id, nominee_name, nominee_relation, nominee_dob, nominee_user_id) VALUES (?, ?, ?, ?, ?)",
                    [policyId, details.nominee_name, details.nominee_relation, details.nominee_dob, details.nominee_user_id || null]
                );
            }
        }

        res.status(201).json({ message: 'Policy purchased successfully!', policyNumber, id: policyId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 9b. My Policies: Remove/Cancel a policy
app.delete('/api/my-policies/:id', async (req, res) => {
    const policyId = req.params.id;
    const { user_id } = req.body;

    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    try {
        const [result] = await db.query(
            "DELETE FROM policies WHERE id = ? AND user_id = ?", [policyId, user_id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Policy not found or not owned by you.' });
        }
        res.json({ message: 'Policy removed successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 10. My Policies: Get user's purchased policies
app.get('/api/my-policies', async (req, res) => {
    const user_id = req.query.user_id;
    const search = req.query.search || '';
    const statusFilter = req.query.status || 'all';
    
    if (!user_id) return res.status(400).json({ error: 'Missing user_id parameter' });

    try {
        let query = `
            SELECT p.id, p.plan_id, p.policy_number, p.type, p.provider_name, p.sum_insured, p.premium_amount, p.start_date, p.end_date, p.status,
                   ip.name as plan_name
            FROM policies p
            LEFT JOIN insurance_plans ip ON p.plan_id = ip.id
            WHERE p.user_id = ?
        `;
        let queryParams = [user_id];

        if (statusFilter !== 'all') {
            query += ` AND p.status = ?`;
            queryParams.push(statusFilter);
        }

        if (search) {
            query += ` AND (p.policy_number LIKE ? OR p.provider_name LIKE ? OR p.type LIKE ? OR ip.name LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        query += ` GROUP BY p.id ORDER BY p.start_date DESC`;

        // Auto-expire any policies past their end_date before returning
        const today = new Date().toISOString().split('T')[0];
        await db.query(
            `UPDATE policies SET status = 'expired' WHERE user_id = ? AND status IN ('active', 'renew_soon') AND end_date < ?`,
            [user_id, today]
        );

        // Auto-renew_soon
        await db.query(
            `UPDATE policies p 
             JOIN insurance_plans ip ON p.plan_id = ip.id 
             SET p.status = 'renew_soon' 
             WHERE p.user_id = ? AND p.status = 'active' 
             AND DATEDIFF(p.end_date, CURRENT_DATE()) <= ip.renew_warning_days 
             AND DATEDIFF(p.end_date, CURRENT_DATE()) >= 0`,
            [user_id]
        );

        const [updatedRows] = await db.query(query, queryParams);
        res.json(updatedRows);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// 10. My Claims: Get user's claims
app.get('/api/my-claims', async (req, res) => {
    const user_id = req.query.user_id;
    const search = req.query.search || '';
    
    if (!user_id) return res.status(400).json({ error: 'Missing user_id parameter' });

    try {
        let query = `
            SELECT c.*, p.type as policy_type, p.policy_number, p.provider_name as policy_provider
            FROM claims c
            JOIN policies p ON c.policy_id = p.id
            WHERE c.user_id = ?
        `;
        let queryParams = [user_id];

        if (search) {
            query += ` AND (c.claim_id LIKE ? OR c.provider_name LIKE ? OR c.description LIKE ? OR p.type LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        query += ` GROUP BY c.id ORDER BY c.created_at DESC`;
        
        const [rows] = await db.query(query, queryParams);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// 10b. Submit a new Claim
app.post('/api/claims', async (req, res) => {
    const { user_id, policy_number, incident_date, amount, provider_name, description, account_name, account_number, ifsc_code } = req.body;

    if (!user_id || !policy_number || !incident_date || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        console.log("---- CLAIM SUBMISSION DEBUG ----");
        console.log("Entire Payload Received:", req.body);
        console.log("Extracted user_id:", user_id);
        console.log("Extracted policy_number (raw):", `"${policy_number}"`);
        
        // Find the policy_id belonging to the user
        const cleanPolicyNumber = policy_number.trim();
        console.log("Cleaned policy_number (trimmed):", `"${cleanPolicyNumber}"`);

        const [[policy]] = await db.query('SELECT id FROM policies WHERE policy_number = ? AND user_id = ?', [cleanPolicyNumber, user_id]);
        
        console.log("Database Query Policy Result:", policy);
        console.log("--------------------------------");

        if (!policy) {
            return res.status(404).json({ error: 'Policy not found or does not belong to you' });
        }

        // Generate a random Claim ID (e.g. #CLM-892341)
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const claimIdStr = `#CLM-${randomNum}`;

        // Insert into claims
        const [claimResult] = await db.query(`
            INSERT INTO claims (claim_id, user_id, policy_id, incident_date, estimated_amount, provider_name, description, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `, [claimIdStr, user_id, policy.id, incident_date, amount, provider_name, description]);

        // Insert into bank details
        await db.query(`
            INSERT INTO claim_payout_details (claim_id, account_name, account_number, ifsc_code)
            VALUES (?, ?, ?, ?)
        `, [claimResult.insertId, account_name, account_number, ifsc_code]);

        res.status(201).json({ message: 'Claim submitted successfully', claim_id: claimIdStr });

    } catch (err) {
        console.error(err);
        // Check if the error is from a MySQL TRIGGER (SIGNAL SQLSTATE '45000')
        if (err.errno === 1644) {
            return res.status(400).json({ error: err.sqlMessage });
        }
        res.status(500).json({ error: 'Database error while submitting claim' });
    }
});

// --- Admin Endpoints ---

// 12. Get all claims for Admin
app.get('/api/admin/claims', async (req, res) => {
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
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 13. Update Claim Status
app.put('/api/admin/claims/:id/status', async (req, res) => {
    const claimId = req.params.id;
    const { status } = req.body; // 'approved' or 'declined'
    
    if (!['approved', 'declined'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const [result] = await db.query('UPDATE claims SET status = ? WHERE id = ?', [status, claimId]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Claim not found' });
        res.json({ message: 'Status updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 11. Single Policy Detail
app.get('/api/my-policies/:id', async (req, res) => {
    const policyId = req.params.id;
    const user_id = req.query.user_id;

    if (!user_id) return res.status(400).json({ error: 'Missing user_id parameter' });

    try {
        const [[policy]] = await db.query(`
            SELECT p.*, ip.name as plan_name, ip.description as plan_description,
                   ip.coverage_limit, ip.network, ip.icon_type
            FROM policies p
            LEFT JOIN insurance_plans ip ON p.plan_id = ip.id
            WHERE p.id = ? AND p.user_id = ?
        `, [policyId, user_id]);

        if (!policy) return res.status(404).json({ error: 'Policy not found' });

        // Auto-expire or renew_soon if applicable
        if (policy.status === 'active' || policy.status === 'renew_soon') {
            const todayD = new Date().toISOString().split('T')[0];
            if (new Date(policy.end_date) < new Date(todayD)) {
                await db.query('UPDATE policies SET status = ? WHERE id = ?', ['expired', policyId]);
                policy.status = 'expired';
            } else if (policy.status === 'active') {
                const [rwdRows] = await db.query('SELECT renew_warning_days FROM insurance_plans WHERE id = ?', [policy.plan_id]);
                const warningDays = rwdRows.length ? rwdRows[0].renew_warning_days : 30;
                const daysLeft = (new Date(policy.end_date) - new Date()) / (1000 * 60 * 60 * 24);
                if (daysLeft <= warningDays && daysLeft >= 0) {
                    await db.query('UPDATE policies SET status = ? WHERE id = ?', ['renew_soon', policyId]);
                    policy.status = 'renew_soon';
                }
            }
        }

        // Fetch type-specific details
        const [details] = await db.query('SELECT * FROM policy_details WHERE policy_id = ?', [policyId]);
        policy.details = details.length > 0 ? details[0] : null;

        res.json(policy);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// User search (for nominee account linking)
app.get('/api/users/search', async (req, res) => {
    const q = req.query.q || '';
    if (q.trim().length < 2) return res.json([]);
    try {
        const [rows] = await db.query(
            'SELECT id, full_name, email FROM users WHERE full_name LIKE ? OR email LIKE ? LIMIT 6',
            [`%${q}%`, `%${q}%`]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Nominee policies — life policies where the logged-in user is listed as nominee
app.get('/api/my-nominee-policies', async (req, res) => {
    const user_id = req.query.user_id;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    try {
        const [rows] = await db.query(`
            SELECT
                pd.nominee_name, pd.nominee_relation,
                p.policy_number, p.premium_amount, p.start_date, p.end_date, p.status,
                ip.name        AS plan_name,
                ip.coverage_limit,
                u.full_name    AS policy_holder_name
            FROM policy_details pd
            JOIN policies        p  ON pd.policy_id  = p.id
            JOIN insurance_plans ip ON p.plan_id     = ip.id
            JOIN users           u  ON p.user_id     = u.id
            WHERE pd.nominee_user_id = ? AND p.type = 'life'
            ORDER BY p.start_date DESC
        `, [user_id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});