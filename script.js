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
    try {
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
    // Load data from localStorage first, fallback to empty arrays
    const savedStudents = localStorage.getItem('students');
    const savedApplications = localStorage.getItem('applications');
    
    if (savedStudents) {
        students = JSON.parse(savedStudents);
        console.log('Loaded students from localStorage:', students);
    } else {
        students = []; // Start with empty array - no sample data
        localStorage.setItem('students', JSON.stringify(students));
        console.log('Initialized with empty students array');
    }
    
    if (savedApplications) {
        applications = JSON.parse(savedApplications);
        // Cleanup: remove legacy sample applications (with firstName/lastName fields)
        try {
            const cleanedApplications = applications.filter(app => app && (
                (typeof app.studentId !== 'undefined' && (app.documentType || app.documentFiles))
            ));
            if (cleanedApplications.length !== applications.length) {
                applications = cleanedApplications;
                localStorage.setItem('applications', JSON.stringify(applications));
            }
        } catch (e) {
            // ignore cleanup errors
        }
    } else {
        applications = []; // Start with empty array
        localStorage.setItem('applications', JSON.stringify(applications));
    }
    
    loadPersistedChatMessages();
    // Load notifications from storage
    try {
        const savedNotifs = localStorage.getItem('notifications');
        if (savedNotifs) {
            const parsed = JSON.parse(savedNotifs);
            if (Array.isArray(parsed)) notifications = parsed;
        }
    } catch (_) { /* ignore */ }

    // Ensure admin credentials exist (defaults if not configured)
    ensureAdminCredentials();
    
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        // Guard: prevent archived students from auto-login sessions
        if (currentUser && currentUser.role === 'student') {
            try {
                const storedStudents = JSON.parse(localStorage.getItem('students') || '[]');
                const match = storedStudents.find(s => (
                    (typeof currentUser.id === 'number' && s.id === currentUser.id) ||
                    (s.email && currentUser.email && String(s.email).toLowerCase() === String(currentUser.email).toLowerCase())
                ));
                if (match && (match.status || 'active') === 'archived') {
                    currentUser = null;
                    localStorage.removeItem('currentUser');
                    showToast('Your account is archived. Please contact admin to reactivate.', 'error');
                    showLogin();
                    return;
                }
            } catch (_) { /* ignore */ }
        }
        if (document && document.body) {
            document.body.classList.add('logged-in');
            if (currentUser.role === 'admin') {
                document.body.classList.add('admin-logged-in');
            } else {
                document.body.classList.remove('admin-logged-in');
            }
        }
        showDashboard();
    } else {
        showHome();
    }
    
    // Generate sample notifications
    generateSampleNotifications();
}

// Admin credentials helpers
function ensureAdminCredentials() {
    try {
        const stored = JSON.parse(localStorage.getItem('adminCredentials') || 'null');
        if (!stored || !stored.email || !stored.password) {
            const defaults = { email: 'admin@grantes.com', password: 'admin123' };
            localStorage.setItem('adminCredentials', JSON.stringify(defaults));
        }
    } catch (e) {
        // fallback: write defaults
        try { localStorage.setItem('adminCredentials', JSON.stringify({ email: 'admin@grantes.com', password: 'admin123' })); } catch (_) {}
    }
}

function getAdminCredentials() {
    try {
        const stored = JSON.parse(localStorage.getItem('adminCredentials') || 'null');
        if (stored && typeof stored.email === 'string' && typeof stored.password === 'string') {
            return stored;
        }
    } catch (_) {}
    return { email: 'admin@grantes.com', password: 'admin123' };
}

function setAdminCredentials(email, password) {
    const creds = { email: String(email || '').trim(), password: String(password || '') };
    localStorage.setItem('adminCredentials', JSON.stringify(creds));
}

// Navigation Functions
function showHome() {
    hideAllSections();
    document.getElementById('home').classList.add('active');
    updateNavigation();
    // Render home feed posts targeted for Home Page audience
    if (typeof loadHomeFeed === 'function') {
        loadHomeFeed();
    }
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
        if (document && document.body) {
            document.body.classList.add('logged-in');
            if (currentUser.role === 'admin') {
                document.body.classList.add('admin-logged-in');
            } else {
                document.body.classList.remove('admin-logged-in');
            }
        }
        const homeLink = document.querySelector('.nav-link[onclick="showHome()"]');
        const loginLink = document.querySelector('.nav-link[onclick="showLogin()"]');
        const registerLink = document.querySelector('.nav-link[onclick="showRegister()"]');
        if (homeLink) homeLink.style.display = 'none';
        if (loginLink) loginLink.style.display = 'none';
        if (registerLink) registerLink.style.display = 'none';
    } else {
        if (document && document.body) {
            document.body.classList.remove('logged-in');
            document.body.classList.remove('admin-logged-in');
        }
        const homeLink = document.querySelector('.nav-link[onclick="showHome()"]');
        const loginLink = document.querySelector('.nav-link[onclick="showLogin()"]');
        const registerLink = document.querySelector('.nav-link[onclick="showRegister()"]');
        if (homeLink) homeLink.style.display = 'block';
        if (loginLink) loginLink.style.display = 'block';
        if (registerLink) registerLink.style.display = 'block';
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
        department: document.getElementById('department').value,
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
        department: formData.department,
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

// Enhanced Home Feed: Render admin posts where audience === 'home' in modern cards
function loadHomeFeed() {
    const feedEl = document.getElementById('homeFeed');
    if (!feedEl) return;

    // Read from adminPosts; fallback to legacy 'posts' if present, then merge
    const storedAdminPosts = JSON.parse(localStorage.getItem('adminPosts') || '[]');
    const legacyPosts = JSON.parse(localStorage.getItem('posts') || '[]');
    const allPosts = [...storedAdminPosts, ...legacyPosts];

    // Accept both 'home' and 'Home Page' values (legacy), and be lenient on casing
    const homePosts = allPosts.filter(p => {
        if (!p) return false;
        const audRaw = (p.audience == null ? '' : p.audience).toString().toLowerCase();
        // Include posts with audience 'home'/'home page' or no audience (legacy)
        return audRaw === '' || audRaw === 'home' || audRaw === 'home page';
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Fallback: if no Home-specific posts, show latest recent posts so something appears
    const postsToRender = (homePosts.length > 0 ? homePosts : allPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))).slice(0, 10);

    if (postsToRender.length === 0) {
        feedEl.innerHTML = `
            <div class="welcome-message">
                <h3>No public posts yet</h3>
                <p>Announcements for the Home Page will appear here.</p>
            </div>
        `;
        return;
    }

    feedEl.innerHTML = postsToRender.map(post => {
        const aud = ((post && post.audience) ? post.audience.toString().toLowerCase() : '');
        const ts = post && post.timestamp ? post.timestamp : new Date().toISOString();
        const author = (post && post.author) ? post.author : 'Administrator';
        const content = (post && post.content) ? post.content : '';
        const hasMulti = Array.isArray(post.images) && post.images.length > 1;
        const hasSingle = !!post.image;
        const isTextOnly = !hasMulti && !hasSingle;
        if (isTextOnly) {
            return `
        <div class="post-card product-style text-only">
            <div class="post-content">
                <div class="post-hero-text">${content}</div>
            </div>
        </div>`;
        }
        const imageFirst = (post.layout || 'image-left') === 'image-left';
        const mediaHtml = (Array.isArray(post.images) && post.images.length > 1)
            ? renderCarousel(post.images)
            : (post.image ? `<div class=\"post-image\"><img src=\"${post.image}\" alt=\"post image\"></div>` : '');
        const detailsHtml = `<div class=\"post-details\">\n                        <div class=\"post-text\">${content}</div>\n                        ${post.type === 'media' ? '<div class=\"post-media\"><i class=\"fas fa-image\"></i> Media attached</div>' : ''}\n                        ${post.type === 'live' ? '<div class=\"post-live\"><i class=\"fas fa-video\"></i> Live video</div>' : ''}\n                        ${post.type === 'feeling' ? '<div class=\"post-feeling\"><i class=\"fas fa-smile\"></i> Feeling/Activity</div>' : ''}\n                    </div>`;
        return `
        <div class=\"post-card product-style\">\n            <div class=\"post-content\">\n                <div class=\"post-body ${imageFirst ? 'image-left' : 'image-right'}\">\n                    ${imageFirst ? `${mediaHtml}${detailsHtml}` : `${detailsHtml}${mediaHtml}`}
                </div>
            </div>
        </div>`;
    }).join('');
}


// Ensure Home feed renders on initial page load
document.addEventListener('DOMContentLoaded', function() {
    try { loadHomeFeed(); } catch (_) { /* ignore */ }
});

function homeLikePost(postId) {
    const allPosts = JSON.parse(localStorage.getItem('adminPosts') || '[]');
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    post.likes = (post.likes || 0) + 1;
    localStorage.setItem('adminPosts', JSON.stringify(allPosts));
    loadHomeFeed();
}

function homeCommentPost(postId) {
    const comment = prompt('Add a comment:');
    if (!comment || !comment.trim()) return;
    const allPosts = JSON.parse(localStorage.getItem('adminPosts') || '[]');
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    if (!Array.isArray(post.comments)) post.comments = [];
    post.comments.push({ id: Date.now(), author: 'Guest', content: comment.trim(), timestamp: new Date().toISOString() });
    localStorage.setItem('adminPosts', JSON.stringify(allPosts));
    loadHomeFeed();
}

function homeSharePost(postId) {
    alert('Link copied for sharing!');
}

function handleLogin(event) {
    event.preventDefault();
    
    const role = document.getElementById('loginRole').value;
    const emailRaw = document.getElementById('loginEmail').value;
    const passwordRaw = document.getElementById('loginPassword').value;
    const email = (emailRaw || '').trim().toLowerCase();
    const password = (passwordRaw || '').trim();
    
    console.log('Login attempt:', { role, email, password });
    
    // First, accept admin credentials regardless of selected role
    const configuredAdmin = getAdminCredentials();
    const adminEmails = new Set([
        (configuredAdmin.email || '').toLowerCase(),
        'admin@grantes.local',
        'admin'
    ]);
    if (adminEmails.has(email) && password === configuredAdmin.password) {
        currentUser = {
            id: 'admin',
            name: 'Administrator',
            email: configuredAdmin.email,
            role: 'admin'
        };
        if (!safeSetItem('currentUser', JSON.stringify(currentUser))) {
            showToast('Storage is full. Logged in without saving session.', 'warning');
        }
        if (document && document.body) {
            document.body.classList.add('logged-in');
            document.body.classList.add('admin-logged-in');
        } 
        try { updateNavigation(); } catch (_) { /* ignore */ }
        showToast('Login successful!', 'success');
        showDashboard();
        return;
    }

    if (role === 'admin') {
        // Admin login via configured credentials
        const configured = getAdminCredentials();
        const allowedEmails = new Set([
            (configured.email || '').toLowerCase(),
            'admin@grantes.local',
            'admin'
        ]);
        if (allowedEmails.has(email) && password === configured.password) {
            currentUser = {
                id: 'admin',
                name: 'Administrator',
                email: configured.email,
                role: 'admin'
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            if (document && document.body) {
                document.body.classList.add('logged-in');
                document.body.classList.add('admin-logged-in');
            }
            try { updateNavigation(); } catch (_) { /* ignore */ }
            showToast('Login successful!', 'success');
            showDashboard();
        } else {
            showToast('Invalid admin credentials', 'error');
        }
    } else if (role === 'student') {
        // Student login - accept Award Number OR Student ID (in same input), or email
        const identifierRaw = document.getElementById('loginAwardNumber').value || '';
        const identifier = identifierRaw.trim().toLowerCase();
        
        // Load latest students from localStorage only (single source of truth)
        const storedStudents = JSON.parse(localStorage.getItem('students') || '[]');
        
        const student = storedStudents.find(s => {
            const sEmail = ((s.email || '').trim().toLowerCase());
            const sAward = ((s.awardNumber || '').trim().toLowerCase());
            const sStudentId = ((s.studentId || '').trim().toLowerCase());
            const sPass = ((s.password || '').trim());
            
            const idMatches = identifier && (sAward === identifier || sStudentId === identifier);
            const emailMatches = email && sEmail === email;
            if (emailMatches || idMatches) {
                return sPass === password;
            }
            return false;
        });
        
        if (student) {
            // Block archived accounts from logging in
            const status = (student.status || 'active').toLowerCase();
            if (status === 'archived') {
                showToast('Your account has been archived. Please contact the administrator to reactivate.', 'error');
                return;
            }
            // Ensure student has a numeric id saved for downstream features
            const ensured = ensureStudentHasId(student);
            currentUser = {
                id: ensured.id,
                name: `${student.firstName} ${student.lastName}`,
                email: student.email,
                role: 'student',
                studentData: ensured
            };
            if (!safeSetItem('currentUser', JSON.stringify(currentUser))) {
                showToast('Storage is full. Logged in without saving session.', 'warning');
            }
            if (document && document.body) {
                document.body.classList.add('logged-in');
                document.body.classList.remove('admin-logged-in');
            }
            try { updateNavigation(); } catch (_) { /* ignore */ }
            showToast('Login successful!', 'success');
            showDashboard();
        } else {
            showToast('Invalid credentials. Please check your award number/email and password.', 'error');
        }
    } else {
        showToast('Please select a role and try again', 'error');
    }
}

// Safe localStorage setter - prevents quota errors from breaking flows
function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        return false;
    }
}

