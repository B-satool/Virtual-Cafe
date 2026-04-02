/**
 * Authentication and Session Management for Virtual Café
 */

import { sanitizeInput, showError, showNotification, getHeaders } from './utils.js';
import { showLandingPage, showHomePage } from './ui.js';

/**
 * Handle individual login submission
 */
export async function handleLoginSubmit(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');
    
    // Clear previous errors
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
    
    // Validate inputs
    if (!email || !password) {
        showError(errorDiv, 'Please fill in all fields');
        return;
    }

    // Basic email validation
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        showError(errorDiv, 'Please enter a valid email address');
        return;
    }
    
    try {
        // Disable button during submission
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        
        // Call backend login endpoint
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: getHeaders(false),
            body: JSON.stringify({ 
                email: sanitizeInput(email), 
                password 
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showError(errorDiv, data.error || 'Login failed. Please try again.');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
            return;
        }
        
        // Store auth tokens securely
        if (data.accessToken && data.userId) {
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('userEmail', email);
            
            // Update user display
            const sanitizedEmail = sanitizeInput(email);
            document.getElementById('currentUserDisplay').textContent = `Welcome, ${sanitizedEmail.split('@')[0]}`;
            
            // Redirect to landing page
            showLandingPage();
            // loadPublicRooms(); // This should be handled in a controller or app init
            
            // Clear form
            document.getElementById('loginForm').reset();
            
            showNotification('Login successful!', 'success');
            
            // Trigger room loading (using a custom event)
            window.dispatchEvent(new CustomEvent('auth:success'));
        } else {
            showError(errorDiv, 'Invalid response from server');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showError(errorDiv, 'An error occurred. Please try again.');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
}

/**
 * Handle individual signup submission
 */
export async function handleSignupSubmit(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('signupFullName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const errorDiv = document.getElementById('signupError');
    const signupBtn = document.getElementById('signupBtn');
    
    // Clear previous errors
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
    
    // Validate inputs
    if (!fullName || !email || !password || !confirmPassword) {
        showError(errorDiv, 'Please fill in all fields');
        return;
    }

    if (password !== confirmPassword) {
        showError(errorDiv, 'Passwords do not match');
        return;
    }
    
    if (password.length < 8) {
        showError(errorDiv, 'Password must be at least 8 characters');
        return;
    }
    
    try {
        // Disable button during submission
        signupBtn.disabled = true;
        signupBtn.textContent = 'Creating Account...';
        
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: getHeaders(false),
            body: JSON.stringify({ 
                email: sanitizeInput(email), 
                password,
                fullName: sanitizeInput(fullName)
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showError(errorDiv, data.error || 'Sign up failed. Please try again.');
            signupBtn.disabled = false;
            signupBtn.textContent = 'Create Account';
            return;
        }
        
        if (data.accessToken && data.userId) {
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('userEmail', email);
            
            document.getElementById('currentUserDisplay').textContent = `Welcome, ${sanitizeInput(fullName).split(' ')[0]}`;
            
            showLandingPage();
            document.getElementById('signupForm').reset();
            
            if (data.emailConfirmationRequired) {
                showNotification('Account created! Please check your email to confirm.', 'info');
            } else {
                showNotification('Account created successfully!', 'success');
            }
            
            window.dispatchEvent(new CustomEvent('auth:success'));
        } else {
            showError(errorDiv, 'Invalid response from server');
            signupBtn.disabled = false;
            signupBtn.textContent = 'Create Account';
        }
        
    } catch (error) {
        console.error('Signup error:', error);
        showError(errorDiv, 'An error occurred. Please try again.');
        signupBtn.disabled = false;
        signupBtn.textContent = 'Create Account';
    }
}

/**
 * Verify JWT token
 */
export async function verifyToken() {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;
    
    try {
        const response = await fetch('/api/auth/verify', {
            method: 'GET',
            headers: getHeaders(true)
        });
        
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Handle user logout
 */
export async function logout() {
    localStorage.clear();
    showHomePage();
    showNotification('Logged out successfully');
}
