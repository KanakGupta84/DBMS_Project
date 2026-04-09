-- ======================================================================
--  InsureWise — Final Dummy Data  (v3)
--  Users: Mridul (admin), Vatsal, Kanak, Anjali, Rohan, Sneha
--  Password for all:  password123
-- ======================================================================

USE dbms_project;

SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM policy_details;
DELETE FROM policy_feedback;
DELETE FROM claim_payout_details;
DELETE FROM claims;
DELETE FROM policies;
DELETE FROM insurance_plans;
DELETE FROM users;
SET FOREIGN_KEY_CHECKS = 1;

ALTER TABLE users            AUTO_INCREMENT = 1;
ALTER TABLE insurance_plans  AUTO_INCREMENT = 1;
ALTER TABLE policies         AUTO_INCREMENT = 1;
ALTER TABLE claims           AUTO_INCREMENT = 1;
ALTER TABLE policy_feedback  AUTO_INCREMENT = 1;
ALTER TABLE policy_details   AUTO_INCREMENT = 1;

-- ======================================================================
-- 1.  USERS
--     SHA-256("password123") = ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f
-- ======================================================================
-- ID  Name              Email                    Role
-- 1   Mridul Verma      mridul@insurewise.com    admin
-- 2   Vatsal Patel      vatsal@example.com       customer
-- 3   Kanak Gupta       kanak@example.com        customer
-- 4   Anjali Mehta      anjali@example.com       customer
-- 5   Rohan Sharma      rohan@example.com        customer
-- 6   Sneha Iyer        sneha@example.com        customer

