 USE dbms_project;

-- Clear existing data to avoid conflicts
DELETE FROM policy_details;
DELETE FROM policy_feedback;

DELETE FROM claim_payout_details;
DELETE FROM claims;
DELETE FROM policies;
DELETE FROM insurance_plans;
DELETE FROM users;

-- Reset Auto Increments
ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE insurance_plans AUTO_INCREMENT = 1;
ALTER TABLE policies AUTO_INCREMENT = 1;
ALTER TABLE claims AUTO_INCREMENT = 1;
ALTER TABLE policy_feedback AUTO_INCREMENT = 1;
ALTER TABLE policy_details AUTO_INCREMENT = 1;

-- 1. Insert Users (Password: password123)
INSERT INTO users (full_name, email, password_hash, role) VALUES 
('Mridul Verma', 'admin@insurewise.com', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'admin'),
('John Doe', 'john@example.com', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'customer'),
('Jane Smith', 'jane@example.com', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'customer'),
('Alice Brown', 'alice@test.com', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'customer');

-- 2. Insert Insurance Plans (Catalog) - 10 Plans
INSERT INTO insurance_plans (name, type, provider_name, description, coverage_limit, network, premium_amount, icon_type) VALUES 
('Allianz Global Health', 'health', 'Allianz', 'Comprehensive Medical Coverage with Zero-cashless hospitalization globally.', '₹25L / Year', 'Global (Tier 1)', 6800.00, 'shield'),
('Prudential Term Life', 'life', 'Prudential', 'Secured Legacy Plan. Critical Illness rider available.', '₹1,00,00,000', '-', 3600.00, 'shield'),
('AIG Motor Elite', 'motor', 'AIG', 'Comprehensive Auto Guard. 100% Value Own Damage and 24/7 Roadside Assistance.', '₹15,00,000', 'Nationwide Cashless Garages', 9000.00, 'car'),
('HDFC Ergo Health Optima', 'health', 'HDFC Ergo', 'Affordable health insurance for the whole family.', '₹10L / Year', 'India (Tier 1 & 2)', 3500.00, 'shield'),
('ICICI Lombard Motor', 'motor', 'ICICI Lombard', 'Quick claim settlement and wide network of garages.', '₹10,00,000', 'India-wide', 4500.00, 'car'),
('Star Health Senior', 'health', 'Star Health', 'Specialized health plan for senior citizens.', '₹5L / Year', 'India', 8500.00, 'shield'),
('Bajaj Life Shield', 'life', 'Bajaj Allianz', 'Flexible term insurance with return of premium option.', '₹50,00,000', '-', 2200.00, 'shield'),
('Liberty Motor Supreme', 'motor', 'Liberty', 'High coverage for luxury vehicles.', '₹50,00,000', 'Premium Network', 15000.00, 'car'),
('Care Health Joy', 'health', 'Care Health', 'Maternity focused health coverage.', '₹7L / Year', 'Tier 1 Cities', 4200.00, 'shield'),
('Max Life Smart Term', 'life', 'Max Life', 'Digital-first term insurance with fast processing.', '₹2,00,00,000', '-', 4800.00, 'shield');

-- 3. Insert Purchased Policies (with plan_id for UNIQUE constraint)
-- John Doe (User 2)
INSERT INTO policies (policy_number, user_id, plan_id, type, provider_name, sum_insured, premium_amount, start_date, end_date, status) VALUES 
('IW-HEALTH-001', 2, 1, 'health', 'Allianz', 2500000.00, 6800.00, '2023-01-01', '2024-01-01', 'renew_soon'),
('IW-MOTOR-002', 2, 3, 'motor', 'AIG', 1500000.00, 9000.00, '2023-05-15', '2024-05-15', 'active'),
-- Jane Smith (User 3)
('IW-LIFE-003', 3, 2, 'life', 'Prudential', 10000000.00, 3600.00, '2021-08-20', '2051-08-20', 'active'),
('IW-HEALTH-004', 3, 4, 'health', 'HDFC Ergo', 1000000.00, 3500.00, '2023-10-10', '2024-10-10', 'active'),
-- Alice Brown (User 4)
('IW-MOTOR-005', 4, 5, 'motor', 'ICICI Lombard', 1000000.00, 4500.00, '2022-12-01', '2023-12-01', 'expired');

-- 3b. Insert Policy Details (type-specific info)
INSERT INTO policy_details (policy_id, patient_name, date_of_birth, blood_group, pre_existing_conditions) VALUES
(1, 'John Doe', '1990-05-15', 'O+', 'None');

INSERT INTO policy_details (policy_id, vehicle_number, vehicle_model, registration_year) VALUES
(2, 'DL-01-AB-1234', 'Honda City 2021', 2021);

INSERT INTO policy_details (policy_id, nominee_name, nominee_relation, nominee_dob) VALUES
(3, 'Jane Mother', 'parent', '1965-03-10');

INSERT INTO policy_details (policy_id, patient_name, date_of_birth, blood_group) VALUES
(4, 'Jane Smith', '1992-11-22', 'B+');

INSERT INTO policy_details (policy_id, vehicle_number, vehicle_model, registration_year) VALUES
(5, 'MH-02-CD-5678', 'Hyundai Creta 2020', 2020);

-- 4. Insert Claims
INSERT INTO claims (claim_id, user_id, policy_id, incident_date, estimated_amount, provider_name, description, status) VALUES 
('#CLM-1001', 2, 1, '2023-11-05', 45000.00, 'City Hospital', 'Appendicitis surgery and 3-day hospitalization.', 'approved'),
('#CLM-1002', 2, 2, '2023-12-10', 12000.00, 'Elite Garage', 'Front bumper damage due to minor collision.', 'pending'),
('#CLM-1003', 4, 5, '2023-06-15', 5500.00, 'Auto Care', 'Engine issues during long trip.', 'declined');

-- 5. Insert Policy Feedback
INSERT INTO policy_feedback (user_id, plan_id, rating, feedback_text) VALUES 
(3, 1, 5, 'Excellent coverage and claim process was completely cashless as promised.'),
(2, 2, 4, 'Good term life plan, but the medical checkup took a while.'),
(3, 3, 5, 'Roadside assistance saved me when my car broke down at 2 AM.'),
(2, 3, 4, 'Premium is a bit high, but the zero-depreciation cover is totally worth it.'),
(4, 4, 3, 'Average service, the app interface is a bit clunky.'),
(4, 5, 5, 'Very quick claim process for my motor insurance.');