// Guarantee stored student has a unique numeric id; persists back to localStorage if missing
function ensureStudentHasId(student) {
    if (student && typeof student.id === 'number' && student.id > 0) return student;
    const stored = JSON.parse(localStorage.getItem('students') || '[]');
    const matchIdx = stored.findIndex(s => (
        (s.awardNumber && student.awardNumber && String(s.awardNumber).trim().toLowerCase() === String(student.awardNumber).trim().toLowerCase()) ||
        (s.email && student.email && String(s.email).trim().toLowerCase() === String(student.email).trim().toLowerCase()) ||
        (s.studentId && student.studentId && String(s.studentId).trim().toLowerCase() === String(student.studentId).trim().toLowerCase())
    ));
    const nextId = stored.reduce((m, s) => {
        const idNum = typeof s.id === 'number' ? s.id : 0;
        return idNum > m ? idNum : m;
    }, 0) + 1;
    if (matchIdx !== -1) {
        if (!stored[matchIdx].id) stored[matchIdx].id = nextId;
        localStorage.setItem('students', JSON.stringify(stored));
        student.id = stored[matchIdx].id;
    } else if (!student.id) {
        student.id = nextId;
    }
    return student;
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showToast('Logged out successfully', 'success');
    if (document && document.body) {
        document.body.classList.remove('logged-in');
        document.body.classList.remove('admin-logged-in');
    }
    showHome();
}

// Student Homepage Functions
function loadStudentHomepage() {
    const student = currentUser.studentData;
    
    // Update header
    document.getElementById('studentName').textContent = student.firstName + ' ' + student.lastName;
    
    // Update notification count
    // Reload notifications from storage to reflect new ones
    try {
        const savedNotifs = JSON.parse(localStorage.getItem('notifications') || '[]');
        if (Array.isArray(savedNotifs)) notifications = savedNotifs;
    } catch (_) {}
    const unreadNotifs = notifications.filter(n => n.studentId === student.id && !n.read);
    document.getElementById('studentNotificationCount').textContent = unreadNotifs.length;
    
    // Update message count (guard if element not present in sidebar)
    const studentMessages = JSON.parse(localStorage.getItem('studentMessages') || '[]');
    const unreadMessages = studentMessages.filter(m => m.studentId === student.id && m.sender === 'admin' && !m.read);
    const msgCountElHeader = document.getElementById('studentMessageCount');
    if (msgCountElHeader) { msgCountElHeader.textContent = unreadMessages.length; }
    
    // Load profile information
    loadStudentProfile();
    
    // Load announcements
    loadStudentAnnouncements();
    
    // Load messages
    loadStudentMessages();
    // Make counters open Messages tab
    const msgCountEl = document.getElementById('studentMessageCount');
    if (msgCountEl) { msgCountEl.style.cursor = 'pointer'; msgCountEl.onclick = () => openStudentMessages(); }
    const notifCountEl = document.getElementById('studentNotificationCount');
    if (notifCountEl) { notifCountEl.style.cursor = 'pointer'; notifCountEl.onclick = () => openStudentMessages(); }
    
    // Initialize chat
    initializeChat();
}


function loadStudentProfile() {
    const student = currentUser.studentData;
    
    const sideName = document.getElementById('profileName');
    if (sideName) sideName.textContent = `${student.firstName} ${student.lastName}`;
    const sideId = document.getElementById('profileStudentId');
    if (sideId) sideId.textContent = student.studentId;
    const sideEmail = document.getElementById('profileEmail');
    if (sideEmail) sideEmail.textContent = student.email;
    const sideCourse = document.getElementById('profileCourse');
    if (sideCourse) sideCourse.textContent = student.course;
    const sideYear = document.getElementById('profileYear');
    if (sideYear) sideYear.textContent = student.year;
    const sideAward = document.getElementById('profileAwardNumber');
    if (sideAward) sideAward.textContent = student.awardNumber || 'Not assigned';
    const statusEl = document.getElementById('profileStatus');
    if (statusEl) {
        const flags = [];
        if (student.isIndigenous) flags.push('INDIGENOUS PEOPLE');
        if (student.isPwd) flags.push("PWD's");
        statusEl.textContent = flags.length ? flags.join(', ') : '—';
    }
    const indigenousEl = document.getElementById('profileIndigenous');
    const pwdEl = document.getElementById('profilePwd');
    if (indigenousEl) indigenousEl.textContent = student.isIndigenous ? 'Yes' : 'No';
    if (pwdEl) pwdEl.textContent = student.isPwd ? 'Yes' : 'No';

    // Also populate main profile panel fields if present
    const nameMain = document.getElementById('profileNameMain');
    if (nameMain) nameMain.textContent = `${student.firstName} ${student.lastName}`;
    const idMain = document.getElementById('profileStudentIdMain');
    if (idMain) idMain.textContent = student.studentId;
    const emailMain = document.getElementById('profileEmailMain');
    if (emailMain) emailMain.textContent = student.email;
    const courseMain = document.getElementById('profileCourseMain');
    if (courseMain) courseMain.textContent = student.course;
    const deptMain = document.getElementById('profileDepartmentMain');
    if (deptMain) deptMain.textContent = student.department || '';
    const placeMain = document.getElementById('profilePlaceMain');
    if (placeMain) placeMain.textContent = student.place || '';
    const yearMain = document.getElementById('profileYearMain');
    if (yearMain) yearMain.textContent = student.year;
    const awardMain = document.getElementById('profileAwardNumberMain');
    if (awardMain) awardMain.textContent = student.awardNumber || 'Not assigned';
    const statusMain = document.getElementById('profileStatusMain');
    if (statusMain) {
        const flagsMain = [];
        if (student.isIndigenous) flagsMain.push('INDIGENOUS PEOPLE');
        if (student.isPwd) flagsMain.push("PWD's");
        statusMain.textContent = flagsMain.length ? flagsMain.join(', ') : '—';
    }
    const indigenousMain = document.getElementById('profileIndigenousMain');
    if (indigenousMain) indigenousMain.textContent = student.isIndigenous ? 'Yes' : 'No';
    const pwdMain = document.getElementById('profilePwdMain');
    if (pwdMain) pwdMain.textContent = student.isPwd ? 'Yes' : 'No';
}

// Removed Student Account Settings modal and handlers per request

