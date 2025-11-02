// Initialize Firebase with error handling
let database;
let auth;
let isFirebaseInitialized = false;

function initializeFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.error('Firebase not loaded');
      return false;
    }
    
    if (typeof window.firebaseConfig === 'undefined') {
      console.error('Firebase configuration not loaded. Make sure firebase-config.js is included.');
      return false;
    }
    
    firebase.initializeApp(window.firebaseConfig);
    database = firebase.database();
    auth = firebase.auth();
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
      statusElement.setAttribute('title', 'Working offline - data stored locally');
    } else if (this.isConnected) {
      statusElement.className = 'status status--success';
      statusElement.textContent = 'Connected';
      statusElement.setAttribute('title', 'Connected to Firebase');
    } else {
      statusElement.className = 'status status--error';
      statusElement.textContent = 'Disconnected';
      statusElement.setAttribute('title', 'Connection lost - data may not sync');
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

// Authentication Manager
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.setupAuthStateListener();
  }

  setupAuthStateListener() {
    auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      this.updateUIForAuthState(user);
    });
  }

  updateUIForAuthState(user) {
    const authButtons = document.getElementById('authButtons');
    const profileSection = document.getElementById('profileSection');
    const userDisplayName = document.getElementById('userDisplayName');
    const addProjectBtn = document.getElementById('addProjectBtn');

    if (user) {
      // User is logged in
      authButtons.style.display = 'none';
      profileSection.style.display = 'flex';
      userDisplayName.textContent = user.displayName || user.email;
      if (addProjectBtn) addProjectBtn.style.display = 'block';
    } else {
      // User is logged out
      authButtons.style.display = 'flex';
      profileSection.style.display = 'none';
      if (addProjectBtn) addProjectBtn.style.display = 'none';
    }
  }

  async register(email, password, displayName) {
    console.log('AuthManager.register called with:', email, displayName);
    try {
      if (!auth) {
        throw new Error('Firebase Auth not initialized');
      }
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      console.log('User created successfully:', userCredential.user.uid);
      
      // Update profile with display name
      if (displayName) {
        await userCredential.user.updateProfile({
          displayName: displayName
        });
        console.log('Display name updated to:', displayName);
      }
      
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  }

  async login(email, password) {
    console.log('AuthManager.login called with:', email);
    try {
      if (!auth) {
        throw new Error('Firebase Auth not initialized');
      }
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      console.log('Login successful:', userCredential.user.uid);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  async logout() {
    try {
      await auth.signOut();
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

// Initialize auth manager
const authManager = new AuthManager();

// UI State Management
class UIController {
  constructor() {
    this.currentProject = null;
    this.isEditMode = false;
    this.searchTerm = '';
    this.statusFilter = '';
    this.mentorFilter = '';
    this.isRegisterMode = false;
    
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
    
  // //   // Initialize demo data after a short delay
  //   setTimeout(() => {
  //     projectStore.initializeWithDemoData().catch(console.error);
  //   }, 1000);
  }

  initializeEventListeners() {
    console.log('Setting up event listeners');
    
    // Get all required elements
    const addProjectBtn = document.getElementById('addProjectBtn');
    const emptyStateBtn = document.getElementById('emptyStateBtn');
    const closeModal = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const closeDetailsModal = document.getElementById('closeDetailsModal');
    const closeDetailsBtn = document.getElementById('closeDetailsBtn');
    const editProjectBtn = document.getElementById('editProjectBtn');
    const deleteProjectBtn = document.getElementById('deleteProjectBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFileInput = document.getElementById('importFileInput');
    const projectForm = document.getElementById('projectForm');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const mentorFilter = document.getElementById('mentorFilter');
    const projectModal = document.getElementById('projectModal');
    const detailsModal = document.getElementById('detailsModal');

    // Add project buttons
    if (addProjectBtn) {
      addProjectBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openAddProjectModal();
      });
    }

    if (emptyStateBtn) {
      emptyStateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openAddProjectModal();
      });
    }

    // Modal close buttons
    if (closeModal) {
      closeModal.addEventListener('click', () => this.closeModal());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeModal());
    }

    if (closeDetailsModal) {
      closeDetailsModal.addEventListener('click', () => this.closeDetailsModal());
    }

    if (closeDetailsBtn) {
      closeDetailsBtn.addEventListener('click', () => this.closeDetailsModal());
    }

    // Form submission
    if (projectForm) {
      projectForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Project actions
    if (editProjectBtn) {
      editProjectBtn.addEventListener('click', () => this.editCurrentProject());
    }

    if (deleteProjectBtn) {
      deleteProjectBtn.addEventListener('click', () => this.deleteCurrentProject());
    }

    // Export functionality
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportProjects());
    }

    // Import functionality
    if (importBtn && importFileInput) {
      importBtn.addEventListener('click', () => {
        importFileInput.click();
      });

      importFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleImport(e.target.files);
        }
      });
    }

    // Search and filters
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleSearch(e));
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => this.handleStatusFilter(e));
    }

    if (mentorFilter) {
      mentorFilter.addEventListener('change', (e) => this.handleMentorFilter(e));
    }

    // Modal overlay click to close
    if (projectModal) {
      projectModal.addEventListener('click', (e) => {
        if (e.target === projectModal) {
          this.closeModal();
        }
      });
    }

    if (detailsModal) {
      detailsModal.addEventListener('click', (e) => {
        if (e.target === detailsModal) {
          this.closeDetailsModal();
        }
      });
    }

    // Keyboard support
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (projectModal && !projectModal.classList.contains('hidden')) {
          this.closeModal();
        } else if (detailsModal && !detailsModal.classList.contains('hidden')) {
          this.closeDetailsModal();
        }
      }
    });

    // Authentication event listeners
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const authForm = document.getElementById('authForm');
    const authModal = document.getElementById('authModal');
    const closeAuthModal = document.getElementById('closeAuthModal');
    const cancelAuthBtn = document.getElementById('cancelAuthBtn');
    const toggleAuthMode = document.getElementById('toggleAuthMode');
    const authTitle = document.getElementById('authTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const displayNameGroup = document.getElementById('displayNameGroup');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    const profileMenuButton = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');

    // Login button
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        this.isRegisterMode = false;
        this.updateAuthModal(false);
        authModal.classList.remove('hidden');
      });
    }

    // Register button
    if (registerBtn) {
      registerBtn.addEventListener('click', () => {
        this.isRegisterMode = true;
        this.updateAuthModal(true);
        authModal.classList.remove('hidden');
      });
    }

    // Toggle between login and register
    if (toggleAuthMode) {
      toggleAuthMode.addEventListener('click', (e) => {
        e.preventDefault();
        this.isRegisterMode = !this.isRegisterMode;
        this.updateAuthModal(this.isRegisterMode);
      });
    }

    // Close auth modal
    if (closeAuthModal) {
      closeAuthModal.addEventListener('click', () => {
        authModal.classList.add('hidden');
        authForm.reset();
      });
    }

    if (cancelAuthBtn) {
      cancelAuthBtn.addEventListener('click', () => {
        authModal.classList.add('hidden');
        authForm.reset();
      });
    }

    // Auth modal overlay click to close
    if (authModal) {
      authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
          authModal.classList.add('hidden');
          authForm.reset();
        }
      });
    }

    // Auth form submission
    if (authForm) {
      authForm.addEventListener('submit', async (e) => {
        console.log('Auth form submitted, isRegisterMode:', this.isRegisterMode);
        e.preventDefault();
        await this.handleAuthSubmit(e);
      });
    } else {
      console.error('Auth form not found!');
    }

    // Auth submit button click handler (backup in case form submit doesn't fire)
    if (authSubmitBtn) {
      authSubmitBtn.addEventListener('click', async (e) => {
        console.log('Auth submit button clicked');
        e.preventDefault();
        if (authForm) {
          const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
          authForm.dispatchEvent(submitEvent);
        }
      });
    } else {
      console.error('Auth submit button not found!');
    }

    // Logout button
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        const result = await authManager.logout();
        if (result.success) {
          profileMenu.classList.remove('active');
          this.showSuccessMessage('Logged out successfully');
        } else {
          this.showErrorMessage('Failed to logout: ' + result.error);
        }
      });
    }

    // Profile menu toggle
    if (profileMenuButton && profileMenu) {
      profileMenuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('Profile button clicked');
        // Remove hidden class first if it exists
        profileMenu.classList.remove('hidden');
        // Then toggle active
        profileMenu.classList.toggle('active');
        console.log('Profile menu classes:', profileMenu.className);
      });

      // Close profile menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!profileMenu.contains(e.target) && !profileMenuButton.contains(e.target)) {
          profileMenu.classList.remove('active');
        }
      });
    } else {
      console.error('Profile menu elements not found:', {
        button: !!profileMenuButton,
        menu: !!profileMenu
      });
    }
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
    const statusClass = this.getStatusClass(project.status);

    // Ensure consistent assignees display
    const assigneesList = project.assignees?.length 
      ? project.assignees.map(assignee => `<span class="assignee-tag">${assignee}</span>`).join('')
      : '<span class="assignee-tag assignee-tag--placeholder">No assignees</span>';

    // Ensure consistent description display
    const description = project.description?.trim() 
      ? project.description 
      : 'No description available';

    // Ensure consistent date display
    const startDateDisplay = project.startDate 
      ? `Started: ${new Date(project.startDate).toLocaleDateString()}`
      : 'Start date: Not set';
    
    const dueDateDisplay = project.dueDate 
      ? `Due: ${new Date(project.dueDate).toLocaleDateString()}`
      : 'Due date: Not set';

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
          <p class="project-card__description">${description}</p>
          
          <div class="project-card__assignees">
            <div class="project-card__assignees-title">Assignees</div>
            <div class="assignee-list">${assigneesList}</div>
          </div>
          
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
            <div class="date-item">${startDateDisplay}</div>
            <div class="date-item">${dueDateDisplay}</div>
          </div>
          ${isOverdue ? '<div class="overdue-indicator"><span class="status status--error">Overdue</span></div>' : ''}
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
    const comments = project.comments?.map((comment, index) => 
      `<div class="comment">
        <div class="comment-content">${comment}</div>
        <button type="button" class="comment-delete" data-comment-index="${index}" 
                title="Delete comment" aria-label="Delete comment">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"></polyline>
            <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
          </svg>
        </button>
      </div>`
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
        <div class="comments-list">
          ${comments}
        </div>
        <div class="add-comment">
          <textarea id="newCommentInput" class="form-control comment-input" 
                    placeholder="Add a comment..." rows="2"></textarea>
          <button type="button" class="btn btn--primary comment-btn" id="addCommentBtn">
            Add Comment
          </button>
        </div>
      </div>
    `;

    const detailsTitle = document.getElementById('detailsTitle');
    if (detailsTitle) detailsTitle.textContent = project.title;

    // Add event listener for the comment button
    const addCommentBtn = document.getElementById('addCommentBtn');
    if (addCommentBtn) {
      console.log('Adding comment button event listener');
      addCommentBtn.addEventListener('click', () => {
        console.log('Comment button clicked');
        this.addComment();
      });
    } else {
      console.error('addCommentBtn not found');
    }

    // Add event listeners for comment delete buttons
    const deleteButtons = document.querySelectorAll('.comment-delete');
    console.log('Found delete buttons:', deleteButtons.length);
    deleteButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const commentIndex = parseInt(button.getAttribute('data-comment-index'));
        console.log('Delete button clicked for comment index:', commentIndex);
        this.deleteComment(commentIndex);
      });
    });
  }

  editCurrentProject() {
    if (!this.currentProject) {
      console.error('No current project to edit');
      return;
    }

    console.log('Editing project:', this.currentProject.title);
    
    // Set edit mode before closing details modal
    this.isEditMode = true;
    
    // Store the project reference before closing modal
    const projectToEdit = this.currentProject;
    
    // Close details modal
    this.closeDetailsModal();
    
    // Set the current project again (in case closeDetailsModal cleared it)
    this.currentProject = projectToEdit;
    
    // Update modal UI
    const modalTitle = document.getElementById('modalTitle');
    const saveBtn = document.getElementById('saveBtn');
    
    if (modalTitle) modalTitle.textContent = 'Edit Project';
    if (saveBtn) saveBtn.textContent = 'Update Project';
    
    // Populate form with project data
    this.populateForm(this.currentProject);
    
    // Show the edit modal
    this.showModal('projectModal');
  }

  async deleteCurrentProject() {
    if (!this.currentProject) return;

    // Check authentication
    if (!authManager.isAuthenticated()) {
      this.showErrorMessage('You must be logged in to delete projects');
      return;
    }

    if (confirm(`Are you sure you want to delete "${this.currentProject.title}"? This action cannot be undone.`)) {
      try {
        await projectStore.deleteProject(this.currentProject.id);
        this.closeDetailsModal();
      } catch (error) {
        alert('Failed to delete project. Please try again.');
      }
    }
  }

  async addComment() {
    console.log('addComment called');
    if (!this.currentProject) {
      console.error('No current project to add comment to');
      return;
    }

    // Check authentication
    if (!authManager.isAuthenticated()) {
      this.showErrorMessage('You must be logged in to add comments');
      return;
    }

    const commentInput = document.getElementById('newCommentInput');
    if (!commentInput) {
      console.error('Comment input not found');
      return;
    }

    const commentText = commentInput.value.trim();
    console.log('Comment text:', commentText);
    if (!commentText) {
      this.showErrorMessage('Please enter a comment before adding.');
      commentInput.focus();
      return;
    }

    // Show loading state
    const addBtn = document.getElementById('addCommentBtn');
    const originalText = addBtn?.textContent;
    if (addBtn) {
      addBtn.disabled = true;
      addBtn.textContent = 'Adding...';
    }

    try {
      // Get current user information
      const user = authManager.getCurrentUser();
      const userName = user?.displayName || user?.email || 'Anonymous';
      const userId = user?.uid || null;
      
      // Create new comment object with user info and timestamp
      const newComment = {
        text: commentText,
        userName: userName,
        userId: userId,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toLocaleString()
      };
      console.log('New comment:', newComment);
      
      // Add to current project's comments
      if (!this.currentProject.comments) {
        this.currentProject.comments = [];
      }
      this.currentProject.comments.push(newComment);
      console.log('Updated comments:', this.currentProject.comments);

      // Update project in storage - pass the entire updated project
      await projectStore.updateProject(this.currentProject.id, this.currentProject);
      console.log('Project updated in storage');

      // Clear input
      commentInput.value = '';

      // Update just the comments section instead of the entire modal
      this.refreshCommentsSection(this.currentProject);
      console.log('Comments section refreshed');

      // Show success message
      this.showSuccessMessage('Comment added successfully!');
      console.log('Comment added successfully');
    } catch (error) {
      console.error('Failed to add comment:', error);
      this.showErrorMessage(`Failed to add comment: ${error.message || 'Please try again.'}`);
      
      // Revert the comment addition since it failed
      if (this.currentProject.comments && this.currentProject.comments.length > 0) {
        this.currentProject.comments.pop();
      }
    } finally {
      // Restore button state
      if (addBtn) {
        addBtn.disabled = false;
        addBtn.textContent = originalText;
      }
    }
  }

  async deleteComment(commentIndex) {
    console.log('deleteComment called with index:', commentIndex);
    
    // Check authentication
    if (!authManager.isAuthenticated()) {
      this.showErrorMessage('You must be logged in to delete comments');
      return;
    }
    
    if (!this.currentProject || !this.currentProject.comments) {
      console.error('No current project or comments to delete');
      return;
    }

    if (commentIndex < 0 || commentIndex >= this.currentProject.comments.length) {
      console.error('Invalid comment index:', commentIndex);
      return;
    }

    const commentToDelete = this.currentProject.comments[commentIndex];
    
    // Check permissions: user must be the comment author or admin
    const currentUser = authManager.getCurrentUser();
    const currentUserId = currentUser?.uid;
    const commentUserId = typeof commentToDelete === 'object' ? commentToDelete.userId : null;
    
    // Admin check using configured admin emails
    const isAdmin = window.adminEmails && window.adminEmails.includes(currentUser?.email);
    
    if (!isAdmin && currentUserId !== commentUserId) {
      this.showErrorMessage('You can only delete your own comments');
      return;
    }
    
    // Get comment text for confirmation
    const commentText = typeof commentToDelete === 'string' ? commentToDelete : commentToDelete.text;
    if (!confirm(`Are you sure you want to delete this comment?\n\n"${commentText}"`)) {
      return;
    }

    try {
      // Remove comment from array
      this.currentProject.comments.splice(commentIndex, 1);
      console.log('Comment removed from array. Remaining comments:', this.currentProject.comments);

      // Update project in storage
      await projectStore.updateProject(this.currentProject.id, this.currentProject);
      console.log('Project updated in storage after comment deletion');

      // Update just the comments section instead of the entire modal
      this.refreshCommentsSection(this.currentProject);
      console.log('Comments section refreshed after comment deletion');

      // Show success message
      this.showSuccessMessage('Comment deleted successfully!');
      console.log('Comment deleted successfully');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      this.showErrorMessage(`Failed to delete comment: ${error.message || 'Please try again.'}`);
      
      // Revert the comment deletion since it failed  
      this.currentProject.comments.splice(commentIndex, 0, commentToDelete);
    }
  }

  refreshCommentsSection(project) {
    console.log('Refreshing comments section for project:', project.title);
    
    // Find the comments list container
    const commentsListContainer = document.querySelector('.comments-list');
    if (!commentsListContainer) {
      console.error('Comments list container not found');
      return;
    }

    const currentUser = authManager.getCurrentUser();
    const currentUserId = currentUser?.uid;

    // Generate updated comments HTML
    const comments = project.comments?.map((comment, index) => {
      // Handle both old string format and new object format
      let commentText, userName, userId, createdAt;
      
      if (typeof comment === 'string') {
        // Old format: "timestamp: text"
        commentText = comment;
        userName = 'Legacy User';
        userId = null;
        createdAt = '';
      } else {
        // New format: object with user info
        commentText = comment.text;
        userName = comment.userName || 'Anonymous';
        userId = comment.userId;
        createdAt = comment.createdAt || '';
      }

      // Check if current user can delete this comment
      const isAdmin = window.adminEmails && window.adminEmails.includes(currentUser?.email);
      const canDelete = currentUserId && (currentUserId === userId || isAdmin);
      const deleteButton = canDelete ? 
        `<button type="button" class="comment-delete" data-comment-index="${index}" 
                title="Delete comment" aria-label="Delete comment">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"></polyline>
            <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2,2h4a2,2 0 0,1,2,2v2"></path>
          </svg>
        </button>` : '';

      return `<div class="comment">
        <div class="comment-header">
          <span class="comment-author">${userName}</span>
          <span class="comment-time">${createdAt}</span>
        </div>
        <div class="comment-content">${commentText}</div>
        ${deleteButton}
      </div>`;
    }).join('') || '<div class="comment">No comments yet</div>';

    // Update the comments list HTML
    commentsListContainer.innerHTML = comments;

    // Re-attach event listeners to new delete buttons
    const deleteButtons = commentsListContainer.querySelectorAll('.comment-delete');
    console.log('Re-attaching listeners to', deleteButtons.length, 'delete buttons');
    deleteButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const commentIndex = parseInt(button.getAttribute('data-comment-index'));
        console.log('Delete button clicked for comment index:', commentIndex);
        this.deleteComment(commentIndex);
      });
    });

    console.log('Comments section refreshed successfully');
  }

  populateForm(project) {
    if (!project) {
      console.error('No project data to populate form');
      return;
    }
    
    console.log('Populating form with project:', project);
    
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
      if (element) {
        element.value = value;
        console.log(`Set ${id} = ${value}`);
      } else {
        console.warn(`Element with id '${id}' not found`);
      }
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
    
    // Check authentication
    if (!authManager.isAuthenticated()) {
      this.showErrorMessage('You must be logged in to create or edit projects');
      return;
    }
    
    // Clear previous error states
    this.clearFormErrors();
    
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
      comments: this.currentProject?.comments || []
    };

    // Enhanced validation
    const validationErrors = this.validateProjectData(projectData);
    if (validationErrors.length > 0) {
      this.showValidationErrors(validationErrors);
      return;
    }

    // Show loading state
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn?.textContent;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    try {
      if (this.isEditMode && this.currentProject) {
        await projectStore.updateProject(this.currentProject.id, projectData);
        this.showSuccessMessage('Project updated successfully!');
      } else {
        await projectStore.addProject(projectData);
        this.showSuccessMessage('Project created successfully!');
      }
      
      setTimeout(() => this.closeModal(), 1000);
    } catch (error) {
      console.error('Save error:', error);
      this.showErrorMessage('Failed to save project. Please try again.');
    } finally {
      // Reset button state
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
      }
    }
  }

  validateProjectData(data) {
    const errors = [];

    // Required fields
    if (!data.title) {
      errors.push({ field: 'projectTitle', message: 'Project title is required' });
    }
    if (!data.mentor) {
      errors.push({ field: 'projectMentor', message: 'Mentor is required' });
    }

    // Progress validation
    if (data.progress < 0 || data.progress > 100) {
      errors.push({ field: 'projectProgress', message: 'Progress must be between 0 and 100' });
    }

    // Date validation
    if (data.startDate && data.dueDate) {
      const startDate = new Date(data.startDate);
      const dueDate = new Date(data.dueDate);
      if (startDate > dueDate) {
        errors.push({ field: 'dueDate', message: 'Due date cannot be before start date' });
      }
    }

    // URL validation for resources
    if (data.resources.length > 0) {
      const invalidUrls = data.resources.filter(url => {
        if (!url) return false;
        try {
          new URL(url);
          return false;
        } catch {
          return true;
        }
      });
      if (invalidUrls.length > 0) {
        errors.push({ field: 'projectResources', message: 'Please enter valid URLs for resources' });
      }
    }

    // Title length validation
    if (data.title && data.title.length > 100) {
      errors.push({ field: 'projectTitle', message: 'Title must be less than 100 characters' });
    }

    return errors;
  }

  clearFormErrors() {
    document.querySelectorAll('.form-error').forEach(error => error.remove());
    document.querySelectorAll('.form-control.error').forEach(input => {
      input.classList.remove('error');
    });
  }

  showValidationErrors(errors) {
    errors.forEach(error => {
      const field = document.getElementById(error.field);
      if (field) {
        field.classList.add('error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.textContent = error.message;
        field.parentNode.appendChild(errorDiv);
      }
    });
  }

  showSuccessMessage(message) {
    this.showNotification(message, 'success');
  }

  showErrorMessage(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
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
      this.resetModalState();
    }
  }

  closeDetailsModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
      
      // Only clear currentProject if we're not going into edit mode
      if (!this.isEditMode) {
        this.currentProject = null;
      }
    }
  }

  updateAuthModal(isRegister) {
    const authTitle = document.getElementById('authTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const displayNameGroup = document.getElementById('displayNameGroup');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    const toggleAuthMode = document.getElementById('toggleAuthMode');

    if (isRegister) {
      authTitle.textContent = 'Create Account';
      authSubmitBtn.textContent = 'Register';
      displayNameGroup.style.display = 'block';
      confirmPasswordGroup.style.display = 'block';
      toggleAuthMode.innerHTML = 'Already have an account? <span class="btn-link">Login</span>';
    } else {
      authTitle.textContent = 'Login';
      authSubmitBtn.textContent = 'Login';
      displayNameGroup.style.display = 'none';
      confirmPasswordGroup.style.display = 'none';
      toggleAuthMode.innerHTML = 'Don\'t have an account? <span class="btn-link">Register</span>';
    }
  }

  async handleAuthSubmit(e) {
    console.log('handleAuthSubmit called, isRegisterMode:', this.isRegisterMode);
    e.preventDefault();
    
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const authModal = document.getElementById('authModal');
    const authForm = document.getElementById('authForm');

    console.log('Email:', email, 'Password length:', password.length);

    if (this.isRegisterMode) {
      const displayName = document.getElementById('authDisplayName').value;
      const confirmPassword = document.getElementById('authConfirmPassword').value;

      // Validate passwords match
      if (password !== confirmPassword) {
        this.showErrorMessage('Passwords do not match');
        return;
      }

      // Register user
      const result = await authManager.register(email, password, displayName);
      if (result.success) {
        authModal.classList.add('hidden');
        authForm.reset();
        this.showSuccessMessage('Account created successfully! Welcome, ' + displayName);
      } else {
        this.showErrorMessage('Registration failed: ' + result.error);
      }
    } else {
      // Login user
      const result = await authManager.login(email, password);
      if (result.success) {
        authModal.classList.add('hidden');
        authForm.reset();
        this.showSuccessMessage('Logged in successfully!');
      } else {
        this.showErrorMessage('Login failed: ' + result.error);
      }
    }
  }

  resetModalState() {
    this.isEditMode = false;
    this.currentProject = null;
    
    // Reset modal title and button text
    const modalTitle = document.getElementById('modalTitle');
    const saveBtn = document.getElementById('saveBtn');
    
    if (modalTitle) modalTitle.textContent = 'Add New Project';
    if (saveBtn) {
      saveBtn.textContent = 'Save Project';
      saveBtn.disabled = false;
    }
    
    // Clear any error states
    this.clearFormErrors();
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

  async handleImport(files) {
    console.log('Starting import process with', files.length, 'files');
    
    // Check authentication
    if (!authManager.isAuthenticated()) {
      this.showErrorMessage('You must be logged in to import projects');
      return;
    }
    
    if (files.length === 0) {
      this.showErrorMessage('No files selected for import.');
      return;
    }

    let totalImported = 0;
    let totalErrors = 0;

    this.showSuccessMessage('Processing import files...');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log('Processing file:', file.name, 'Type:', file.type);

      try {
        const projects = await this.parseImportFile(file);
        console.log('Parsed projects from', file.name, ':', projects.length);

        if (projects.length > 0) {
          const imported = await this.importProjects(projects, file.name);
          totalImported += imported;
        } else {
          console.warn('No valid projects found in', file.name);
          totalErrors++;
        }
      } catch (error) {
        console.error('Error processing file', file.name, ':', error);
        totalErrors++;
      }
    }

    // Reset file input
    const importFileInput = document.getElementById('importFileInput');
    if (importFileInput) importFileInput.value = '';

    // Show results
    if (totalImported > 0) {
      this.showSuccessMessage(`Successfully imported ${totalImported} projects!`);
    }
    if (totalErrors > 0) {
      this.showErrorMessage(`${totalErrors} files had errors during import.`);
    }

    console.log('Import process completed. Imported:', totalImported, 'Errors:', totalErrors);
  }

  async parseImportFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          let workbook;

          if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            // Parse CSV
            workbook = XLSX.read(data, { type: 'string' });
          } else {
            // Parse Excel (xlsx, xls)
            workbook = XLSX.read(data, { type: 'array' });
          }

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          const projects = this.convertImportDataToProjects(jsonData);
          resolve(projects);
        } catch (error) {
          console.error('Error parsing file:', error);
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));

      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }

  convertImportDataToProjects(data) {
    console.log('Converting import data to projects:', data);
    
    if (data.length === 0) return [];

    // Get headers (first row)
    const headers = data[0].map(h => String(h || '').toLowerCase().trim());
    console.log('Headers found:', headers);

    // Map common column names to our fields
    const fieldMap = {
      'title': ['title', 'project title', 'name', 'project name'],
      'description': ['description', 'desc', 'details', 'project description'],
      'mentor': ['mentor', 'supervisor', 'guide', 'lead'],
      'assignees': ['assignees', 'assigned to', 'team', 'members', 'assignee'],
      'status': ['status', 'state', 'phase'],
      'progress': ['progress', 'completion', '%', 'percent', 'progress%'],
      'startDate': ['start date', 'startdate', 'start', 'begin date'],
      'dueDate': ['due date', 'duedate', 'due', 'end date', 'deadline']
    };

    // Find column indices for each field
    const columnIndices = {};
    Object.keys(fieldMap).forEach(field => {
      const possibleNames = fieldMap[field];
      const index = headers.findIndex(header => 
        possibleNames.some(name => header.includes(name))
      );
      if (index !== -1) {
        columnIndices[field] = index;
        console.log(`Mapped ${field} to column ${index} (${headers[index]})`);
      }
    });

    // Convert data rows to projects
    const projects = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      // Check if row has any data
      if (row.every(cell => !cell || String(cell).trim() === '')) continue;

      const project = {
        title: this.getFieldValue(row, columnIndices.title) || `Imported Project ${i}`,
        description: this.getFieldValue(row, columnIndices.description) || '',
        mentor: this.getFieldValue(row, columnIndices.mentor) || '',
        assignees: this.parseAssignees(this.getFieldValue(row, columnIndices.assignees)),
        status: this.normalizeStatus(this.getFieldValue(row, columnIndices.status)),
        progress: this.parseProgress(this.getFieldValue(row, columnIndices.progress)),
        startDate: this.parseDate(this.getFieldValue(row, columnIndices.startDate)),
        dueDate: this.parseDate(this.getFieldValue(row, columnIndices.dueDate)),
        resources: [],
        comments: []
      };

      projects.push(project);
      console.log('Created project:', project.title);
    }

    return projects;
  }

  getFieldValue(row, columnIndex) {
    if (columnIndex === undefined || columnIndex < 0 || columnIndex >= row.length) {
      return '';
    }
    const value = row[columnIndex];
    return value ? String(value).trim() : '';
  }

  parseAssignees(assigneeString) {
    if (!assigneeString) return [];
    return assigneeString
      .split(/[,;]/)
      .map(a => a.trim())
      .filter(a => a.length > 0);
  }

  normalizeStatus(status) {
    if (!status) return 'Planning';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('progress') || statusLower.includes('active') || statusLower.includes('ongoing')) {
      return 'In Progress';
    } else if (statusLower.includes('complete') || statusLower.includes('done') || statusLower.includes('finished')) {
      return 'Completed';
    } else if (statusLower.includes('review') || statusLower.includes('testing')) {
      return 'Review';
    } else if (statusLower.includes('plan') || statusLower.includes('start') || statusLower.includes('new')) {
      return 'Planning';
    }
    
    return status; // Return original if no match
  }

  parseProgress(progressString) {
    if (!progressString) return 0;
    
    const numStr = String(progressString).replace(/[^\d.]/g, '');
    const num = parseFloat(numStr);
    
    if (isNaN(num)) return 0;
    
    // If number is > 1, assume it's percentage, otherwise fraction
    return num > 1 ? Math.min(num, 100) : Math.min(num * 100, 100);
  }

  parseDate(dateString) {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      }
    } catch (error) {
      console.warn('Invalid date format:', dateString);
    }
    
    return '';
  }

  async importProjects(projects, fileName) {
    console.log('Importing', projects.length, 'projects from', fileName);
    
    let successCount = 0;
    
    for (const projectData of projects) {
      try {
        await projectStore.addProject(projectData);
        successCount++;
        console.log('Successfully imported project:', projectData.title);
      } catch (error) {
        console.error('Failed to import project:', projectData.title, error);
      }
    }
    
    console.log(`Import completed for ${fileName}. Success: ${successCount}/${projects.length}`);
    return successCount;
  }
}

// Initialize the application
new UIController();
