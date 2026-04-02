/**
 * Utility functions for Virtual Café
 */

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - The raw input string
 * @returns {string} - The sanitized string
 */
export function sanitizeInput(input) {
    if (!input) return '';
    return input.trim();
}

/**
 * Escape HTML characters
 * @param {string} text - The raw text
 * @returns {string} - The escaped HTML string
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show a temporary notification to the user
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether it's an error message
 */
export function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : ''}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

/**
 * Show error message in a specific container
 * @param {HTMLElement} errorDiv - The elements to show the error in
 * @param {string} message - The error message
 */
export function showError(errorDiv, message) {
    if (!errorDiv) return;
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
}

/**
 * Get standard headers for fetch requests
 * @param {boolean} includeAuth - Whether to include the access token
 * @returns {Object} - Header object
 */
export function getHeaders(includeAuth = true) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (includeAuth) {
        const token = localStorage.getItem('accessToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }
    
    return headers;
}

/**
 * Format seconds into MM:SS
 * @param {number} seconds - Total seconds
 * @returns {string} - Formatted time string
 */
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
