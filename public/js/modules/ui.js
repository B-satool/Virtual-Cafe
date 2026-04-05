/**
 * UI Management for Virtual Café
 */

/**
 * Hide all pages
 */
export function hideAllPages() {
  const pages = [
    "homePage",
    "loginPage",
    "signupPage",
    "landingPage",
    "dashboardPage",
    "roomPage",
    "waitingRoomPage",
  ];
  pages.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove("active");
      if (id === "waitingRoomPage") el.style.display = "none";
    }
  });
}

/**
 * Show the home page
 */
export function showHomePage() {
  hideAllPages();
  document.getElementById("homePage").classList.add("active");
  localStorage.setItem("currentPage", "homePage");
}

/**
 * Show the login page
 */
export function showLoginPage() {
  hideAllPages();
  document.getElementById("loginPage").classList.add("active");
  localStorage.setItem("currentPage", "loginPage");
}

/**
 * Show the signup page
 */
export function showSignupPage() {
  hideAllPages();
  document.getElementById("signupPage").classList.add("active");
  localStorage.setItem("currentPage", "signupPage");
}

/**
 * Show the landing/dashboard page
 */
export function showLandingPage() {
  hideAllPages();
  document.getElementById("landingPage").classList.add("active");
  localStorage.setItem("currentPage", "landingPage");

  // Clear all input fields when returning to landing page
  const inputs = document.querySelectorAll("input");
  inputs.forEach((input) => {
    if (input.type !== "submit" && input.type !== "button") {
      input.value = "";
    }
  });
}

/**
 * Show the user dashboard page
 */
export function showDashboardPage() {
  hideAllPages();
  document.getElementById("dashboardPage").classList.add("active");
  localStorage.setItem("currentPage", "dashboardPage");

  // Load dashboard data
  import("./dashboard.js").then((module) => {
    module.loadDashboard();
  });
}

/**
 * Show the room page
 */
export function showRoomPage() {
  hideAllPages();
  document.getElementById("roomPage").classList.add("active");
  localStorage.setItem("currentPage", "roomPage");
}

/**
 * Show the waiting room page
 */
export function showWaitingRoom() {
  hideAllPages();
  const waitingRoom = document.getElementById("waitingRoomPage");
  if (waitingRoom) {
    waitingRoom.classList.add("active");
    waitingRoom.style.display = "flex";
    localStorage.setItem("currentPage", "waitingRoomPage");
  }
}

/**
 * Toggle ambient sounds modal
 */
export function toggleAmbientSounds() {
  const sounds = document.getElementById("ambientSounds");
  if (!sounds) return;

  sounds.classList.toggle("minimized");

  // Save state to localStorage
  const isMinimized = sounds.classList.contains("minimized");
  localStorage.setItem("ambientMinimized", isMinimized);
}
