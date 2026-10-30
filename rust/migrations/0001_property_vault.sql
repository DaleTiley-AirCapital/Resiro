CREATE SCHEMA IF NOT EXISTS resiro;
CREATE TABLE resiro.users (
 id uuid PRIMARY KEY, org_id uuid NOT NULL, email text NOT NULL UNIQUE,
 name text NOT NULL, password_hash text NOT NULL, role text NOT NULL DEFAULT 'owner',
 profile jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE resiro.sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES resiro.users(id),
 csrf text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE resiro.invites (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES resiro.users(id),
 expires_at timestamptz NOT NULL, consumed_at timestamptz
);
CREATE TABLE resiro.properties (
 id uuid PRIMARY KEY, org_id uuid NOT NULL, name text NOT NULL, address text NOT NULL,
 data jsonb NOT NULL DEFAULT '{}', visibility text NOT NULL DEFAULT 'private',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX property_owner ON resiro.properties(org_id);
CREATE TABLE resiro.documents (
 id uuid PRIMARY KEY, property_id uuid NOT NULL REFERENCES resiro.properties(id),
 org_id uuid NOT NULL, name text NOT NULL, title text NOT NULL, category text NOT NULL,
 sha256 text NOT NULL, bytes bigint NOT NULL, mime text NOT NULL, bucket text NOT NULL,
 object_key text NOT NULL, status text NOT NULL DEFAULT 'queued', extracted_text text NOT NULL DEFAULT '',
 extraction jsonb NOT NULL DEFAULT '{}', error text, attempts integer NOT NULL DEFAULT 0,
 claimed_at timestamptz, processed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(property_id,sha256)
);
CREATE INDEX document_property ON resiro.documents(property_id,org_id,category);
CREATE INDEX document_search ON resiro.documents USING gin(to_tsvector('english',name || ' ' || title || ' ' || extracted_text));
CREATE TABLE resiro.document_sources (
 id uuid PRIMARY KEY, document_id uuid NOT NULL REFERENCES resiro.documents(id),
 source_root text NOT NULL, source_path text NOT NULL, parent_id uuid REFERENCES resiro.documents(id),
 modified_at text, source_sha256 text, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(document_id,source_root,source_path)
);
CREATE TABLE resiro.facts (
 id uuid PRIMARY KEY, property_id uuid NOT NULL REFERENCES resiro.properties(id),
 document_id uuid NOT NULL REFERENCES resiro.documents(id), org_id uuid NOT NULL,
 fact_key text NOT NULL, value jsonb NOT NULL, quote text NOT NULL, page integer,
 confidence text NOT NULL DEFAULT 'candidate', review_status text NOT NULL DEFAULT 'unreviewed',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fact_property ON resiro.facts(property_id,org_id,fact_key);
CREATE TABLE resiro.assets (
 id uuid PRIMARY KEY, property_id uuid NOT NULL REFERENCES resiro.properties(id), org_id uuid NOT NULL,
 name text NOT NULL, category text NOT NULL, room text NOT NULL DEFAULT '',
 data jsonb NOT NULL DEFAULT '{}', document_id uuid REFERENCES resiro.documents(id),
 review_status text NOT NULL DEFAULT 'candidate', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX asset_property ON resiro.assets(property_id,org_id);
CREATE TABLE resiro.events (
 id uuid PRIMARY KEY, property_id uuid REFERENCES resiro.properties(id), org_id uuid NOT NULL,
 kind text NOT NULL, title text NOT NULL, data jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE resiro.reminders (
 id uuid PRIMARY KEY, property_id uuid NOT NULL REFERENCES resiro.properties(id), org_id uuid NOT NULL,
 title text NOT NULL, description text NOT NULL DEFAULT '', due_at timestamptz NOT NULL,
 recurrence text NOT NULL DEFAULT 'none', status text NOT NULL DEFAULT 'open',
 notified_due timestamptz, revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE resiro.bookings (
 id uuid PRIMARY KEY, property_id uuid NOT NULL REFERENCES resiro.properties(id), owner_org uuid NOT NULL,
 supplier_org uuid NOT NULL, title text NOT NULL, description text NOT NULL DEFAULT '',
 start_at timestamptz NOT NULL,end_at timestamptz NOT NULL,status text NOT NULL DEFAULT 'requested',
 revision integer NOT NULL DEFAULT 1, history jsonb NOT NULL DEFAULT '[]',
 notified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), CHECK(end_at>start_at)
);
CREATE INDEX booking_supplier ON resiro.bookings(supplier_org,start_at);
CREATE TABLE resiro.notifications (
 id uuid PRIMARY KEY, org_id uuid NOT NULL, source_key text NOT NULL UNIQUE, title text NOT NULL,
 message text NOT NULL, path text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE resiro.questions (
 id uuid PRIMARY KEY, property_id uuid NOT NULL REFERENCES resiro.properties(id), org_id uuid NOT NULL,
 question text NOT NULL, answer jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE resiro.imports (
 id uuid PRIMARY KEY, property_id uuid NOT NULL REFERENCES resiro.properties(id), org_id uuid NOT NULL,
 manifest jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
-- Keep the existing installation intact; migrate identities without replacing passwords.
INSERT INTO resiro.users(id,org_id,email,name,password_hash,role,profile)
SELECT id,org_id,email,coalesce(first_name,'') || ' ' || coalesce(last_name,''),password,
 CASE WHEN user_type='supplier' THEN 'supplier' ELSE 'owner' END,'{}'::jsonb
FROM public.users ON CONFLICT(email) DO NOTHING;
INSERT INTO resiro.properties(id,org_id,name,address,data)
SELECT id,org_id,name,coalesce(address,name),
 jsonb_build_object('dna_id',dna_id,'municipality',municipality,'township',township,'erf_number',parcel_id,'country',country)
FROM public.properties ON CONFLICT(id) DO NOTHING;
