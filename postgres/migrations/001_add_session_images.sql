-- Migration: Add session_images table for image optimization
-- Run this if your database was created before image optimization feature

CREATE TABLE IF NOT EXISTS session_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    original_path TEXT NOT NULL,
    webp_path TEXT NOT NULL,
    thumbnail_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    webp_size_bytes INTEGER,
    thumbnail_size_bytes INTEGER,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_images_session_id ON session_images(session_id);
CREATE INDEX IF NOT EXISTS idx_session_images_created_at ON session_images(created_at DESC);