function loadStudentAnnouncements() {
    const adminPosts = JSON.parse(localStorage.getItem('adminPosts') || '[]');
    const container = document.getElementById('studentAnnouncementsFeed');
    
    const studentScoped = adminPosts.filter(p => p && (p.audience === 'students' || !p.audience));
    if (studentScoped.length === 0) {
        container.innerHTML = `
            <div class="no-posts">
                <i class="fas fa-newspaper"></i>
                <h4>No announcements yet</h4>
                <p>The administration hasn't posted any announcements yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = studentScoped.map(post => {
        const comments = JSON.parse(localStorage.getItem('studentComments') || '[]');
        const postComments = comments.filter(comment => comment.postId === post.id);
        const engagement = (post && post.engagement) ? post.engagement : { likes: [], comments: [], shares: [] };
        const likeCount = Array.isArray(engagement.likes) ? engagement.likes.length : 0;
        const likedByCurrent = (currentUser && currentUser.studentData)
            ? (Array.isArray(engagement.likes) && engagement.likes.some(l => l && l.userId === currentUser.studentData.id))
            : false;
        
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
                    ${Array.isArray(post.images) && post.images.length > 1 ? renderCarousel(post.images) : (post.image ? `<div class="post-image"><img src="${post.image}" alt="post image"></div>` : '')}
                    <div class="post-text">${post.content}</div>
                    ${post.type === 'media' ? '<div class="post-media"><i class="fas fa-image"></i> Media attached</div>' : ''}
                    ${post.type === 'live' ? '<div class="post-live"><i class="fas fa-video"></i> Live video</div>' : ''}
                    ${post.type === 'feeling' ? '<div class="post-feeling"><i class="fas fa-smile"></i> Feeling/Activity</div>' : ''}
                </div>
                <div class="post-actions">
                    <button class="post-action-btn ${likedByCurrent ? 'liked' : ''}" onclick="togglePostLike(${post.id})">
                        <i class="fas fa-heart"></i>
                        <span>${likeCount}</span>
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
    // Use shared chatMessages thread persisted in localStorage; migrate legacy records if present
    loadPersistedChatMessages();
    const student = currentUser.studentData;
    try {
        const legacy = JSON.parse(localStorage.getItem('studentMessages') || '[]');
        if (Array.isArray(legacy) && legacy.some(m => m && m.studentId === student.id)) {
            const existingKeys = new Set(chatMessages.map(m => `${m.studentId}|${m.timestamp}|${m.sender}|${m.text}`));
            legacy.forEach(m => {
                if (!m || m.studentId !== student.id) return;
                const key = `${m.studentId}|${m.timestamp}|${m.sender}|${m.text}`;
                if (!existingKeys.has(key)) {
                    chatMessages.push({
                        id: m.id || Date.now(),
                        text: m.text || '',
                        sender: m.sender || 'student',
                        timestamp: m.timestamp || new Date().toISOString(),
                        studentId: m.studentId
                    });
                }
            });
            persistChatMessages();
        }
    } catch (_) { /* ignore */ }

    const studentThread = chatMessages.filter(m => m.studentId === student.id);
    const container = document.getElementById('studentChatMessages');
    if (!container) return;
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
    container.innerHTML = studentThread.map(message => {
        const isStudent = message.sender !== 'admin';
        const time = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        return `
            <div class="message-item ${isStudent ? 'sent' : 'received'}">
                <div class="message-avatar">${isStudent ? 'S' : 'A'}</div>
                <div class="message-bubble">
                    <div class="message-text">${message.text || ''}</div>
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
    }).join('');
    container.scrollTop = container.scrollHeight;
}

