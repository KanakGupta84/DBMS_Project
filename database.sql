-- ======================================================================
--  InsureWise — Complete Database Schema (Fresh Install)
--  Run with:  mysql -u root -p < database.sql
-- ======================================================================

DROP DATABASE IF EXISTS dbms_project;
CREATE DATABASE dbms_project
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE dbms_project;

-- ======================================================================
-- TABLE 1: users
-- ======================================================================
CREATE TABLE users (
    id            INT           AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(100)  NOT NULL,
    email         VARCHAR(100)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    role          ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ======================================================================
-- TABLE 2: insurance_plans
-- ======================================================================
CREATE TABLE insurance_plans (
    id             INT            AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(150)   NOT NULL,
    type           ENUM('health', 'motor', 'life') NOT NULL,
    provider_name  VARCHAR(100)   NOT NULL,
    description    TEXT,
    coverage_limit VARCHAR(100),
    network        VARCHAR(100),
    premium_amount DECIMAL(10,2)  NOT NULL,
    icon_type      VARCHAR(50)    NOT NULL DEFAULT 'shield',
    duration_days  INT            NOT NULL DEFAULT 365,
    renew_warning_days INT        NOT NULL DEFAULT 30,
    created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_duration CHECK (duration_days > 0),
    CONSTRAINT chk_renew_warn CHECK (renew_warning_days >= 0 AND renew_warning_days < duration_days)
);

-- ======================================================================
-- TABLE 3: policies
--   * No UNIQUE(user_id, plan_id) — motor policies allow multiple cars.
--   * Duplicate enforcement for health/life is done at the app level.
-- ======================================================================
CREATE TABLE policies (
    id             INT            AUTO_INCREMENT PRIMARY KEY,
    policy_number  VARCHAR(50)    NOT NULL UNIQUE,
    user_id        INT            NOT NULL,
    plan_id        INT,                          -- nullable: SET NULL if plan deleted
    type           ENUM('health', 'motor', 'life') NOT NULL,
    provider_name  VARCHAR(100)   NOT NULL,
    sum_insured    DECIMAL(12,2)  NOT NULL,
    premium_amount DECIMAL(10,2)  NOT NULL,
    start_date     DATE           NOT NULL,
    end_date       DATE           NOT NULL,
    status         ENUM('active', 'expired', 'renew_soon') NOT NULL DEFAULT 'active',
    created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_sum_insured    CHECK (sum_insured    > 0),
    CONSTRAINT chk_premium_amount CHECK (premium_amount > 0),
    CONSTRAINT chk_dates          CHECK (end_date > start_date),

    CONSTRAINT fk_policies_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_policies_plan FOREIGN KEY (plan_id)
        REFERENCES insurance_plans(id) ON DELETE SET NULL
);

-- ======================================================================
-- TABLE 4: claims
-- ======================================================================
CREATE TABLE claims (
    id               INT            AUTO_INCREMENT PRIMARY KEY,
    claim_id         VARCHAR(50)    NOT NULL UNIQUE,
    user_id          INT            NOT NULL,
    policy_id        INT            NOT NULL,
    incident_date    DATE           NOT NULL,
    estimated_amount DECIMAL(12,2)  NOT NULL,
    provider_name    VARCHAR(150),
    description      TEXT,
    status           ENUM('pending', 'approved', 'declined') NOT NULL DEFAULT 'pending',
    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_claim_amount CHECK (estimated_amount > 0),

    CONSTRAINT fk_claims_user   FOREIGN KEY (user_id)
        REFERENCES users(id)     ON DELETE CASCADE,
    CONSTRAINT fk_claims_policy FOREIGN KEY (policy_id)
        REFERENCES policies(id)  ON DELETE CASCADE
);

-- ======================================================================
-- TABLE 5: claim_payout_details
-- ======================================================================
CREATE TABLE claim_payout_details (
    id             INT           AUTO_INCREMENT PRIMARY KEY,
    claim_id       INT           NOT NULL UNIQUE,
    account_name   VARCHAR(150)  NOT NULL,
    account_number VARCHAR(50)   NOT NULL,
    ifsc_code      VARCHAR(20)   NOT NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_account_number CHECK (LENGTH(account_number) >= 5),
    CONSTRAINT chk_ifsc_code      CHECK (LENGTH(ifsc_code)       = 11),

    CONSTRAINT fk_payout_claim FOREIGN KEY (claim_id)
        REFERENCES claims(id) ON DELETE CASCADE
);

-- ======================================================================
-- TABLE 6: policy_feedback
-- ======================================================================
CREATE TABLE policy_feedback (
    id            INT   AUTO_INCREMENT PRIMARY KEY,
    user_id       INT   NOT NULL,
    plan_id       INT   NOT NULL,
    rating        INT   NOT NULL,
    feedback_text TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),

    CONSTRAINT fk_feedback_user FOREIGN KEY (user_id)
        REFERENCES users(id)          ON DELETE CASCADE,
    CONSTRAINT fk_feedback_plan FOREIGN KEY (plan_id)
        REFERENCES insurance_plans(id) ON DELETE CASCADE
);

