-- =============================================
-- MIGRATION: Initialize User Authentication System
-- Based on Prisma Schema for QUANT Accounting System
-- =============================================

-- =============================================
-- EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENUM TYPES
-- =============================================

-- Roles de usuario en el sistema
CREATE TYPE user_role AS ENUM ('administrator', 'accountant');

-- Tipos de avatar
CREATE TYPE avatar_type AS ENUM ('generated', 'uploaded', 'social', 'gravatar');

-- Acciones de auditoría para usuarios
CREATE TYPE audit_action AS ENUM (
    'create', 
    'update', 
    'delete', 
    'login', 
    'logout', 
    'failed_login', 
    'password_change',
    'photo_upload',
    'photo_delete'
);

-- =============================================
-- TABLAS PRINCIPALES
-- =============================================

-- Tabla principal de usuarios
CREATE TABLE user_account (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'accountant',
    
    -- Sistema de Avatar Híbrido
    profile_image_url VARCHAR(500),
    avatar_type avatar_type NOT NULL DEFAULT 'generated',
    
    -- Control de foto de perfil
    photo_requested BOOLEAN NOT NULL DEFAULT TRUE,
    photo_uploaded_at TIMESTAMP,
    photo_reminder_sent_at TIMESTAMP,
    
    -- Control de estado y seguridad
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMP,
    last_activity TIMESTAMP,
    
    -- Seguridad y bloqueos
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP,
    password_changed_at TIMESTAMP,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- OAuth (opcional para futuro)
    google_id VARCHAR(100) UNIQUE,
    facebook_id VARCHAR(100) UNIQUE,
    
    -- Auditoría
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    
    CONSTRAINT fk_user_created_by FOREIGN KEY (created_by) REFERENCES user_account(id) ON DELETE SET NULL,
    CONSTRAINT fk_user_updated_by FOREIGN KEY (updated_by) REFERENCES user_account(id) ON DELETE SET NULL
);

-- Tabla de sesiones de usuario
CREATE TABLE user_session (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE
);

-- Tabla de permisos por rol
CREATE TABLE role_permission (
    id SERIAL PRIMARY KEY,
    role user_role NOT NULL,
    module VARCHAR(50) NOT NULL,
    can_read BOOLEAN NOT NULL DEFAULT FALSE,
    can_create BOOLEAN NOT NULL DEFAULT FALSE,
    can_update BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    
    CONSTRAINT fk_permission_created_by FOREIGN KEY (created_by) REFERENCES user_account(id) ON DELETE SET NULL,
    UNIQUE(role, module)
);

-- Tabla de auditoría de usuarios
CREATE TABLE user_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER,
    action audit_action NOT NULL,
    entity_type VARCHAR(50) NOT NULL DEFAULT 'user',
    entity_id INTEGER,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE SET NULL
);

-- =============================================
-- ÍNDICES
-- =============================================

-- Índices para búsquedas rápidas de usuarios
CREATE INDEX idx_user_username ON user_account(username) WHERE is_active = TRUE;
CREATE INDEX idx_user_email ON user_account(email) WHERE is_active = TRUE;
CREATE INDEX idx_user_role ON user_account(role) WHERE is_active = TRUE;
CREATE INDEX idx_user_active ON user_account(is_active);
CREATE INDEX idx_user_locked ON user_account(locked_until) WHERE locked_until IS NOT NULL;

-- Índices para sistema de avatar
CREATE INDEX idx_user_avatar_type ON user_account(avatar_type);
CREATE INDEX idx_user_photo_requested ON user_account(photo_requested) 
    WHERE photo_requested = TRUE AND avatar_type = 'generated';

-- Índices para sesiones
CREATE INDEX idx_session_user ON user_session(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_session_token ON user_session(token) WHERE is_active = TRUE;
CREATE INDEX idx_session_expires ON user_session(expires_at) WHERE is_active = TRUE;
CREATE INDEX idx_session_active ON user_session(is_active, expires_at);

-- Índices para permisos
CREATE INDEX idx_role_permission ON role_permission(role, module);

-- Índices para auditoría
CREATE INDEX idx_audit_user ON user_audit_log(user_id);
CREATE INDEX idx_audit_action ON user_audit_log(action);
CREATE INDEX idx_audit_date ON user_audit_log(performed_at DESC);
CREATE INDEX idx_audit_entity ON user_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user_date ON user_audit_log(user_id, performed_at DESC);

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_account_updated_at 
    BEFORE UPDATE ON user_account 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();