function loadStudentNotifications() {
    const container = document.getElementById('notificationsContainer');
    // Ensure we have the latest persisted notifications
    try {
        const savedNotifs = JSON.parse(localStorage.getItem('notifications') || '[]');
        if (Array.isArray(savedNotifs)) notifications = savedNotifs;
    } catch (_) {}
    const studentNotifications = notifications.filter(n => n.studentId === currentUser.studentData.id && !n.read);
    
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

// (Removed legacy showStudentTab for #student-dashboard to avoid conflicts)

// Admin Dashboard Functions
function loadAdminDashboard() {
    // Load students from localStorage as single source of truth
    const storedStudents = JSON.parse(localStorage.getItem('students') || '[]');
    students = storedStudents;
    
    // Update stats (Only count ACTIVE students for totals/IP/PWDs; Archived shown separately)
    const activeStudents = students.filter(s => (s.status || 'active') === 'active');
    document.getElementById('totalStudents').textContent = activeStudents.length;
    document.getElementById('totalApproved').textContent = 
        activeStudents.filter(s => s.isIndigenous).length;
    document.getElementById('totalPending').textContent = 
        activeStudents.filter(s => s.isPwd).length;
    document.getElementById('totalArchived').textContent = 
        students.filter(s => (s.status || 'active') === 'archived').length;
    
    // Show admin homepage by default
    const adminHomepage = document.getElementById('admin-homepage');
    const adminSection = document.getElementById('admin-dashboard');
    const tabContent = adminSection ? adminSection.querySelector('.tab-content') : document.querySelector('.tab-content');
    const navTabs = adminSection ? adminSection.querySelector('.admin-nav-tabs') : null;
    adminHomepage.style.display = 'block';
    tabContent.style.display = 'none';
    if (navTabs) navTabs.style.display = 'none';
    
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
    const filteredApplications = filterApplicationsByStatus().filter(app => app && app.documentType);
    
    if (filteredApplications.length === 0) {
        container.innerHTML = '<p class="no-data">No applications found.</p>';
        return;
    }
    
    container.innerHTML = filteredApplications.map(app => {
        const student = students.find(s => s.id === app.studentId) || { firstName: '', lastName: '', studentId: '' };
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
    
    container.innerHTML = filteredStudents.map((student, index) => {
        return `
            <div class="student-item">
                <div class="student-header">
                    <h4><span class="student-index">${index + 1}</span>${student.firstName} ${student.lastName}</h4>
                </div>
                <div class="student-info">
                    <div class="info-item">
                        <span class="info-label">Student ID</span>
                        <span class="info-value">${student.studentId || 'N/A'}</span>
                    </div>
                </div>
                <div class="student-actions">
                    <button class="btn btn-secondary" onclick="openStudentProfileModal(${student.id})">View Profile</button>
                    <button class="btn btn-secondary" onclick="editStudent(${student.id})">Edit</button>
                    <button class="btn btn-secondary" onclick="archiveStudent(${student.id})">Archive</button>
                    <button class="btn btn-danger" onclick="deleteStudent(${student.id})">Delete</button>
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

// Quick action: show only the Students list and hide the tab bar
function openManageStudents() {
    showAdminTab('students');
    const navTabs = document.querySelector('.admin-nav-tabs');
    if (navTabs) {
        navTabs.style.display = 'none';
    }
    // Ensure default view is active when opening Manage Students directly
    studentsViewFilter = 'active';
    loadStudents();
}

// Show Profile panel when clicking the sidebar profile card header
function showStudentProfile() {
    const homepageContent = document.getElementById('student-homepage-content');
    const tabContent = document.querySelector('#student-homepage .tab-content');
    const navTabs = document.querySelector('#student-homepage .admin-nav-tabs');

    if (homepageContent && tabContent && navTabs) {
        homepageContent.style.display = 'none';
        tabContent.style.display = 'block';
        // Hide tabs when viewing profile via sidebar
        navTabs.style.display = 'none';

        // Hide all panels and show profile panel
        document.querySelectorAll('#student-homepage .tab-panel').forEach(panel => panel.classList.remove('active'));
        const profilePanel = document.getElementById('profile-tab');
        if (profilePanel) profilePanel.classList.add('active');

        // Do not alter tab button active state (tabs remain Announcements/Messages)
        document.querySelectorAll('#student-homepage .nav-tab-btn').forEach(btn => btn.classList.remove('active'));
    }

    // Ensure profile data is populated
    loadStudentProfile();
}

// Open Messages from sidebar Notifications or counters
function openStudentMessages() {
    const homepageContent = document.getElementById('student-homepage-content');
    const tabContent = document.querySelector('#student-homepage .tab-content');
    const navTabs = document.querySelector('#student-homepage .admin-nav-tabs');

    if (homepageContent && tabContent && navTabs) {
        homepageContent.style.display = 'none';
        tabContent.style.display = 'block';
        navTabs.style.display = 'flex';

        // Switch to messages panel and highlight Messages tab button
        document.querySelectorAll('#student-homepage .tab-panel').forEach(panel => panel.classList.remove('active'));
        const msgPanel = document.getElementById('messages-tab');
        if (msgPanel) msgPanel.classList.add('active');
        document.querySelectorAll('#student-homepage .nav-tab-btn').forEach(btn => btn.classList.remove('active'));
        const msgBtn = document.querySelector(`#student-homepage .nav-tab-btn[onclick*="'messages'"]`);
        if (msgBtn) msgBtn.classList.add('active');

        // Ensure messages render
        setTimeout(loadStudentMessages, 0);
    }

    // Mark all notifications as read for this student and update count
    try {
        const currentId = currentUser && currentUser.studentData ? currentUser.studentData.id : null;
        if (currentId != null) {
            let list = JSON.parse(localStorage.getItem('notifications') || '[]');
            let changed = false;
            list = list.map(n => {
                if (n && n.studentId === currentId && !n.read) { changed = true; return { ...n, read: true }; }
                return n;
            });
            if (changed) {
                notifications = list;
                localStorage.setItem('notifications', JSON.stringify(list));
                const countEl = document.getElementById('studentNotificationCount');
                if (countEl) countEl.textContent = '0';
            }
        }
    } catch (_) { /* ignore */ }
}

function loadReports() {
    // Simple chart implementation (in a real app, you'd use a charting library)
    const applicationChart = document.getElementById('applicationChart');
    const trendChart = document.getElementById('trendChart');
    const departmentChart = document.getElementById('departmentChart');
    const departmentSummary = document.getElementById('departmentSummary');
    const placeChart = document.getElementById('placeChart');
    const placeSummary = document.getElementById('placeSummary');
    
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

    // Department analysis (ACTIVE students only)
    if (departmentChart && departmentSummary) {
        const storedStudents = JSON.parse(localStorage.getItem('students') || '[]');
        const active = storedStudents.filter(s => (s.status || 'active') === 'active');
        const deptCounts = active.reduce((acc, s) => {
            const dept = (s && s.department) ? s.department : 'Unspecified';
            acc[dept] = (acc[dept] || 0) + 1;
            return acc;
        }, {});
        if (Object.keys(deptCounts).length === 0) {
            departmentSummary.innerHTML = '<p class="no-data">No department data available.</p>';
        } else {
            // Render chart
            drawSimpleChart(departmentChart, deptCounts);
            // Render summary list
            const total = Object.values(deptCounts).reduce((a, b) => a + b, 0);
            const sorted = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]);
            departmentSummary.innerHTML = `
                <ul class="dept-summary-list">
                    ${sorted.map(([name, count], idx) => {
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const color = `hsl(${(idx * 53) % 360}, 70%, 55%)`;
                        const abbr = abbreviateDepartment(name);
                        return `<li title="${name}">
                            <span class="dept-color-dot" style="background:${color}"></span>
                            <span class="dept-name">${abbr}</span>
                            <span class="dept-count">${count} (${pct}%)</span>
                        </li>`;
                    }).join('')}
                </ul>
            `;
        }
    }
}

// Place (From) analysis (counts and percentage summary) - ACTIVE students only
if (placeChart && placeSummary) {
    const storedStudents = JSON.parse(localStorage.getItem('students') || '[]');
    const active = storedStudents.filter(s => (s.status || 'active') === 'active');
    const placeCounts = active.reduce((acc, s) => {
        const place = (s && s.place && s.place.trim()) ? s.place.trim() : 'Unspecified';
        acc[place] = (acc[place] || 0) + 1;
        return acc;
    }, {});
        if (Object.keys(placeCounts).length === 0) {
            placeSummary.innerHTML = '<p class="no-data">No origin data available.</p>';
            const ctx = placeChart.getContext('2d');
            ctx.clearRect(0, 0, placeChart.width, placeChart.height);
        } else {
            drawSimpleChart(placeChart, placeCounts);
            const total = Object.values(placeCounts).reduce((a, b) => a + b, 0);
            const sorted = Object.entries(placeCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);
            placeSummary.innerHTML = `
                <ul class="dept-summary-list">
                    ${sorted.map(([name, count], idx) => {
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const color = `hsl(${(idx * 53) % 360}, 70%, 55%)`;
                        return `<li title="${name}">
                            <span class="dept-color-dot" style="background:${color}"></span>
                            <span class="dept-name">${name}</span>
                            <span class="dept-count">${count} (${pct}%)</span>
                        </li>`;
                    }).join('')}
                </ul>
            `;
        }
    }

function drawSimpleChart(canvas, data, opts) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const maxValue = Math.max(...Object.values(data));
    const labels = Object.keys(data);
    const values = Object.values(data);
    const count = labels.length;
    const padding = 10;
    const barWidth = Math.max(20, Math.floor(width / count) - padding);
    const labelColor = '#374151';
    const hideLabels = !!(opts && opts.hideLabels);
    const labelFormatter = (opts && typeof opts.labelFormatter === 'function') ? opts.labelFormatter : (t) => t;
    
    labels.forEach((key, index) => {
        const value = values[index];
        const bottomSpace = hideLabels ? 8 : 18;
        const barHeight = maxValue > 0 ? (value / maxValue) * (height - (32 + bottomSpace)) : 0;
        const x = index * (barWidth + padding) + 5;
        const y = height - barHeight - (16 + bottomSpace);

        // Bar color with spaced hues for readability
        ctx.fillStyle = `hsl(${(index * 53) % 360}, 70%, 55%)`;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Value label above bar
        ctx.fillStyle = labelColor;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(String(value), x + barWidth/2, y - 6);

        // Optional label under bar
        if (!hideLabels) {
            const text = labelFormatter(key);
            ctx.save();
            ctx.fillStyle = labelColor;
            ctx.translate(x + barWidth/2, height - 6);
            ctx.rotate(0);
            ctx.fillText(text, 0, 0);
            ctx.restore();
        }
    });
}

function abbreviateDepartment(name) {
    if (!name) return '';
    const mapping = {
        'Department of Computer Studies': 'DCS',
        'Department of Business and Management': 'DBM',
        'Department of Industrial Technology': 'DIT',
        'Department of General Teacher Training': 'DGTT',
        'College of Criminal Justice Education': 'CCJE',
        'Unspecified': 'Unspecified'
    };
    if (mapping[name]) return mapping[name];
    // Generic fallback: collapse common prefixes and shorten words
    return name
        .replace(/^Department of\s+/i, '')
        .replace(/and/gi, '&')
        .replace(/Education/gi, 'Edu')
        .replace(/Management/gi, 'Mgmt')
        .replace(/Technology/gi, 'Tech')
        .replace(/General/gi, 'Gen')
        .trim();
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
    // Keep the header meta showing the correct Student ID (not award number)
    document.getElementById('adminStudentId').textContent = student.studentId || '';
    const adminDeptEl = document.getElementById('adminStudentDepartment');
    if (adminDeptEl) { adminDeptEl.textContent = student.department || ''; }
    const adminPlaceEl = document.getElementById('adminStudentPlace');
    if (adminPlaceEl) { adminPlaceEl.textContent = student.place || ''; }
    document.getElementById('adminStudentCourse').textContent = student.course;
    document.getElementById('adminStudentYear').textContent = student.year;
    const adminStudentIdValueEl = document.getElementById('adminStudentIdValue');
    if (adminStudentIdValueEl) { adminStudentIdValueEl.textContent = student.studentId; }
    const adminStudentAwardNumberEl = document.getElementById('adminStudentAwardNumber');
    if (adminStudentAwardNumberEl) { adminStudentAwardNumberEl.textContent = student.awardNumber || 'N/A'; }
    document.getElementById('adminStudentStatus').textContent = student.status;
    // Application status removed from admin view
    const registeredValue = student.registered || student.registrationDate || student.registeredDate || null;
    document.getElementById('adminStudentRegistered').textContent = registeredValue ? formatDate(registeredValue) : 'N/A';

    const img = document.getElementById('adminStudentPhoto');
    if (img) {
        if (student.idPictureDataUrl) {
            img.src = student.idPictureDataUrl;
        } else {
            img.src = '';
            img.alt = 'No ID Picture available';
        }
    }

    // Show flags in admin view if needed
    const indigenousBadge = document.getElementById('adminStudentIndigenous');
    const pwdBadge = document.getElementById('adminStudentPwd');
    if (indigenousBadge) indigenousBadge.textContent = student.isIndigenous ? 'Yes' : 'No';
    if (pwdBadge) pwdBadge.textContent = student.isPwd ? 'Yes' : 'No';

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
    const thread = chatMessages
        .filter(m => m.studentId === adminActiveChatStudentId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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
    // Ensure we scroll to the latest message after layout/paint
    const scrollToBottom = () => { try { container.scrollTop = container.scrollHeight; } catch (_) {} };
    scrollToBottom();
    requestAnimationFrame(scrollToBottom);
    setTimeout(scrollToBottom, 0);
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
    try { localStorage.setItem('notifications', JSON.stringify(notifications)); } catch (_) {}
    
    renderAdminStudentChat();
    input.value = '';
    try {
        const container = document.getElementById('adminStudentChatMessages');
        if (container) container.scrollTop = container.scrollHeight;
    } catch (_) { /* ignore */ }
    
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
        localStorage.setItem('students', JSON.stringify(students));
        loadStudents();
        loadAdminDashboard();
        try { loadReports(); } catch (_) { /* ignore */ }
        showToast('Student archived successfully!', 'success');
    }
}

function activateStudent(studentId) {
    const studentIndex = students.findIndex(s => s.id === studentId);
    students[studentIndex].status = 'active';
    localStorage.setItem('students', JSON.stringify(students));
    loadStudents();
    loadAdminDashboard();
    try { loadReports(); } catch (_) { /* ignore */ }
    showToast('Student activated successfully!', 'success');
}

function deleteStudent(studentId) {
    if (!confirm('Are you sure you want to permanently delete this student?')) return;
    // Reload latest
    const stored = JSON.parse(localStorage.getItem('students') || '[]');
    const newList = stored.filter(s => s.id !== studentId);
    localStorage.setItem('students', JSON.stringify(newList));
    students = newList;
    // Remove related chat messages
    try {
        loadPersistedChatMessages();
        const filteredMsgs = chatMessages.filter(m => m.studentId !== studentId);
        chatMessages = filteredMsgs;
        persistChatMessages();
    } catch (_) { /* ignore */ }
    loadStudents();
    loadAdminDashboard();
    showToast('Student deleted successfully!', 'success');
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

// Global view state for Students tab; default to 'active'. 'archived' is set by viewArchived().
let studentsViewFilter = 'active';

function filterStudentsByStatus() {
    const statusFilter = studentsViewFilter || 'active';
    const searchTerm = (document.getElementById('searchStudentRecords').value || '').trim().toLowerCase();
    
    // Load students from localStorage as single source of truth
    const storedStudents = JSON.parse(localStorage.getItem('students') || '[]');
    students = storedStudents;
    
    let filtered = students;
    
    // Always apply filter; default active if unspecified
    filtered = filtered.filter(student => (student.status || 'active') === statusFilter);
    
    if (searchTerm) {
        filtered = filtered.filter(student => 
            (student.firstName || '').toLowerCase().includes(searchTerm) ||
            (student.lastName || '').toLowerCase().includes(searchTerm) ||
            (student.studentId || '').toLowerCase().includes(searchTerm) ||
            (student.email || '').toLowerCase().includes(searchTerm) ||
            (student.awardNumber || '').toLowerCase().includes(searchTerm) ||
            (student.course || '').toLowerCase().includes(searchTerm) ||
            (student.year || '').toLowerCase().includes(searchTerm)
        );
    }
    
    return filtered;
}

// Quick view: show archived students list and jump to Students tab
function viewArchived() {
    // Switch to Students tab
    try { showAdminTab('students'); } catch (_) {}
    const navTabs = document.querySelector('.admin-nav-tabs');
    if (navTabs) navTabs.style.display = 'flex';
    // Set filter to archived and reload
    studentsViewFilter = 'archived';
    // Clear search for full list
    const searchEl = document.getElementById('searchStudentRecords');
    if (searchEl) searchEl.value = '';
    loadStudents();
}

function searchStudents() {
    loadStudents();
}

// Settings Functions
function updateSettings() {
    // Removed subsidy types and system message; only handle admin credentials and student credential updates
    const adminEmailEl = document.getElementById('adminEmailSetting');
    const adminPasswordEl = document.getElementById('adminPasswordSetting');
    const adminPasswordConfirmEl = document.getElementById('adminPasswordConfirmSetting');

    // Save admin credentials if provided
    if (adminEmailEl || adminPasswordEl || adminPasswordConfirmEl) {
        const newEmail = (adminEmailEl && adminEmailEl.value || '').trim();
        const newPassword = (adminPasswordEl && adminPasswordEl.value || '').trim();
        const confirmPassword = (adminPasswordConfirmEl && adminPasswordConfirmEl.value || '').trim();

        if (newEmail && !/^\S+@\S+\.\S+$/.test(newEmail)) {
            showToast('Please enter a valid admin email address.', 'error');
            return;
        }
        if (newPassword || confirmPassword) {
            if (newPassword.length < 6) {
                showToast('Admin password must be at least 6 characters.', 'error');
                return;
            }
            if (newPassword !== confirmPassword) {
                showToast('Admin password confirmation does not match.', 'error');
                return;
            }
        }

        // Merge with existing credentials
        const existing = getAdminCredentials();
        const mergedEmail = newEmail || existing.email;
        const mergedPassword = newPassword ? newPassword : existing.password;
        setAdminCredentials(mergedEmail, mergedPassword);
    }

    showToast('Settings updated successfully!', 'success');
}

// Admin: Update a student's award number and/or password from Settings
function updateStudentCredentialsFromSettings() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Not authorized.', 'error');
        return;
    }

    const lookupEl = document.getElementById('adminStudentLookup');
    const selectedIdEl = document.getElementById('adminSelectedStudentId');
    const newAwardEl = document.getElementById('adminStudentNewAward');
    const newPassEl = document.getElementById('adminStudentNewPassword');
    const newPassConfirmEl = document.getElementById('adminStudentNewPasswordConfirm');

    const identifier = (lookupEl && lookupEl.value || '').trim().toLowerCase();
    const selectedId = selectedIdEl && selectedIdEl.value ? parseInt(selectedIdEl.value) : null;
    const newAward = (newAwardEl && newAwardEl.value || '').trim();
    const newPassword = (newPassEl && newPassEl.value || '').trim();
    const confirmPassword = (newPassConfirmEl && newPassConfirmEl.value || '').trim();

    if (!selectedId) {
        showToast('Please search and select a student from the list.', 'error');
        return;
    }

    if (!newAward && !newPassword && !confirmPassword) {
        showToast('Nothing to update.', 'warning');
        return;
    }

    if (newPassword || confirmPassword) {
        if (newPassword.length < 6) {
            showToast('Password must be at least 6 characters.', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match.', 'error');
            return;
        }
    }

    const stored = JSON.parse(localStorage.getItem('students') || '[]');
    const matchIndex = stored.findIndex(s => s && s.id === selectedId);

    if (matchIndex === -1) {
        showToast('Student not found. Check the identifier and try again.', 'error');
        return;
    }

    if (newAward) {
        const taken = stored.some((s, i) => i !== matchIndex && s && s.awardNumber && String(s.awardNumber).toLowerCase() === newAward.toLowerCase());
        if (taken) {
            showToast('Award number is already in use by another account.', 'error');
            return;
        }
        stored[matchIndex].awardNumber = newAward;
    }
    if (newPassword) {
        stored[matchIndex].password = newPassword;
    }

    localStorage.setItem('students', JSON.stringify(stored));

    // If admin is viewing Students tab, refresh list and stats
    try { loadStudents(); } catch (_) {}
    try { loadAdminDashboard(); } catch (_) {}

    // Clear inputs and summary (keep search text)
    if (newAwardEl) { newAwardEl.value = ''; newAwardEl.disabled = true; }
    if (newPassEl) { newPassEl.value = ''; newPassEl.disabled = true; }
    if (newPassConfirmEl) { newPassConfirmEl.value = ''; newPassConfirmEl.disabled = true; }
    const showPw2 = document.getElementById('adminShowPasswords');
    if (showPw2) { showPw2.checked = false; showPw2.disabled = true; }
    const selectedIdEl2 = document.getElementById('adminSelectedStudentId');
    if (selectedIdEl2) selectedIdEl2.value = '';
    const summaryBox = document.getElementById('adminSelectedStudentSummary');
    if (summaryBox) summaryBox.style.display = 'none';
    const hint = document.getElementById('adminAwardValidation');
    if (hint) { hint.textContent = ''; hint.className = 'input-hint'; }

    showToast('Student account updated successfully!', 'success');
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
    try { localStorage.setItem('notifications', JSON.stringify(notifications)); } catch (_) { /* ignore */ }
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
    const content = (postInput && postInput.value ? postInput.value.trim() : '').toString();
    const audienceSelect = document.getElementById('postAudience');
    const courseSelect = document.getElementById('postCourse');
    const audience = audienceSelect ? audienceSelect.value : 'students';
    const course = courseSelect ? courseSelect.value : '';
    const imageDataUrl = window.__pendingPostImageDataUrl || null;
    const imageList = Array.isArray(window.__pendingPostImages) ? window.__pendingPostImages : (imageDataUrl ? [imageDataUrl] : []);
    const layoutSelect = document.getElementById('postLayout');
    const layout = layoutSelect ? layoutSelect.value : 'image-left';
    
    if (window.__postingInProgress) {
        return; // prevent double submissions
    }
    window.__postingInProgress = true;
    const finish = () => { window.__postingInProgress = false; };
    
    // Require either text or at least one image (except special 'feeling' type)
    if (!content && imageList.length === 0 && type !== 'feeling') {
        showToast('Please enter text or add at least one image', 'error');
        finish();
        return;
    }
    
    // Load existing posts from localStorage (single source of truth)
    const allPosts = JSON.parse(localStorage.getItem('adminPosts') || '[]');
    
    const newPost = {
        id: Date.now(),
        author: 'Administrator',
        content: content || '',
        type: type,
        audience: audience, // 'students' or 'home' (and possibly 'specific')
        course: audience === 'specific' ? course : null,
        image: imageDataUrl,
        images: imageList,
        layout: layout,
        timestamp: new Date().toISOString(),
        likes: 0,
        comments: [],
        shares: 0,
        liked: false
    };
    
    try {
        allPosts.unshift(newPost);
        localStorage.setItem('adminPosts', JSON.stringify(allPosts));
    } catch (e) {
        showToast('Post is too large to save. Try fewer/smaller images.', 'error');
        finish();
        return;
    }
    
    // Reset inputs
    if (postInput) postInput.value = '';
    if (audienceSelect) audienceSelect.value = 'students';
    if (courseSelect) courseSelect.style.display = 'none';
    const layoutSelectReset = document.getElementById('postLayout');
    if (layoutSelectReset) layoutSelectReset.value = 'image-left';
    clearPostImage();
    
    loadAdminPosts();
    // Notify all active students about new announcement
    try {
        const allStudents = JSON.parse(localStorage.getItem('students') || '[]');
        const active = allStudents.filter(s => (s.status || 'active') === 'active');
        const noteTitle = (audience === 'home') ? 'New Public Announcement' : 'New Student Announcement';
        active.forEach(s => addNotification(s.id, noteTitle, content || '')); 
    } catch (_) { /* ignore */ }
    // If on Home, refresh Home feed too
    if (document.getElementById('home') && document.getElementById('home').classList.contains('active')) {
        if (typeof loadHomeFeed === 'function') loadHomeFeed();
    }
    showToast('Post created successfully!', 'success');
    finish();
}

// Ensure Publish button uses unified createPost logic
function publishPost() {
    createPost('text');
}

// Post image helpers
function triggerPostImageUpload() {
    const input = document.getElementById('postImageInput');
    if (input) input.click();
}

// Simple carousel renderer and controller
function renderCarousel(images) {
    const id = `carousel-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const slides = images.map((src, idx) => `<div class=\"carousel-slide ${idx===0?'active':''}\"><img src=\"${src}\" alt=\"image ${idx+1}\"></div>`).join('');
    return `
    <div class=\"carousel\" id=\"${id}\" data-index=\"0\">\n        <button class=\"carousel-arrow left\" onclick=\"carouselPrev('${id}')\" aria-label=\"Previous\">&#10094;</button>\n        <div class=\"carousel-track\">${slides}</div>\n        <button class=\"carousel-arrow right\" onclick=\"carouselNext('${id}')\" aria-label=\"Next\">&#10095;</button>\n    </div>`;
}

function carouselNext(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const slides = el.querySelectorAll('.carousel-slide');
    if (slides.length === 0) return;
    let index = parseInt(el.getAttribute('data-index') || '0', 10);
    slides[index].classList.remove('active');
    index = (index + 1) % slides.length;
    slides[index].classList.add('active');
    el.setAttribute('data-index', String(index));
}

function carouselPrev(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const slides = el.querySelectorAll('.carousel-slide');
    if (slides.length === 0) return;
    let index = parseInt(el.getAttribute('data-index') || '0', 10);
    slides[index].classList.remove('active');
    index = (index - 1 + slides.length) % slides.length;
    slides[index].classList.add('active');
    el.setAttribute('data-index', String(index));
}

function handlePostImagesSelected(event) {
    const files = (event.target.files && Array.from(event.target.files)) || [];
    if (files.length === 0) return;
    const imageFiles = files.filter(f => f.type && f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
        showToast('Please select image files', 'error');
        return;
    }
    const readers = [];
    window.__pendingPostImages = [];
    imageFiles.forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            window.__pendingPostImages.push(e.target.result);
            if (idx === 0) {
                window.__pendingPostImageDataUrl = e.target.result;
                const prev = document.getElementById('postImagePreview');
                const img = document.getElementById('postImagePreviewImg');
                const count = document.getElementById('postImageCount');
                if (prev && img) {
                    img.src = e.target.result;
                    prev.style.display = 'flex';
                }
                if (count) {
                    count.textContent = `+${Math.max(0, imageFiles.length - 1)}`;
                    count.style.display = imageFiles.length > 1 ? 'inline-flex' : 'none';
                }
            } else {
                const count = document.getElementById('postImageCount');
                if (count) {
                    count.textContent = `+${Math.max(0, window.__pendingPostImages.length - 1)}`;
                    count.style.display = window.__pendingPostImages.length > 1 ? 'inline-flex' : 'none';
                }
            }
        };
        reader.readAsDataURL(file);
        readers.push(reader);
    });
}

