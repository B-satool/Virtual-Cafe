/**
 * Supabase Database Configuration and Query Utilities
 * Handles all database operations for Virtual Café
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// =============================================
// ROOMS OPERATIONS
// =============================================

async function createRoom(roomCode, isPublic = true, capacity = 10, createdBy = null) {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .insert([
        {
          room_code: roomCode,
          is_public: isPublic,
          capacity: capacity,
          created_by: createdBy
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, room: data };
  } catch (error) {
    console.error('Error creating room:', error.message);
    return { success: false, error: error.message };
  }
}

async function getRoomByCode(roomCode) {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
    return { success: true, room: data };
  } catch (error) {
    console.error('Error getting room:', error.message);
    return { success: false, error: error.message };
  }
}

async function getRoomById(roomId) {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { success: true, room: data };
  } catch (error) {
    console.error('Error getting room by ID:', error.message);
    return { success: false, error: error.message };
  }
}

async function getPublicRooms(limit = 50) {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, rooms: data };
  } catch (error) {
    console.error('Error getting public rooms:', error.message);
    return { success: false, error: error.message };
  }
}

async function checkRoomExists(roomCode) {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('id')
      .eq('room_code', roomCode)
      .limit(1);

    if (error) throw error;
    return { success: true, exists: data && data.length > 0 };
  } catch (error) {
    console.error('Error checking room exists:', error.message);
    return { success: false, error: error.message };
  }
}

// =============================================
// PARTICIPANTS OPERATIONS
// =============================================

async function addParticipant(roomId, userId, username, isHost = false) {
  try {
    const { data, error } = await supabase
      .from('participants')
      .insert([
        {
          room_id: roomId,
          user_id: userId,
          username: username,
          is_host: isHost
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, participant: data };
  } catch (error) {
    console.error('Error adding participant:', error.message);
    return { success: false, error: error.message };
  }
}

async function removeParticipant(roomId, userId) {
  try {
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error removing participant:', error.message);
    return { success: false, error: error.message };
  }
}

async function getParticipants(roomId) {
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return { success: true, participants: data };
  } catch (error) {
    console.error('Error getting participants:', error.message);
    return { success: false, error: error.message };
  }
}

async function getParticipantCount(roomId) {
  try {
    const { count, error } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId);

    if (error) throw error;
    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Error getting participant count:', error.message);
    return { success: false, error: error.message };
  }
}

async function setHostStatus(roomId, userId, isHost) {
  try {
    const { error } = await supabase
      .from('participants')
      .update({ is_host: isHost })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error setting host status:', error.message);
    return { success: false, error: error.message };
  }
}

async function clearNonHosts(roomId) {
  try {
    const { error } = await supabase
      .from('participants')
      .update({ is_host: false })
      .eq('room_id', roomId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error clearing hosts:', error.message);
    return { success: false, error: error.message };
  }
}

// =============================================
// TASKS OPERATIONS
// =============================================

async function addTask(roomId, title, createdBy) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          room_id: roomId,
          title: title,
          created_by: createdBy
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, task: data };
  } catch (error) {
    console.error('Error adding task:', error.message);
    return { success: false, error: error.message };
  }
}

async function updateTask(taskId, updates) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, task: data };
  } catch (error) {
    console.error('Error updating task:', error.message);
    return { success: false, error: error.message };
  }
}

async function deleteTask(taskId) {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting task:', error.message);
    return { success: false, error: error.message };
  }
}

async function getTasks(roomId) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { success: true, tasks: data };
  } catch (error) {
    console.error('Error getting tasks:', error.message);
    return { success: false, error: error.message };
  }
}

async function clearRoomTasks(roomId) {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('room_id', roomId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error clearing tasks:', error.message);
    return { success: false, error: error.message };
  }
}

// =============================================
// TIMER STATE OPERATIONS
// =============================================

async function saveTimerState(roomId, timerState) {
  try {
    const { data, error } = await supabase
      .from('timer_states')
      .insert([
        {
          room_id: roomId,
          is_running: timerState.isRunning,
          mode: timerState.mode,
          time_remaining: timerState.timeRemaining,
          total_time: timerState.totalTime,
          started_at: timerState.startedAt,
          paused_at: timerState.pausedAt,
          session_count: timerState.sessionCount
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, timerState: data };
  } catch (error) {
    console.error('Error saving timer state:', error.message);
    return { success: false, error: error.message };
  }
}

async function getLatestTimerState(roomId) {
  try {
    const { data, error } = await supabase
      .from('timer_states')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { success: true, timerState: data };
  } catch (error) {
    console.error('Error getting timer state:', error.message);
    return { success: false, error: error.message };
  }
}

// =============================================
// ACTIVITY LOG OPERATIONS
// =============================================

async function logActivity(roomId, activityType, userId = null, username = null, details = null) {
  try {
    const { error } = await supabase
      .from('room_activity_log')
      .insert([
        {
          room_id: roomId,
          activity_type: activityType,
          user_id: userId,
          username: username,
          details: details
        }
      ]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error logging activity:', error.message);
    return { success: false, error: error.message };
  }
}

async function getActivityLog(roomId, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('room_activity_log')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, activities: data };
  } catch (error) {
    console.error('Error getting activity log:', error.message);
    return { success: false, error: error.message };
  }
}

// =============================================
// EXPORTS
// =============================================

module.exports = {
  supabase,
  
  // Rooms
  createRoom,
  getRoomByCode,
  getRoomById,
  getPublicRooms,
  checkRoomExists,
  
  // Participants
  addParticipant,
  removeParticipant,
  getParticipants,
  getParticipantCount,
  setHostStatus,
  clearNonHosts,
  
  // Tasks
  addTask,
  updateTask,
  deleteTask,
  getTasks,
  clearRoomTasks,
  
  // Timer State
  saveTimerState,
  getLatestTimerState,
  
  // Activity Log
  logActivity,
  getActivityLog
};
