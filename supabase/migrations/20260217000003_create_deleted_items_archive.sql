-- Global archive table for soft-delete/undo flows across the application
CREATE TABLE IF NOT EXISTS deleted_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  location_id UUID NULL REFERENCES locations(id) ON DELETE SET NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  restored_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  restored_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_deleted_items_entity ON deleted_items(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_deleted_items_deleted_at ON deleted_items(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_deleted_items_active ON deleted_items(restored_at) WHERE restored_at IS NULL;

ALTER TABLE deleted_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for service role only" ON deleted_items;
CREATE POLICY "Enable read for service role only" ON deleted_items
  FOR SELECT USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Enable write for service role only" ON deleted_items;
CREATE POLICY "Enable write for service role only" ON deleted_items
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE deleted_items IS 'Global archive/recycle bin entries for deleted entities with snapshots for restore.';