function clearPostImage() {
    window.__pendingPostImageDataUrl = null;
    window.__pendingPostImages = [];
    const input = document.getElementById('postImageInput');
    if (input) input.value = '';
    const prev = document.getElementById('postImagePreview');
    const img = document.getElementById('postImagePreviewImg');
    const count = document.getElementById('postImageCount');
    if (prev && img) {
        img.src = '';
        prev.style.display = 'none';
    }
    if (count) { count.style.display = 'none'; }
}

function loadAdminPosts() {
    const postsFeed = document.getElementById('postsFeed');
    if (!postsFeed) return;
    const allPosts = JSON.parse(localStorage.getItem('adminPosts') || '[]');
    
    // Test: Show alert to confirm function is called
    console.log('loadAdminPosts called, posts count:', allPosts.length);
    
    if (allPosts.length === 0) {
        postsFeed.innerHTML = `
            <div class="welcome-message">
                <h3>Welcome to the Admin Dashboard</h3>
                <p>Manage student applications, view reports, and configure system settings from this central location.</p>
            </div>
        `;
        return;
    }
    
    postsFeed.innerHTML = allPosts.map(post => {
        const studentComments = JSON.parse(localStorage.getItem('studentComments') || '[]');
        const postComments = studentComments.filter(c => c && c.postId === post.id);
        const likesCount = (post && post.engagement && Array.isArray(post.engagement.likes)) ? post.engagement.likes.length : (post.likes || 0);
        
        // Test: Log image data
        console.log('Post', post.id, 'has image:', !!post.image, 'has images:', Array.isArray(post.images));

        return `
        <div class=\"post-card\">\n            <div class=\"post-header\">\n                <div class=\"post-author-avatar\">\n                    <i class=\"fas fa-user-shield\"></i>\n                </div>\n                <div class=\"post-author-info\">\n                    <h4>${post.author}</h4>\n                    <p>${formatDate(post.timestamp)}</p>\n                </div>\n                <span class=\"post-audience-badge ${post.audience}\">\n                    ${post.audience === 'students' ? 'GranTES Students' : 'Home Page'}\n                </span>\n            </div>\n            <div class=\"post-content\">\n                ${Array.isArray(post.images) && post.images.length > 1 ? renderCarousel(post.images) : (post.image ? `<div class="post-image"><img src="${post.image}" alt="post image"></div>` : '')}\n                <div class=\"post-text\">${post.content}</div>\n                ${post.type === 'media' ? '<div class=\"post-media\"><i class=\"fas fa-image\"></i> Media attached</div>' : ''}\n                ${post.type === 'live' ? '<div class=\"post-live\"><i class=\"fas fa-video\"></i> Live video</div>' : ''}\n                ${post.type === 'feeling' ? '<div class=\"post-feeling\"><i class=\"fas fa-smile\"></i> Feeling/Activity</div>' : ''}\n            </div>\n            <div class=\"post-actions-bar\">\n                <button class=\"post-action-bar-btn\" onclick=\"adminDeletePost(${post.id})\">\n                    <i class=\"fas fa-trash\"></i>\n                    <span>Delete</span>\n                </button>\n            </div>
            ${post.audience === 'students' ? `
            <div class=\"admin-comments-section\" style=\"margin-top:10px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;\">
                <div style="padding:8px 10px; font-weight:600; color:#111827; background:#f3f4f6; display:flex; align-items:center; gap:10px; border-bottom:1px solid #e5e7eb;">
                    <span><i class="fas fa-heart" style="color:#ef4444;"></i> ${likesCount} ${likesCount===1 ? 'Like' : 'Likes'}</span>
                    <span style="opacity:0.4">•</span>
                    <button onclick=\"toggleAdminComments(${post.id})\" style=\"background:none; border:none; color:#3b82f6; cursor:pointer; display:flex; align-items:center; gap:6px; font-weight:600;\">
                        <i class="fas fa-comments"></i>
                        <span>View Comments (${postComments.length})</span>
                    </button>
                </div>
                <div id=\"admin-comments-${post.id}\" style=\"display:none;\">
                    ${postComments.length > 0 ? postComments.map(c => `
                        <div class=\"admin-comment-row\" style=\"padding:8px 12px; border-bottom:1px solid #e5e7eb; background:#ffffff;\">
                            <strong>${c.author || 'Student'}</strong>: ${c.text || ''}
                            <span style=\"color:#9ca3af; font-size:12px; margin-left:6px;\">${c.timestamp ? formatDate(c.timestamp) : ''}</span>
                        </div>
                    `).join('') : '<div style=\"color:#9ca3af; font-style:italic; padding:12px; text-align:center;\">No comments yet</div>'}
                </div>
            </div>
            ` : ''}
        </div>
        `;
    }).join('');
}

