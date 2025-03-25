CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20),
    reservation_type VARCHAR(20),
    needs_protection BOOLEAN,
    number_of_people INT,
    plan_type VARCHAR(10),
    equipment_insurance BOOLEAN,
    options TEXT,
    shooting_type VARCHAR(20),
    shooting_details TEXT,
    photographer_name VARCHAR(100)
);

CREATE TABLE calendar (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    reservationDetails JSON
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    company_name VARCHAR(255),
    address VARCHAR(255),
    role VARCHAR(20) NOT NULL
);