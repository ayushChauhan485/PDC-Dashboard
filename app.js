// PDC Project Dashboard - Main Application
class ProjectStore {
    constructor() {
        this.projects = [];
        this.channel = new BroadcastChannel('pdc-projects');
        this.channel.addEventListener('message', (event) => {
            if (event.data.type === 'sync') {
                this.projects = event.data.payload;
                if (window.app) {
                    window.app.renderCurrentView();
                }
            }
        });
        
        // Load demo data if #/demo
        if (window.location.hash === '#/demo') {
            this.loadDemoData();
        }
    }

    broadcast() {
        this.channel.postMessage({
            type: 'sync',
            payload: this.projects
        });
    }

    addProject(project) {
        project.id = this.generateUUID();
        project.lastUpdated = new Date().toISOString();
        project.comments = project.comments || [];
        this.projects.push(project);
        this.broadcast();
    }

    updateProject(id, updates) {
        const index = this.projects.findIndex(p => p.id === id);
        if (index !== -1) {
            this.projects[index] = { ...this.projects[index], ...updates, lastUpdated: new Date().toISOString() };
            this.broadcast();
        }
    }

    deleteProject(id) {
        this.projects = this.projects.filter(p => p.id !== id);
        this.broadcast();
    }

    getProject(id) {
        return this.projects.find(p => p.id === id);
    }

    addComment(projectId, comment) {
        const project = this.getProject(projectId);
        if (project) {
            comment.id = this.generateUUID();
            comment.date = new Date().toISOString();
            project.comments.push(comment);
            project.lastUpdated = new Date().toISOString();
            this.broadcast();
        }
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    loadDemoData() {
        const demoProjects = [
            {
                id: this.generateUUID(),
                title: "AR Campus Navigation App",
                description: "Develop an augmented reality application to help students navigate the campus",
                mentor: "Arjun Singh",
                assignees: ["Priya Sharma", "Rohit Kumar", "Anita Patel"],
                status: "In Progress",
                startDate: "2025-09-01",
                dueDate: "2025-11-15",
                progress: 45,
                resources: [
                    { name: "AR.js Documentation", url: "https://ar-js-org.github.io/AR.js-Docs/" },
                    { name: "Campus Map Data", url: "#" }
                ],
                comments: [
                    { id: this.generateUUID(), author: "Arjun Singh", text: "Great progress on the UI mockups!", date: "2025-09-15T10:30:00Z" }
                ],
                lastUpdated: new Date().toISOString()
            },
            {
                id: this.generateUUID(),
                title: "Smart Library Management",
                description: "IoT-based system for tracking book availability and user behavior",
                mentor: "Sneha Reddy",
                assignees: ["Vikram Gupta", "Meera Joshi"],
                status: "Not Started",
                startDate: "2025-09-20",
                dueDate: "2025-12-01",
                progress: 0,
                resources: [
                    { name: "Arduino Documentation", url: "https://docs.arduino.cc/" },
                    { name: "RFID Guide", url: "#" }
                ],
                comments: [],
                lastUpdated: new Date().toISOString()
            }
        ];
        this.projects = demoProjects;
    }

    exportData() {
        const data = {
            projects: this.projects,
            exportDate: new Date().toISOString(),
            version: "1.0"
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pdc-projects-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.projects && Array.isArray(data.projects)) {
                this.projects = data.projects;
                this.broadcast();
                return true;
            }
        } catch (error) {
            console.error('Import error:', error);
        }
        return false;
    }
}

class Router {
    constructor() {
        this.currentView = 'dashboard';
        this.currentProjectId = null;
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    }

    handleRoute() {
        const hash = window.location.hash || '#/dashboard';
        const parts = hash.substring(2).split('/');
        
        if (parts[0] === 'project' && parts[1]) {
            this.currentView = 'detail';
            this.currentProjectId = parts[1];
        } else {
            this.currentView = 'dashboard';
            this.currentProjectId = null;
        }
        
        if (window.app) {
            window.app.renderCurrentView();
        }
    }

    navigateTo(path) {
        window.location.hash = `#/${path}`;
    }
}

