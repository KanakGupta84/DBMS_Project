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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;
    
    try {
        let query = `
            SELECT 
                p.*,
                COALESCE(AVG(f.rating), 0) as avg_rating,
                COUNT(f.id) as feedback_count
            FROM insurance_plans p
            LEFT JOIN policy_feedback f ON p.id = f.plan_id
        `;
        let queryParams = [];

        if (search) {
            query += ` WHERE p.name LIKE ? OR p.provider_name LIKE ? OR p.type LIKE ?`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ` GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
        queryParams.push(limit, offset);
        
        const [rows] = await db.query(query, queryParams);
        
        let countQuery = "SELECT COUNT(*) as total FROM insurance_plans p";
        let countParams = [];
        if (search) {
            countQuery += ` WHERE p.name LIKE ? OR p.provider_name LIKE ? OR p.type LIKE ?`;
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        const [[{ total }]] = await db.query(countQuery, countParams);
        
        res.json({
            plans: rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 6. Plans: Create a new plan (Admin)
app.post('/api/admin/plans', async (req, res) => {
    const { name, type, provider_name, description, coverage_limit, network, premium_amount, icon_type } = req.body;
    
    if (!name || !type || !premium_amount) {
        return res.status(400).json({ error: 'Required fields missing' });
    }

    try {
        const [result] = await db.query(
            "INSERT INTO insurance_plans (name, type, provider_name, description, coverage_limit, network, premium_amount, icon_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [name, type, provider_name || 'Generic Provider', description || '', coverage_limit || '', network || '', premium_amount, icon_type || 'shield']
        );
        res.status(201).json({ message: 'Plan added', planId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 7. Feedback: Add new feedback
app.post('/api/feedback', async (req, res) => {
    const { plan_id, rating, feedbackText, userId } = req.body;
    
    if (!plan_id || !rating || !feedbackText || !userId) {
        return res.status(400).json({ error: 'All fields required' });
    }

    try {
        await db.query(
            "INSERT INTO policy_feedback (user_id, plan_id, rating, feedback_text) VALUES (?, ?, ?, ?)",
            [userId, plan_id, rating, feedbackText]
        );
        res.status(201).json({ message: 'Feedback added' });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            res.status(400).json({ error: 'Invalid Plan ID. This plan might not exist in the database yet.'});
        } else {
            res.status(500).json({ error: 'Database error' });
        }
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
    const { user_id, plan_id, details } = req.body;
    
    if (!user_id || !plan_id) {
        return res.status(400).json({ error: 'user_id and plan_id are required' });
    }

    try {
        // Check if user already owns this plan
        const [existing] = await db.query(
            "SELECT id FROM policies WHERE user_id = ? AND plan_id = ?", [user_id, plan_id]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'You have already purchased this plan.' });
        }

        // Fetch the plan details from insurance_plans
        const [[plan]] = await db.query("SELECT * FROM insurance_plans WHERE id = ?", [plan_id]);
        if (!plan) return res.status(404).json({ error: 'Plan not found' });

        // Generate a unique policy number
        const policyNumber = 'IW-' + Date.now().toString(36).toUpperCase();
        
        // Set dates: start today, end 1 year from now
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

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
                    [policyId, details.vehicle_number, details.vehicle_model, details.registration_year]
                );
            } else if (plan.type === 'life') {
                await db.query(
                    "INSERT INTO policy_details (policy_id, nominee_name, nominee_relation, nominee_dob) VALUES (?, ?, ?, ?)",
                    [policyId, details.nominee_name, details.nominee_relation, details.nominee_dob]
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
        
        const [rows] = await db.query(query, queryParams);
        res.json(rows);
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

        // Fetch type-specific details
        const [details] = await db.query('SELECT * FROM policy_details WHERE policy_id = ?', [policyId]);
        policy.details = details.length > 0 ? details[0] : null;

        res.json(policy);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
