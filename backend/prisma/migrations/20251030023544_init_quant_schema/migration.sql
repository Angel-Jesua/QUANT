-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('administrator', 'accountant');

-- CreateEnum
CREATE TYPE "avatar_type" AS ENUM ('generated', 'uploaded', 'social', 'gravatar');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'failed_login', 'password_change', 'photo_upload', 'photo_delete');

-- CreateTable
CREATE TABLE "user_account" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'accountant',
    "profile_image_url" TEXT,
    "avatar_type" "avatar_type" NOT NULL DEFAULT 'generated',
    "photo_requested" BOOLEAN NOT NULL DEFAULT true,
    "photo_uploaded_at" TIMESTAMP(3),
    "photo_reminder_sent_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "last_activity" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3),
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "google_id" TEXT,
    "facebook_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "user_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_session" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "ip_address" INET,
    "user_agent" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "id" SERIAL NOT NULL,
    "role" "user_role" NOT NULL,
    "module" TEXT NOT NULL,
    "can_read" BOOLEAN NOT NULL DEFAULT false,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_update" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_audit_log" (
    "id" BIGSERIAL NOT NULL,
    "user_id" INTEGER,
    "action" "audit_action" NOT NULL,
    "entity_type" TEXT NOT NULL DEFAULT 'user',
    "entity_id" INTEGER,
    "old_data" JSONB,
    "new_data" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_account_username_key" ON "user_account"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_account_email_key" ON "user_account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_account_google_id_key" ON "user_account"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_account_facebook_id_key" ON "user_account"("facebook_id");

-- CreateIndex
CREATE INDEX "user_account_username_idx" ON "user_account"("username");

-- CreateIndex
CREATE INDEX "user_account_email_idx" ON "user_account"("email");

-- CreateIndex
CREATE INDEX "user_account_role_idx" ON "user_account"("role");

-- CreateIndex
CREATE INDEX "user_account_is_active_idx" ON "user_account"("is_active");

-- CreateIndex
CREATE INDEX "user_account_locked_until_idx" ON "user_account"("locked_until");

-- CreateIndex
CREATE INDEX "user_account_avatar_type_idx" ON "user_account"("avatar_type");

-- CreateIndex
CREATE INDEX "user_account_photo_requested_idx" ON "user_account"("photo_requested");

-- CreateIndex
CREATE INDEX "user_account_created_by_idx" ON "user_account"("created_by");

-- CreateIndex
CREATE INDEX "user_account_updated_by_idx" ON "user_account"("updated_by");

-- CreateIndex
CREATE UNIQUE INDEX "user_session_token_key" ON "user_session"("token");

-- CreateIndex
CREATE INDEX "user_session_user_id_idx" ON "user_session"("user_id");

-- CreateIndex
CREATE INDEX "user_session_token_idx" ON "user_session"("token");

-- CreateIndex
CREATE INDEX "user_session_expires_at_idx" ON "user_session"("expires_at");

-- CreateIndex
CREATE INDEX "user_session_is_active_expires_at_idx" ON "user_session"("is_active", "expires_at");

-- CreateIndex
CREATE INDEX "role_permission_role_module_idx" ON "role_permission"("role", "module");

-- CreateIndex
CREATE INDEX "role_permission_created_by_idx" ON "role_permission"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_role_module_key" ON "role_permission"("role", "module");

-- CreateIndex
CREATE INDEX "user_audit_log_user_id_idx" ON "user_audit_log"("user_id");

-- CreateIndex
CREATE INDEX "user_audit_log_action_idx" ON "user_audit_log"("action");

-- CreateIndex
CREATE INDEX "user_audit_log_performed_at_idx" ON "user_audit_log"("performed_at");

-- CreateIndex
CREATE INDEX "user_audit_log_entity_type_entity_id_idx" ON "user_audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "user_audit_log_user_id_performed_at_idx" ON "user_audit_log"("user_id", "performed_at");

-- AddForeignKey
ALTER TABLE "user_account" ADD CONSTRAINT "user_account_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_account" ADD CONSTRAINT "user_account_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_session" ADD CONSTRAINT "user_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_audit_log" ADD CONSTRAINT "user_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