function toggleLike(postId) {
    const allPosts = JSON.parse(localStorage.getItem('adminPosts') || '[]');
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    if (post.liked) {
        post.likes = Math.max(0, (post.likes || 0) - 1);
        post.liked = false;
    } else {
        post.likes = (post.likes || 0) + 1;
        post.liked = true;
    }
    localStorage.setItem('adminPosts', JSON.stringify(allPosts));
    loadAdminPosts();
}

function commentPost(postId) {
    const comment = prompt('Add a comment:');
    if (!comment || !comment.trim()) return;
    const allPosts = JSON.parse(localStorage.getItem('adminPosts') || '[]');
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    if (!Array.isArray(post.comments)) post.comments = [];
    post.comments.push({ id: Date.now(), author: 'Administrator', content: comment.trim(), timestamp: new Date().toISOString() });
    localStorage.setItem('adminPosts', JSON.stringify(allPosts));
    loadAdminPosts();
    showToast('Comment added!', 'success');
}

function sharePost(postId) {
    const allPosts = JSON.parse(localStorage.getItem('adminPosts') || '[]');
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    post.shares = (post.shares || 0) + 1;
    localStorage.setItem('adminPosts', JSON.stringify(allPosts));
    loadAdminPosts();
    showToast('Post shared!', 'success');
}

function adminDeletePost(postId) {
    if (!confirm('Delete this post permanently?')) return;
    const allPosts = JSON.parse(localStorage.getItem('adminPosts') || '[]');
    const updated = allPosts.filter(p => p.id !== postId);
    localStorage.setItem('adminPosts', JSON.stringify(updated));
    loadAdminPosts();
    try { loadHomeFeed(); } catch (_) { /* ignore */ }
    showToast('Post deleted', 'success');
}

