// Global Variables
let currentUser = null;
let students = [];
let applications = [];
let notifications = [];
let currentApplicationId = null;

// Chat Variables
let chatMessages = [];
let chatIsOpen = false;
let chatIsMinimized = false;
let unreadMessageCount = 0;

// Sample Data (In a real application, this would come from a backend)
const sampleStudents = [
    {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        studentId: "STU001",
        email: "john.doe@email.com",
        course: "Computer Science",
        year: "3rd",
        status: "active",
        registrationDate: "2024-01-15",
        applicationStatus: "approved"
    },
    {
        id: 2,
        firstName: "Jane",
        lastName: "Smith",
        studentId: "STU002",
        email: "jane.smith@email.com",
        course: "Business Administration",
        year: "2nd",
        status: "active",
        registrationDate: "2024-02-20",
        applicationStatus: "pending"
    }
];

const sampleApplications = [
    {
        id: 1,
        studentId: 1,
        documentType: "Student ID",
        fileName: "student_id.pdf",
        notes: "Submitted for semester subsidy",
        status: "approved",
        submittedDate: "2024-01-16",
        reviewedDate: "2024-01-18",
        reviewerNotes: "Approved after verification"
    },
    {
        id: 2,
        studentId: 2,
        documentType: "Certificate of Registration",
        fileName: "cor.pdf",
        notes: "Need financial assistance",
        status: "pending",
        submittedDate: "2024-02-21",
        reviewedDate: null,
        reviewerNotes: null
    }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Load sample data
    students = [...sampleStudents];
    applications = [...sampleApplications];
    
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    } else {
        showHome();
    }
    
    // Generate sample notifications
    generateSampleNotifications();
}

// Navigation Functions
function showHome() {
    hideAllSections();
    document.getElementById('home').classList.add('active');
    updateNavigation();
}

function showLogin() {
    hideAllSections();
    document.getElementById('login').classList.add('active');
    updateNavigation();
}

function showRegister() {
    hideAllSections();
    document.getElementById('register').classList.add('active');
    updateNavigation();
}

function showDashboard() {
    hideAllSections();
    if (currentUser && currentUser.role === 'admin') {
        document.getElementById('admin-dashboard').classList.add('active');
        loadAdminDashboard();
    } else {
        document.getElementById('student-dashboard').classList.add('active');
        loadStudentDashboard();
    }
    updateNavigation();
}

function hideAllSections() {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
}

function updateNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.style.display = 'block';
    });
    
    if (currentUser) {
        document.querySelector('.nav-link[onclick="showHome()"]').style.display = 'none';
        document.querySelector('.nav-link[onclick="showLogin()"]').style.display = 'none';
        document.querySelector('.nav-link[onclick="showRegister()"]').style.display = 'none';
    } else {
        document.querySelector('.nav-link[onclick="showHome()"]').style.display = 'block';
        document.querySelector('.nav-link[onclick="showLogin()"]').style.display = 'block';
        document.querySelector('.nav-link[onclick="showRegister()"]').style.display = 'block';
    }
}

// Authentication Functions
function handleRegister(event) {
    event.preventDefault();
    
    const formData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        studentId: document.getElementById('studentId').value,
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value,
        confirmPassword: document.getElementById('confirmPassword').value,
        course: document.getElementById('course').value,
        year: document.getElementById('year').value
    };
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    // Check if email already exists
    if (students.find(s => s.email === formData.email)) {
        showToast('Email already registered', 'error');
        return;
    }
    
    // Check if student ID already exists
    if (students.find(s => s.studentId === formData.studentId)) {
        showToast('Student ID already registered', 'error');
        return;
    }
    
    // Create new student
    const newStudent = {
        id: students.length + 1,
        firstName: formData.firstName,
        lastName: formData.lastName,
        studentId: formData.studentId,
        email: formData.email,
        password: formData.password, // In real app, this should be hashed
        course: formData.course,
        year: formData.year,
        status: 'active',
        registrationDate: new Date().toISOString().split('T')[0],
        applicationStatus: 'none'
    };
    
    students.push(newStudent);
    showToast('Registration successful! Please login.', 'success');
    showLogin();
}

