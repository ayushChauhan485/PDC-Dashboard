// Sample data script for PDC Dashboard
// Run this in the browser console to add demo projects

const sampleProjects = [
  {
    title: "E-Commerce Platform Development",
    description: "Building a modern e-commerce platform with React, Node.js, and MongoDB. Features include user authentication, product catalog, shopping cart, and payment integration.",
    mentor: "Dr. Sarah Johnson",
    assignees: ["Alice Smith", "Bob Wilson", "Carol Brown"],
    status: "In Progress",
    progress: 65,
    startDate: "2025-01-15",
    dueDate: "2025-04-30",
    resources: [
      "https://github.com/team/ecommerce-project",
      "https://docs.mongodb.com/",
      "https://reactjs.org/docs/"
    ]
  },
  {
    title: "Machine Learning Chatbot",
    description: "Developing an AI-powered customer service chatbot using Python, TensorFlow, and natural language processing techniques.",
    mentor: "Prof. Michael Chen",
    assignees: ["David Lee", "Emma Davis"],
    status: "Planning",
    progress: 20,
    startDate: "2025-02-01",
    dueDate: "2025-06-15",
    resources: [
      "https://tensorflow.org/tutorials",
      "https://huggingface.co/transformers/",
      "https://spacy.io/usage/spacy-101"
    ]
  },
  {
    title: "Mobile Fitness App",
    description: "Cross-platform mobile application for fitness tracking with React Native, including workout plans, progress tracking, and social features.",
    mentor: "Dr. Lisa Rodriguez",
    assignees: ["Frank Miller", "Grace Taylor", "Henry Clark"],
    status: "Review",
    progress: 85,
    startDate: "2024-11-01",
    dueDate: "2025-03-15",
    resources: [
      "https://reactnative.dev/docs/getting-started",
      "https://expo.dev/",
      "https://firebase.google.com/docs/auth"
    ]
  }
];

// Function to add sample projects
async function addSampleProjects() {
  console.log('Adding sample projects...');
  
  for (const project of sampleProjects) {
    try {
      await projectStore.addProject(project);
      console.log(`✅ Added project: ${project.title}`);
    } catch (error) {
      console.error(`❌ Failed to add project ${project.title}:`, error);
    }
  }
  
  console.log('🎉 Sample projects added successfully!');
  console.log('Try clicking on a project card and then the Edit button to test the edit functionality.');
}

// Auto-run the function
console.log('🚀 Loading sample data...');
addSampleProjects();