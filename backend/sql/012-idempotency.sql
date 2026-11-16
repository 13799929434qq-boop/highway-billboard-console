CREATE TABLE sys_action_request (
 request_id CHAR(36) NOT NULL,
 username VARCHAR(50) NOT NULL,
 action_type VARCHAR(50) NOT NULL,
 payload_hash CHAR(64) NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