function handleLogin(event) {
    event.preventDefault();
    
    const role = document.getElementById('loginRole').value;
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (role === 'admin') {
        // Admin login (hardcoded for demo)
        if (email === 'admin@grantes.com' && password === 'admin123') {
            currentUser = {
                id: 'admin',
                name: 'Administrator',
                email: email,
                role: 'admin'
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showToast('Login successful!', 'success');
            showDashboard();
        } else {
            showToast('Invalid admin credentials', 'error');
        }
    } else if (role === 'student') {
        // Student login
        const student = students.find(s => s.email === email && s.password === password);
        if (student) {
            currentUser = {
                id: student.id,
                name: `${student.firstName} ${student.lastName}`,
                email: student.email,
                role: 'student',
                studentData: student
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showToast('Login successful!', 'success');
            showDashboard();
        } else {
            showToast('Invalid credentials', 'error');
        }
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showToast('Logged out successfully', 'success');
    showHome();
}

// Student Dashboard Functions
function loadStudentDashboard() {
    const student = currentUser.studentData;
    
    // Update dashboard header
    document.getElementById('studentName').textContent = student.firstName + ' ' + student.lastName;
    
    // Update stats
    document.getElementById('applicationStatus').textContent = 
        student.applicationStatus === 'none' ? 'Not Submitted' : 
        student.applicationStatus.charAt(0).toUpperCase() + student.applicationStatus.slice(1);
    
    // Update notification count
    const studentNotifications = notifications.filter(n => n.studentId === student.id);
    document.getElementById('notificationCount').textContent = studentNotifications.length;
    
    // Load profile information
    loadStudentProfile();
    
    // Load notifications
    loadStudentNotifications();
    
    // Initialize chat
    initializeChat();
}

function loadStudentProfile() {
    const student = currentUser.studentData;
    
    document.getElementById('profileName').textContent = `${student.firstName} ${student.lastName}`;
    document.getElementById('profileStudentId').textContent = student.studentId;
    document.getElementById('profileEmail').textContent = student.email;
    document.getElementById('profileCourse').textContent = student.course;
    document.getElementById('profileYear').textContent = student.year;
    document.getElementById('profileStatus').textContent = 
        student.applicationStatus === 'none' ? 'Not Submitted' : 
        student.applicationStatus.charAt(0).toUpperCase() + student.applicationStatus.slice(1);
}

function loadStudentNotifications() {
    const container = document.getElementById('notificationsContainer');
    const studentNotifications = notifications.filter(n => n.studentId === currentUser.studentData.id);
    
    if (studentNotifications.length === 0) {
        container.innerHTML = '<p class="no-notifications">No notifications yet.</p>';
        return;
    }
    
    container.innerHTML = studentNotifications.map(notification => `
        <div class="notification-item ${notification.read ? '' : 'unread'}">
            <h4>${notification.title}</h4>
            <p>${notification.message}</p>
            <div class="timestamp">${formatDate(notification.date)}</div>
        </div>
    `).join('');
}

function submitApplication(event) {
    event.preventDefault();
    
    const documentType = document.getElementById('documentType').value;
    const fileUpload = document.getElementById('fileUpload').files[0];
    const notes = document.getElementById('applicationNotes').value;
    
    if (!fileUpload) {
        showToast('Please select a file to upload', 'error');
        return;
    }
    
    // Create new application
    const newApplication = {
        id: applications.length + 1,
        studentId: currentUser.studentData.id,
        documentType: documentType,
        fileName: fileUpload.name,
        notes: notes,
        status: 'pending',
        submittedDate: new Date().toISOString().split('T')[0],
        reviewedDate: null,
        reviewerNotes: null
    };
    
    applications.push(newApplication);
    
    // Update student status
    const studentIndex = students.findIndex(s => s.id === currentUser.studentData.id);
    students[studentIndex].applicationStatus = 'pending';
    currentUser.studentData.applicationStatus = 'pending';
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Add notification
    addNotification(currentUser.studentData.id, 'Application Submitted', 
        'Your subsidy application has been submitted and is under review.');
    
    showToast('Application submitted successfully!', 'success');
    
    // Reset form
    document.getElementById('applicationNotes').value = '';
    document.getElementById('fileUpload').value = '';
    document.getElementById('documentType').value = '';
    
    // Reload dashboard
    loadStudentDashboard();
}

// Student Tab Functions
function showStudentTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('#student-dashboard .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab panels
    document.querySelectorAll('#student-dashboard .tab-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Admin Dashboard Functions
function loadAdminDashboard() {
    // Update stats
    document.getElementById('totalStudents').textContent = students.length;
    document.getElementById('totalApproved').textContent = 
        students.filter(s => s.applicationStatus === 'approved').length;
    document.getElementById('totalPending').textContent = 
        students.filter(s => s.applicationStatus === 'pending').length;
    document.getElementById('totalArchived').textContent = 
        students.filter(s => s.status === 'archived').length;
    
    // Load applications
    loadApplications();
    
    // Load students
    loadStudents();
    
    // Initialize chat
    initializeChat();
}

function loadApplications() {
    const container = document.getElementById('applicationsContainer');
    const filteredApplications = filterApplicationsByStatus();
    
    if (filteredApplications.length === 0) {
        container.innerHTML = '<p class="no-data">No applications found.</p>';
        return;
    }
    
    container.innerHTML = filteredApplications.map(app => {
        const student = students.find(s => s.id === app.studentId);
        return `
            <div class="application-item">
                <div class="application-header">
                    <h4>${student.firstName} ${student.lastName}</h4>
                    <span class="status-badge status-${app.status}">${app.status}</span>
                </div>
                <div class="application-info">
                    <div class="info-item">
                        <span class="info-label">Student ID</span>
                        <span class="info-value">${student.studentId}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Document Type</span>
                        <span class="info-value">${app.documentType}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Submitted Date</span>
                        <span class="info-value">${formatDate(app.submittedDate)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Status</span>
                        <span class="info-value">${app.status}</span>
                    </div>
                </div>
                <div class="application-actions">
                    ${app.status === 'pending' ? 
                        `<button class="btn btn-primary" onclick="reviewApplication(${app.id})">Review</button>` : 
                        `<button class="btn btn-secondary" onclick="viewApplicationDetails(${app.id})">View Details</button>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

function loadStudents() {
    const container = document.getElementById('studentsContainer');
    const filteredStudents = filterStudentsByStatus();
    
    if (filteredStudents.length === 0) {
        container.innerHTML = '<p class="no-data">No students found.</p>';
        return;
    }
    
    container.innerHTML = filteredStudents.map(student => {
        return `
            <div class="student-item">
                <div class="student-header">
                    <h4>${student.firstName} ${student.lastName}</h4>
                    <span class="status-badge status-${student.status}">${student.status}</span>
                </div>
                <div class="student-info">
                    <div class="info-item">
                        <span class="info-label">Student ID</span>
                        <span class="info-value">${student.studentId}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Email</span>
                        <span class="info-value">${student.email}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Course</span>
                        <span class="info-value">${student.course}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Year</span>
                        <span class="info-value">${student.year}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Application Status</span>
                        <span class="info-value">${student.applicationStatus}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Registration Date</span>
                        <span class="info-value">${formatDate(student.registrationDate)}</span>
                    </div>
                </div>
                <div class="student-actions">
                    <button class="btn btn-primary" onclick="sendMessageToStudent(${student.id})">Send Message</button>
                    ${student.status === 'active' ? 
                        `<button class="btn btn-secondary" onclick="archiveStudent(${student.id})">Archive</button>` : 
                        `<button class="btn btn-success" onclick="activateStudent(${student.id})">Activate</button>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

// Admin Tab Functions
function showAdminTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('#admin-dashboard .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab panels
    document.querySelectorAll('#admin-dashboard .tab-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Load tab-specific content
    if (tabName === 'reports') {
        loadReports();
    }
}

function loadReports() {
    // Simple chart implementation (in a real app, you'd use a charting library)
    const applicationChart = document.getElementById('applicationChart');
    const trendChart = document.getElementById('trendChart');
    
    if (applicationChart && trendChart) {
        drawSimpleChart(applicationChart, {
            approved: students.filter(s => s.applicationStatus === 'approved').length,
            pending: students.filter(s => s.applicationStatus === 'pending').length,
            rejected: students.filter(s => s.applicationStatus === 'rejected').length
        });
        
        drawSimpleChart(trendChart, {
            jan: 5,
            feb: 8,
            mar: 12,
            apr: 15
        });
    }
}

function drawSimpleChart(canvas, data) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const maxValue = Math.max(...Object.values(data));
    const barWidth = width / Object.keys(data).length - 10;
    
    Object.entries(data).forEach(([key, value], index) => {
        const barHeight = (value / maxValue) * (height - 40);
        const x = index * (barWidth + 10) + 5;
        const y = height - barHeight - 20;
        
        ctx.fillStyle = `hsl(${index * 120}, 70%, 50%)`;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(key, x + barWidth/2, height - 5);
        ctx.fillText(value.toString(), x + barWidth/2, y - 5);
    });
}

// Application Management Functions
function reviewApplication(applicationId) {
    const application = applications.find(a => a.id === applicationId);
    const student = students.find(s => s.id === application.studentId);
    
    currentApplicationId = applicationId;
    
    document.getElementById('applicationDetails').innerHTML = `
        <div class="application-details">
            <h4>Application Details</h4>
            <div class="detail-row">
                <strong>Student:</strong> ${student.firstName} ${student.lastName} (${student.studentId})
            </div>
            <div class="detail-row">
                <strong>Document Type:</strong> ${application.documentType}
            </div>
            <div class="detail-row">
                <strong>File:</strong> ${application.fileName}
            </div>
            <div class="detail-row">
                <strong>Notes:</strong> ${application.notes || 'No additional notes'}
            </div>
            <div class="detail-row">
                <strong>Submitted:</strong> ${formatDate(application.submittedDate)}
            </div>
        </div>
    `;
    
    document.getElementById('reviewModal').style.display = 'block';
}

function updateApplicationStatus(status) {
    if (!currentApplicationId) return;
    
    const applicationIndex = applications.findIndex(a => a.id === currentApplicationId);
    const studentIndex = students.findIndex(s => s.id === applications[applicationIndex].studentId);
    
    // Update application
    applications[applicationIndex].status = status;
    applications[applicationIndex].reviewedDate = new Date().toISOString().split('T')[0];
    applications[applicationIndex].reviewerNotes = status === 'approved' ? 'Application approved' : 'Application rejected';
    
    // Update student status
    students[studentIndex].applicationStatus = status;
    
    // Add notification
    const student = students[studentIndex];
    addNotification(student.id, 
        status === 'approved' ? 'Application Approved' : 'Application Rejected',
        status === 'approved' ? 
            'Congratulations! Your subsidy application has been approved.' :
            'Your subsidy application has been rejected. Please contact the office for more information.'
    );
    
    closeModal();
    loadApplications();
    loadAdminDashboard(); // Refresh stats
    
    showToast(`Application ${status} successfully!`, 'success');
}

function viewApplicationDetails(applicationId) {
    const application = applications.find(a => a.id === applicationId);
    const student = students.find(s => s.id === application.studentId);
    
    alert(`Application Details:\n\nStudent: ${student.firstName} ${student.lastName}\nDocument: ${application.documentType}\nStatus: ${application.status}\nSubmitted: ${formatDate(application.submittedDate)}\nReviewed: ${application.reviewedDate ? formatDate(application.reviewedDate) : 'Not reviewed'}\nNotes: ${application.notes || 'None'}`);
}

// Student Management Functions
function sendMessageToStudent(studentId) {
    const message = prompt('Enter your message:');
    if (message) {
        const student = students.find(s => s.id === studentId);
        addNotification(studentId, 'Message from Admin', message);
        showToast('Message sent successfully!', 'success');
    }
}

function archiveStudent(studentId) {
    if (confirm('Are you sure you want to archive this student?')) {
        const studentIndex = students.findIndex(s => s.id === studentId);
        students[studentIndex].status = 'archived';
        loadStudents();
        loadAdminDashboard();
        showToast('Student archived successfully!', 'success');
    }
}

function activateStudent(studentId) {
    const studentIndex = students.findIndex(s => s.id === studentId);
    students[studentIndex].status = 'active';
    loadStudents();
    loadAdminDashboard();
    showToast('Student activated successfully!', 'success');
}

// Filter Functions
function filterApplications() {
    loadApplications();
}

function filterApplicationsByStatus() {
    const statusFilter = document.getElementById('statusFilter').value;
    const searchTerm = document.getElementById('searchStudents').value.toLowerCase();
    
    let filtered = applications;
    
    if (statusFilter) {
        filtered = filtered.filter(app => app.status === statusFilter);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(app => {
            const student = students.find(s => s.id === app.studentId);
            return student.firstName.toLowerCase().includes(searchTerm) || 
                   student.lastName.toLowerCase().includes(searchTerm) ||
                   student.studentId.toLowerCase().includes(searchTerm);
        });
    }
    
    return filtered;
}

function searchApplications() {
    loadApplications();
}

function filterStudents() {
    loadStudents();
}

function filterStudentsByStatus() {
    const statusFilter = document.getElementById('studentStatusFilter').value;
    const searchTerm = document.getElementById('searchStudentRecords').value.toLowerCase();
    
    let filtered = students;
    
    if (statusFilter) {
        filtered = filtered.filter(student => student.status === statusFilter);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(student => 
            student.firstName.toLowerCase().includes(searchTerm) ||
            student.lastName.toLowerCase().includes(searchTerm) ||
            student.studentId.toLowerCase().includes(searchTerm) ||
            student.email.toLowerCase().includes(searchTerm)
        );
    }
    
    return filtered;
}

function searchStudents() {
    loadStudents();
}

// Settings Functions
function updateSettings() {
    const subsidyTypes = document.getElementById('subsidyTypes').value;
    const systemMessage = document.getElementById('systemMessage').value;
    
    // In a real app, this would save to backend
    showToast('Settings updated successfully!', 'success');
}

function generateReport() {
    // In a real app, this would generate a PDF or Excel report
    showToast('Report generated successfully!', 'success');
}

// Notification Functions
function addNotification(studentId, title, message) {
    const notification = {
        id: notifications.length + 1,
        studentId: studentId,
        title: title,
        message: message,
        date: new Date().toISOString(),
        read: false
    };
    
    notifications.push(notification);
}

function generateSampleNotifications() {
    // Generate some sample notifications
    if (notifications.length === 0) {
        addNotification(1, 'Welcome!', 'Welcome to GranTES Smart Subsidy Management System');
        addNotification(2, 'Application Received', 'Your application has been received and is under review');
    }
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('notificationToast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
        setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function closeModal() {
    document.getElementById('reviewModal').style.display = 'none';
    currentApplicationId = null;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('reviewModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Export data functions (for demo purposes)
function exportStudents() {
    const dataStr = JSON.stringify(students, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students.json';
    link.click();
}

function exportApplications() {
    const dataStr = JSON.stringify(applications, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'applications.json';
    link.click();
}

// Chat Functions
function toggleChat() {
    const chatBox = document.getElementById('chatBox');
    const chatToggle = document.getElementById('chatToggle');
    
    if (chatIsOpen) {
        closeChat();
    } else {
        openChat();
    }
}

function openChat() {
    const chatBox = document.getElementById('chatBox');
    chatBox.classList.add('show');
    chatIsOpen = true;
    chatIsMinimized = false;
    
    // Clear unread count
    unreadMessageCount = 0;
    updateChatBadge();
    
    // Load chat messages
    loadChatMessages();
    
    // Focus on input
    setTimeout(() => {
        document.getElementById('chatInput').focus();
    }, 300);
}

function closeChat() {
    const chatBox = document.getElementById('chatBox');
    chatBox.classList.remove('show');
    chatIsOpen = false;
    chatIsMinimized = false;
}

function toggleChatMinimize() {
    const chatBox = document.getElementById('chatBox');
    chatIsMinimized = !chatIsMinimized;
    
    if (chatIsMinimized) {
        chatBox.classList.add('minimized');
    } else {
        chatBox.classList.remove('minimized');
    }
}

function loadChatMessages() {
    const container = document.getElementById('chatMessages');
    
    // Clear welcome message if there are chat messages
    if (chatMessages.length > 0) {
        container.innerHTML = '';
        
        chatMessages.forEach(message => {
            addMessageToChat(message);
        });
    }
    
    scrollChatToBottom();
}

function addMessageToChat(message) {
    const container = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.sender === 'user' ? 'sent' : 'received'}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            ${message.sender === 'user' ? 
                (currentUser && currentUser.role === 'student' ? 'S' : 'A') : 
                (message.sender === 'admin' ? 'A' : 'S')
            }
        </div>
        <div class="message-content">
            <div>${message.text}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    container.appendChild(messageDiv);
    scrollChatToBottom();
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    const userMessage = {
        id: Date.now(),
        text: message,
        sender: 'user',
        timestamp: new Date().toISOString(),
        userId: currentUser ? currentUser.id : 'anonymous'
    };
    
    chatMessages.push(userMessage);
    addMessageToChat(userMessage);
    
    // Clear input
    input.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    // Simulate admin response (in real app, this would be a server call)
    setTimeout(() => {
        hideTypingIndicator();
        simulateAdminResponse(message);
    }, 1000 + Math.random() * 2000);
}

function simulateAdminResponse(userMessage) {
    const responses = [
        "Thank you for your message. How can I help you today?",
        "I understand your concern. Let me look into that for you.",
        "That's a great question. Let me provide you with the information you need.",
        "I'm here to help. Could you provide more details about your request?",
        "Thank you for contacting us. I'll get back to you with a solution shortly.",
        "I appreciate you reaching out. Let me assist you with that.",
        "I understand. Let me check your application status and get back to you.",
        "That's a valid concern. I'll review your case and respond accordingly.",
        "Thank you for your patience. I'm working on resolving this for you.",
        "I'm here to support you. Let me provide you with the guidance you need."
    ];
    
    const adminResponse = {
        id: Date.now() + 1,
        text: responses[Math.floor(Math.random() * responses.length)],
        sender: 'admin',
        timestamp: new Date().toISOString()
    };
    
    chatMessages.push(adminResponse);
    addMessageToChat(adminResponse);
    
    // Update unread count if chat is closed
    if (!chatIsOpen) {
        unreadMessageCount++;
        updateChatBadge();
    }
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

function showTypingIndicator() {
    const container = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'typing-indicator show';
    typingDiv.innerHTML = `
        <div class="message received">
            <div class="message-avatar">A</div>
            <div class="message-content">
                <div>Admin is typing<span class="typing-dots">.</span><span class="typing-dots">.</span><span class="typing-dots">.</span></div>
            </div>
        </div>
    `;
    
    container.appendChild(typingDiv);
    scrollChatToBottom();
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function scrollChatToBottom() {
    const container = document.getElementById('chatMessages');
    container.scrollTop = container.scrollHeight;
}

function updateChatBadge() {
    const badge = document.getElementById('chatBadge');
    if (unreadMessageCount > 0) {
        badge.textContent = unreadMessageCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function sendMessageToStudent(studentId) {
    const message = prompt('Enter your message:');
    if (message) {
        const student = students.find(s => s.id === studentId);
        
        // Add message to chat history
        const adminMessage = {
            id: Date.now(),
            text: message,
            sender: 'admin',
            timestamp: new Date().toISOString(),
            studentId: studentId
        };
        
        // Find existing chat or create new one
        let existingChat = chatMessages.filter(m => m.studentId === studentId);
        if (existingChat.length === 0) {
            chatMessages.push(adminMessage);
        }
        
        addNotification(studentId, 'Message from Admin', message);
        showToast('Message sent successfully!', 'success');
        
        // If chat is open for this student, add the message
        if (chatIsOpen) {
            addMessageToChat(adminMessage);
        }
    }
}

// Initialize chat when user logs in
function initializeChat() {
    if (currentUser) {
        // Show chat toggle for logged in users
        document.getElementById('chatToggle').style.display = 'flex';
        
        // Set appropriate chat header based on user role
        const chatUserName = document.getElementById('chatUserName');
        if (currentUser.role === 'admin') {
            chatUserName.textContent = 'Student Support';
        } else {
            chatUserName.textContent = 'Admin Support';
        }
    } else {
        document.getElementById('chatToggle').style.display = 'none';
    }
}