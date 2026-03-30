-- Virtual Café Database Schema for Supabase
-- Created for PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code VARCHAR(255) NOT NULL UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT true,
  capacity INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  
  CONSTRAINT room_code_length CHECK (char_length(room_code) >= 3 AND char_length(room_code) <= 255),
  CONSTRAINT capacity_valid CHECK (capacity >= 1 AND capacity <= 50)
);

-- Participants Table (Room Membership)
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_participant_per_room UNIQUE(room_id, user_id)
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT title_not_empty CHECK (char_length(title) > 0)
);

-- Timer States Table (for history and recovery)
CREATE TABLE IF NOT EXISTS timer_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  is_running BOOLEAN NOT NULL DEFAULT false,
  mode VARCHAR(50) NOT NULL CHECK (mode IN ('study', 'break')),
  time_remaining INTEGER NOT NULL,
  total_time INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE,
  session_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Room Activity Log (optional, for analytics)
CREATE TABLE IF NOT EXISTS room_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  user_id VARCHAR(255),
  username VARCHAR(255),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Settings (for future enhancement)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL UNIQUE,
  sound_preferences JSONB DEFAULT '{"rain": false, "cafe": false, "fireplace": false}'::jsonb,
  volume_settings JSONB DEFAULT '{"rain": 50, "cafe": 50, "fireplace": 50}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_is_public ON rooms(is_public);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_participants_room_id ON participants(room_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_room_id ON tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);

CREATE INDEX IF NOT EXISTS idx_timer_states_room_id ON timer_states(room_id);
CREATE INDEX IF NOT EXISTS idx_timer_states_created_at ON timer_states(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_room_activity_room_id ON room_activity_log(room_id);
CREATE INDEX IF NOT EXISTS idx_room_activity_created_at ON room_activity_log(created_at DESC);

-- Enable Row Level Security (RLS) - Optional but recommended
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow all for now - secure later with authentication)
CREATE POLICY "Enable read for all users" ON rooms FOR SELECT USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON rooms FOR ALL USING (true);

CREATE POLICY "Enable read for all users" ON participants FOR SELECT USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON participants FOR ALL USING (true);

CREATE POLICY "Enable read for all users" ON tasks FOR SELECT USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON tasks FOR ALL USING (true);

CREATE POLICY "Enable read for all users" ON timer_states FOR SELECT USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON timer_states FOR ALL USING (true);

CREATE POLICY "Enable read for all users" ON room_activity_log FOR SELECT USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON room_activity_log FOR ALL USING (true);

CREATE POLICY "Enable read for own settings" ON user_settings FOR SELECT USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON user_settings FOR ALL USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timer_states_updated_at BEFORE UPDATE ON timer_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
