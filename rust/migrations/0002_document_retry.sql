ALTER TABLE resiro.documents ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX document_queue_ready ON resiro.documents(status,next_attempt_at);
CREATE TABLE resiro.auth_attempts (key text PRIMARY KEY,attempts integer NOT NULL,window_start timestamptz NOT NULL DEFAULT now());
