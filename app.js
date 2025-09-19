// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBO4MrF8lyQn8Z291h2i6xvsG991TPzP08",
  authDomain: "pdc-dashboard-8963a.firebaseapp.com",
  databaseURL: "https://pdc-dashboard-8963a-default-rtdb.asia-southeast1.firebasedatabase.app",
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

    // Progress slider
    const progressSlider = document.getElementById('projectProgress');
    if (progressSlider) {
      progressSlider.addEventListener('input', (e) => {
        const progressValue = document.getElementById('progressValue');
        if (progressValue) {
          progressValue.textContent = e.target.value + '%';
        }
      });
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
    const assigneesList = project.assignees?.join(', ') || 'None';
    const statusClass = this.getStatusClass(project.status);

    return `
      <div class="project-card" data-project-id="${project.id}">
        <div class="project-card__header">
          <h3 class="project-card__title">${project.title}</h3>
          <span class="badge badge--${statusClass}">${project.status}</span>
        </div>
        
        ${project.description ? `<p class="project-card__description">${project.description}</p>` : ''}
        
        <div class="project-card__meta">
          <div class="project-card__mentor">
            <strong>Mentor:</strong> ${project.mentor}
          </div>
          
          ${project.assignees?.length ? `
            <div class="project-card__assignees">
              <strong>Assignees:</strong> ${assigneesList}
            </div>
          ` : ''}
          
          <div class="project-card__progress">
            <div class="progress-bar">
              <div class="progress-bar__fill" style="width: ${project.progress || 0}%"></div>
            </div>
            <span class="progress-text">${project.progress || 0}%</span>
          </div>
          
          ${project.dueDate ? `
            <div class="project-card__due-date ${isOverdue ? 'overdue' : ''}">
              <strong>Due:</strong> ${new Date(project.dueDate).toLocaleDateString()}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  getStatusClass(status) {
    const statusMap = {
      'Planning': 'planning',
      'In Progress': 'in-progress',
      'Review': 'review',
      'Completed': 'completed'
    };
    return statusMap[status] || 'planning';
  }

  getFilteredProjects() {
    let projects = projectStore.getProjects();

    if (this.searchTerm) {
      projects = projects.filter(project =>
        project.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        project.mentor.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        project.assignees?.some(assignee => assignee.toLowerCase().includes(this.searchTerm.toLowerCase()))
      );
    }

    if (this.statusFilter) {
      projects = projects.filter(project => project.status === this.statusFilter);
    }

    if (this.mentorFilter) {
      projects = projects.filter(project => project.mentor === this.mentorFilter);
    }

    return projects;
  }

  updateStats() {
    const projects = this.getFilteredProjects();
    const activeProjects = projects.filter(p => p.status === 'In Progress' || p.status === 'Planning').length;
    const completedProjects = projects.filter(p => p.status === 'Completed').length;
    const overdueProjects = projects.filter(p => 
      p.dueDate && new Date(p.dueDate) < new Date() && p.status !== 'Completed'
    ).length;

    document.getElementById('totalProjects').textContent = projects.length;
    document.getElementById('activeProjects').textContent = activeProjects;
    document.getElementById('completedProjects').textContent = completedProjects;
    document.getElementById('overdueProjects').textContent = overdueProjects;
  }

  updateFilters() {
    const projects = projectStore.getProjects();
    const mentorFilter = document.getElementById('mentorFilter');
    
    if (mentorFilter) {
      const mentors = [...new Set(projects.map(p => p.mentor))].sort();
      const currentValue = mentorFilter.value;
      
      mentorFilter.innerHTML = '<option value="">All Mentors</option>' +
        mentors.map(mentor => `<option value="${mentor}">${mentor}</option>`).join('');
      
      mentorFilter.value = currentValue;
    }
  }

  openAddProjectModal() {
    console.log('Opening add project modal');
    this.isEditMode = false;
    this.currentProject = null;
    
    // Reset form
    const form = document.getElementById('projectForm');
    if (form) {
      form.reset();
    }
    
    // Update modal title
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
      modalTitle.textContent = 'Add New Project';
    }
    
    // Reset progress display
    const progressValue = document.getElementById('progressValue');
    if (progressValue) {
      progressValue.textContent = '0%';
    }
    
    // Show modal
    const modal = document.getElementById('projectModal');
    if (modal) {
      modal.classList.add('show');
    }
  }

  openProjectDetails(projectId) {
    console.log('Opening project details for:', projectId);
    
    const project = projectStore.getProject(projectId);
    if (!project) {
      console.error('Project not found:', projectId);
      return;
    }

    this.currentProject = project;

    // Update modal title
    const detailsTitle = document.getElementById('detailsTitle');
    if (detailsTitle) {
      detailsTitle.textContent = project.title;
    }

    // Create and set details content
    const detailsContent = document.getElementById('projectDetailsContent');
    if (detailsContent) {
      detailsContent.innerHTML = this.createProjectDetailsHTML(project);
    }

    // Show modal
    const modal = document.getElementById('projectDetailsModal');
    if (modal) {
      modal.classList.add('show');
    }
  }

  createProjectDetailsHTML(project) {
    const isOverdue = project.dueDate && new Date(project.dueDate) < new Date() && project.status !== 'Completed';
    
    return `
      <div class="project-details">
        <div class="detail-section">
          <h4>Status & Progress</h4>
          <div class="detail-row">
            <span class="badge badge--${this.getStatusClass(project.status)}">${project.status}</span>
            ${isOverdue ? '<span class="badge badge--danger">Overdue</span>' : ''}
          </div>
          <div class="progress-section">
            <div class="progress-bar progress-bar--large">
              <div class="progress-bar__fill" style="width: ${project.progress || 0}%"></div>
            </div>
            <span class="progress-text">${project.progress || 0}% Complete</span>
          </div>
        </div>
        
        ${project.description ? `
          <div class="detail-section">
            <h4>Description</h4>
            <p>${project.description}</p>
          </div>
        ` : ''}
        
        <div class="detail-section">
          <h4>Team</h4>
          <div class="detail-row">
            <strong>Mentor:</strong> ${project.mentor}
          </div>
          ${project.assignees?.length ? `
            <div class="detail-row">
              <strong>Assignees:</strong> ${project.assignees.join(', ')}
            </div>
          ` : ''}
        </div>
        
        <div class="detail-section">
          <h4>Timeline</h4>
          ${project.startDate ? `
            <div class="detail-row">
              <strong>Start Date:</strong> ${new Date(project.startDate).toLocaleDateString()}
            </div>
          ` : ''}
          ${project.dueDate ? `
            <div class="detail-row">
              <strong>Due Date:</strong> ${new Date(project.dueDate).toLocaleDateString()}
              ${isOverdue ? ' <span class="text-danger">(Overdue)</span>' : ''}
            </div>
          ` : ''}
          <div class="detail-row">
            <strong>Created:</strong> ${new Date(project.createdAt).toLocaleDateString()}
          </div>
          <div class="detail-row">
            <strong>Last Updated:</strong> ${new Date(project.lastUpdated).toLocaleDateString()}
          </div>
        </div>
        
        ${project.resources?.length ? `
          <div class="detail-section">
            <h4>Resources</h4>
            <div class="resources-list">
              ${project.resources.map(resource => `
                <a href="${resource}" target="_blank" class="resource-link">${resource}</a>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  editCurrentProject() {
    console.log('Editing current project:', this.currentProject);
    
    if (!this.currentProject) {
      console.error('No current project to edit');
      return;
    }

    this.isEditMode = true;
    
    // Close details modal first
    this.closeDetailsModal();
    
    // Update modal title
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
      modalTitle.textContent = 'Edit Project';
    }
    
    // Populate form with current project data
    const project = this.currentProject;
    
    // Basic fields
    this.setFormValue('projectTitle', project.title || '');
    this.setFormValue('projectDescription', project.description || '');
    this.setFormValue('projectMentor', project.mentor || '');
    this.setFormValue('projectStatus', project.status || 'Planning');
    this.setFormValue('projectProgress', project.progress || 0);
    this.setFormValue('projectStartDate', project.startDate || '');
    this.setFormValue('projectDueDate', project.dueDate || '');
    
    // Handle assignees (convert array to comma-separated string)
    this.setFormValue('projectAssignees', project.assignees?.join(', ') || '');
    
    // Handle resources (convert array to comma-separated string)  
    this.setFormValue('projectResources', project.resources?.join(', ') || '');
    
    // Update progress display
    const progressValue = document.getElementById('progressValue');
    if (progressValue) {
      progressValue.textContent = (project.progress || 0) + '%';
    }
    
    // Show edit modal
    const modal = document.getElementById('projectModal');
    if (modal) {
      modal.classList.add('show');
    }
  }

  setFormValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = value;
    }
  }

  async deleteCurrentProject() {
    if (!this.currentProject) return;

    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await projectStore.deleteProject(this.currentProject.id);
        this.closeDetailsModal();
        console.log('Project deleted successfully');
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Error deleting project. Please try again.');
      }
    }
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    console.log('Form submitted, edit mode:', this.isEditMode);

    const formData = this.getFormData();
    if (!formData) return;

    try {
      if (this.isEditMode && this.currentProject) {
        console.log('Updating project:', this.currentProject.id, formData);
        await projectStore.updateProject(this.currentProject.id, formData);
        console.log('Project updated successfully');
      } else {
        console.log('Adding new project:', formData);
        await projectStore.addProject(formData);
        console.log('Project added successfully');
      }

      this.closeModal();
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project. Please try again.');
    }
  }

  getFormData() {
    const title = document.getElementById('projectTitle')?.value?.trim();
    const description = document.getElementById('projectDescription')?.value?.trim();
    const mentor = document.getElementById('projectMentor')?.value?.trim();

    if (!title || !mentor) {
      alert('Please fill in all required fields (Title and Mentor)');
      return null;
    }

    const assigneesStr = document.getElementById('projectAssignees')?.value?.trim() || '';
    const resourcesStr = document.getElementById('projectResources')?.value?.trim() || '';

    return {
      title,
      description,
      mentor,
      status: document.getElementById('projectStatus')?.value || 'Planning',
      progress: parseInt(document.getElementById('projectProgress')?.value || 0),
      startDate: document.getElementById('projectStartDate')?.value || null,
      dueDate: document.getElementById('projectDueDate')?.value || null,
      assignees: assigneesStr ? assigneesStr.split(',').map(s => s.trim()).filter(s => s) : [],
      resources: resourcesStr ? resourcesStr.split(',').map(s => s.trim()).filter(s => s) : []
    };
  }

  closeModal() {
    const modal = document.getElementById('projectModal');
    if (modal) {
      modal.classList.remove('show');
    }
    
    // Reset state
    this.isEditMode = false;
    this.currentProject = null;
  }

  closeDetailsModal() {
    const modal = document.getElementById('projectDetailsModal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  handleSearch(e) {
    this.searchTerm = e.target.value;
    this.updateUI();
  }

  handleStatusFilter(e) {
    this.statusFilter = e.target.value;
    this.updateUI();
  }

  handleMentorFilter(e) {
    this.mentorFilter = e.target.value;
    this.updateUI();
  }

  exportProjects() {
    try {
      const projects = projectStore.getProjects();
      const dataStr = JSON.stringify(projects, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `pdc-projects-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(link.href);
      console.log('Projects exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting projects');
    }
  }
}

// Initialize the application
const uiController = new UIController();

// Make controller globally available for debugging
window.uiController = uiController;
window.projectStore = projectStore;
