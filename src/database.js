// Database module for Supabase interactions
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

async function signUp(email, password, fullName) {
  try {
    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.APP_URL || "http://localhost:3001"}/auth/callback`,
        data: {
          display_name: fullName,
        },
      },
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    const userId = authData.user.id;

    // Create user profile in database
    // Use .insert() instead of .upsert() to catch duplicates
    const username = fullName.toLowerCase().replace(/\s+/g, ".");
    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .insert(
        [
          {
            id: userId,
            email,
            display_name: fullName,
            username: username,
            avatar_url: null,
            profile_picture_url: null,
          },
        ],
        { onConflict: "id" },
      );

    if (profileError && !profileError.message.includes("duplicate")) {
      // Log the error but don't return - user was created in auth
      console.error("Profile creation error:", profileError.message);
    }

    // For development: if email confirmation is required, allow login anyway
    // Production should enforce email confirmation
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return {
      success: true,
      userId,
      accessToken: session?.access_token,
      refreshToken: session?.refresh_token,
      user: authData.user,
      emailConfirmationRequired: authData.user?.email_confirmed_at === null,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function logIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      userId: data.user.id,
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function logOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function verifyToken(token) {
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, user: data.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// USER PROFILE FUNCTIONS
// ============================================

async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function updateUserProfile(userId, updates) {
  try {
    // Handle backward compatibility: if display_name is sent, also send as full_name
    if (updates.display_name && !updates.full_name) {
      updates.full_name = updates.display_name;
    }

    // Ensure username is always lowercase with dots
    if (updates.username) {
      updates.username = updates.username.toLowerCase().replace(/\s+/g, ".");

      // Check username uniqueness (excluding current user)
      const { data: existingUsers, error: checkError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("username", updates.username)
        .neq("id", userId)
        .limit(1);

      if (checkError) {
        return { success: false, error: checkError.message };
      }

      if (existingUsers && existingUsers.length > 0) {
        return { success: false, error: "Username already taken" };
      }
    }

    // Remove empty/null profile_picture_url to avoid unnecessary updates
    if (
      updates.profile_picture_url === null ||
      updates.profile_picture_url === ""
    ) {
      delete updates.profile_picture_url;
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", userId)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// ROOM FUNCTIONS
// ============================================

async function createRoom(roomName, isPublic, roomCode, capacity, createdBy) {
  try {
    const { data, error } = await supabase
      .from("rooms")
      .insert([
        {
          room_name: roomName,
          is_public: isPublic,
          room_code: roomCode,
          capacity: capacity,
          created_by: createdBy,
        },
      ])
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getRoomByCode(roomCode) {
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_code", roomCode)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getRoomById(roomId) {
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function deleteRoom(roomId) {
  try {
    const { error } = await supabase.from("rooms").delete().eq("id", roomId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getPublicRooms() {
  try {
    // Query rooms and count participants in one go
    const { data, error } = await supabase
      .from("rooms")
      .select("*, participants:participants(count)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return { success: false, error: error.message };
    }

    // Transform results to have a flat participant_count
    const transformed = data.map((room) => ({
      ...room,
      participant_count: room.participants ? room.participants[0].count : 0,
    }));

    return { success: true, result: transformed };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function checkRoomExists(roomCode) {
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select("id")
      .eq("room_code", roomCode);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, exists: data && data.length > 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// PARTICIPANT FUNCTIONS
// ============================================

async function addParticipant(roomId, userId, username, isHost = false) {
  try {
    const { data, error } = await supabase
      .from("participants")
      .insert([
        {
          room_id: roomId,
          user_id: userId,
          username: username,
          is_host: isHost,
        },
      ])
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function removeParticipant(roomId, userId) {
  try {
    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getParticipants(roomId) {
  try {
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function setHostStatus(roomId, userId, isHost) {
  try {
    const { data, error } = await supabase
      .from("participants")
      .update({ is_host: isHost })
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function clearNonHosts(roomId) {
  try {
    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("room_id", roomId)
      .eq("is_host", false);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// TASK FUNCTIONS
// ============================================

async function addTask(roomId, title, createdBy) {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          room_id: roomId,
          title: title,
          completed: false,
          created_by: createdBy,
        },
      ])
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function updateTask(taskId, updates) {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function deleteTask(taskId) {
  try {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getTasks(roomId) {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function clearRoomTasks(roomId) {
  try {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("room_id", roomId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// TIMER FUNCTIONS
// ============================================

async function saveTimerState(
  roomId,
  isRunning,
  mode,
  timeRemaining,
  totalTime,
) {
  try {
    const { data, error } = await supabase
      .from("timer_states")
      .insert([
        {
          room_id: roomId,
          is_running: isRunning,
          mode: mode,
          time_remaining: timeRemaining,
          total_time: totalTime,
        },
      ])
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getLatestTimerState(roomId) {
  try {
    const { data, error } = await supabase
      .from("timer_states")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// JOIN REQUEST FUNCTIONS
// ============================================

async function createJoinRequest(roomId, userId, username) {
  try {
    const { data, error } = await supabase
      .from("join_requests")
      .insert([
        {
          room_id: roomId,
          user_id: userId,
          username: username,
          status: "pending",
        },
      ])
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getJoinRequests(roomId, status = "pending") {
  try {
    const { data, error } = await supabase
      .from("join_requests")
      .select("*")
      .eq("room_id", roomId)
      .eq("status", status)
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function approveJoinRequest(requestId) {
  try {
    const { data, error } = await supabase
      .from("join_requests")
      .update({ status: "approved", approved_at: new Date() })
      .eq("id", requestId)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function rejectJoinRequest(requestId) {
  try {
    const { data, error } = await supabase
      .from("join_requests")
      .update({ status: "rejected", rejected_at: new Date() })
      .eq("id", requestId)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function deleteJoinRequest(roomId, userId) {
  try {
    const { error } = await supabase
      .from("join_requests")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// USER SETTINGS / SOUND PREFERENCES
// ============================================

async function getSoundPreferences(userId) {
  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("sound_preferences, volume_settings")
      .eq("user_id", userId)
      .single();

    if (error && error.code === "PGRST116") {
      // No row found — return defaults
      return { success: true, result: null };
    }
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function saveSoundPreferences(userId, soundPreferences, volumeSettings) {
  try {
    const { data, error } = await supabase
      .from("user_settings")
      .upsert(
        [
          {
            user_id: userId,
            sound_preferences: soundPreferences,
            volume_settings: volumeSettings,
          },
        ],
        { onConflict: "user_id" },
      )
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// SESSION LOGGING FUNCTIONS
// ============================================

async function logSessionStart(userId, roomId) {
  try {
    const { data, error } = await supabase
      .from("session_logs")
      .insert([
        {
          user_id: userId,
          room_id: roomId,
          joined_at: new Date().toISOString(),
          left_at: null,
        },
      ])
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function logSessionEnd(userId, roomId) {
  try {
    // Find the most recent session for this user in this room
    const { data: sessions, error: fetchError } = await supabase
      .from("session_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("room_id", roomId)
      .is("left_at", null)
      .order("joined_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    if (!sessions || sessions.length === 0) {
      return { success: false, error: "No active session found" };
    }

    const sessionId = sessions[0].id;

    const { error } = await supabase
      .from("session_logs")
      .update({ left_at: new Date().toISOString() })
      .eq("id", sessionId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getUserSessionLogs(userId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from("session_logs")
      .select(
        `
                id,
                user_id,
                room_id,
                joined_at,
                left_at,
                rooms(room_name, room_code)
            `,
      )
      .eq("user_id", userId)
      .order("joined_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Export all functions
module.exports = {
  // Auth
  signUp,
  logIn,
  logOut,
  verifyToken,
  // User Profile
  getUserProfile,
  updateUserProfile,
  // Rooms
  createRoom,
  getRoomByCode,
  getRoomById,
  deleteRoom,
  getPublicRooms,
  checkRoomExists,
  // Participants
  addParticipant,
  removeParticipant,
  getParticipants,
  setHostStatus,
  clearNonHosts,
  // Tasks
  addTask,
  updateTask,
  deleteTask,
  getTasks,
  clearRoomTasks,
  // Timer
  saveTimerState,
  getLatestTimerState,
  // Join Requests
  createJoinRequest,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  deleteJoinRequest,
  // Sound Preferences
  getSoundPreferences,
  saveSoundPreferences,
  // Session Logging
  logSessionStart,
  logSessionEnd,
  getUserSessionLogs,
};
