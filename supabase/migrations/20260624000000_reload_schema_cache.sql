-- Reload PostgREST schema cache after migration changes.
-- Fixes: "Could not find a relationship between 'room_members' and 'user_id' in the schema cache"
NOTIFY pgrst, 'reload schema';
