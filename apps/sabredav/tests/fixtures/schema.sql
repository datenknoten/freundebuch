-- Test database schema for SabreDAV integration tests
-- This is a minimal schema based on the Freundebuch migrations

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS friends;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Auth schema tables
-- ============================================

-- Users table
CREATE TABLE auth.users (
    id SERIAL PRIMARY KEY,
    external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    self_profile_id INTEGER,
    preferences JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- App passwords table for CardDAV authentication
CREATE TABLE auth.app_passwords (
    id SERIAL PRIMARY KEY,
    external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_prefix VARCHAR(8) NOT NULL,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT app_passwords_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX idx_app_passwords_user_id ON auth.app_passwords(user_id);
CREATE INDEX idx_app_passwords_prefix ON auth.app_passwords(password_prefix);
CREATE INDEX idx_app_passwords_active ON auth.app_passwords(user_id) WHERE revoked_at IS NULL;

-- ============================================
-- Friends schema tables
-- ============================================

-- Main friends table
CREATE TABLE friends.friends (
    id SERIAL PRIMARY KEY,
    external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    name_prefix VARCHAR(50),
    name_first VARCHAR(100),
    name_middle VARCHAR(100),
    name_last VARCHAR(100),
    name_suffix VARCHAR(50),
    photo_url VARCHAR(500),
    photo_thumbnail_url VARCHAR(500),
    job_title VARCHAR(255),
    organization VARCHAR(255),
    department VARCHAR(255),
    work_notes TEXT,
    interests TEXT,
    vcard_raw_json JSONB,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT friends_display_name_not_empty CHECK (LENGTH(TRIM(display_name)) > 0)
);

CREATE INDEX idx_friends_user_id ON friends.friends(user_id);
CREATE INDEX idx_friends_external_id ON friends.friends(external_id);
CREATE INDEX idx_friends_not_deleted ON friends.friends(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER update_friends_updated_at
BEFORE UPDATE ON friends.friends
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Friend phones
CREATE TABLE friends.friend_phones (
    id SERIAL PRIMARY KEY,
    external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    friend_id INTEGER NOT NULL REFERENCES friends.friends(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    phone_type VARCHAR(20) NOT NULL DEFAULT 'mobile',
    label VARCHAR(100),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_phone_type CHECK (phone_type IN ('mobile', 'home', 'work', 'fax', 'other'))
);

CREATE INDEX idx_friend_phones_friend_id ON friends.friend_phones(friend_id);

-- Friend emails
CREATE TABLE friends.friend_emails (
    id SERIAL PRIMARY KEY,
    external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    friend_id INTEGER NOT NULL REFERENCES friends.friends(id) ON DELETE CASCADE,
    email_address VARCHAR(255) NOT NULL,
    email_type VARCHAR(20) NOT NULL DEFAULT 'personal',
    label VARCHAR(100),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_email_type CHECK (email_type IN ('personal', 'work', 'other'))
);

CREATE INDEX idx_friend_emails_friend_id ON friends.friend_emails(friend_id);

-- Friend addresses
CREATE TABLE friends.friend_addresses (
    id SERIAL PRIMARY KEY,
    external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    friend_id INTEGER NOT NULL REFERENCES friends.friends(id) ON DELETE CASCADE,
    street_line1 VARCHAR(255),
    street_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    address_type VARCHAR(20) NOT NULL DEFAULT 'home',
    label VARCHAR(100),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_address_type CHECK (address_type IN ('home', 'work', 'other'))
);

CREATE INDEX idx_friend_addresses_friend_id ON friends.friend_addresses(friend_id);

-- Friend URLs
CREATE TABLE friends.friend_urls (
    id SERIAL PRIMARY KEY,
    external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    friend_id INTEGER NOT NULL REFERENCES friends.friends(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    url_type VARCHAR(20) NOT NULL DEFAULT 'personal',
    label VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_url_type CHECK (url_type IN ('personal', 'work', 'blog', 'other'))
);

CREATE INDEX idx_friend_urls_friend_id ON friends.friend_urls(friend_id);

-- Friend dates (birthdays, anniversaries)
CREATE TABLE friends.friend_dates (
    id SERIAL PRIMARY KEY,
    external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    friend_id INTEGER NOT NULL REFERENCES friends.friends(id) ON DELETE CASCADE,
    date_value DATE NOT NULL,
    year_known BOOLEAN NOT NULL DEFAULT TRUE,
    date_type VARCHAR(20) NOT NULL,
    label VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_date_type CHECK (date_type IN ('birthday', 'anniversary', 'other'))
);

CREATE INDEX idx_friend_dates_friend_id ON friends.friend_dates(friend_id);

-- Friend met info
CREATE TABLE friends.friend_met_info (
    id SERIAL PRIMARY KEY,
    external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    friend_id INTEGER NOT NULL UNIQUE REFERENCES friends.friends(id) ON DELETE CASCADE,
    met_date DATE,
    met_location VARCHAR(255),
    met_context TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_friend_met_info_friend_id ON friends.friend_met_info(friend_id);

CREATE TRIGGER update_friend_met_info_updated_at
BEFORE UPDATE ON friends.friend_met_info
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Friend social profiles
CREATE TABLE friends.friend_social_profiles (
    id SERIAL PRIMARY KEY,
    external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    friend_id INTEGER NOT NULL REFERENCES friends.friends(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL DEFAULT 'other',
    profile_url VARCHAR(500),
    username VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_friend_social_profiles_friend_id ON friends.friend_social_profiles(friend_id);

-- Friend changes tracking for CardDAV sync
CREATE TABLE friends.friend_changes (
    id BIGSERIAL PRIMARY KEY,
    friend_id INTEGER,
    user_id INTEGER NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_external_id UUID NOT NULL,
    change_type VARCHAR(10) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_change_type CHECK (change_type IN ('create', 'update', 'delete'))
);

CREATE INDEX idx_friend_changes_user_id ON friends.friend_changes(user_id);
CREATE INDEX idx_friend_changes_sync ON friends.friend_changes(user_id, id);

-- ============================================
-- Trigger functions for change tracking
-- ============================================

CREATE OR REPLACE FUNCTION friends.log_friend_change()
RETURNS TRIGGER AS $$
DECLARE
  v_change_type VARCHAR(10);
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO friends.friend_changes (friend_id, user_id, change_type, friend_external_id)
    VALUES (NEW.id, NEW.user_id, 'create', NEW.external_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.display_name IS DISTINCT FROM NEW.display_name
       OR OLD.name_prefix IS DISTINCT FROM NEW.name_prefix
       OR OLD.name_first IS DISTINCT FROM NEW.name_first
       OR OLD.name_middle IS DISTINCT FROM NEW.name_middle
       OR OLD.name_last IS DISTINCT FROM NEW.name_last
       OR OLD.name_suffix IS DISTINCT FROM NEW.name_suffix
       OR OLD.nickname IS DISTINCT FROM NEW.nickname
       OR OLD.photo_url IS DISTINCT FROM NEW.photo_url
       OR OLD.job_title IS DISTINCT FROM NEW.job_title
       OR OLD.organization IS DISTINCT FROM NEW.organization
       OR OLD.department IS DISTINCT FROM NEW.department
       OR OLD.interests IS DISTINCT FROM NEW.interests
       OR OLD.work_notes IS DISTINCT FROM NEW.work_notes
       OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
    THEN
      IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        v_change_type := 'delete';
      ELSE
        v_change_type := 'update';
      END IF;

      INSERT INTO friends.friend_changes (friend_id, user_id, change_type, friend_external_id)
      VALUES (NEW.id, NEW.user_id, v_change_type, NEW.external_id);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friend_change_trigger
AFTER INSERT OR UPDATE ON friends.friends
FOR EACH ROW
EXECUTE FUNCTION friends.log_friend_change();

-- Function to log sub-resource changes
CREATE OR REPLACE FUNCTION friends.log_subresource_change()
RETURNS TRIGGER AS $$
DECLARE
  v_friend_external_id UUID;
  v_user_id INTEGER;
BEGIN
  SELECT external_id, user_id INTO v_friend_external_id, v_user_id
  FROM friends.friends
  WHERE id = COALESCE(NEW.friend_id, OLD.friend_id);

  IF v_friend_external_id IS NOT NULL THEN
    INSERT INTO friends.friend_changes (friend_id, user_id, change_type, friend_external_id)
    VALUES (COALESCE(NEW.friend_id, OLD.friend_id), v_user_id, 'update', v_friend_external_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers on sub-resource tables
CREATE TRIGGER phone_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON friends.friend_phones
FOR EACH ROW
EXECUTE FUNCTION friends.log_subresource_change();

CREATE TRIGGER email_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON friends.friend_emails
FOR EACH ROW
EXECUTE FUNCTION friends.log_subresource_change();

CREATE TRIGGER address_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON friends.friend_addresses
FOR EACH ROW
EXECUTE FUNCTION friends.log_subresource_change();

CREATE TRIGGER url_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON friends.friend_urls
FOR EACH ROW
EXECUTE FUNCTION friends.log_subresource_change();

CREATE TRIGGER date_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON friends.friend_dates
FOR EACH ROW
EXECUTE FUNCTION friends.log_subresource_change();

CREATE TRIGGER social_profile_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON friends.friend_social_profiles
FOR EACH ROW
EXECUTE FUNCTION friends.log_subresource_change();

CREATE TRIGGER met_info_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON friends.friend_met_info
FOR EACH ROW
EXECUTE FUNCTION friends.log_subresource_change();