function toggleAdminComments(postId) {
    const commentsDiv = document.getElementById(`admin-comments-${postId}`);
    if (!commentsDiv) return;
    
    if (commentsDiv.style.display === 'none') {
        commentsDiv.style.display = 'block';
    } else {
        commentsDiv.style.display = 'none';
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
    
    // Add active class to clicked tab button (only if called from a click)
    if (typeof event !== 'undefined' && event && event.target) {
        event.target.classList.add('active');
    } else {
        // If called programmatically, set active on the correct nav button
        const btn = document.querySelector(`#student-homepage .nav-tab-btn[onclick*="'${tabName}'"]`);
        if (btn) btn.classList.add('active');
    }
    
    // Load specific content based on tab
    switch(tabName) {
        case 'announcements':
            loadStudentAnnouncements();
            break;
        case 'messages':
            // Defer to ensure panel is visible before rendering
            setTimeout(loadStudentMessages, 0);
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

    // Push into shared chatMessages and persist
    const message = {
        id: Date.now(),
        sender: 'student',
        text: text,
        timestamp: new Date().toISOString(),
        studentId: currentUser.studentData.id
    };
    chatMessages.push(message);
    persistChatMessages();
    input.value = '';
    loadStudentMessages();
}

// simulateAdminResponse removed in favor of shared chatMessages

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
    const post = adminPosts.find(p => p && p.id === postId);
    if (!post) return;
    if (!post.engagement) post.engagement = { likes: [], comments: [], shares: [] };
    const currentId = currentUser && currentUser.studentData ? currentUser.studentData.id : null;
    if (currentId == null) return;
    const likeIdx = post.engagement.likes.findIndex(l => l && l.userId === currentId);
    if (likeIdx >= 0) {
        post.engagement.likes.splice(likeIdx, 1);
    } else {
        post.engagement.likes.push({ userId: currentId, userName: `${currentUser.studentData.firstName} ${currentUser.studentData.lastName}`, timestamp: new Date().toISOString() });
    }
    localStorage.setItem('adminPosts', JSON.stringify(adminPosts));
    loadStudentAnnouncements();
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

// Student Registration Modal Functions
function openStudentRegistrationModal() {
    document.getElementById('studentRegistrationModal').style.display = 'block';
    // Clear form
    document.getElementById('studentRegistrationForm').reset();
}

function closeStudentRegistrationModal() {
    document.getElementById('studentRegistrationModal').style.display = 'none';
}

function handleStudentRegistration(event) {
    event.preventDefault();
    
    const firstName = (document.getElementById('adminFirstName').value || '').trim();
    const lastName = (document.getElementById('adminLastName').value || '').trim();
    const studentId = (document.getElementById('adminStudentIdInput').value || '').trim();
    const email = (document.getElementById('adminEmail').value || '').trim();
    const awardNumber = (document.getElementById('adminAwardNumber').value || '').trim();
    const password = document.getElementById('adminPassword').value;
    const confirmPassword = document.getElementById('adminConfirmPassword').value;
    const course = (document.getElementById('adminCourse').value || '').trim();
    const place = (document.getElementById('adminPlace') && document.getElementById('adminPlace').value || '').trim();
    const department = (document.getElementById('adminDepartment') && document.getElementById('adminDepartment').value || '').trim();
    const year = (document.getElementById('adminYear').value || '').trim();
    const photoFile = document.getElementById('adminPhoto') ? document.getElementById('adminPhoto').files[0] : null;
    const isIndigenous = document.getElementById('adminIsIndigenous') ? document.getElementById('adminIsIndigenous').checked : false;
    const isPwd = document.getElementById('adminIsPwd') ? document.getElementById('adminIsPwd').checked : false;
    
    // Basic required validation
    if (!firstName || !lastName || !studentId || !email || !awardNumber || !department || !place || !course || !year) {
        showToast('Please complete all required fields', 'error');
        return;
    }
    // Validate passwords match
    if (password !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }
    
    // Load latest students data from localStorage
    const savedStudents = localStorage.getItem('students');
    if (savedStudents) {
        students = JSON.parse(savedStudents);
    }

    // Uniqueness validation (field-specific, ignore empty existing fields)
    const norm = (v) => (v || '').trim().toLowerCase();
    const existsStudentId = students.some(s => (s.studentId && norm(s.studentId) === norm(studentId)));
    const existsEmail = students.some(s => (s.email && norm(s.email) === norm(email)));
    const existsAward = students.some(s => (s.awardNumber && norm(s.awardNumber) === norm(awardNumber)));
    if (existsStudentId || existsEmail || existsAward) {
        let msg = 'Duplicate found:';
        const parts = [];
        if (existsStudentId) parts.push('Student ID');
        if (existsEmail) parts.push('Email');
        if (existsAward) parts.push('Award Number');
        showToast(`${msg} ${parts.join(', ')} already exists`, 'error');
        return;
    }
    
    // Helper to finalize save after optional image processing
    const finalizeSave = (idPictureDataUrl) => {
        // Create new student with unique ID
        const newStudent = {
            id: students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1,
            firstName: firstName,
            lastName: lastName,
            studentId: studentId,
            email: email,
            awardNumber: awardNumber,
            password: password,
            department: department,
            place: place,
            course: course,
            year: year,
            status: 'active',
            applicationStatus: 'none',
            registered: new Date().toISOString(),
            role: 'student',
            idPictureDataUrl: idPictureDataUrl || null,
            isIndigenous: isIndigenous,
            isPwd: isPwd
        };
        
        students.push(newStudent);
        localStorage.setItem('students', JSON.stringify(students));
        
        closeStudentRegistrationModal();
        showToast('Student registered successfully!', 'success');
        showAdminTab('students');
    };

    if (photoFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            finalizeSave(e.target.result);
        };
        reader.readAsDataURL(photoFile);
    } else {
        finalizeSave(null);
    }
}

// Bulk Registration Modal Functions
function openBulkRegistrationModal() {
    document.getElementById('bulkRegistrationModal').style.display = 'block';
    // Reset to step 1
    document.getElementById('bulkStep1').classList.add('active');
    document.getElementById('bulkStep2').classList.remove('active');
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('processFileBtn').disabled = true;
}

function closeBulkRegistrationModal() {
    document.getElementById('bulkRegistrationModal').style.display = 'none';
}

// Admin Tab Navigation
function showAdminTab(tabName) {
    // Scope to admin dashboard only
    const adminSection = document.getElementById('admin-dashboard');
    const homepageContent = document.getElementById('admin-homepage');
    const tabContent = adminSection ? adminSection.querySelector('.tab-content') : null;
    const navTabs = adminSection ? adminSection.querySelector('.admin-nav-tabs') : null;
    
    if (!adminSection || !homepageContent || !tabContent || !navTabs) {
        return;
    }
    
    if (tabName === 'homepage') {
        homepageContent.style.display = 'block';
        tabContent.style.display = 'none';
        navTabs.style.display = 'none';
        return;
    }
    
    // Show tab content within admin section
    homepageContent.style.display = 'none';
    tabContent.style.display = 'block';
    navTabs.style.display = 'flex';
    
    // Hide all admin tab panels and deactivate tab buttons
    adminSection.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    adminSection.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Activate selected tab panel
    const targetPanel = document.getElementById(`${tabName}-tab`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
    
    // Mark clicked button active if this came from a click
    if (typeof event !== 'undefined' && event && event.target) {
        event.target.classList.add('active');
    }
    
    // Load content
    switch(tabName) {
        case 'applications':
            loadApplications();
            break;
        case 'students':
            // When navigating via Students tab, always default to Active
            studentsViewFilter = 'active';
            loadStudents();
            break;
        case 'reports':
            loadReports();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Load Applications Tab
function loadApplications() {
    const container = document.getElementById('applicationsContainer');
    
    if (applications.length === 0) {
        container.innerHTML = '<p class="no-data">No applications found.</p>';
        return;
    }
    
    const applicationsHTML = applications.map(app => `
        <div class="application-item">
            <div class="application-header">
                <h4>${app.firstName} ${app.lastName}</h4>
                <span class="status-badge status-${app.status}">${app.status.toUpperCase()}</span>
            </div>
            <div class="application-info">
                <div class="info-item">
                    <span class="info-label">Student ID:</span>
                    <span class="info-value">${app.studentId}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${app.email}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Course:</span>
                    <span class="info-value">${app.course}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Year:</span>
                    <span class="info-value">${app.year}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Applied:</span>
                    <span class="info-value">${formatDate(app.appliedDate)}</span>
                </div>
            </div>
            <div class="application-actions">
                <button class="btn btn-primary" onclick="reviewApplication(${app.id})">Review</button>
                <button class="btn btn-success" onclick="updateApplicationStatus(${app.id}, 'approved')">Approve</button>
                <button class="btn btn-danger" onclick="updateApplicationStatus(${app.id}, 'rejected')">Reject</button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = applicationsHTML;
}

// Load Students Tab
function loadStudents() {
    const container = document.getElementById('studentsContainer');
    if (!container) {
        console.log('studentsContainer not found!');
        return;
    }
    // Remove legacy fallback that mirrored awardNumber into studentId to avoid confusion
    const filteredStudents = filterStudentsByStatus();
    if (filteredStudents.length === 0) {
        container.innerHTML = '<p class="no-data">No students found.</p>';
        return;
    }
    container.innerHTML = filteredStudents.map((student, index) => {
        const isArchived = (student.status || 'active') === 'archived';
        return `
            <div class="student-item">
                <div class="student-header">
                    <h4><span class="student-index">${index + 1}</span>${student.firstName || ''} ${student.lastName || ''}</h4>
                    ${isArchived ? '<span class="status-badge status-archived">ARCHIVED</span>' : ''}
                </div>
                <div class="student-info">
                    <div class="info-item">
                        <span class="info-label">Student ID</span>
                        <span class="info-value">${student.studentId || 'N/A'}</span>
                    </div>
                </div>
                <div class="student-actions">
                    <button class="btn btn-secondary" onclick="openStudentProfileModal(${student.id})">View Profile</button>
                    ${isArchived ? `<button class="btn btn-success" onclick="activateStudent(${student.id})">Activate</button>` : `<button class="btn btn-secondary" onclick="editStudent(${student.id})">Edit</button><button class="btn btn-secondary" onclick="archiveStudent(${student.id})">Archive</button>`}
                    <button class="btn btn-danger" onclick="deleteStudent(${student.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Load Reports Tab
function loadReports() {
    const departmentChart = document.getElementById('departmentChart');
    const departmentSummary = document.getElementById('departmentSummary');
    const placeChart = document.getElementById('placeChart');
    const placeSummary = document.getElementById('placeSummary');

    // Department analysis (ACTIVE students only)
    if (departmentChart && departmentSummary) {
        const studentsArr = JSON.parse(localStorage.getItem('students') || '[]');
        const active = studentsArr.filter(s => (s.status || 'active') === 'active');
        const deptCounts = active.reduce((acc, s) => {
            const d = (s && s.department) ? s.department : 'Unspecified';
            acc[d] = (acc[d] || 0) + 1;
            return acc;
        }, {});
        if (Object.keys(deptCounts).length === 0) {
            departmentSummary.innerHTML = '<p class="no-data">No department data available.</p>';
            const ctx = departmentChart.getContext('2d');
            ctx.clearRect(0, 0, departmentChart.width, departmentChart.height);
        } else {
            drawSimpleChart(departmentChart, deptCounts, { hideLabels: false, labelFormatter: abbreviateDepartment });
            const total = Object.values(deptCounts).reduce((a, b) => a + b, 0);
            const sorted = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]);
            departmentSummary.innerHTML = `
                <ul class="dept-summary-list">
                    ${sorted.map(([name, count], idx) => {
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const color = `hsl(${(idx * 53) % 360}, 70%, 55%)`;
                        const abbr = abbreviateDepartment(name);
                        return `<li title="${name}">
                            <span class="dept-color-dot" style="background:${color}"></span>
                            <span class="dept-name">${abbr}</span>
                            <span class="dept-count">${count} (${pct}%)</span>
                        </li>`;
                    }).join('')}
                </ul>
            `;
        }
    }

    // From (place) analysis (ACTIVE students only)
    if (placeChart && placeSummary) {
        const studentsArr = JSON.parse(localStorage.getItem('students') || '[]');
        const active = studentsArr.filter(s => (s.status || 'active') === 'active');
        const placeCounts = active.reduce((acc, s) => {
            const p = (s && s.place && s.place.trim()) ? s.place.trim() : 'Unspecified';
            acc[p] = (acc[p] || 0) + 1;
            return acc;
        }, {});
        if (Object.keys(placeCounts).length === 0) {
            placeSummary.innerHTML = '<p class="no-data">No origin data available.</p>';
            const ctx = placeChart.getContext('2d');
            ctx.clearRect(0, 0, placeChart.width, placeChart.height);
        } else {
            // Hide labels under bars; values only on top
            drawSimpleChart(placeChart, placeCounts, { hideLabels: true });
            const total = Object.values(placeCounts).reduce((a, b) => a + b, 0);
            const sorted = Object.entries(placeCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);
            placeSummary.innerHTML = `
                <ul class="dept-summary-list">
                    ${sorted.map(([name, count], idx) => {
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const color = `hsl(${(idx * 53) % 360}, 70%, 55%)`;
                        return `<li title="${name}">
                            <span class="dept-color-dot" style="background:${color}"></span>
                            <span class="dept-name">${(name || 'Unspecified').toLowerCase()}</span>
                            <span class="dept-count">${count} (${pct}%)</span>
                        </li>`;
                    }).join('')}
                </ul>
            `;
        }
    }
}

// Load Settings Tab
function loadSettings() {
	// Prefill admin credentials into the Settings tab
	const adminEmailEl = document.getElementById('adminEmailSetting');
	const adminPasswordEl = document.getElementById('adminPasswordSetting');
	const adminPasswordConfirmEl = document.getElementById('adminPasswordConfirmSetting');
	const adminLookup = document.getElementById('adminStudentLookup');
	const resultsBox = document.getElementById('adminStudentSearchResults');
	const selectedIdEl = document.getElementById('adminSelectedStudentId');
	const awardEl = document.getElementById('adminStudentNewAward');
	const passEl = document.getElementById('adminStudentNewPassword');
	const pass2El = document.getElementById('adminStudentNewPasswordConfirm');
	const updateBtn = document.getElementById('adminUpdateStudentBtn');

	try {
		const creds = getAdminCredentials();
		if (adminEmailEl) adminEmailEl.value = creds.email || '';
		if (adminPasswordEl) adminPasswordEl.value = '';
		if (adminPasswordConfirmEl) adminPasswordConfirmEl.value = '';
	} catch (_) {}

	// Wire up live search for student lookup
	if (adminLookup && resultsBox) {
		adminLookup.oninput = function() {
			const q = (adminLookup.value || '').trim().toLowerCase();
			// Reset selection and disable fields until a student is selected
			if (selectedIdEl) selectedIdEl.value = '';
			if (awardEl) { awardEl.value = ''; awardEl.disabled = true; }
			if (passEl) { passEl.value = ''; passEl.disabled = true; }
			if (pass2El) { pass2El.value = ''; pass2El.disabled = true; }
			if (updateBtn) updateBtn.disabled = true;

			if (!q) {
				resultsBox.style.display = 'none';
				resultsBox.innerHTML = '';
				return;
			}
			const students = JSON.parse(localStorage.getItem('students') || '[]');
			const matches = students.filter(s => {
				if (!s) return false;
				const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
				const email = (s.email || '').toLowerCase();
				const award = (s.awardNumber || '').toLowerCase();
				const sid = (s.studentId || '').toLowerCase();
				return name.includes(q) || email.includes(q) || award.includes(q) || sid.includes(q);
			}).slice(0, 10);
			if (matches.length === 0) {
				resultsBox.style.display = 'none';
				resultsBox.innerHTML = '';
				return;
			}
			resultsBox.innerHTML = matches.map(s => `
				<div class="result-item" data-id="${s.id}">
					<div class="result-name">${(s.firstName || '')} ${(s.lastName || '')}</div>
					<div class="result-meta">${s.studentId || ''} • ${s.awardNumber || ''} • ${s.email || ''}</div>
				</div>
			`).join('');
			resultsBox.style.display = 'block';
			// Click handler for results
			Array.from(resultsBox.querySelectorAll('.result-item')).forEach(item => {
				item.onclick = function() {
					const id = parseInt(this.getAttribute('data-id'));
					try {
						const list = JSON.parse(localStorage.getItem('students') || '[]');
						const found = list.find(s => s && s.id === id);
						if (found) {
							if (selectedIdEl) selectedIdEl.value = String(found.id);
							if (awardEl) { awardEl.disabled = false; awardEl.value = found.awardNumber || ''; }
							if (passEl) { passEl.disabled = false; passEl.value = ''; }
							if (pass2El) { pass2El.disabled = false; pass2El.value = ''; }
							const showPwCtl = document.getElementById('adminShowPasswords');
							if (showPwCtl) { showPwCtl.disabled = false; showPwCtl.checked = false; }
							if (updateBtn) updateBtn.disabled = false;
						}
					} catch (_) {}
					adminLookup.value = this.querySelector('.result-meta').textContent;
					resultsBox.style.display = 'none';
					resultsBox.innerHTML = '';
				};
			});
		};
	}

	// Outside-click to close search results
	document.addEventListener('click', function(e) {
		if (!resultsBox) return;
		const within = e.target === resultsBox || (adminLookup && e.target === adminLookup) || (resultsBox.contains && resultsBox.contains(e.target));
		if (!within) {
			resultsBox.style.display = 'none';
		}
	});

	// Show/Hide password toggle
	const showPw = document.getElementById('adminShowPasswords');
	if (showPw) {
		// Ensure default disabled state until a student is selected
		showPw.disabled = !passEl || passEl.disabled;
		showPw.onchange = function() {
			const type = this.checked ? 'text' : 'password';
			if (passEl) passEl.type = type;
			if (pass2El) pass2El.type = type;
		};
	}

	// Live award uniqueness validation
	if (awardEl) {
		awardEl.oninput = function() {
			const hint = document.getElementById('adminAwardValidation');
			if (!hint) return;
			const value = (awardEl.value || '').trim().toLowerCase();
			const selectedId = selectedIdEl && selectedIdEl.value ? parseInt(selectedIdEl.value) : null;
			if (!value || !selectedId) { 
				hint.textContent = ''; 
				hint.className = 'input-hint'; 
				if (updateBtn) updateBtn.disabled = false; 
				return; 
			}
			try {
				const list = JSON.parse(localStorage.getItem('students') || '[]');
				const taken = list.some(s => s && s.id !== selectedId && s.awardNumber && String(s.awardNumber).toLowerCase() === value);
				if (taken) {
					hint.textContent = 'This award number is already in use.';
					hint.className = 'input-hint error';
					if (updateBtn) updateBtn.disabled = true;
				} else {
					hint.textContent = 'Award number is available.';
					hint.className = 'input-hint success';
					if (updateBtn) updateBtn.disabled = false;
				}
			} catch (_) { /* ignore */ }
		};
	}

	// Enable update when passwords valid and matching
	function validatePasswordInputs() {
		if (!passEl || !pass2El || !updateBtn) return;
		const p1 = (passEl.value || '').trim();
		const p2 = (pass2El.value || '').trim();
		const hint = document.getElementById('adminPasswordValidation');
		if (!p1 && !p2) { if (hint) { hint.textContent = ''; hint.className = 'input-hint'; } return; }
		if (p1.length < 6) {
			if (hint) { hint.textContent = 'Password must be at least 6 characters.'; hint.className = 'input-hint error'; }
			updateBtn.disabled = true;
			return;
		}
		if (p1 !== p2) {
			if (hint) { hint.textContent = 'Passwords do not match.'; hint.className = 'input-hint error'; }
			updateBtn.disabled = true;
			return;
		}
		if (hint) { hint.textContent = 'Password looks good.'; hint.className = 'input-hint success'; }
		updateBtn.disabled = false;
	}
	if (passEl) passEl.oninput = validatePasswordInputs;
	if (pass2El) pass2El.oninput = validatePasswordInputs;
}

// Student Management Functions
function viewStudentProfile(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    // Populate modal with student data
    document.getElementById('adminStudentName').textContent = `${student.firstName} ${student.lastName}`;
    document.getElementById('adminStudentEmail').textContent = student.email;
    document.getElementById('adminStudentId').textContent = student.studentId;
    document.getElementById('adminStudentCourse').textContent = student.course;
    document.getElementById('adminStudentYear').textContent = student.year;
    document.getElementById('adminStudentStatus').textContent = student.status;
    document.getElementById('adminStudentAppStatus').textContent = student.applicationStatus || 'N/A';
    document.getElementById('adminStudentRegistered').textContent = formatDate(student.registered);
    
    // Set student ID picture if available
    const img = document.getElementById('adminStudentPhoto');
    if (img) {
        if (student.idPictureDataUrl) {
            img.src = student.idPictureDataUrl;
            img.alt = 'Student ID Picture';
        } else {
            img.src = '';
            img.alt = 'No ID Picture available';
        }
    }
    
    // Show modal
    document.getElementById('studentProfileModal').style.display = 'block';
}

function closeStudentProfileModal() {
    document.getElementById('studentProfileModal').style.display = 'none';
}

function editStudent(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) {
        showToast('Student not found!', 'error');
        return;
    }
    
    // Populate the edit form with current student data
    document.getElementById('editStudentId').value = student.id;
    document.getElementById('editFirstName').value = student.firstName || '';
    document.getElementById('editLastName').value = student.lastName || '';
    document.getElementById('editStudentIdInput').value = student.studentId || '';
    document.getElementById('editEmail').value = student.email || '';
    // Award number and password removed from Edit modal
    document.getElementById('editDepartment').value = student.department || '';
    document.getElementById('editPlace').value = student.place || '';
    document.getElementById('editCourse').value = student.course || '';
    document.getElementById('editYear').value = student.year || '';
    document.getElementById('editIsIndigenous').checked = student.isIndigenous || false;
    document.getElementById('editIsPwd').checked = student.isPwd || false;
    
    // Show current photo if available
    const currentPhotoPreview = document.getElementById('currentPhotoPreview');
    if (student.idPictureDataUrl) {
        currentPhotoPreview.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${student.idPictureDataUrl}" alt="Current ID Picture" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 2px solid #e2e8f0;">
                <span style="font-size: 0.9rem; color: #64748b;">Current ID Picture</span>
            </div>
        `;
    } else {
        currentPhotoPreview.innerHTML = '<span style="font-size: 0.9rem; color: #64748b;">No current ID picture</span>';
    }
    
    // Show the modal
    document.getElementById('editStudentModal').style.display = 'block';
}

function closeEditStudentModal() {
    document.getElementById('editStudentModal').style.display = 'none';
    // Clear the form
    document.getElementById('editStudentForm').reset();
    document.getElementById('currentPhotoPreview').innerHTML = '';
}

function handleEditStudent(event) {
    event.preventDefault();
    
    const studentId = parseInt(document.getElementById('editStudentId').value);
    const firstName = document.getElementById('editFirstName').value.trim();
    const lastName = document.getElementById('editLastName').value.trim();
    const studentIdInput = document.getElementById('editStudentIdInput').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const awardNumber = undefined; // removed from form
    const password = undefined; // removed from form
    const confirmPassword = undefined; // removed from form
    const department = document.getElementById('editDepartment').value;
    const place = document.getElementById('editPlace').value.trim();
    const course = document.getElementById('editCourse').value.trim();
    const year = document.getElementById('editYear').value;
    const photoFile = document.getElementById('editPhoto').files[0];
    const isIndigenous = document.getElementById('editIsIndigenous').checked;
    const isPwd = document.getElementById('editIsPwd').checked;
    
    // Validation
    if (!firstName || !lastName || !studentIdInput || !email || !department || !place || !course || !year) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Check for duplicate email or award number (excluding current student)
    const existingStudent = students.find(s => s.id !== studentId && (s.email === email));
    if (existingStudent) {
        showToast('Email or Award Number already exists for another student', 'error');
        return;
    }
    
    // Find the student to update
    const studentIndex = students.findIndex(s => s.id === studentId);
    if (studentIndex === -1) {
        showToast('Student not found', 'error');
        return;
    }
    
    // Helper to finalize update after optional image processing
    const finalizeUpdate = (idPictureDataUrl) => {
        // Update student data
        students[studentIndex] = {
            ...students[studentIndex],
            firstName: firstName,
            lastName: lastName,
            studentId: studentIdInput,
            email: email,
            // awardNumber and password unchanged
            department: department,
            place: place,
            course: course,
            year: year,
            isIndigenous: isIndigenous,
            isPwd: isPwd,
            idPictureDataUrl: idPictureDataUrl !== undefined ? idPictureDataUrl : students[studentIndex].idPictureDataUrl
        };
        
        // Save to localStorage
        localStorage.setItem('students', JSON.stringify(students));
        
        // Close modal and refresh
        closeEditStudentModal();
        loadStudents();
        showToast('Student updated successfully!', 'success');
    };
    
    if (photoFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            finalizeUpdate(e.target.result);
        };
        reader.readAsDataURL(photoFile);
    } else {
        // Keep existing photo if no new one uploaded
        finalizeUpdate(undefined);
    }
}

function archiveStudent(studentId) {
    if (confirm('Are you sure you want to archive this student?')) {
        const student = students.find(s => s.id === studentId);
        if (student) {
            student.status = 'archived';
            localStorage.setItem('students', JSON.stringify(students));
            loadStudents();
            loadAdminDashboard();
            try { loadReports(); } catch (_) {}
            showToast('Student archived successfully!', 'success');
        }
    }
}

// Application Management Functions
function reviewApplication(applicationId) {
    const application = applications.find(app => app.id === applicationId);
    if (!application) return;
    
    currentApplicationId = applicationId;
    
    // Populate modal with application details
    const detailsContainer = document.getElementById('applicationDetails');
    detailsContainer.innerHTML = `
        <div class="application-details">
            <h4>Application Details</h4>
            <div class="detail-row">
                <strong>Name:</strong>
                <span>${application.firstName} ${application.lastName}</span>
            </div>
            <div class="detail-row">
                <strong>Student ID:</strong>
                <span>${application.studentId}</span>
            </div>
            <div class="detail-row">
                <strong>Email:</strong>
                <span>${application.email}</span>
            </div>
            <div class="detail-row">
                <strong>Course:</strong>
                <span>${application.course}</span>
            </div>
            <div class="detail-row">
                <strong>Year Level:</strong>
                <span>${application.year}</span>
            </div>
            <div class="detail-row">
                <strong>Applied Date:</strong>
                <span>${formatDate(application.appliedDate)}</span>
            </div>
            <div class="detail-row">
                <strong>Status:</strong>
                <span class="status-badge status-${application.status}">${application.status.toUpperCase()}</span>
            </div>
        </div>
    `;
    
    // Show modal
    document.getElementById('reviewModal').style.display = 'block';
}

function updateApplicationStatus(applicationId, status) {
    const application = applications.find(app => app.id === applicationId);
    if (!application) return;
    
    application.status = status;
    application.reviewedDate = new Date().toISOString();
    
    // Save to localStorage
    localStorage.setItem('applications', JSON.stringify(applications));
    
    // Reload applications
    loadApplications();
    
    // Close modal if open
    closeModal();
    
    // Show success message
    showToast(`Application ${status} successfully!`, 'success');
}

// Filter and Search Functions
function filterApplications() {
    loadApplications();
}

function searchApplications() {
    loadApplications();
}

function filterStudents() {
    loadStudents();
}

function searchStudents() {
    loadStudents();
}
