/**
 * Task Management for Virtual Café
 */

import { getSocket, getSocketState } from './socket.js';
import { escapeHtml, showNotification } from './utils.js';

/**
 * Update the task list UI
 */
export function updateTasksUI(tasks) {
    const taskList = document.getElementById('taskList');
    if (!taskList) return;

    if (!tasks || tasks.length === 0) {
        taskList.innerHTML = '<div class="empty-state">No tasks yet. Start by adding one!</div>';
        return;
    }

    taskList.innerHTML = tasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="window.updateTaskCompletion('${task.id}')">
            <div class="task-content">
                <div class="task-text">${escapeHtml(task.title)}</div>
            </div>
            <div class="task-actions">
                <button class="btn-danger" onclick="window.deleteTask('${task.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

/**
 * Handle individual task addition
 */
export function addTask() {
    const { socket } = getSocketState();
    const input = document.getElementById('taskInput');
    if (!input) return;
    
    const title = input.value.trim();

    if (!title) {
        showNotification('Please enter a task', true);
        return;
    }

    socket.emit('task:add', { title });
    input.value = '';
}

/**
 * Handle individual task completion update
 */
export function updateTaskCompletion(taskId) {
    const { socket, roomState } = getSocketState();
    if (!roomState.tasks) return;
    
    const task = roomState.tasks.find(t => t.id === taskId);
    if (task) {
        socket.emit('task:update', {
            taskId,
            updates: { completed: !task.completed }
        });
    }
}

/**
 * Handle individual task deletion
 */
export function deleteTask(taskId) {
    const { socket } = getSocketState();
    socket.emit('task:delete', { taskId });
}
