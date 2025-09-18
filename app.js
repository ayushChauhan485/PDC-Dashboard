// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBO4MrF8lyQn8Z291h2i6xvsG991TPzP08",
  authDomain: "pdc-dashboard-8963a.firebaseapp.com",
  databaseURL: "databaseURL: "https://pdc-dashboard-8963a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pdc-dashboard-8963a",
  storageBucket: "pdc-dashboard-8963a.firebasestorage.app",
  messagingSenderId: "340274488388",
  appId: "1:340274488388:web:ca56cabacd68e0521d0811"
};

// Initialize Firebase with error handling
let database;
let isFirebaseInitialized = false;

function initializeFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.error('Firebase not loaded');
      return false;
    }
    
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    isFirebaseInitialized = true;
    console.log('Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return false;
  }
}

// Firebase-based Project Store
class FirebaseProjectStore {
  constructor() {
    this.projects = new Map();
    this.listeners = new Set();
    this.isConnected = false;
    
    if (initializeFirebase()) {
      this.projectsRef = database.ref('projects');
      this.setupConnectionListener();
      this.setupDataListener();
    } else {
      // Fallback to local storage
      this.useLocalStorage = true;
      this.loadFromLocalStorage();
      this.updateConnectionStatus();
    }
  }

  setupConnectionListener() {
    if (!isFirebaseInitialized) return;
    
    const connectedRef = database.ref('.info/connected');
    connectedRef.on('value', (snapshot) => {
      this.isConnected = snapshot.val();
      this.updateConnectionStatus();
      console.log('Connection status:', this.isConnected);
    });
  }

  updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;
    