-- ======================================================================
-- TABLE 7: policy_details
--   One row per policy.  Only the columns for the policy's type are filled.
--
--   health  → patient_name, date_of_birth, blood_group, pre_existing_conditions
--   motor   → vehicle_number, vehicle_model, registration_year
--   life    → nominee_name, nominee_relation, nominee_dob, nominee_user_id
--
--   nominee_user_id links the nominee to their InsureWise account so their
--   dashboard can show "I am a nominee for this policy".
-- ======================================================================
CREATE TABLE policy_details (
    id                      INT          AUTO_INCREMENT PRIMARY KEY,
    policy_id               INT          NOT NULL UNIQUE,

    -- Health fields
    patient_name            VARCHAR(150),
    date_of_birth           DATE,
    blood_group             ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-'),
    pre_existing_conditions TEXT,

    -- Motor fields
    vehicle_number          VARCHAR(20),
    vehicle_model           VARCHAR(100),
    registration_year       INT,

    -- Life fields
    nominee_name            VARCHAR(150),
    nominee_relation        ENUM('spouse','parent','child','sibling','other'),
    nominee_dob             DATE,
    nominee_user_id         INT NULL,    -- FK to users.id (the nominee's account)

    CONSTRAINT chk_reg_year CHECK (
        registration_year IS NULL OR registration_year BETWEEN 1990 AND 2030
    ),

    CONSTRAINT fk_details_policy  FOREIGN KEY (policy_id)
        REFERENCES policies(id)  ON DELETE CASCADE,
    CONSTRAINT fk_details_nominee FOREIGN KEY (nominee_user_id)
        REFERENCES users(id)     ON DELETE SET NULL
);

-- ======================================================================
-- INDEXES  (speed up common queries)
-- ======================================================================
CREATE INDEX idx_policies_user_id       ON policies(user_id);
CREATE INDEX idx_policies_plan_id       ON policies(plan_id);
CREATE INDEX idx_policies_type          ON policies(type);
CREATE INDEX idx_policies_status        ON policies(status);

CREATE INDEX idx_claims_user_id         ON claims(user_id);
CREATE INDEX idx_claims_policy_id       ON claims(policy_id);
CREATE INDEX idx_claims_status          ON claims(status);

CREATE INDEX idx_plans_type             ON insurance_plans(type);
CREATE INDEX idx_plans_name             ON insurance_plans(name);

CREATE INDEX idx_details_vehicle        ON policy_details(vehicle_number);
CREATE INDEX idx_details_nominee_user   ON policy_details(nominee_user_id);

CREATE INDEX idx_feedback_plan          ON policy_feedback(plan_id);
CREATE INDEX idx_feedback_user          ON policy_feedback(user_id);

-- ======================================================================
-- TRIGGER 1: Block claims on expired policies
-- ======================================================================
DELIMITER //

CREATE TRIGGER trg_no_claim_on_expired
BEFORE INSERT ON claims
FOR EACH ROW
BEGIN
    DECLARE v_status  ENUM('active','expired','renew_soon');
    DECLARE v_end     DATE;

    SELECT status, end_date
    INTO   v_status, v_end
    FROM   policies
    WHERE  id = NEW.policy_id;

    IF v_status = 'expired' OR v_end < CURDATE() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot file a claim on an expired policy.';
    END IF;
END;
//

-- ======================================================================
-- TRIGGER 2: Claim amount must not exceed sum insured
-- ======================================================================
CREATE TRIGGER trg_claim_within_limit
BEFORE INSERT ON claims
FOR EACH ROW
BEGIN
    DECLARE v_sum DECIMAL(12,2);

    SELECT sum_insured
    INTO   v_sum
    FROM   policies
    WHERE  id = NEW.policy_id;

    IF NEW.estimated_amount > v_sum THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Claim amount cannot exceed the policy sum insured.';
    END IF;
END;
//

DELIMITER ;

-- ======================================================================
-- Auto-expire any policies whose end_date has already passed
-- (useful after importing old data)
-- ======================================================================
UPDATE policies
SET    status = 'expired'
WHERE  end_date < CURDATE()
  AND  status   != 'expired';