// --- Global State and Constants ---
let tasks = [];
let isEditing = false;
let currentTaskId = null;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// --- DOM Elements ---
const plannerGrid = document.getElementById('planner-grid');
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const modalTitle = document.getElementById('modal-title');
const addTaskBtn = document.getElementById('add-task-btn');
const cancelBtn = document.getElementById('cancel-btn');
const searchInput = document.getElementById('search-input');
const filterPriority = document.getElementById('filter-priority');
const filterCategory = document.getElementById('filter-category');

// --- 1. Local Storage Management ---
const loadTasks = () => {
    const storedTasks = localStorage.getItem('weeklyPlannerTasks');
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
    } else {
        // Initial dummy data with new fields
        tasks = [
            { id: 1, text: 'Design System Documentation', day: 'Mon', completed: false, priority: 'High', category: 'Work', link: 'https://www.notion.so/', notes: 'Draft the core component list for the new project.' },
            { id: 2, text: 'Weekly grocery run', day: 'Wed', completed: false, priority: 'Medium', category: 'Personal', link: '', notes: 'Need to buy eggs, milk, and bread.' },
            { id: 3, text: '30-min HIIT workout', day: 'Fri', completed: true, priority: 'Low', category: 'Fitness', link: 'https://www.youtube.com/watch?v=workout', notes: '' }
        ];
    }
    renderAll();
};

const saveTasks = () => {
    localStorage.setItem('weeklyPlannerTasks', JSON.stringify(tasks));
    updateStats();
};

// --- 2. Rendering and Display ---