    if (this.useLocalStorage) {
      statusElement.className = 'status status--warning';
      statusElement.textContent = 'Local Storage';
    } else if (this.isConnected) {
      statusElement.className = 'status status--success';
      statusElement.textContent = 'Connected';
    } else {
      statusElement.className = 'status status--error';
      statusElement.textContent = 'Disconnected';
    }
  }

  setupDataListener() {
    if (!isFirebaseInitialized || !this.projectsRef) return;
    
    this.projectsRef.on('value', (snapshot) => {
      const data = snapshot.val();
      this.projects.clear();
      
      if (data) {
        Object.entries(data).forEach(([id, project]) => {
          this.projects.set(id, { ...project, id });
        });
      }
      
      this.notifyListeners();
    }, (error) => {
      console.error('Firebase read error:', error);
      this.isConnected = false;
      this.updateConnectionStatus();
    });
  }

  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('pdc-projects');
      if (stored) {
        const projects = JSON.parse(stored);
        this.projects.clear();
        projects.forEach(project => {
          this.projects.set(project.id, project);
        });
      }
    } catch (error) {
      console.error('Local storage load error:', error);
    }
  }

  saveToLocalStorage() {
    if (!this.useLocalStorage) return;
    
    try {
      const projects = Array.from(this.projects.values());
      localStorage.setItem('pdc-projects', JSON.stringify(projects));
    } catch (error) {
      console.error('Local storage save error:', error);
    }
  }

  addListener(callback) {
    this.listeners.add(callback);
  }

  removeListener(callback) {
    this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Listener callback error:', error);
      }
    });
  }

  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  async addProject(projectData) {
    try {
      const id = this.generateId();
      const project = {
        ...projectData,
        id,
        createdAt: Date.now(),
        lastUpdated: Date.now()
      };
      
      if (this.useLocalStorage) {
        this.projects.set(id, project);
        this.saveToLocalStorage();
        this.notifyListeners();
        return project;
      } else if (isFirebaseInitialized && this.projectsRef) {
        await this.projectsRef.child(id).set(project);
        return project;
      }
    } catch (error) {
      console.error('Error adding project:', error);
      throw error;
    }
  }

  async updateProject(id, updates) {
    try {
      const updatedData = {
        ...updates,
        lastUpdated: Date.now()
      };
      
      if (this.useLocalStorage) {
        const existing = this.projects.get(id);
        if (existing) {
          this.projects.set(id, { ...existing, ...updatedData });
          this.saveToLocalStorage();
          this.notifyListeners();
        }
        return { id, ...updatedData };
      } else if (isFirebaseInitialized && this.projectsRef) {
        await this.projectsRef.child(id).update(updatedData);
        return { id, ...updatedData };
      }
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  async deleteProject(id) {
    try {
      if (this.useLocalStorage) {
        this.projects.delete(id);
        this.saveToLocalStorage();
        this.notifyListeners();
      } else if (isFirebaseInitialized && this.projectsRef) {
        await this.projectsRef.child(id).remove();
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  getProjects() {
    return Array.from(this.projects.values());
  }

  getProject(id) {
    return this.projects.get(id);
  }

  // Initialize with demo data if database is empty
  async initializeWithDemoData() {
    if (this.projects.size > 0) return;
    
    const demoProjects = [
      {
        title: "AI Chatbot Development",
        description: "Develop an intelligent chatbot using natural language processing for customer support automation.",
        mentor: "Dr. Sarah Chen",
        assignees: ["Alex Kumar", "Maria Rodriguez"],
        status: "In Progress",
        startDate: "2024-01-15",
        dueDate: "2024-03-30",
        progress: 65,
        resources: ["https://github.com/example/chatbot", "https://docs.openai.com/"],
        comments: ["Initial prototype completed", "Working on NLP improvements"]
      },
      {
        title: "Mobile App UI/UX Redesign",
        description: "Complete redesign of the mobile application interface with focus on user experience and accessibility.",
        mentor: "Prof. James Wilson",
        assignees: ["Emily Zhang", "David Thompson", "Lisa Park"],
        status: "Planning",
        startDate: "2024-02-01",
        dueDate: "2024-04-15",
        progress: 25,
        resources: ["https://figma.com/design-system", "https://material.io/design"],
        comments: ["User research phase completed", "Moving to wireframe stage"]
      }
    ];

    try {
      for (const project of demoProjects) {
        await this.addProject(project);
      }
    } catch (error) {
      console.error('Demo data initialization error:', error);
    }
  }
}

// Initialize store
const projectStore = new FirebaseProjectStore();

// UI State Management
class UIController {
  constructor() {
    this.currentProject = null;
    this.isEditMode = false;
    this.searchTerm = '';
    this.statusFilter = '';
    this.mentorFilter = '';
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  initialize() {
    console.log('Initializing UI Controller');
    this.initializeEventListeners();
    this.initializeDataListener();
    
    // Initialize demo data after a short delay
    setTimeout(() => {
      projectStore.initializeWithDemoData().catch(console.error);
    }, 1000);
  }

  initializeEventListeners() {
    console.log('Setting up event listeners');
    
    // Modal controls
    const addProjectBtn = document.getElementById('addProjectBtn');
    const emptyStateBtn = document.getElementById('emptyStateBtn');
    const closeModal = document.getElementById('closeModal');
    const closeDetailsModal = document.getElementById('closeDetailsModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const closeDetailsBtn = document.getElementById('closeDetailsBtn');

    if (addProjectBtn) {
      addProjectBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Add project button clicked');
        this.openAddProjectModal();
      });
    }

    if (emptyStateBtn) {
      emptyStateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openAddProjectModal();
      });
    }

    if (closeModal) {
      closeModal.addEventListener('click', () => this.closeModal());
    }

    if (closeDetailsModal) {
      closeDetailsModal.addEventListener('click', () => this.closeDetailsModal());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeModal());
    }

    if (closeDetailsBtn) {
      closeDetailsBtn.addEventListener('click', () => this.closeDetailsModal());
    }

    // Form submission
    const projectForm = document.getElementById('projectForm');
    if (projectForm) {
      projectForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Project actions
    const editProjectBtn = document.getElementById('editProjectBtn');
    const deleteProjectBtn = document.getElementById('deleteProjectBtn');
    
    if (editProjectBtn) {
      editProjectBtn.addEventListener('click', () => this.editCurrentProject());
    }

    if (deleteProjectBtn) {
      deleteProjectBtn.addEventListener('click', () => this.deleteCurrentProject());
    }

    // Export functionality
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportProjects());
    }

    // Search and filters
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const mentorFilter = document.getElementById('mentorFilter');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleSearch(e));
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => this.handleStatusFilter(e));
    }

    if (mentorFilter) {
      mentorFilter.addEventListener('change', (e) => this.handleMentorFilter(e));
    }

    // Modal overlay clicks
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal__overlay')) {
        this.closeModal();
        this.closeDetailsModal();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        this.closeDetailsModal();
      }
    });

    console.log('Event listeners set up complete');
  }

  initializeDataListener() {
    projectStore.addListener(() => {
      console.log('Data updated, refreshing UI');
      this.updateUI();
    });
  }

  updateUI() {
    this.renderProjects();
    this.updateStats();
    this.updateFilters();
  }

  renderProjects() {
    const projectsGrid = document.getElementById('projectsGrid');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const emptyState = document.getElementById('emptyState');
    
    if (!projectsGrid || !loadingSpinner || !emptyState) return;
    
    const projects = this.getFilteredProjects();
    console.log('Rendering projects:', projects.length);

    // Hide loading spinner
    loadingSpinner.style.display = 'none';

    if (projects.length === 0) {
      projectsGrid.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    projectsGrid.style.display = 'grid';
    projectsGrid.innerHTML = projects.map(project => this.createProjectCard(project)).join('');

    // Add click listeners to project cards
    projectsGrid.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', () => {
        const projectId = card.dataset.projectId;
        this.openProjectDetails(projectId);
      });
    });
  }

  createProjectCard(project) {
    const isOverdue = project.dueDate && new Date(project.dueDate) < new Date() && project.status !== 'Completed';
    const assigneesList = project.assignees?.map(assignee => 
      `<span class="assignee-tag">${assignee}</span>`
    ).join('') || '';

    const statusClass = this.getStatusClass(project.status);

    return `
      <div class="project-card" data-project-id="${project.id}">
        <div class="project-card__header">
          <h3 class="project-card__title">${project.title}</h3>
          <div class="project-card__meta">
            <span class="project-card__mentor">👨‍🏫 ${project.mentor}</span>
            <span class="status ${statusClass}">${project.status}</span>
          </div>
        </div>
        
        <div class="project-card__body">
          ${project.description ? `<p class="project-card__description">${project.description}</p>` : ''}
          
          ${project.assignees?.length ? `
            <div class="project-card__assignees">
              <div class="project-card__assignees-title">Assignees</div>
              <div class="assignee-list">${assigneesList}</div>
            </div>
          ` : ''}
          
          <div class="project-card__progress">
            <div class="progress-label">
              <span>Progress</span>
              <span>${project.progress || 0}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${project.progress || 0}%"></div>
            </div>
          </div>
        </div>
        
        <div class="project-card__footer">
          <div class="project-card__dates">
            ${project.startDate ? `Started: ${new Date(project.startDate).toLocaleDateString()}` : ''}
            ${project.dueDate ? `<br>Due: ${new Date(project.dueDate).toLocaleDateString()}` : ''}
            ${isOverdue ? '<br><span class="status status--error">Overdue</span>' : ''}
          </div>
        </div>
      </div>
    `;
  }

  getStatusClass(status) {
    const statusMap = {
      'Planning': 'status--info',
      'In Progress': 'status--warning',
      'Review': 'status--info',
      'Completed': 'status--success'
    };
    return statusMap[status] || 'status--info';
  }

  getFilteredProjects() {
    let projects = projectStore.getProjects();

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      projects = projects.filter(project =>
        project.title.toLowerCase().includes(term) ||
        (project.description && project.description.toLowerCase().includes(term)) ||
        project.mentor.toLowerCase().includes(term)
      );
    }

    if (this.statusFilter) {
      projects = projects.filter(project => project.status === this.statusFilter);
    }

    if (this.mentorFilter) {
      projects = projects.filter(project => project.mentor === this.mentorFilter);
    }

    return projects.sort((a, b) => (b.lastUpdated || b.createdAt || 0) - (a.lastUpdated || a.createdAt || 0));
  }

  updateStats() {
    const projects = projectStore.getProjects();
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'In Progress' || p.status === 'Planning').length;
    const completedProjects = projects.filter(p => p.status === 'Completed').length;
    const overdue = projects.filter(p => 
      p.dueDate && new Date(p.dueDate) < new Date() && p.status !== 'Completed'
    ).length;

    const totalEl = document.getElementById('totalProjects');
    const activeEl = document.getElementById('activeProjects');
    const completedEl = document.getElementById('completedProjects');
    const overdueEl = document.getElementById('overdue');

    if (totalEl) totalEl.textContent = totalProjects;
    if (activeEl) activeEl.textContent = activeProjects;
    if (completedEl) completedEl.textContent = completedProjects;
    if (overdueEl) overdueEl.textContent = overdue;
  }

  updateFilters() {
    const projects = projectStore.getProjects();
    const mentorFilter = document.getElementById('mentorFilter');
    
    if (!mentorFilter) return;
    
    const currentMentorValue = mentorFilter.value;

    // Update mentor filter options
    const mentors = [...new Set(projects.map(p => p.mentor))].sort();
    mentorFilter.innerHTML = '<option value="">All Mentors</option>' + 
      mentors.map(mentor => `<option value="${mentor}">${mentor}</option>`).join('');
    
    mentorFilter.value = currentMentorValue;
  }

  openAddProjectModal() {
    console.log('Opening add project modal');
    this.isEditMode = false;
    this.currentProject = null;
    
    const modalTitle = document.getElementById('modalTitle');
    const saveBtn = document.getElementById('saveBtn');
    
    if (modalTitle) modalTitle.textContent = 'Add New Project';
    if (saveBtn) saveBtn.textContent = 'Save Project';
    
    this.resetForm();
    this.showModal('projectModal');
  }

  openProjectDetails(projectId) {
    const project = projectStore.getProject(projectId);
    if (!project) return;

    this.currentProject = project;
    this.renderProjectDetails(project);
    this.showModal('detailsModal');
  }

  renderProjectDetails(project) {
    const detailsContainer = document.getElementById('projectDetails');
    if (!detailsContainer) return;
    
    const resources = project.resources?.map(url => 
      `<a href="${url}" target="_blank" class="resource-link">${url}</a>`
    ).join('') || 'No resources added';

    const assignees = project.assignees?.join(', ') || 'No assignees';
    const comments = project.comments?.map(comment => 
      `<div class="comment">${comment}</div>`
    ).join('') || '<div class="comment">No comments yet</div>';

    detailsContainer.innerHTML = `
      <div class="project-detail">
        <div class="project-detail__label">Title</div>
        <div class="project-detail__value">${project.title}</div>
      </div>
      
      <div class="project-detail">
        <div class="project-detail__label">Description</div>
        <div class="project-detail__value">${project.description || 'No description provided'}</div>
      </div>
      
      <div class="project-detail">
        <div class="project-detail__label">Mentor</div>
        <div class="project-detail__value">${project.mentor}</div>
      </div>
      
      <div class="project-detail">
        <div class="project-detail__label">Assignees</div>
        <div class="project-detail__value">${assignees}</div>
      </div>
      
      <div class="project-detail">
        <div class="project-detail__label">Status</div>
        <div class="project-detail__value">
          <span class="status ${this.getStatusClass(project.status)}">${project.status}</span>
        </div>
      </div>
      
      <div class="project-detail">
        <div class="project-detail__label">Progress</div>
        <div class="project-detail__value">
          <div class="progress-bar" style="margin-top: 8px;">
            <div class="progress-fill" style="width: ${project.progress || 0}%"></div>
          </div>
          <span>${project.progress || 0}%</span>
        </div>
      </div>
      
      <div class="project-detail">
        <div class="project-detail__label">Dates</div>
        <div class="project-detail__value">
          Start: ${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}<br>
          Due: ${project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'Not set'}
        </div>
      </div>
      
      <div class="project-detail">
        <div class="project-detail__label">Resources</div>
        <div class="project-detail__resources">${resources}</div>
      </div>
      
      <div class="comments-section">
        <div class="project-detail__label">Comments</div>
        ${comments}
      </div>
    `;

    const detailsTitle = document.getElementById('detailsTitle');
    if (detailsTitle) detailsTitle.textContent = project.title;
  }

  editCurrentProject() {
    if (!this.currentProject) return;

    this.isEditMode = true;
    this.closeDetailsModal();
    
    const modalTitle = document.getElementById('modalTitle');
    const saveBtn = document.getElementById('saveBtn');
    
    if (modalTitle) modalTitle.textContent = 'Edit Project';
    if (saveBtn) saveBtn.textContent = 'Update Project';
    
    this.populateForm(this.currentProject);
    this.showModal('projectModal');
  }

  async deleteCurrentProject() {
    if (!this.currentProject) return;

    if (confirm(`Are you sure you want to delete "${this.currentProject.title}"? This action cannot be undone.`)) {
      try {
        await projectStore.deleteProject(this.currentProject.id);
        this.closeDetailsModal();
      } catch (error) {
        alert('Failed to delete project. Please try again.');
      }
    }
  }

  populateForm(project) {
    const elements = {
      projectTitle: project.title,
      projectDescription: project.description || '',
      projectMentor: project.mentor,
      projectAssignees: project.assignees?.join(', ') || '',
      projectStatus: project.status,
      projectProgress: project.progress || 0,
      startDate: project.startDate || '',
      dueDate: project.dueDate || '',
      projectResources: project.resources?.join(', ') || ''
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.value = value;
    });
  }

  resetForm() {
    const form = document.getElementById('projectForm');
    if (form) {
      form.reset();
      const progressEl = document.getElementById('projectProgress');
      if (progressEl) progressEl.value = 0;
    }
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    console.log('Form submitted');
    
    const projectData = {
      title: this.getFormValue('projectTitle'),
      description: this.getFormValue('projectDescription'),
      mentor: this.getFormValue('projectMentor'),
      assignees: this.getFormValue('projectAssignees')
        .split(',')
        .map(a => a.trim())
        .filter(a => a),
      status: this.getFormValue('projectStatus'),
      progress: parseInt(this.getFormValue('projectProgress')) || 0,
      startDate: this.getFormValue('startDate'),
      dueDate: this.getFormValue('dueDate'),
      resources: this.getFormValue('projectResources')
        .split(',')
        .map(r => r.trim())
        .filter(r => r),
      comments: []
    };

    // Validation
    if (!projectData.title || !projectData.mentor) {
      alert('Please fill in required fields (Title and Mentor)');
      return;
    }

    try {
      if (this.isEditMode && this.currentProject) {
        await projectStore.updateProject(this.currentProject.id, projectData);
        console.log('Project updated');
      } else {
        await projectStore.addProject(projectData);
        console.log('Project added');
      }
      
      this.closeModal();
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save project. Please try again.');
    }
  }

  getFormValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : '';
  }

  handleSearch(e) {
    this.searchTerm = e.target.value;
    this.renderProjects();
  }

  handleStatusFilter(e) {
    this.statusFilter = e.target.value;
    this.renderProjects();
  }

  handleMentorFilter(e) {
    this.mentorFilter = e.target.value;
    this.renderProjects();
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal() {
    const modal = document.getElementById('projectModal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
      this.resetForm();
    }
  }

  closeDetailsModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
      this.currentProject = null;
    }
  }

  exportProjects() {
    const projects = projectStore.getProjects();
    const csv = this.convertToCSV(projects);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'pdc-projects.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  convertToCSV(projects) {
    const headers = ['Title', 'Description', 'Mentor', 'Assignees', 'Status', 'Progress', 'Start Date', 'Due Date'];
    const rows = projects.map(project => [
      project.title || '',
      project.description || '',
      project.mentor || '',
      project.assignees?.join('; ') || '',
      project.status || '',
      project.progress || 0,
      project.startDate || '',
      project.dueDate || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }
}

// Initialize the application
new UIController();