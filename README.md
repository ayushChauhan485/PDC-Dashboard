# PDC Project Dashboard

A modern, responsive web application for managing and tracking project development progress. Built with Firebase integration for real-time data synchronization and offline capability.

## Features

### 🎯 Core Functionality
- **Project Management**: Create, edit, delete, and track projects
- **Real-time Updates**: Live synchronization across multiple devices
- **Progress Tracking**: Visual progress indicators and status management
- **Search & Filtering**: Find projects by title, mentor, or status
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### 📊 Dashboard Analytics
- Total projects overview
- Active projects counter
- Completed projects tracking
- Overdue projects monitoring

### 🔧 Technical Features
- Firebase Realtime Database integration
- Offline functionality with local storage fallback
- Modern CSS with custom design system
- Responsive grid layout
- Modal-based project editing

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase Realtime Database
- **Hosting**: Firebase Hosting
- **Styling**: Custom CSS with CSS Variables
- **Icons**: SVG icons

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- Firebase CLI
- Modern web browser

### 1. Clone the Repository
```bash
git clone https://github.com/ayushChauhan485/PDC-Dashboard.git
cd PDC-Dashboard
```

### 2. Firebase Setup

#### Create Firebase Configuration
1. Copy the example config file:
   ```bash
   cp firebase-config.example.js firebase-config.js
   ```

2. Update `firebase-config.js` with your Firebase project details:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select existing one
   - Go to Project Settings → General → Your apps
   - Copy the config object and paste into `firebase-config.js`

**⚠️ Important**: The `firebase-config.js` file is gitignored for security. Never commit API keys to version control.

#### Firebase Database Setup
1. In Firebase Console, go to Realtime Database
2. Create a database in test mode
3. Set up basic security rules (optional)

### 3. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 4. Login to Firebase
```bash
firebase login
```

### 5. Start Local Development Server

#### Option A: Using Python (Recommended for quick setup)
```bash
python -m http.server 8080
```
Then open: http://localhost:8080

#### Option B: Using Firebase Hosting
```bash
firebase serve --port 3000
```
Then open: http://localhost:3000

### 6. Add Sample Data (Optional)
1. Open the application in your browser
2. Open browser developer console (F12)
3. Copy and paste the contents of `sample-data.js`
4. Press Enter to execute
5. Refresh the page to see sample projects

## Project Structure

```
PDC-Dashboard/
├── index.html          # Main HTML file
├── style.css           # Stylesheet with design system
├── app.js             # Main JavaScript application
├── firebase.json      # Firebase hosting configuration
├── sample-data.js     # Sample data for demonstration
├── README.md          # This file
└── LICENSE           # MIT License
```

## Usage

### Adding a New Project
1. Click the "Add Project" button in the header
2. Fill in the project details:
   - **Title** (required): Project name
   - **Description**: Brief project overview
   - **Mentor** (required): Supervising mentor name
   - **Assignees**: Team members (comma-separated)
   - **Status**: Current project status
   - **Progress**: Completion percentage
   - **Start/Due Dates**: Project timeline
   - **Resources**: Relevant URLs or documentation links

### Managing Projects
- **View Details**: Click on any project card to see full details
- **Edit Project**: Use the edit button in project details modal
- **Delete Project**: Use the delete button (with confirmation)
- **Search**: Use the search bar to find specific projects
- **Filter**: Use status and mentor filters for refined views

### Dashboard Statistics
The top section shows real-time statistics:
- **Total Projects**: All projects in the system
- **Active**: Projects with "Planning" or "In Progress" status
- **Completed**: Projects marked as "Completed"
- **Overdue**: Projects past their due date

## Firebase Configuration

The application uses Firebase Realtime Database with the following structure:
```json
{
  "projects": {
    "projectId": {
      "id": "unique-project-id",
      "title": "Project Title",
      "description": "Project description",
      "mentor": "Mentor Name",
      "assignees": ["assignee1", "assignee2"],
      "status": "In Progress",
      "progress": 50,
      "startDate": "2025-01-01",
      "dueDate": "2025-06-01",
      "resources": ["url1", "url2"],
      "createdAt": 1640995200000,
      "lastUpdated": 1640995200000,
      "comments": []
    }
  }
}
```

## Customization

### Design System
The application uses CSS custom properties for theming. Key variables are defined in `:root`:
- Color tokens for consistent theming
- Typography scales
- Spacing system
- Component-specific styles

### Adding New Features
1. Extend the project data model in `app.js`
2. Update the form HTML in `index.html`
3. Modify the CSS for styling
4. Update Firebase security rules if needed

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

---

**Note**: This application requires an internet connection for Firebase features. It will fall back to local storage when offline, but data synchronization requires connectivity.