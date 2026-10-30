CREATE TABLE resiro.analysis_sections (
 document_id uuid NOT NULL REFERENCES resiro.documents(id) ON DELETE CASCADE,
 model text NOT NULL, section_hash text NOT NULL, part_index integer NOT NULL,
 analysis jsonb NOT NULL, response_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(document_id,model,section_hash)
);