INSERT INTO users (full_name, email, password_hash, role) VALUES
('Mridul Verma',  'mridul@insurewise.com', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'admin'),
('Vatsal Patel',  'vatsal@example.com',    'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'customer'),
('Kanak Gupta',   'kanak@example.com',     'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'customer'),
('Anjali Mehta',  'anjali@example.com',    'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'customer'),
('Rohan Sharma',  'rohan@example.com',     'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'customer'),
('Sneha Iyer',    'sneha@example.com',     'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'customer');

-- ======================================================================
-- 2.  INSURANCE PLANS CATALOG  (10 plans — IDs 1–10)
-- ======================================================================
-- Plans with NO active policies (safe for admin to delete as demo):
--   Plan 6: Star Health Senior      → zero policies
--   Plan 5: ICICI Lombard Motor     → only EXPIRED policy (Anjali)

INSERT INTO insurance_plans (name, type, provider_name, description, coverage_limit, network, premium_amount, icon_type, duration_days, renew_warning_days) VALUES
-- Health (plans 1, 4, 6, 9)
('Allianz Global Health',    'health', 'Allianz',       'Comprehensive zero-cashless hospitalization worldwide.', '₹25L / Year',    'Global (Tier 1)',              6800.00, 'shield', 365, 30),
('Prudential Term Life',     'life',   'Prudential',    'Secured legacy plan with critical illness rider.',       '₹1,00,00,000',   '-',                            3600.00, 'shield', 365, 30),
('AIG Motor Elite',          'motor',  'AIG',           'Own damage cover + 24/7 roadside assistance.',          '₹15,00,000',     'Nationwide Cashless Garages',  9000.00, 'car', 365, 30),
('HDFC Ergo Health Optima',  'health', 'HDFC Ergo',     'Budget-friendly family health cover.',                  '₹10L / Year',    'India (Tier 1 & 2)',           3500.00, 'shield', 365, 30),
('ICICI Lombard Motor',      'motor',  'ICICI Lombard', 'Quick settlement, wide cashless garage network.',       '₹10,00,000',     'India-wide',                   4500.00, 'car', 365, 30),
('Star Health Senior',       'health', 'Star Health',   'Senior citizen plan with day-care procedures covered.', '₹5L / Year',     'India',                        8500.00, 'shield', 365, 30),
('Bajaj Life Shield',        'life',   'Bajaj Allianz', 'Flexible term plan with return-of-premium option.',     '₹50,00,000',     '-',                            2200.00, 'shield', 365, 30),
('Liberty Motor Supreme',    'motor',  'Liberty',       'High-limit cover for luxury and premium vehicles.',     '₹50,00,000',     'Premium Network',             15000.00, 'car', 365, 30),
('Care Health Joy',          'health', 'Care Health',   'Maternity, OPD, and wellness benefits included.',       '₹7L / Year',     'Tier 1 Cities',                4200.00, 'shield', 365, 30),
('Max Life Smart Term',      'life',   'Max Life',      'Digital-first term insurance with fast underwriting.',  '₹2,00,00,000',   '-',                            4800.00, 'shield', 365, 30);

-- ======================================================================
-- 3.  POLICIES  (14 total)
-- ======================================================================
-- ID  Policy No.        User   Plan  Type    Notes
--  1  IW-HEALTH-001     Vatsal  1    health  Active
--  2  IW-MOTOR-002      Vatsal  3    motor   Active  — Car 1: Brezza
--  3  IW-MOTOR-003      Vatsal  3    motor   Active  — Car 2: Honda Jazz (SAME AIG plan!)
--  4  IW-LIFE-004       Vatsal  7    life    Active  — Nominee = Kanak (user 3) ✓
--  5  IW-HEALTH-005     Kanak   4    health  Active
--  6  IW-LIFE-006       Kanak   2    life    Active  — Nominee = Vatsal (user 2) ✓
--  7  IW-HEALTH-007     Anjali  4    health  Active  (same plan as Kanak — different user)
--  8  IW-MOTOR-008      Anjali  5    motor   EXPIRED — only ICICI policy (plan 5 now deletable!)
--  9  IW-LIFE-009       Anjali  10   life    Active  — Nominee = Rohan (user 5) ✓
-- 10  IW-MOTOR-010      Rohan   8    motor   Active  — Car: Audi Q3 (premium)
-- 11  IW-MOTOR-011      Rohan   3    motor   Active  — Car: Honda Activa (diff plan)
-- 12  IW-LIFE-012       Rohan   2    life    Active  — Nominee = Sneha (user 6) ✓
-- 13  IW-HEALTH-013     Sneha   9    health  Active
-- 14  IW-LIFE-014       Sneha   7    life    Active  — Nominee = Mridul (user 1) ✓ admin is nominee!

INSERT INTO policies
    (policy_number, user_id, plan_id, type, provider_name, sum_insured, premium_amount, start_date, end_date, status)
VALUES

-- Vatsal Patel (user 2)
('IW-HEALTH-001',  2,  1, 'health', 'Allianz',        2500000.00,  6800.00, '2023-06-01', '2026-06-01', 'renew_soon'),
('IW-MOTOR-002',   2,  3, 'motor',  'AIG',             1500000.00,  9000.00, '2023-09-15', '2026-09-15', 'active'),
('IW-MOTOR-003',   2,  3, 'motor',  'AIG',             1500000.00,  9000.00, '2024-02-01', '2026-02-01', 'active'),     -- SAME AIG plan, 2nd car!
('IW-LIFE-004',    2,  7, 'life',   'Bajaj Allianz',   5000000.00,  2200.00, '2022-01-10', '2052-01-10', 'active'),

-- Kanak Gupta (user 3)
('IW-HEALTH-005',  3,  4, 'health', 'HDFC Ergo',       1000000.00,  3500.00, '2024-01-01', '2026-01-01', 'active'),
('IW-LIFE-006',    3,  2, 'life',   'Prudential',      10000000.00, 3600.00, '2021-11-20', '2051-11-20', 'active'),

-- Anjali Mehta (user 4)
('IW-HEALTH-007',  4,  4, 'health', 'HDFC Ergo',       1000000.00,  3500.00, '2023-04-15', '2026-04-15', 'active'),
('IW-MOTOR-008',   4,  5, 'motor',  'ICICI Lombard',   1000000.00,  4500.00, '2022-07-01', '2023-07-01', 'expired'),   -- EXPIRED → plan 5 safe to delete
('IW-LIFE-009',    4, 10, 'life',   'Max Life',        20000000.00, 4800.00, '2023-08-01', '2053-08-01', 'active'),

-- Rohan Sharma (user 5)
('IW-MOTOR-010',   5,  8, 'motor',  'Liberty',         5000000.00, 15000.00, '2024-03-01', '2026-03-01', 'active'),    -- Audi Q3, premium plan
('IW-MOTOR-011',   5,  3, 'motor',  'AIG',             1500000.00,  9000.00, '2024-05-01', '2026-05-01', 'active'),    -- Honda Activa, same AIG plan as Vatsal's
('IW-LIFE-012',    5,  2, 'life',   'Prudential',      10000000.00, 3600.00, '2023-12-01', '2053-12-01', 'active'),

-- Sneha Iyer (user 6)
('IW-HEALTH-013',  6,  9, 'health', 'Care Health',      700000.00,  4200.00, '2024-02-15', '2026-02-15', 'active'),
('IW-LIFE-014',    6,  7, 'life',   'Bajaj Allianz',   5000000.00,  2200.00, '2023-10-01', '2053-10-01', 'active');

-- ======================================================================
-- 4.  POLICY DETAILS
-- ======================================================================

-- Health
INSERT INTO policy_details (policy_id, patient_name, date_of_birth, blood_group, pre_existing_conditions) VALUES
(1,  'Vatsal Patel',  '1999-03-15', 'O+',  'None'),
(5,  'Kanak Gupta',   '2000-11-28', 'B+',  'Mild seasonal allergies'),
(7,  'Anjali Mehta',  '1988-07-04', 'A-',  'Thyroid — managed with medication'),
(13, 'Sneha Iyer',    '1996-05-22', 'AB+', 'None');

-- Motor — Vatsal: 2 cars under same AIG plan (vehicle_number differs)
INSERT INTO policy_details (policy_id, vehicle_number, vehicle_model, registration_year) VALUES
(2,  'DL-09-GH-2019', 'Maruti Brezza 2022',  2022),  -- Vatsal Car 1  → AIG
(3,  'HR-26-JK-5432', 'Honda Jazz 2020',     2020),  -- Vatsal Car 2  → AIG (SAME PLAN!)
(8,  'MH-12-PQ-8765', 'Toyota Fortuner 2021',2021),  -- Anjali (expired)
(10, 'KA-03-CD-3456', 'Audi Q3 2023',        2023),  -- Rohan premium car → Liberty
(11, 'KA-03-EF-7890', 'Honda Activa 2019',   2019);  -- Rohan 2nd car → AIG

-- Life — with nominee_user_id links
--  Policy 4:  Vatsal's life  → nominee = Kanak (user 3)  → Kanak sees on dashboard ✓
--  Policy 6:  Kanak's life   → nominee = Vatsal (user 2)  → Vatsal sees on dashboard ✓
--  Policy 9:  Anjali's life  → nominee = Rohan (user 5)   → Rohan sees on dashboard ✓
--  Policy 12: Rohan's life   → nominee = Sneha (user 6)   → Sneha sees on dashboard ✓
--  Policy 14: Sneha's life   → nominee = Mridul (user 1)  → Mridul sees on dashboard ✓
INSERT INTO policy_details (policy_id, nominee_name, nominee_relation, nominee_dob, nominee_user_id) VALUES
(4,  'Kanak Gupta',   'sibling', '2000-11-28', 3),
(6,  'Vatsal Patel',  'sibling', '1999-03-15', 2),
(9,  'Rohan Sharma',  'spouse',  '1994-08-19', 5),
(12, 'Sneha Iyer',    'spouse',  '1996-05-22', 6),
(14, 'Mridul Verma',  'other',   '1998-01-01', 1);

-- ======================================================================
-- 5.  CLAIMS  (against active policies only — triggers enforce limits)
-- ======================================================================
-- Amounts must be < sum_insured of the referenced policy

INSERT INTO claims (claim_id, user_id, policy_id, incident_date, estimated_amount, provider_name, description, status) VALUES
('#CLM-2001', 2,  1,  '2024-01-15', 38000.00,  'Apollo Hospital Ahmedabad', 'Appendicitis surgery + 4-day hospitalization.',             'approved'),
('#CLM-2002', 2,  2,  '2024-03-10', 24000.00,  'AIG Cashless Garage Delhi', 'Rear-bumper damage from parking collision.',                  'pending'),
('#CLM-2003', 3,  5,  '2024-02-28', 52000.00,  'Sterling Hospital',         'Fracture of right wrist — surgery and physiotherapy.',       'approved'),
('#CLM-2004', 4,  7,  '2024-04-05', 19500.00,  'Fortis Hospital Pune',      'Thyroid surgery follow-up and overnight observation.',       'pending'),
('#CLM-2005', 5,  10, '2024-05-12', 145000.00, 'Liberty Premium Garage',    'Front-end collision damage to Audi Q3 — panel repair.',      'pending'),
('#CLM-2006', 6,  13, '2024-03-22', 28000.00,  'Motherhood Hospital',       'Maternity — normal delivery and post-natal care package.',   'approved');

-- ======================================================================
-- 6.  POLICY FEEDBACK
-- ======================================================================

INSERT INTO policy_feedback (user_id, plan_id, rating, feedback_text) VALUES
(2, 1, 5, 'Allianz cashless hospitalization worked flawlessly in Ahmedabad. Highly recommend!'),
(3, 2, 4, 'Good term life plan, though the medical check-up took longer than expected.'),
(2, 3, 5, 'AIG roadside assistance was life-saving when my Brezza broke down on NH-48 at midnight.'),
(5, 3, 4, 'AIG covers my Activa well. Premium is fair for the coverage.'),
(2, 7, 5, 'Bajaj Life Shield nominee setup was very easy. Customer service is top-notch.'),
(4, 4, 4, 'HDFC Ergo coverage is solid. Claim was processed in 3 working days.'),
(3, 4, 3, 'Average digital experience. App interface could use a redesign.'),
(5, 8, 5, 'Liberty Supreme is perfect for premium vehicles. Zero-depreciation saved me ₹1.2L.'),
(6, 9, 4, 'Care Health Joy maternity cover was exactly what I needed. Easy claim process.'),
(4, 10, 4, 'Max Life underwriting was quick — entire process done online in 2 days.');