class PDCApp {
    constructor() {
        this.store = new ProjectStore();
        this.router = new Router();
        this.currentFilter = { status: '', search: '' };
        this.editingProject = null;
        
        // Wait for DOM to be ready before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.init();
            });
        } else {
            this.init();
        }
    }

    init() {
        this.initializeEventListeners();
        this.renderCurrentView();
    }

    initializeEventListeners() {
        try {
            // Modal controls
            const addProjectBtn = document.getElementById('addProjectBtn');
            const closeModal = document.getElementById('closeModal');
            const cancelBtn = document.getElementById('cancelBtn');
            const projectForm = document.getElementById('projectForm');

            if (addProjectBtn) {
                addProjectBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Add project button clicked');
                    this.openProjectModal();
                });
            }

            if (closeModal) {
                closeModal.addEventListener('click', () => this.closeProjectModal());
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.closeProjectModal());
            }

            if (projectForm) {
                projectForm.addEventListener('submit', (e) => this.handleProjectSubmit(e));
            }
            
            // Dynamic form elements
            const addAssignee = document.getElementById('addAssignee');
            const addResource = document.getElementById('addResource');
            const progress = document.getElementById('progress');

            if (addAssignee) {
                addAssignee.addEventListener('click', () => this.addAssigneeInput());
            }

            if (addResource) {
                addResource.addEventListener('click', () => this.addResourceInput());
            }

            if (progress) {
                progress.addEventListener('input', (e) => {
                    const progressValue = document.getElementById('progressValue');
                    if (progressValue) {
                        progressValue.textContent = e.target.value + '%';
                    }
                });
            }

            // Search and filter
            const searchInput = document.getElementById('searchInput');
            const statusFilter = document.getElementById('statusFilter');

            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.currentFilter.search = e.target.value.toLowerCase();
                    this.renderDashboard();
                });
            }

            if (statusFilter) {
                statusFilter.addEventListener('change', (e) => {
                    this.currentFilter.status = e.target.value;
                    this.renderDashboard();
                });
            }

            // Import/Export
            const exportBtn = document.getElementById('exportBtn');
            const importBtn = document.getElementById('importBtn');
            const importFile = document.getElementById('importFile');

            if (exportBtn) {
                exportBtn.addEventListener('click', () => this.store.exportData());
            }

            if (importBtn) {
                importBtn.addEventListener('click', () => {
                    if (importFile) {
                        importFile.click();
                    }
                });
            }

            if (importFile) {
                importFile.addEventListener('change', (e) => this.handleImport(e));
            }

            // Detail view navigation
            const backToDashboard = document.getElementById('backToDashboard');
            if (backToDashboard) {
                backToDashboard.addEventListener('click', () => {
                    this.router.navigateTo('dashboard');
                });
            }

            // Delete confirmation modal
            const deleteProjectBtn = document.getElementById('deleteProjectBtn');
            const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
            const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

            if (deleteProjectBtn) {
                deleteProjectBtn.addEventListener('click', () => this.showDeleteModal());
            }

            if (cancelDeleteBtn) {
                cancelDeleteBtn.addEventListener('click', () => this.hideDeleteModal());
            }

            if (confirmDeleteBtn) {
                confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());
            }
            
            // Edit project
            const editProjectBtn = document.getElementById('editProjectBtn');
            if (editProjectBtn) {
                editProjectBtn.addEventListener('click', () => this.editCurrentProject());
            }

            // Modal backdrop clicks
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-backdrop')) {
                    this.closeProjectModal();
                    this.hideDeleteModal();
                }
            });

            console.log('Event listeners initialized successfully');
        } catch (error) {
            console.error('Error initializing event listeners:', error);
        }
    }

    renderCurrentView() {
        if (this.router.currentView === 'dashboard') {
            this.showDashboard();
            this.renderDashboard();
        } else if (this.router.currentView === 'detail') {
            this.showDetailView();
            this.renderProjectDetail(this.router.currentProjectId);
        }
    }

    showDashboard() {
        const dashboardView = document.getElementById('dashboardView');
        const detailView = document.getElementById('detailView');
        
        if (dashboardView) dashboardView.classList.remove('hidden');
        if (detailView) detailView.classList.add('hidden');
    }

    showDetailView() {
        const dashboardView = document.getElementById('dashboardView');
        const detailView = document.getElementById('detailView');
        
        if (dashboardView) dashboardView.classList.add('hidden');
        if (detailView) detailView.classList.remove('hidden');
    }

    renderDashboard() {
        const grid = document.getElementById('projectsGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (!grid || !emptyState) return;
        
        let projects = this.store.projects;
        
        // Apply filters
        if (this.currentFilter.status) {
            projects = projects.filter(p => p.status === this.currentFilter.status);
        }
        
        if (this.currentFilter.search) {
            projects = projects.filter(p => 
                p.title.toLowerCase().includes(this.currentFilter.search) ||
                p.mentor.toLowerCase().includes(this.currentFilter.search) ||
                p.assignees.some(a => a.toLowerCase().includes(this.currentFilter.search))
            );
        }

        if (projects.length === 0) {
            grid.innerHTML = '';
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            grid.innerHTML = projects.map(project => this.renderProjectCard(project)).join('');
            
            // Add click listeners to project cards
            grid.querySelectorAll('.project-card').forEach(card => {
                card.addEventListener('click', () => {
                    const projectId = card.dataset.projectId;
                    this.router.navigateTo(`project/${projectId}`);
                });
            });
        }
    }

    renderProjectCard(project) {
        const isOverdue = project.dueDate && new Date(project.dueDate) < new Date() && project.status !== 'Completed';
        const statusClass = project.status === 'Completed' ? 'status--success' : 
                           project.status === 'In Progress' ? 'status--info' : 'status--warning';
        
        return `
            <div class="project-card card" data-project-id="${project.id}">
                <div class="project-title">${project.title}</div>
                <div class="meta-row">
                    <span class="status ${statusClass}">${project.status}</span>
                    ${isOverdue ? '<span class="status status--error">Overdue</span>' : ''}
                    <span>Mentor: ${project.mentor}</span>
                </div>
                <div class="meta-row">
                    <span>${project.assignees.length} assignee${project.assignees.length !== 1 ? 's' : ''}</span>
                    ${project.dueDate ? `<span>Due: ${new Date(project.dueDate).toLocaleDateString()}</span>` : ''}
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${project.progress || 0}%"></div>
                </div>
                <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                    ${project.progress || 0}% complete
                </div>
            </div>
        `;
    }

    renderProjectDetail(projectId) {
        const project = this.store.getProject(projectId);
        const detailContent = document.getElementById('detailContent');
        
        if (!detailContent || !project) {
            if (detailContent) {
                detailContent.innerHTML = '<p>Project not found.</p>';
            }
            return;
        }

        const isOverdue = project.dueDate && new Date(project.dueDate) < new Date() && project.status !== 'Completed';
        const statusClass = project.status === 'Completed' ? 'status--success' : 
                           project.status === 'In Progress' ? 'status--info' : 'status--warning';

        detailContent.innerHTML = `
            <div class="card">
                <div class="card__body">
                    <h2>${project.title}</h2>
                    <div class="meta-row" style="margin: var(--space-8) 0;">
                        <span class="status ${statusClass}">${project.status}</span>
                        ${isOverdue ? '<span class="status status--error">Overdue</span>' : ''}
                    </div>
                    
                    ${project.description ? `<p><strong>Description:</strong><br>${project.description}</p>` : ''}
                    
                    <div class="form-row" style="margin: var(--space-16) 0;">
                        <div><strong>Mentor:</strong> ${project.mentor}</div>
                        <div><strong>Progress:</strong> ${project.progress || 0}%</div>
                    </div>
                    
                    ${project.startDate || project.dueDate ? `
                        <div class="form-row" style="margin: var(--space-16) 0;">
                            ${project.startDate ? `<div><strong>Start:</strong> ${new Date(project.startDate).toLocaleDateString()}</div>` : ''}
                            ${project.dueDate ? `<div><strong>Due:</strong> ${new Date(project.dueDate).toLocaleDateString()}</div>` : ''}
                        </div>
                    ` : ''}
                    
                    <div class="progress-bar" style="margin: var(--space-16) 0;">
                        <div class="progress-fill" style="width: ${project.progress || 0}%"></div>
                    </div>
                    
                    <div style="margin: var(--space-16) 0;">
                        <label class="form-label">Quick Update Progress:</label>
                        <input type="range" min="0" max="100" value="${project.progress || 0}" 
                               class="progress-slider" onchange="window.app.updateProjectProgress('${project.id}', this.value)">
                        <div class="progress-display">
                            <span>${project.progress || 0}%</span>
                        </div>
                    </div>
                </div>
            </div>
            
            ${project.assignees.length > 0 ? `
                <div class="card">
                    <div class="card__body">
                        <h4>Assignees</h4>
                        <div class="flex" style="gap: var(--space-8); flex-wrap: wrap;">
                            ${project.assignees.map(name => `<span class="status status--info">${name}</span>`).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}
            
            ${project.resources && project.resources.length > 0 ? `
                <div class="card">
                    <div class="card__body">
                        <h4>Resources</h4>
                        <div style="display: flex; flex-direction: column; gap: var(--space-8);">
                            ${project.resources.map(resource => `
                                <div>
                                    <a href="${resource.url}" target="_blank" class="btn btn--outline btn--sm">
                                        ${resource.name}
                                    </a>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <div class="card">
                <div class="card__body">
                    <h4>Comments</h4>
                    <div class="comment-list">
                        ${project.comments.map(comment => `
                            <div class="comment-item">
                                <div style="font-weight: var(--font-weight-medium); font-size: var(--font-size-sm);">
                                    ${comment.author}
                                    <span style="color: var(--color-text-secondary); font-weight: normal;">
                                        • ${new Date(comment.date).toLocaleDateString()}
                                    </span>
                                </div>
                                <div style="margin-top: var(--space-4);">${comment.text}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="margin-top: var(--space-16);">
                        <div class="form-group">
                            <input type="text" placeholder="Your name" class="form-control" id="commentAuthor">
                        </div>
                        <div class="form-group">
                            <textarea placeholder="Add a comment..." class="form-control" id="commentText" rows="3"></textarea>
                        </div>
                        <button class="btn btn--primary" onclick="window.app.addComment('${project.id}')">Post Comment</button>
                    </div>
                </div>
            </div>
        `;
    }

    updateProjectProgress(projectId, progress) {
        this.store.updateProject(projectId, { progress: parseInt(progress) });
        this.renderProjectDetail(projectId);
    }

    addComment(projectId) {
        const authorField = document.getElementById('commentAuthor');
        const textField = document.getElementById('commentText');
        
        if (!authorField || !textField) return;
        
        const author = authorField.value.trim();
        const text = textField.value.trim();
        
        if (!author || !text) {
            alert('Please fill in both name and comment fields.');
            return;
        }
        
        this.store.addComment(projectId, { author, text });
        authorField.value = '';
        textField.value = '';
        this.renderProjectDetail(projectId);
    }

    openProjectModal(project = null) {
        console.log('Opening project modal', project);
        this.editingProject = project;
        const modal = document.getElementById('projectModal');
        const title = document.getElementById('modalTitle');
        
        if (!modal) {
            console.error('Modal element not found');
            return;
        }
        
        if (project) {
            if (title) title.textContent = 'Edit Project';
            this.populateForm(project);
        } else {
            if (title) title.textContent = 'Add New Project';
            this.resetForm();
        }
        
        modal.classList.remove('hidden');
        
        // Focus on first input
        setTimeout(() => {
            const titleInput = document.getElementById('title');
            if (titleInput) titleInput.focus();
        }, 100);
        
        console.log('Modal should be visible now');
    }

    closeProjectModal() {
        const modal = document.getElementById('projectModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.editingProject = null;
    }

    populateForm(project) {
        const setFieldValue = (id, value) => {
            const field = document.getElementById(id);
            if (field) field.value = value || '';
        };

        setFieldValue('title', project.title);
        setFieldValue('description', project.description);
        setFieldValue('mentor', project.mentor);
        setFieldValue('status', project.status || 'Not Started');
        setFieldValue('startDate', project.startDate);
        setFieldValue('dueDate', project.dueDate);
        setFieldValue('progress', project.progress || 0);
        
        const progressValue = document.getElementById('progressValue');
        if (progressValue) progressValue.textContent = (project.progress || 0) + '%';
        
        // Populate assignees
        const assigneesList = document.getElementById('assigneesList');
        if (assigneesList) {
            assigneesList.innerHTML = '';
            if (project.assignees && project.assignees.length > 0) {
                project.assignees.forEach(assignee => {
                    assigneesList.appendChild(this.createAssigneeInput(assignee));
                });
            } else {
                assigneesList.appendChild(this.createAssigneeInput());
            }
        }
        
        // Populate resources
        const resourcesList = document.getElementById('resourcesList');
        if (resourcesList) {
            resourcesList.innerHTML = '';
            if (project.resources && project.resources.length > 0) {
                project.resources.forEach(resource => {
                    resourcesList.appendChild(this.createResourceInput(resource.name, resource.url));
                });
            } else {
                resourcesList.appendChild(this.createResourceInput());
            }
        }
    }

    resetForm() {
        const form = document.getElementById('projectForm');
        if (form) form.reset();
        
        const progressValue = document.getElementById('progressValue');
        if (progressValue) progressValue.textContent = '0%';
        
        // Reset dynamic lists
        const assigneesList = document.getElementById('assigneesList');
        if (assigneesList) {
            assigneesList.innerHTML = '';
            assigneesList.appendChild(this.createAssigneeInput());
        }
        
        const resourcesList = document.getElementById('resourcesList');
        if (resourcesList) {
            resourcesList.innerHTML = '';
            resourcesList.appendChild(this.createResourceInput());
        }
    }

    createAssigneeInput(value = '') {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control assignee-input';
        input.placeholder = 'Enter assignee name';
        input.value = value;
        return input;
    }

    createResourceInput(name = '', url = '') {
        const div = document.createElement('div');
        div.className = 'resource-row';
        div.innerHTML = `
            <input type="text" class="form-control resource-name" placeholder="Resource name" value="${name}">
            <input type="url" class="form-control resource-url" placeholder="Resource URL" value="${url}">
        `;
        return div;
    }

    addAssigneeInput() {
        const assigneesList = document.getElementById('assigneesList');
        if (assigneesList) {
            assigneesList.appendChild(this.createAssigneeInput());
        }
    }

    addResourceInput() {
        const resourcesList = document.getElementById('resourcesList');
        if (resourcesList) {
            resourcesList.appendChild(this.createResourceInput());
        }
    }

    handleProjectSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const project = {
            title: formData.get('title').trim(),
            description: formData.get('description').trim(),
            mentor: formData.get('mentor').trim(),
            status: formData.get('status'),
            startDate: formData.get('startDate'),
            dueDate: formData.get('dueDate'),
            progress: parseInt(formData.get('progress')) || 0,
            assignees: [],
            resources: []
        };

        // Validate required fields
        if (!project.title || !project.mentor) {
            alert('Please fill in all required fields.');
            return;
        }

        // Collect assignees
        document.querySelectorAll('.assignee-input').forEach(input => {
            if (input.value.trim()) {
                project.assignees.push(input.value.trim());
            }
        });

        // Collect resources
        document.querySelectorAll('.resource-row').forEach(row => {
            const name = row.querySelector('.resource-name').value.trim();
            const url = row.querySelector('.resource-url').value.trim();
            if (name && url) {
                project.resources.push({ name, url });
            }
        });

        if (this.editingProject) {
            this.store.updateProject(this.editingProject.id, project);
        } else {
            this.store.addProject(project);
        }

        this.closeProjectModal();
        this.renderCurrentView();
    }

    editCurrentProject() {
        const project = this.store.getProject(this.router.currentProjectId);
        if (project) {
            this.openProjectModal(project);
        }
    }

    showDeleteModal() {
        const modal = document.getElementById('deleteModal');
        if (modal) modal.classList.remove('hidden');
    }

    hideDeleteModal() {
        const modal = document.getElementById('deleteModal');
        if (modal) modal.classList.add('hidden');
    }

    confirmDelete() {
        if (this.router.currentProjectId) {
            this.store.deleteProject(this.router.currentProjectId);
            this.hideDeleteModal();
            this.router.navigateTo('dashboard');
        }
    }

    handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const success = this.store.importData(event.target.result);
            if (success) {
                alert('Projects imported successfully!');
                this.renderCurrentView();
            } else {
                alert('Failed to import projects. Please check the file format.');
            }
        };
        reader.readAsText(file);
        
        // Reset input
        e.target.value = '';
    }
}

// Initialize the application when DOM is ready
let app;

function initApp() {
    app = new PDCApp();
    window.app = app;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}