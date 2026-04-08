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

CREATE TABLE DISEASE (
    disease_id INT PRIMARY KEY,
    disease_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(200)
);

CREATE TABLE VEHICLE_PROBLEM (
    problem_id INT PRIMARY KEY,
    problem_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(200)
);

CREATE TABLE CLAIM (
    claim_id INT PRIMARY KEY,
    due_date DATE NOT NULL,
    payment_status VARCHAR(50) NOT NULL,
    overdue_flag BOOLEAN NOT NULL DEFAULT FALSE,
    
    CHECK (payment_status IN ('Pending', 'Approved', 'Rejected')),
    
    policy_id INT NOT NULL,
    disease_id INT DEFAULT NULL,
    problem_id INT DEFAULT NULL,
    FOREIGN KEY (policy_id) REFERENCES POLICY(policy_id),
    FOREIGN KEY (disease_id) REFERENCES DISEASE(disease_id),
    FOREIGN KEY (problem_id) REFERENCES VEHICLE_PROBLEM(problem_id)
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

CREATE TABLE POLICY_DISEASE_COVERAGE (
    coverage_id INT PRIMARY KEY,
    coverage_limit INT NOT NULL CHECK (coverage_limit>0),

    policy_id INT NOT NULL,
    disease_id INT NOT NULL,
    FOREIGN KEY (policy_id) REFERENCES POLICY(policy_id),
    FOREIGN KEY (disease_id) REFERENCES DISEASE(disease_id),
    UNIQUE (policy_id, disease_id)
);

CREATE TABLE POLICY_VEHICLE_COVERAGE (
    coverage_id INT PRIMARY KEY,
    coverage_limit INT NOT NULL CHECK (coverage_limit>0),
    deductible_amt INT NOT NULL DEFAULT 0 CHECK (deductible_amt>=0),

    policy_id  INT NOT NULL,
    problem_id INT NOT NULL,
    FOREIGN KEY (policy_id)  REFERENCES POLICY(policy_id),
    FOREIGN KEY (problem_id) REFERENCES VEHICLE_PROBLEM(problem_id),
    UNIQUE (policy_id, problem_id)
);

CREATE TABLE LIFE_POLICY_TERMS (
    terms_id INT PRIMARY KEY,
    maturity_condition VARCHAR(100) NOT NULL,

    policy_id INT NOT NULL UNIQUE,
    FOREIGN KEY (policy_id) REFERENCES POLICY(policy_id)
);

USE policy;

CREATE INDEX idx_policy_policyholder ON POLICY(policyholder_id);
CREATE INDEX idx_policy_policytype ON POLICY(policytype_id);
CREATE INDEX idx_premium_policy ON PREMIUM(policy_id);
CREATE INDEX idx_claim_policy ON CLAIM(policy_id);
CREATE INDEX idx_claim_disease ON CLAIM(disease_id);
CREATE INDEX idx_claim_problem ON CLAIM(problem_id);
CREATE INDEX idx_claimhistory_claim ON CLAIM_HISTORY(claim_id);
CREATE INDEX idx_nominee_policy ON NOMINEE(policy_id);
CREATE INDEX idx_disease_coverage_policy ON POLICY_DISEASE_COVERAGE(policy_id);
CREATE INDEX idx_disease_coverage_disease ON POLICY_DISEASE_COVERAGE(disease_id);
CREATE INDEX idx_vehicle_coverage_policy ON POLICY_VEHICLE_COVERAGE(policy_id);
CREATE INDEX idx_vehicle_coverage_problem ON POLICY_VEHICLE_COVERAGE(problem_id);
CREATE INDEX idx_life_terms_policy ON LIFE_POLICY_TERMS(policy_id);


INSERT INTO POLICY_HOLDER VALUES
(1, 'Kanak Gupta',  '2011-03-02', '1212121212', 'kanak@gmail.com',  TRUE),
(2, 'Mridul Verma', '1983-11-20', '3232323232', 'mridul@gmail.com', TRUE),
(3, 'Vatsal Kumar', '1967-06-03', '1234567890', 'vatsal@gmail.com', FALSE),
(4, 'Naman Gupta',  '1997-05-01', '0987654321', 'naman@gmail.com',  TRUE);

INSERT INTO POLICY_TYPE VALUES
(1, 'Life Insurance'),
(2, 'Health Insurance'),
(3, 'Vehicle Insurance');

INSERT INTO ADMINISTRATOR VALUES
(1, 'Admin1', 'admin1@policy.com', '0000000001'),
(2, 'Admin2', 'admin2@policy.com', '0000000002');

INSERT INTO DISEASE VALUES
(1, 'Cancer', 'Oncological conditions'),
(2, 'Cardiac Condition', 'Heart-related illnesses'),
(3, 'Diabetes', 'Type 1 and Type 2 diabetes');

INSERT INTO VEHICLE_PROBLEM VALUES
(1, 'Engine Failure', 'Complete or partial engine breakdown'),
(2, 'Accident Damage', 'Damage from road accidents'),
(3, 'Tyre Damage', 'Punctures or blowouts'),
(4, 'Electrical Issue', 'Wiring or battery faults');

INSERT INTO POLICY VALUES
(101, '2024-01-01', '2034-01-01', 5000,  100000, 'Active', 1, 1),
(102, '2023-06-15', '2028-06-15', 15000, 500000, 'Active', 2, 2),
(103, '2022-03-10', '2027-03-10', 20000, 1000000, 'Lapsed', 3, 1),
(104, '2021-05-10', '2030-05-10', 3000,  180000, 'Active', 4, 3);

INSERT INTO PREMIUM VALUES
(201, '2024-01-10', 'Paid', FALSE, 101),
(202, '2024-02-10', 'Paid', FALSE, 102),
(203, '2024-01-15', 'Unpaid', TRUE,  103),
(204, '2024-03-16', 'Paid', FALSE, 104);

INSERT INTO CLAIM VALUES
(301, '2024-03-01', 'Pending',  FALSE, 101, NULL, NULL),  
(302, '2023-12-10', 'Approved', FALSE, 102, 1, NULL),  
(303, '2024-02-20', 'Approved', FALSE, 104, NULL, 2),     
(304, '2024-04-05', 'Rejected', FALSE, 102, 3, NULL);  

INSERT INTO CLAIM_HISTORY VALUES
(401, 'Documents submitted', 301),
(402, 'Claim approved', 302),
(403, 'Repair invoice submitted', 303),
(404, 'Claim approved after survey', 303),
(405, 'Diabetes not covered', 304),
(406, 'Claim rejected', 304);

INSERT INTO NOMINEE VALUES
(501, 'Ajay Gupta', 'Father', 101),
(502, 'Rohit Verma', 'Brother', 102),
(503, 'Neha Kumar', 'Wife', 103),
(504, 'Ritu Gupta', 'Mother', 104);

INSERT INTO POLICY_DISEASE_COVERAGE VALUES
(1, 300000, 102, 1), 
(2, 200000, 102, 2); 

INSERT INTO POLICY_VEHICLE_COVERAGE VALUES
(1, 100000, 10000, 104, 1),  
(2, 150000, 5000,  104, 2);  

INSERT INTO LIFE_POLICY_TERMS VALUES
(1, 'Policy Maturity', 101),
(2, 'Death', 103);

USE policy;

#Retrieve all active policies with policyholder names
SELECT P.policy_id, PH.name, PT.type_name, P.start_date, P.end_date,
       P.premium_amt, P.sum_assured
FROM POLICY P
JOIN POLICY_HOLDER PH ON P.policyholder_id = PH.policyholder_id
JOIN POLICY_TYPE PT   ON P.policytype_id   = PT.policytype_id
WHERE P.policy_status = 'Active';

#Policyholders who have NOT completed KYC
SELECT policyholder_id, name, email, contact_no
FROM POLICY_HOLDER
WHERE kyc_status = FALSE;

#All nominees with their policyholder and policy type
SELECT N.nominee_name, N.relation, PH.name AS policyholder,
       PT.type_name AS policy_type, P.sum_assured
FROM NOMINEE N
JOIN POLICY P        ON N.policy_id         = P.policy_id
JOIN POLICY_HOLDER PH ON P.policyholder_id  = PH.policyholder_id
JOIN POLICY_TYPE PT   ON P.policytype_id    = PT.policytype_id;

#Policies with unpaid premiums along with holder contact info
SELECT PH.name, PH.contact_no, PH.email,
       P.policy_id, P.policy_status, PR.payment_date
FROM PREMIUM PR
JOIN POLICY P         ON PR.policy_id        = P.policy_id
JOIN POLICY_HOLDER PH ON P.policyholder_id   = PH.policyholder_id
WHERE PR.payment_status = 'Unpaid';

#Full claim details with history and policyholder name
SELECT C.claim_id, PH.name AS holder, PT.type_name,
       C.payment_status AS claim_status, CH.remarks
FROM CLAIM C
JOIN CLAIM_HISTORY CH  ON C.claim_id          = CH.claim_id
JOIN POLICY P          ON C.policy_id         = P.policy_id
JOIN POLICY_HOLDER PH  ON P.policyholder_id   = PH.policyholder_id
JOIN POLICY_TYPE PT    ON P.policytype_id     = PT.policytype_id
ORDER BY C.claim_id;

#Count of policies per policy type
SELECT PT.type_name, COUNT(P.policy_id) AS total_policies
FROM POLICY_TYPE PT
LEFT JOIN POLICY P ON PT.policytype_id = P.policytype_id
GROUP BY PT.type_name;


#Average and total premium collected per policy type (active only)
SELECT PT.type_name,
       COUNT(P.policy_id)    AS total_policies,
       SUM(P.premium_amt)    AS total_premium_collected,
       AVG(P.premium_amt)    AS avg_premium
FROM POLICY P
JOIN POLICY_TYPE PT ON P.policytype_id = PT.policytype_id
WHERE P.policy_status = 'Active'
GROUP BY PT.type_name;

#Total sum assured held per policyholder across all their policies
SELECT PH.name,
       COUNT(P.policy_id)  AS num_policies,
       SUM(P.sum_assured)  AS total_sum_assured
FROM POLICY_HOLDER PH
JOIN POLICY P ON PH.policyholder_id = P.policyholder_id
GROUP BY PH.policyholder_id, PH.name;

#Diseases covered under each health policy with coverage limits
SELECT PH.name, P.policy_id, D.disease_name, PDC.coverage_limit
FROM POLICY_DISEASE_COVERAGE PDC
JOIN POLICY P         ON PDC.policy_id  = P.policy_id
JOIN DISEASE D        ON PDC.disease_id = D.disease_id
JOIN POLICY_HOLDER PH ON P.policyholder_id = PH.policyholder_id;

#Vehicle problems covered under each vehicle policy with deductibles
SELECT PH.name, P.policy_id, VP.problem_name,
       PVC.coverage_limit, PVC.deductible_amt
FROM POLICY_VEHICLE_COVERAGE PVC
JOIN POLICY P          ON PVC.policy_id  = P.policy_id
JOIN VEHICLE_PROBLEM VP ON PVC.problem_id = VP.problem_id
JOIN POLICY_HOLDER PH  ON P.policyholder_id = PH.policyholder_id;

#Policyholders whose policies have a pending claim
SELECT name, email, contact_no
FROM POLICY_HOLDER
WHERE policyholder_id IN (
    SELECT P.policyholder_id
    FROM POLICY P
    WHERE P.policy_id IN (
        SELECT policy_id FROM CLAIM
        WHERE payment_status = 'Pending'
    )
);

#Policies with premium above the average premium amount
SELECT P.policy_id, PH.name, PT.type_name, P.premium_amt
FROM POLICY P
JOIN POLICY_HOLDER PH ON P.policyholder_id = PH.policyholder_id
JOIN POLICY_TYPE PT   ON P.policytype_id   = PT.policytype_id
WHERE P.premium_amt > (
    SELECT AVG(premium_amt) FROM POLICY
);

#Claims filed for diseases NOT covered under that policy 
SELECT C.claim_id, PH.name, D.disease_name, C.payment_status
FROM CLAIM C
JOIN POLICY P         ON C.policy_id        = P.policy_id
JOIN POLICY_HOLDER PH ON P.policyholder_id  = PH.policyholder_id
JOIN DISEASE D        ON C.disease_id       = D.disease_id
WHERE C.disease_id IS NOT NULL
  AND C.disease_id NOT IN (
      SELECT disease_id
      FROM POLICY_DISEASE_COVERAGE
      WHERE policy_id = C.policy_id
  );

#Policies expiring within the next 5 years
SELECT P.policy_id, PH.name, PT.type_name,
       P.end_date,
       DATEDIFF(P.end_date, CURDATE()) AS days_remaining
FROM POLICY P
JOIN POLICY_HOLDER PH ON P.policyholder_id = PH.policyholder_id
JOIN POLICY_TYPE PT   ON P.policytype_id   = PT.policytype_id
WHERE P.end_date BETWEEN CURDATE()
                     AND DATE_ADD(CURDATE(), INTERVAL 5 YEAR)
ORDER BY P.end_date ASC;

#Total payout vs total premium revenue per policy type
SELECT PT.type_name,
       SUM(P.premium_amt)                                        AS total_premium_revenue,
       SUM(CASE WHEN C.payment_status = 'Approved'
                THEN P.sum_assured ELSE 0 END)                   AS total_payout,
       SUM(P.premium_amt) - SUM(CASE WHEN C.payment_status = 'Approved'
                                     THEN P.sum_assured ELSE 0 END) AS net_revenue
FROM POLICY P
JOIN POLICY_TYPE PT       ON P.policytype_id   = PT.policytype_id
LEFT JOIN CLAIM C         ON P.policy_id       = C.policy_id
GROUP BY PT.type_name
HAVING SUM(P.premium_amt) > 0
ORDER BY net_revenue DESC;