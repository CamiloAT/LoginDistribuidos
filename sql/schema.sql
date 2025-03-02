CREATE TABLE users (
    user_id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    failed_attempts INT DEFAULT 0
);

CREATE TABLE roles (
    role_id CHAR(36) PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE user_roles (
    user_role_id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    role_id CHAR(36) NOT NULL,
    assignment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE access_history (
    access_id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    access_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_successful TINYINT(1) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO roles (role_id, name, description) 
VALUES (UUID(), 'admin', 'Administrator with full permissions');

INSERT INTO roles (role_id, name, description) 
VALUES (UUID(), 'visitor', 'User with read-only access');

INSERT INTO roles (role_id, name, description) 
VALUES (UUID(), 'editor', 'User with permissions to modify content');

INSERT INTO users (user_id, name, email, password_hash, status, creation_date, failed_attempts) 
VALUES (UUID(), 'Jose', 'jose.ortega01@uptc.edu.co', '$2b$10$xj/bxoSTNMHCZrRMA9NAluAIaAciD6qDlUK8L.qiD43ul/tjJ22LC', 'active', NOW(), 0);

SET @user_id = (SELECT user_id FROM users WHERE email = 'jose.ortega01@uptc.edu.co');

SET @admin_role = (SELECT role_id FROM roles WHERE name = 'admin');
SET @visitor_role = (SELECT role_id FROM roles WHERE name = 'visitor');
SET @editor_role = (SELECT role_id FROM roles WHERE name = 'editor');

INSERT INTO user_roles (user_role_id, user_id, role_id, assignment_date) 
VALUES (UUID(), @user_id, @admin_role, NOW());

INSERT INTO user_roles (user_role_id, user_id, role_id, assignment_date) 
VALUES (UUID(), @user_id, @visitor_role, NOW());

INSERT INTO user_roles (user_role_id, user_id, role_id, assignment_date) 
VALUES (UUID(), @user_id, @editor_role, NOW());