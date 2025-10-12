// Global Variables
let currentUser = null;
let students = [];
let applications = [];
let notifications = [];
let currentApplicationId = null;
let adminPosts = [];

// Chat Variables
let chatMessages = [];
let chatIsOpen = false;
let chatIsMinimized = false;
let unreadMessageCount = 0;

// Persist chat to localStorage so admin messages appear for students later
function loadPersistedChatMessages() {
    try {s
        const stored = localStorage.getItem('chatMessages');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                chatMessages = parsed;
            }
        }
    } catch (e) {
        // ignore parse errors
    }
}

function persistChatMessages() {
    try {
        localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
    } catch (e) {
        // ignore storage errors
    }
}

// Profile Chat Variables
let profileChatMessages = [];
let profileChatIsExpanded = false;
let profileChatPendingFile = null;

let adminActiveChatStudentId = null;



// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Load sample data
    students = [...sampleStudents];
    applications = [...sampleApplications];
    loadPersistedChatMessages();
    
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
        document.getElementById('student-homepage').classList.add('active');
        loadStudentHomepage();
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
    const emailRaw = document.getElementById('loginEmail').value;
    const passwordRaw = document.getElementById('loginPassword').value;
    const email = (emailRaw || '').trim().toLowerCase();
    const password = (passwordRaw || '').trim();
    
    // First, accept admin credentials regardless of selected role to avoid UX issues
    if ((email === 'admin@grantes.com' || email === 'admin@grantes.local') && password === 'admin123') {
        currentUser = {
            id: 'admin',
            name: 'Administrator',
            email: email,
            role: 'admin'
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showToast('Login successful!', 'success');
        showDashboard();
        return;
    }

    if (role === 'admin') {
        // Admin login (hardcoded for demo)
        if ((email === 'admin@grantes.com' || email === 'admin@grantes.local') && password === 'admin123') {
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
        // Student login - check both email and award number
        const awardNumber = document.getElementById('loginAwardNumber').value.trim();
        
        // Load students from localStorage (including admin-created ones)
        const allStudents = JSON.parse(localStorage.getItem('students') || '[]');
        const combinedStudents = [...students, ...allStudents];
        
        const student = combinedStudents.find(s => {
            const sEmail = (s.email || '').trim().toLowerCase();
            const sAwardNumber = (s.awardNumber || '').trim();
            const sPass = (s.password || '').trim();
            
            // Check if login is by email or award number
            if (email && sEmail === email) {
                return sPass === password;
            } else if (awardNumber && sAwardNumber === awardNumber) {
                return sPass === password;
            }
            return false;
        });
        
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
            showToast('Invalid credentials. Please check your award number/email and password.', 'error');
        }
    } else {
        showToast('Please select a role and try again', 'error');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showToast('Logged out successfully', 'success');
    showHome();
}

// Student Homepage Functions
function loadStudentHomepage() {
    const student = currentUser.studentData;
    
    // Update header
    document.getElementById('studentName').textContent = student.firstName + ' ' + student.lastName;
    
    // Update notification count
    const studentNotifications = notifications.filter(n => n.studentId === student.id);
    document.getElementById('studentNotificationCount').textContent = studentNotifications.length;
    
    // Update message count
    const studentMessages = JSON.parse(localStorage.getItem('studentMessages') || '[]');
    const unreadMessages = studentMessages.filter(m => m.studentId === student.id && m.sender === 'admin' && !m.read);
    document.getElementById('studentMessageCount').textContent = unreadMessages.length;
    
    // Load profile information
    loadStudentProfile();
    
    // Load announcements
    loadStudentAnnouncements();
    
    // Load messages
    loadStudentMessages();
    
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
    document.getElementById('profileAwardNumber').textContent = student.awardNumber || 'Not assigned';
    document.getElementById('profileStatus').textContent = 
        student.applicationStatus === 'none' ? 'Not Submitted' : 
        student.applicationStatus.charAt(0).toUpperCase() + student.applicationStatus.slice(1);
}

function loadStudentAnnouncements() {
    const adminPosts = JSON.parse(localStorage.getItem('adminPosts') || '[]');
    const container = document.getElementById('studentAnnouncementsFeed');
    
    if (adminPosts.length === 0) {
        container.innerHTML = `
            <div class="no-posts">
                <i class="fas fa-newspaper"></i>
                <h4>No announcements yet</h4>
                <p>The administration hasn't posted any announcements yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = adminPosts.map(post => {
        const comments = JSON.parse(localStorage.getItem('studentComments') || '[]');
        const postComments = comments.filter(comment => comment.postId === post.id);
        
        return `
            <div class="post-card">
                <div class="post-header">
                    <div class="post-author-avatar">
                        <i class="fas fa-user-shield"></i>
                    </div>
                    <div class="post-author-info">
                        <h4>${post.author}</h4>
                        <p>${formatDate(post.timestamp)}</p>
                    </div>
                </div>
                <div class="post-content">
                    <div class="post-text">${post.content}</div>
                </div>
                <div class="post-actions">
                    <button class="post-action-btn ${post.liked ? 'liked' : ''}" onclick="togglePostLike(${post.id})">
                        <i class="fas fa-heart"></i>
                        <span>${post.likes}</span>
                    </button>
                    <button class="post-action-btn" onclick="toggleComments(${post.id})">
                        <i class="fas fa-comment"></i>
                        <span>${postComments.length}</span>
                    </button>
                </div>
                <div class="comments-section" id="comments-${post.id}" style="display: none;">
                    <div class="comment-form">
                        <input type="text" class="comment-input" placeholder="Write a comment..." id="commentInput-${post.id}">
                        <button class="comment-btn" onclick="addComment(${post.id})">Comment</button>
                    </div>
                    <div class="comments-list" id="commentsList-${post.id}">
                        ${renderComments(postComments)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function loadStudentMessages() {
    const studentMessages = JSON.parse(localStorage.getItem('studentMessages') || '[]');
    const student = currentUser.studentData;
    const studentThread = studentMessages.filter(m => m.studentId === student.id);
    const container = document.getElementById('studentChatMessages');
    
    if (studentThread.length === 0) {
        container.innerHTML = `
            <div class="no-messages">
                <i class="fas fa-comments"></i>
                <h4>No messages yet</h4>
                <p>Start a conversation with the administration team.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = studentThread.map(message => `
        <div class="message-item ${message.sender === 'student' ? 'sent' : 'received'}">
            <div class="message-avatar">
                ${message.sender === 'student' ? 'S' : 'A'}
            </div>
            <div class="message-bubble">
                <div class="message-text">${message.text}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            </div>
        </div>
    `).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
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
    
    const idPicture = document.getElementById('idPictureUpload').files[0];
    const idNumber = document.getElementById('idNumber').value.trim();
    const cor = document.getElementById('corUpload').files[0];
    const notes = document.getElementById('applicationNotes').value;
    
    // Require at least one file
    if (!idPicture && !cor) {
        showToast('Please upload at least one document (ID Picture or COR)', 'error');
        return;
    }

    // Build a single application bundling provided documents
    const attachedDocuments = [];
    let combinedTypeLabels = [];
    let representativeFileName = 'Multiple files';

    if (idPicture) {
        combinedTypeLabels.push('ID Picture');
        attachedDocuments.push({ type: 'ID Picture', fileName: idPicture.name, fileDataUrl: null });
        representativeFileName = idPicture.name;
    }
    if (cor) {
        combinedTypeLabels.push('COR');
        attachedDocuments.push({ type: 'COR', fileName: cor.name, fileDataUrl: null });
        representativeFileName = idPicture ? 'Multiple files' : cor.name;
    }
    if (idNumber) {
        combinedTypeLabels.push('ID Number');
    }

    const newApplication = {
        id: applications.length + 1,
        studentId: currentUser.studentData.id,
        documentType: combinedTypeLabels.join(' + '),
        fileName: representativeFileName,
        notes: notes,
        status: 'pending',
        submittedDate: new Date().toISOString().split('T')[0],
        reviewedDate: null,
        reviewerNotes: null,
        fileDataUrl: null,
        documentFiles: attachedDocuments
    };
    applications.push(newApplication);

    // Store data URLs for preview and save student's ID picture if provided
    const processFileToDataUrl = (file, indexInDocs) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            if (newApplication.documentFiles && newApplication.documentFiles[indexInDocs]) {
                newApplication.documentFiles[indexInDocs].fileDataUrl = e.target.result;
            }
            if (indexInDocs !== null && newApplication.documentFiles[indexInDocs].type === 'ID Picture') {
                const studentIndex = students.findIndex(s => s.id === currentUser.studentData.id);
                students[studentIndex].idPictureDataUrl = e.target.result;
            }
        };
        reader.readAsDataURL(file);
    };

    // Read files
    if (idPicture) processFileToDataUrl(idPicture, 0);
    if (cor) processFileToDataUrl(cor, idPicture ? 1 : 0);
    
    // Update student status
    const studentIndex = students.findIndex(s => s.id === currentUser.studentData.id);
    students[studentIndex].applicationStatus = 'pending';
    currentUser.studentData.applicationStatus = 'pending';
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Add notification
    addNotification(currentUser.studentData.id, 'Application Submitted', 
        'Your documents have been submitted and are under review.');
    
    showToast('Application submitted successfully!', 'success');
    
    // Reset form
    document.getElementById('applicationNotes').value = '';
    const idPictureInput = document.getElementById('idPictureUpload');
    const idCardInput = document.getElementById('idNumber');
    const corInput = document.getElementById('corUpload');
    if (idPictureInput) idPictureInput.value = '';
    if (idCardInput) idCardInput.value = '';
    if (corInput) corInput.value = '';
    
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
    // Load students from localStorage (including admin-created ones)
    const allStudents = JSON.parse(localStorage.getItem('students') || '[]');
    const combinedStudents = [...students, ...allStudents];
    
    // Update stats
    document.getElementById('totalStudents').textContent = combinedStudents.length;
    document.getElementById('totalApproved').textContent = 
        combinedStudents.filter(s => s.applicationStatus === 'approved').length;
    document.getElementById('totalPending').textContent = 
        combinedStudents.filter(s => s.applicationStatus === 'pending').length;
    document.getElementById('totalArchived').textContent = 
        combinedStudents.filter(s => s.status === 'archived').length;
    
    // Show admin homepage by default
    const adminHomepage = document.getElementById('admin-homepage');
    const tabContent = document.querySelector('.tab-content');
    adminHomepage.style.display = 'block';
    tabContent.style.display = 'none';
    
    // Load admin posts
    loadAdminPosts();
    
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
                    ${student.awardNumber ? `
                    <div class="info-item">
                        <span class="info-label">Award Number</span>
                        <span class="info-value">${student.awardNumber}</span>
                    </div>
                    ` : ''}
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
                    <button class="btn btn-secondary" onclick="openStudentProfileModal(${student.id})">View Profile</button>
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
    // Update bottom navigation tab buttons
    document.querySelectorAll('.nav-tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Hide admin homepage and show tab content
    const adminHomepage = document.getElementById('admin-homepage');
    const tabContent = document.querySelector('.tab-content');
    
    if (tabName === 'homepage') {
        adminHomepage.style.display = 'block';
        tabContent.style.display = 'none';
    } else {
        adminHomepage.style.display = 'none';
        tabContent.style.display = 'block';
        
        // Update tab panels
        document.querySelectorAll('#admin-dashboard .tab-panel').forEach(panel => panel.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }
    
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
            <div class="detail-row attachments">
                <strong>Attachments:</strong>
                <div class="attachments-grid">
                    ${(application.documentFiles && application.documentFiles.length > 0) ? application.documentFiles.map(doc => `
                        <div class="attachment-card">
                            <div class="attachment-title">${doc.type}</div>
                            ${doc.fileDataUrl ? (
                                (doc.fileName || '').toLowerCase().endsWith('.pdf')
                                    ? `<iframe src="${doc.fileDataUrl}" class="attachment-preview"></iframe>`
                                    : `<img src="${doc.fileDataUrl}" alt="${doc.fileName || 'file'}" class="attachment-preview">`
                            ) : `<div class=\"attachment-fallback\">${doc.fileName || 'No preview available'}</div>`}
                            ${doc.fileName ? `<div class="attachment-filename">${doc.fileName}</div>` : ''}
                        </div>
                    `).join('') : `
                        <div class="attachment-card">
                            <div class="attachment-fallback">No attachments</div>
                        </div>
                    `}
                </div>
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

function openStudentProfileModal(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const modal = document.getElementById('studentProfileModal');
    if (!modal) return;

    document.getElementById('adminStudentName').textContent = `${student.firstName} ${student.lastName}`;
    document.getElementById('adminStudentEmail').textContent = student.email;
    document.getElementById('adminStudentId').textContent = student.studentId;
    document.getElementById('adminStudentCourse').textContent = student.course;
    document.getElementById('adminStudentYear').textContent = student.year;
    document.getElementById('adminStudentStatus').textContent = student.status;
    document.getElementById('adminStudentAppStatus').textContent = student.applicationStatus;
    document.getElementById('adminStudentRegistered').textContent = formatDate(student.registrationDate);

    const img = document.getElementById('adminStudentPhoto');
    if (img) {
        if (student.idPictureDataUrl) {
            img.src = student.idPictureDataUrl;
        } else {
            img.src = '';
            img.alt = 'No ID Picture available';
        }
    }

    // Load admin-student chat thread for this student
    adminActiveChatStudentId = studentId;
    renderAdminStudentChat();

    modal.style.display = 'block';
}

function closeStudentProfileModal() {
    const modal = document.getElementById('studentProfileModal');
    if (modal) modal.style.display = 'none';
}

function renderAdminStudentChat() {
    const container = document.getElementById('adminStudentChatMessages');
    if (!container) return;
    container.innerHTML = '';
    const thread = chatMessages.filter(m => m.studentId === adminActiveChatStudentId);
    if (thread.length === 0) {
        container.innerHTML = `
            <div class="chat-welcome">
                <div class="welcome-message">
                    <i class="fas fa-comments"></i>
                    <h5>Start chatting</h5>
                    <p>Your messages will appear here.</p>
                </div>
            </div>
        `;
        return;
    }
    thread.forEach(m => addMessageToAdminChat(container, m));
    container.scrollTop = container.scrollHeight;
}

function addMessageToAdminChat(container, message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `profile-message ${message.sender === 'admin' ? 'sent' : 'received'}`;
    const time = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    messageDiv.innerHTML = `
        <div class="profile-message-avatar">${message.sender === 'admin' ? 'A' : 'S'}</div>
        <div class="profile-message-content">
            <div>${message.text || ''}</div>
            <div class="profile-message-time">${time}</div>
        </div>
    `;
    container.appendChild(messageDiv);
    // Ensure persistence when rendering (in case messages were programmatically added)
    persistChatMessages();
}

function adminSendChatMessage() {
    const input = document.getElementById('adminStudentChatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text || !adminActiveChatStudentId) return;
    const msg = {
        id: Date.now(),
        text,
        sender: 'admin',
        timestamp: new Date().toISOString(),
        studentId: adminActiveChatStudentId
    };
    chatMessages.push(msg);
    persistChatMessages();
    
    // Add notification for student
    addNotification(adminActiveChatStudentId, 'New Message from Admin', text);
    
    renderAdminStudentChat();
    input.value = '';
    
    // Update student's profile chat if they're viewing it
    if (currentUser && currentUser.role === 'student' && currentUser.studentData.id === adminActiveChatStudentId) {
        loadProfileChatMessages();
    }
}

function adminHandleChatKeyPress(event) {
    if (event.key === 'Enter') {
        adminSendChatMessage();
    }
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
    
    // Load students from localStorage (including admin-created ones)
    const allStudents = JSON.parse(localStorage.getItem('students') || '[]');
    const combinedStudents = [...students, ...allStudents];
    
    let filtered = combinedStudents;
    
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
    adminActiveChatStudentId = studentId;
    openStudentProfileModal(studentId);
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
        
        // Initialize profile chat
        initializeProfileChat();
    } else {
        document.getElementById('chatToggle').style.display = 'none';
    }
}

// Profile Chat Functions
function initializeProfileChat() {
    // Load any existing profile chat messages
    loadProfileChatMessages();
    const fileInput = document.getElementById('profileChatFile');
    if (fileInput) {
        fileInput.addEventListener('change', handleProfileChatFileSelected);
    }
}

function toggleProfileChat() {
    const chatContainer = document.querySelector('.profile-chat-container');
    profileChatIsExpanded = !profileChatIsExpanded;
    
    if (profileChatIsExpanded) {
        chatContainer.style.position = 'fixed';
        chatContainer.style.top = '50%';
        chatContainer.style.left = '50%';
        chatContainer.style.transform = 'translate(-50%, -50%)';
        chatContainer.style.width = '500px';
        chatContainer.style.height = '600px';
        chatContainer.style.zIndex = '2000';
        chatContainer.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
        
        // Update button icon
        const button = chatContainer.querySelector('.profile-chat-header button i');
        button.className = 'fas fa-compress-arrows-alt';
    } else {
        chatContainer.style.position = '';
        chatContainer.style.top = '';
        chatContainer.style.left = '';
        chatContainer.style.transform = '';
        chatContainer.style.width = '';
        chatContainer.style.height = '400px';
        chatContainer.style.zIndex = '';
        chatContainer.style.boxShadow = '';
        
        // Update button icon
        const button = chatContainer.querySelector('.profile-chat-header button i');
        button.className = 'fas fa-expand-arrows-alt';
    }
}

function loadProfileChatMessages() {
    const container = document.getElementById('profileChatMessages');
    if (!container) return;
    
    // load from storage first so we have the latest
    loadPersistedChatMessages();

    // Get messages for current student from shared chatMessages array
    const studentId = currentUser ? currentUser.studentData.id : null;
    const studentMessages = chatMessages.filter(m => m.studentId === studentId);
    
    // Clear welcome message if there are chat messages
    if (studentMessages.length > 0) {
        container.innerHTML = '';
        
        studentMessages.forEach(message => {
            addMessageToProfileChat(message);
        });
    } else {
        container.innerHTML = `
            <div class="chat-welcome">
                <div class="welcome-message">
                    <i class="fas fa-comments"></i>
                    <h5>Start chatting with Admin</h5>
                    <p>This is a direct message between you and admin.</p>
                </div>
            </div>
        `;
    }
    
    scrollProfileChatToBottom();
}

function addMessageToProfileChat(message) {
    const container = document.getElementById('profileChatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `profile-message ${message.sender === 'user' ? 'sent' : 'received'}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    let contentHtml = '';
    if (message.type === 'file' && message.fileName) {
        const isImage = message.fileType && message.fileType.startsWith('image/');
        if (isImage && message.previewUrl) {
            contentHtml = `<div class="profile-attachment"><img src="${message.previewUrl}" alt="${message.fileName}"></div>`;
        } else {
            contentHtml = `<div class="profile-attachment"><div class="filename">${message.fileName}</div></div>`;
        }
    }
    const textHtml = message.text ? `<div>${message.text}</div>` : '';

    messageDiv.innerHTML = `
        <div class="profile-message-avatar">
            ${message.sender === 'user' ? 
                (currentUser && currentUser.role === 'student' ? 'S' : 'A') : 
                (message.sender === 'admin' ? 'A' : 'S')
            }
        </div>
        <div class="profile-message-content">
            ${contentHtml}
            ${textHtml}
            <div class="profile-message-time">${time}</div>
        </div>
    `;
    
    container.appendChild(messageDiv);
    scrollProfileChatToBottom();
    persistChatMessages();
}

function sendProfileChatMessage() {
    const input = document.getElementById('profileChatInput');
    const message = input.value.trim();
    
    if (!message && !profileChatPendingFile) return;
    
    // Add user message (text and/or file) to shared chatMessages array
    const baseMessage = {
        id: Date.now(),
        sender: 'user',
        timestamp: new Date().toISOString(),
        userId: currentUser ? currentUser.id : 'anonymous',
        studentId: currentUser ? currentUser.studentData.id : null
    };

    if (profileChatPendingFile) {
        const file = profileChatPendingFile;
        const isImage = file.type && file.type.startsWith('image/');
        const messageWithFile = {
            ...baseMessage,
            type: 'file',
            text: message || '',
            fileName: file.name,
            fileType: file.type,
            previewUrl: isImage ? URL.createObjectURL(file) : null
        };
        chatMessages.push(messageWithFile);
        addMessageToProfileChat(messageWithFile);
        profileChatPendingFile = null;
        const fileInput = document.getElementById('profileChatFile');
        if (fileInput) fileInput.value = '';
    } else if (message) {
        const userMessage = {
            ...baseMessage,
            text: message
        };
        chatMessages.push(userMessage);
        addMessageToProfileChat(userMessage);
    }
    
    // Clear input
    input.value = '';
}


function handleProfileChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendProfileChatMessage();
    }
}

function triggerProfileChatFile() {
    const input = document.getElementById('profileChatFile');
    if (input) input.click();
}

function handleProfileChatFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    profileChatPendingFile = file;
    // Optionally, we could show a small chip indicating a file is attached
}

function showProfileTypingIndicator() {
    const container = document.getElementById('profileChatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'profileTypingIndicator';
    typingDiv.className = 'profile-typing-indicator';
    typingDiv.innerHTML = `
        <div class="profile-message-avatar">A</div>
        <div class="profile-message-content">
            <div>Admin is typing<span class="profile-typing-dots">.</span><span class="profile-typing-dots">.</span><span class="profile-typing-dots">.</span></div>
        </div>
    `;
    
    container.appendChild(typingDiv);
    scrollProfileChatToBottom();
}

function hideProfileTypingIndicator() {
    const typingIndicator = document.getElementById('profileTypingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function scrollProfileChatToBottom() {
    const container = document.getElementById('profileChatMessages');
    container.scrollTop = container.scrollHeight;
}

// Admin Posting Functions
function createPost(type) {
    const postInput = document.getElementById('postInput');
    const content = postInput.value.trim();
    
    if (!content && type !== 'feeling') {
        showToast('Please enter some content for your post', 'error');
        return;
    }
    
    const post = {
        id: Date.now(),
        author: 'Administrator',
        content: content || `Created a ${type} post`,
        type: type,
        timestamp: new Date().toISOString(),
        likes: 0,
        comments: 0,
        shares: 0,
        liked: false
    };
    
    adminPosts.unshift(post);
    postInput.value = '';
    loadAdminPosts();
    showToast('Post created successfully!', 'success');
}

function loadAdminPosts() {
    const postsFeed = document.getElementById('postsFeed');
    
    if (adminPosts.length === 0) {
        postsFeed.innerHTML = `
            <div class="welcome-message">
                <h3>Welcome to the Admin Dashboard</h3>
                <p>Manage student applications, view reports, and configure system settings from this central location.</p>
            </div>
        `;
        return;
    }
    
    const postsHTML = adminPosts.map(post => `
        <div class="post-item">
            <div class="post-header">
                <div class="post-author-pic">
                    <i class="fas fa-user-shield"></i>
                </div>
                <div class="post-author-info">
                    <h4>${post.author}</h4>
                    <p>${formatDate(post.timestamp)}</p>
                </div>
            </div>
            <div class="post-content">
                ${post.content}
            </div>
            <div class="post-actions-bar">
                <button class="post-action-bar-btn ${post.liked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                    <i class="fas fa-heart"></i>
                    <span>${post.likes}</span>
                </button>
                <button class="post-action-bar-btn" onclick="commentPost(${post.id})">
                    <i class="fas fa-comment"></i>
                    <span>${post.comments}</span>
                </button>
                <button class="post-action-bar-btn" onclick="sharePost(${post.id})">
                    <i class="fas fa-share"></i>
                    <span>${post.shares}</span>
                </button>
            </div>
        </div>
    `).join('');
    
    postsFeed.innerHTML = postsHTML;
}

function toggleLike(postId) {
    const post = adminPosts.find(p => p.id === postId);
    if (post) {
        if (post.liked) {
            post.likes--;
            post.liked = false;
        } else {
            post.likes++;
            post.liked = true;
        }
        loadAdminPosts();
    }
}

function commentPost(postId) {
    const comment = prompt('Add a comment:');
    if (comment && comment.trim()) {
        const post = adminPosts.find(p => p.id === postId);
        if (post) {
            post.comments++;
            loadAdminPosts();
            showToast('Comment added!', 'success');
        }
    }
}

function sharePost(postId) {
    const post = adminPosts.find(p => p.id === postId);
    if (post) {
        post.shares++;
        loadAdminPosts();
        showToast('Post shared!', 'success');
    }
}

// Handle post input keypress
function handlePostKeyPress(event) {
    if (event.key === 'Enter') {
        createPost('text');
    }
}

// Student Tab Navigation
function showStudentTab(tabName) {
    // Hide homepage content and show tab content
    const homepageContent = document.getElementById('student-homepage-content');
    const tabContent = document.querySelector('#student-homepage .tab-content');
    const navTabs = document.querySelector('#student-homepage .admin-nav-tabs');
    
    if (tabName === 'homepage') {
        homepageContent.style.display = 'block';
        tabContent.style.display = 'none';
        navTabs.style.display = 'none';
        return;
    }
    
    // Show tab content
    homepageContent.style.display = 'none';
    tabContent.style.display = 'block';
    navTabs.style.display = 'flex';
    
    // Hide all tab panels
    document.querySelectorAll('#student-homepage .tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('#student-homepage .nav-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab panel
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Add active class to clicked tab button
    event.target.classList.add('active');
    
    // Load specific content based on tab
    switch(tabName) {
        case 'announcements':
            loadStudentAnnouncements();
            break;
        case 'messages':
            loadStudentMessages();
            break;
        case 'profile':
            loadStudentProfile();
            break;
    }
}

// Student Messaging Functions
function sendMessage() {
    const input = document.getElementById('chatMessageInput');
    const text = input.value.trim();
    
    if (!text) return;

    const message = {
        id: Date.now(),
        sender: 'student',
        text: text,
        timestamp: new Date().toISOString(),
        studentId: currentUser.studentData.id
    };

    const studentMessages = JSON.parse(localStorage.getItem('studentMessages') || '[]');
    studentMessages.push(message);
    localStorage.setItem('studentMessages', JSON.stringify(studentMessages));
    
    input.value = '';
    loadStudentMessages();
    
    // Simulate admin response (in real app, this would be handled by server)
    setTimeout(() => {
        simulateAdminResponse();
    }, 2000);
}

function simulateAdminResponse() {
    const responses = [
        "Thank you for your message. We'll get back to you soon.",
        "We've received your inquiry and will review it shortly.",
        "Thanks for reaching out! Is there anything specific we can help you with?",
        "We appreciate your message. Our team will respond within 24 hours.",
        "Hello! How can we assist you today?"
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    const adminMessage = {
        id: Date.now(),
        sender: 'admin',
        text: randomResponse,
        timestamp: new Date().toISOString(),
        studentId: currentUser.studentData.id
    };

    const studentMessages = JSON.parse(localStorage.getItem('studentMessages') || '[]');
    studentMessages.push(adminMessage);
    localStorage.setItem('studentMessages', JSON.stringify(studentMessages));
    loadStudentMessages();
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function triggerFileUpload() {
    document.getElementById('chatFileInput').click();
}

// Student Announcement Functions
function togglePostLike(postId) {
    const adminPosts = JSON.parse(localStorage.getItem('adminPosts') || '[]');
    const post = adminPosts.find(p => p.id === postId);
    if (post) {
        if (post.liked) {
            post.likes--;
            post.liked = false;
        } else {
            post.likes++;
            post.liked = true;
        }
        
        // Update localStorage
        localStorage.setItem('adminPosts', JSON.stringify(adminPosts));
        loadStudentAnnouncements();
    }
}

function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    if (commentsSection.style.display === 'none') {
        commentsSection.style.display = 'block';
    } else {
        commentsSection.style.display = 'none';
    }
}

function addComment(postId) {
    const input = document.getElementById(`commentInput-${postId}`);
    const text = input.value.trim();
    
    if (!text) return;

    const comment = {
        id: Date.now(),
        postId: postId,
        author: currentUser.name,
        text: text,
        timestamp: new Date().toISOString()
    };

    const studentComments = JSON.parse(localStorage.getItem('studentComments') || '[]');
    studentComments.push(comment);
    localStorage.setItem('studentComments', JSON.stringify(studentComments));
    
    input.value = '';
    loadStudentAnnouncements();
    showToast('Comment added successfully!', 'success');
}

function renderComments(comments) {
    if (comments.length === 0) {
        return '<p style="text-align: center; color: #9ca3af; font-style: italic;">No comments yet</p>';
    }

    return comments.map(comment => `
        <div class="comment-item">
            <div class="comment-avatar">${comment.author.charAt(0).toUpperCase()}</div>
            <div class="comment-content">
                <div class="comment-author">${comment.author}</div>
                <div class="comment-text">${comment.text}</div>
                <div class="comment-time">${formatDate(comment.timestamp)}</div>
            </div>
        </div>
    `).join('');
}
