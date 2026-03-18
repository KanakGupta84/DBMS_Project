CREATE DATABASE policy;
USE policy;

CREATE TABLE POLICY_HOLDER (
    policyholder_id INT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    dob DATE NOT NULL,
    contact_no VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(50) NOT NULL UNIQUE,
    kyc_status BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE POLICY_TYPE (
    policytype_id INT PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL
);

CREATE TABLE ADMINISTRATOR (
    admin_id INT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(50) NOT NULL UNIQUE,
    contact_no VARCHAR(15) NOT NULL UNIQUE
);

CREATE TABLE POLICY (
    policy_id INT PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    premium_amt INT NOT NULL,
    sum_assured INT NOT NULL,
    policy_status VARCHAR(50) NOT NULL DEFAULT 'Active',
    
    CHECK (premium_amt>0),
    CHECK (sum_assured>0),
    CHECK (end_date>start_date),
    CHECK (policy_status IN ('Active', 'Lapsed', 'Expired', 'Cancelled')),
    
    policyholder_id INT NOT NULL,
    policytype_id INT NOT NULL,
    FOREIGN KEY (policyholder_id) REFERENCES POLICY_HOLDER(policyholder_id),
    FOREIGN KEY (policytype_id) REFERENCES POLICY_TYPE(policytype_id)
);

CREATE TABLE PREMIUM (
    payment_id INT PRIMARY KEY,
    payment_date DATE NOT NULL,
    payment_status VARCHAR(50) NOT NULL,
    overdue_flag BOOLEAN NOT NULL DEFAULT FALSE,
    
    CHECK (payment_status IN ('Paid', 'Unpaid')),
    
    policy_id INT NOT NULL,
    FOREIGN KEY (policy_id) REFERENCES POLICY(policy_id)
);

CREATE TABLE CLAIM (
    claim_id INT PRIMARY KEY,
    due_date DATE NOT NULL,
    payment_status VARCHAR(50) NOT NULL,
    overdue_flag BOOLEAN NOT NULL DEFAULT FALSE,
    
    CHECK (payment_status IN ('Pending', 'Approved', 'Rejected')),
    
    policy_id INT NOT NULL,
    FOREIGN KEY (policy_id) REFERENCES POLICY(policy_id)
);

CREATE TABLE CLAIM_HISTORY (
    claimhistory_id INT PRIMARY KEY,
    remarks VARCHAR(100) NOT NULL,
    
    claim_id INT NOT NULL,
    FOREIGN KEY (claim_id) REFERENCES CLAIM(claim_id)
);

CREATE TABLE NOMINEE (
    nominee_id INT PRIMARY KEY,
    nominee_name VARCHAR(50) NOT NULL,
    relation VARCHAR(50) NOT NULL,
    
    policy_id INT NOT NULL,
    FOREIGN KEY (policy_id) REFERENCES POLICY(policy_id)
);


USE policy;

CREATE INDEX idx_policy_policyholder ON POLICY(policyholder_id);
CREATE INDEX idx_policy_policytype ON POLICY(policytype_id);
CREATE INDEX idx_premium_policy ON PREMIUM(policy_id);
CREATE INDEX idx_claim_policy ON CLAIM(policy_id);
CREATE INDEX idx_claimhistory_claim ON CLAIM_HISTORY(claim_id);
CREATE INDEX idx_nominee_policy ON NOMINEE(policy_id);


INSERT INTO POLICY_HOLDER VALUES
(1, 'Kanak Gupta', '2011-03-02', '1212121212', 'kanak@gmail.com', TRUE),
(2, 'Mridul Verma', '1983-11-20', '3232323232', 'mridul@gmail.com', TRUE),
(3, 'Vatsal Kumar', '1967-06-03', '1234567890', 'vatsal@gmail.com', FALSE),
(4, 'Naman Gupta', '1997-05-01', '0987654321', 'naman@gmail.com', TRUE);

INSERT INTO POLICY_TYPE VALUES
(1, 'Life Insurance'),
(2, 'Health Insurance'),
(3, 'Vehicle Insurance');

INSERT INTO ADMINISTRATOR VALUES
(1, 'Admin1', 'admin1@policy.com', '0000000001'),
(2, 'Admin2', 'admin2@policy.com', '0000000002');

INSERT INTO POLICY VALUES
(101, '2024-01-01', '2034-01-01', 5000, 100000, 'Active', 1, 1),
(102, '2023-06-15', '2028-06-15', 15000, 500000, 'Active', 2, 2),
(103, '2022-03-10', '2027-03-10', 20000, 1000000, 'Lapsed', 3, 1),
(104, '2021-05-10', '2030-05-10', 3000, 180000, 'Active', 4, 3);

INSERT INTO PREMIUM VALUES
(201, '2024-01-10', 'Paid', FALSE, 101),
(202, '2024-02-10', 'Paid', FALSE, 102),
(203, '2024-01-15', 'Unpaid', TRUE, 103),
(204, '2024-03-16', 'Paid', FALSE, 104);

INSERT INTO CLAIM VALUES
(301, '2024-03-01', 'Pending', FALSE, 101),
(302, '2023-12-10', 'Approved', FALSE, 102);

INSERT INTO CLAIM_HISTORY VALUES
(401, 'Documents submitted', 301),
(402, 'Claim approved', 302);

INSERT INTO NOMINEE VALUES
(501, 'Ajay Gupta', 'Father', 101),
(502, 'Rohit Verma', 'Brother', 102),
(503, 'Neha Kumar', 'Wife', 103),
(504, 'Ritu Gupta', 'Mother', 104);
