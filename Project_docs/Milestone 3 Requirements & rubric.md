As Milestone 3 (Backend Implementation) is approaching, here are the expected features that should be fully functional and testable in your Virtual Café / Study Room application:



* Authentication \& User Management
* User registration and login
* Persistent user sessions (JWT or similar)
* Basic user profile (name, avatar, study preferences optional)
* Ability to track user presence (online/offline, in-room status)



Study Room Management (Workflow 1)

* Creation of public and private study rooms
* Unique room codes for private rooms with proper validation
* Ability to join/leave rooms seamlessly
* Room metadata:

  * Room name, host, capacity
  * Current participants list
  * Room status (Study / Break)
* Real-time presence tracking (users joining/leaving reflected instantly)
* Host controls:

  * Transfer host (if host leaves)
  * Remove users from room (optional but ideal)
* Handling edge cases:

  * Invalid/expired room codes
  * Room capacity limits
  * Host leaving mid-session



Synchronized Pomodoro System (Workflow 2)

* Host-controlled Pomodoro timer (start, pause, reset, stop)
* Timer state stored on backend and synced across all users in real time
* Automatic transitions between Study and Break sessions
* Configurable timer durations (e.g., 25/5 or custom)
* New users joining mid-session see the correct ongoing timer state
* Timer state persists across refreshes
* Handling edge cases:

  * Host disconnect → reassignment or pause logic
  * Multiple users attempting to control timer (role restriction)



In-Room Collaboration (Workflow 3)

* Shared task list per room:

  * Add, edit, delete tasks
  * Mark tasks as completed
* Real-time synchronization of task updates across all participants
* Task ownership or tagging (optional but adds completeness)
* Clear separation of room-level vs user-level tasks (if implemented)



Ambient Environment Features

* Backend support for available ambient sound options (rain, café, etc.)
* Ability to toggle/select sounds (even if playback is frontend, state can be stored per user)
* Persistence of user preferences (optional but ideal)



Communication \& Interaction (Recommended for Completeness)

* Basic in-room chat system (text-based)
* Real-time messaging between participants
* Notifications for key events:

  * User joins/leaves
  * Timer starts/ends
  * Task updates



Dashboard \& Navigation

* Landing/dashboard page showing:

  * Available public rooms
  * Option to create or join rooms
* Clear navigation flow between dashboard and active room
* Indication of currently logged-in user with logout option



System-Level Features \& Completeness

* Real-time communication using WebSockets (or equivalent) for:

  * Timer sync
  * Presence updates
  * Task updates
  * Chat (if implemented)
* Proper backend structure for rooms, users, sessions, and tasks
* Data validation and error handling (invalid actions, unauthorized access)
* Clean API design with modular endpoints
* Logging and basic monitoring of room activity



The expectation is that the system feels like a complete, real-time collaborative environment,  not just isolated features, but a cohesive experience where users can join rooms, study together, stay synchronized, and interact smoothly.

Please ensure all core components are integrated and functional by the deadline. Refer to the handout for submission guidelines.



