# WBAD Project Proposal

## **Idea: Virtual Café / Study Room App**

# ***Concept Summary***

A web-based platform that recreates the experience of studying in a café by allowing users to join shared or private online study rooms, track collective study/break cycles, and interact with a calm, ambient environment — without the need for physical meetups.

# ***Target Users***

Our main target audience are students but the app is also suitable for people who seek group spaces for working and productivity

# ***Core Features***

## **1\. Public & Private Study Rooms**

* Users can:  
  * Join public rooms  
  * Create private rooms via invite links or codes  
* Each room displays:  
  * Current participants  
  * Room status (Studying / Break)  
  * Room capacity

## **2\. Synchronized Pomodoro Timer**

* One timer controls the entire room  
* All users see:  
  * Same countdown  
  * Automatic transitions (study → break)  
* Host or room creator can:  
  * Start / pause / reset timer

**Edge cases handled:**

* User joins mid-session  
* Refreshing the page  
* Host leaves

## **3\. Shared Task List per Room**

* Room-level task board:  
  * Add / edit / delete tasks  
  * Mark tasks as completed  
* Tasks are visible to all room members  
* Optional: task ownership indicator

**UX focus:** minimal, distraction-free layout

## **4\. Ambient Background Sound Controls**

* Built-in ambient sounds:  
  * Rain  
  * Café chatter  
  * Fireplace, etc.  
* Users can:  
  * Enable/disable sounds locally  
  * Adjust volume

**Important:** sound choice doesn’t affect room logic (clean separation)

## **5\. Room Status & Presence Indicators**

* Visual indicators:  
  * Studying mode  
  * Break mode  
* Simple presence info:  
  * “X users currently in this room”  
  * Join/leave events update UI

# ***Backend Scope***

* shared timer state  
* time synchronization  
* room creation  
* access control  
* room membership

# ***UI / UX Scope***

* Cozy color palette  
* Minimal animations (timer transitions)  
* Clear hierarchy: timer \> room state \> tasks