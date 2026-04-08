-- Create the database
CREATE DATABASE IF NOT EXISTS dbms_project;
USE dbms_project;

-- 1. Users Table (no dependencies)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('customer', 'admin') DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Insurance Plans Catalog (no dependencies)
CREATE TABLE insurance_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type ENUM('health', 'motor', 'life') NOT NULL,
    provider_name VARCHAR(100) NOT NULL,
    description TEXT,
    coverage_limit VARCHAR(100),
    network VARCHAR(100),
    premium_amount DECIMAL(10, 2) NOT NULL,
    icon_type VARCHAR(50) DEFAULT 'shield',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Policies Table (depends on: users, insurance_plans)
CREATE TABLE policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    policy_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    plan_id INT,
    type ENUM('health', 'motor', 'life') NOT NULL,
    provider_name VARCHAR(100) NOT NULL,
    sum_insured DECIMAL(12, 2) NOT NULL CHECK (sum_insured > 0),
    premium_amount DECIMAL(10, 2) NOT NULL CHECK (premium_amount > 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    CHECK (end_date > start_date),
    status ENUM('active', 'expired', 'renew_soon') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES insurance_plans(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_plan (user_id, plan_id)
);

-- 4. Claims Table (depends on: users, policies)
CREATE TABLE claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    policy_id INT NOT NULL,
    incident_date DATE NOT NULL,
    estimated_amount DECIMAL(12, 2) NOT NULL CHECK (estimated_amount > 0),
    provider_name VARCHAR(150),
    description TEXT,
    status ENUM('pending', 'approved', 'declined') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE
);

-- 5. Claim Bank Details Table (depends on: claims)
CREATE TABLE claim_payout_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT UNIQUE NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    account_number VARCHAR(50) NOT NULL CHECK (LENGTH(account_number) >= 5),
    ifsc_code VARCHAR(20) NOT NULL CHECK (LENGTH(ifsc_code) = 11),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);



-- 7. Policy Feedback Table (depends on: users, insurance_plans)
CREATE TABLE policy_feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    feedback_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES insurance_plans(id) ON DELETE CASCADE
);

-- 8. Policy Details Table (depends on: policies)
CREATE TABLE policy_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    policy_id INT NOT NULL UNIQUE,
    -- Health fields
    patient_name VARCHAR(150),
    date_of_birth DATE,
    blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-'),
    pre_existing_conditions TEXT,
    -- Motor fields
    vehicle_number VARCHAR(20),
    vehicle_model VARCHAR(100),
    registration_year INT CHECK (registration_year BETWEEN 1990 AND 2030),
    -- Life fields
    nominee_name VARCHAR(150),
    nominee_relation ENUM('spouse','parent','child','sibling','other'),
    nominee_dob DATE,
    FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- 1. Indexes for text searching (LIKE queries) and filtering
CREATE INDEX idx_policies_type ON policies(type);
CREATE INDEX idx_policies_provider ON policies(provider_name);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_insurance_plans_type ON insurance_plans(type);
CREATE INDEX idx_insurance_plans_name ON insurance_plans(name);

-- 2. Indexes for Foreign Keys used frequently in WHERE joining
CREATE INDEX idx_policies_user_id ON policies(user_id);
CREATE INDEX idx_claims_user_id ON claims(user_id);
CREATE INDEX idx_claims_policy_id ON claims(policy_id);

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Trigger 1: Prevent filing a claim on an expired policy
DELIMITER //
CREATE TRIGGER trg_prevent_claim_on_expired_policy
BEFORE INSERT ON claims
FOR EACH ROW
BEGIN
    DECLARE policy_status ENUM('active', 'expired', 'renew_soon');
    DECLARE policy_end DATE;

    SELECT status, end_date INTO policy_status, policy_end
    FROM policies WHERE id = NEW.policy_id;

    IF policy_status = 'expired' OR policy_end < CURDATE() THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot file a claim on an expired policy.';
    END IF;
END;
//
DELIMITER ;

-- Trigger 2: Validate that claim amount does not exceed policy's sum_insured
DELIMITER //
CREATE TRIGGER trg_validate_claim_amount
BEFORE INSERT ON claims
FOR EACH ROW
BEGIN
    DECLARE max_sum DECIMAL(12, 2);

    SELECT sum_insured INTO max_sum
    FROM policies WHERE id = NEW.policy_id;

    IF NEW.estimated_amount > max_sum THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Claim amount cannot exceed the policy sum insured.';
    END IF;
END;
//
DELIMITER ;

USE dbms_project;
UPDATE policies SET status = 'expired' WHERE end_date < CURDATE() AND status != 'expired';