const createTaskElement = (task) => {
    const li = document.createElement('li');
    li.className = `task-card`;
    li.setAttribute('draggable', true);
    li.setAttribute('data-id', task.id);
    li.setAttribute('data-priority', task.priority);
    li.setAttribute('data-category', task.category);
    if (task.completed) {
        li.classList.add('completed');
    }

    // Include Notes/AI Prompt in a hidden element for potential future use or display
    const notesHTML = task.notes ? `<i class="fas fa-sticky-note" title="${task.notes}"></i>` : '';

    li.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
        <span class="task-text">${task.text}</span>
        <div class="task-actions">
            ${task.link ? `<a href="${task.link}" target="_blank" class="link-btn" title="Open Link"><i class="fas fa-external-link-alt"></i></a>` : ''}
            ${notesHTML}
            <button class="edit-btn" data-id="${task.id}" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="delete-btn" data-id="${task.id}" title="Delete"><i class="fas fa-trash-alt"></i></button>
        </div>
    `;

    return li;
};

// (renderTasks and renderAll functions remain the same, as the creation of the list element is handled above)
const renderTasks = (filteredTasks = tasks) => {
    // 1. Clear the grid
    plannerGrid.innerHTML = '';

    // 2. Create and append day columns
    const dayElements = {};
    DAYS.forEach(day => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day';
        dayDiv.setAttribute('data-day', day);
        dayDiv.innerHTML = `
            <h2>${day}</h2>
            <ul class="task-list" data-day="${day}"></ul>
        `;
        dayElements[day] = dayDiv.querySelector('.task-list');
        plannerGrid.appendChild(dayDiv);
    });

    // 3. Populate tasks into the correct day column
    filteredTasks.forEach(task => {
        if (dayElements[task.day]) {
            dayElements[task.day].appendChild(createTaskElement(task));
        }
    });

    // 4. Attach drag-and-drop listeners to all day containers
    DAYS.forEach(day => {
        const dayContainer = document.querySelector(`.day[data-day="${day}"]`);
        dayContainer.addEventListener('dragover', handleDragOver);
        dayContainer.addEventListener('dragleave', handleDragLeave);
        dayContainer.addEventListener('drop', handleDrop);
    });
};

const renderAll = (e) => {
    // If a link button was clicked, prevent the re-render from happening
    if(e && e.target.closest('.link-btn')) return;

    // Combined filtering logic
    const searchText = searchInput.value.toLowerCase();
    const priorityFilter = filterPriority.value;
    const categoryFilter = filterCategory.value;

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.text.toLowerCase().includes(searchText);
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
        const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
        return matchesSearch && matchesPriority && matchesCategory;
    });

    renderTasks(filteredTasks);
    updateStats();
};


// --- 3. CRUD (Create, Read, Update, Delete) ---

const saveTask = (e) => {
    e.preventDefault();

    const taskText = document.getElementById('task-text').value.trim();
    const taskLink = document.getElementById('task-link').value.trim();
    const taskNotes = document.getElementById('task-notes').value.trim();
    const taskDay = document.getElementById('task-day').value;
    const taskPriority = document.getElementById('task-priority').value;
    const taskCategory = document.getElementById('task-category').value;

    if (!taskText) return;

    if (isEditing) {
        // Update existing task
        const taskIndex = tasks.findIndex(t => t.id === currentTaskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].text = taskText;
            tasks[taskIndex].link = taskLink;
            tasks[taskIndex].notes = taskNotes;
            tasks[taskIndex].day = taskDay;
            tasks[taskIndex].priority = taskPriority;
            tasks[taskIndex].category = taskCategory;
        }
    } else {
        // Create new task
        const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
        tasks.push({
            id: newId,
            text: taskText,
            link: taskLink,
            notes: taskNotes,
            day: taskDay,
            completed: false,
            priority: taskPriority,
            category: taskCategory
        });
    }

    closeModal();
    saveTasks();
    renderAll();
};

const deleteTask = (id) => {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    renderAll();
};

const toggleCompletion = (id) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderAll(); // Rerender to apply completed styles/filters
    }
};

// --- 4. Task Statistics and Progress Tracking (Unchanged) ---
const updateStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById('progress-percent').textContent = `${percent}%`;
    document.getElementById('progress-bar').style.width = `${percent}%`;
};

// --- 5. Task Modal/Form Management ---
const openModal = (editTask = null) => {
    taskModal.classList.remove('hidden');
    
    if (editTask) {
        isEditing = true;
        currentTaskId = editTask.id;
        modalTitle.textContent = 'Edit Task';
        
        document.getElementById('task-text').value = editTask.text;
        document.getElementById('task-link').value = editTask.link || ''; // Load link
        document.getElementById('task-notes').value = editTask.notes || ''; // Load notes
        document.getElementById('task-day').value = editTask.day;
        document.getElementById('task-priority').value = editTask.priority;
        document.getElementById('task-category').value = editTask.category;

    } else {
        isEditing = false;
        currentTaskId = null;
        modalTitle.textContent = 'Create New Task';
        taskForm.reset();
        // Set default day to today (simple example)
        document.getElementById('task-day').value = DAYS[new Date().getDay() - 1] || 'Mon';
    }
    document.getElementById('task-text').focus();
};

const closeModal = () => {
    taskModal.classList.add('hidden');
    taskForm.reset();
};

// --- 6. Drag-and-Drop Handlers (Unchanged) ---
let draggedElement = null;

const handleDragStart = (e) => {
    draggedElement = e.target;
    draggedElement.classList.add('is-dragging');
    e.dataTransfer.setData('text/plain', e.target.dataset.id); // Store task ID
    // Set a subtle ghost image for the drag operation
    e.dataTransfer.setDragImage(draggedElement, 10, 10);
};

const handleDragOver = (e) => {
    e.preventDefault(); // Required to allow dropping
    const dayDiv = e.currentTarget;
    if (!dayDiv.classList.contains('drag-over')) {
        dayDiv.classList.add('drag-over');
    }
};

const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
};

const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const taskId = parseInt(e.dataTransfer.getData('text/plain'));
    const newDay = e.currentTarget.dataset.day;

    // Update the task's day in the data model
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1 && tasks[taskIndex].day !== newDay) {
        tasks[taskIndex].day = newDay;
        saveTasks();
        renderAll(); // Re-render the grid
    }
};

const handleDragEnd = (e) => {
    e.target.classList.remove('is-dragging');
    draggedElement = null;
    document.querySelectorAll('.day').forEach(day => day.classList.remove('drag-over'));
};

// --- 7. Event Delegation and Listeners ---

// Main listener for all task-related clicks (Edit, Delete, Checkbox)
plannerGrid.addEventListener('click', (e) => {
    // If a link button is clicked, we just let the default link action happen and stop here.
    if (e.target.closest('.link-btn')) return;

    const id = parseInt(e.target.closest('[data-id]')?.dataset.id);
    if (!id) return;

    if (e.target.closest('.delete-btn')) {
        deleteTask(id);
    } else if (e.target.closest('.edit-btn')) {
        const taskToEdit = tasks.find(t => t.id === id);
        if (taskToEdit) {
            openModal(taskToEdit);
        }
    } else if (e.target.closest('.task-checkbox')) {
        toggleCompletion(id);
    }
});

// Listener for drag events on dynamically created tasks
plannerGrid.addEventListener('mousedown', (e) => {
    const taskCard = e.target.closest('.task-card');
    if (taskCard) {
        taskCard.addEventListener('dragstart', handleDragStart, { once: true });
        taskCard.addEventListener('dragend', handleDragEnd, { once: true });
    }
});

// Modal and Form Listeners
taskForm.addEventListener('submit', saveTask);
addTaskBtn.addEventListener('click', () => openModal());
cancelBtn.addEventListener('click', closeModal);
taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) { // Close when clicking the backdrop
        closeModal();
    }
});

// Search and Filter Listeners (Real-time filtering)
searchInput.addEventListener('input', renderAll);
filterPriority.addEventListener('change', renderAll);
filterCategory.addEventListener('change', renderAll);

// Quick Task Creation with Keyboard Shortcut (Ctrl/Cmd + K)
document.addEventListener('keydown', (e) => {
    if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey) && taskModal.classList.contains('hidden')) {
        e.preventDefault();
        openModal();
    }
    // Escape key closes modal
    if (e.key === 'Escape' && !taskModal.classList.contains('hidden')) {
        closeModal();
    }
});

// --- Initialization ---
document.addEventListener('DOMContentLoaded', loadTasks);