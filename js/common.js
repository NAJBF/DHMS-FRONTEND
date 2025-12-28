// Common functions for all dashboards - DHMS Frontend
// API Base URL - matches backend endpoint structure
window.API_BASE_URL = window.API_BASE_URL || 'https://dhms-b8w3.onrender.com/aau-dhms-api';

// Demo mode flag
window.DEMO_MODE = localStorage.getItem('demo_mode') === 'true';

// JWT decode function
function decodeJWT(token) {
    if (!token) return {};
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    } catch (e) {
        return {};
    }
}

// Check if token is expired
function isTokenExpired(token) {
    if (!token) return true;
    try {
        const decoded = decodeJWT(token);
        if (!decoded.exp) return false;
        return Date.now() >= decoded.exp * 1000;
    } catch (e) {
        return true;
    }
}

// Alert container for showing messages
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert-toast');
    existingAlerts.forEach(alert => alert.remove());

    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert-toast alert-${type}`;

    // Set icon based on type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';

    alert.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
        <button class="alert-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add styles if not present
    if (!document.getElementById('alert-styles')) {
        const style = document.createElement('style');
        style.id = 'alert-styles';
        style.textContent = `
            .alert-toast {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 10000;
                animation: slideIn 0.3s ease;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            .alert-warning { background: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
            .alert-info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
            .alert-close { 
                background: none; 
                border: none; 
                cursor: pointer; 
                padding: 0;
                margin-left: 10px;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(alert);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => alert.remove(), 300);
        }
    }, 5000);
}

// Mock data function for demo mode
function getMockData(endpoint, options = {}) {
    const method = options.method || 'GET';

    const mockData = {
        // Student endpoints - matching actual backend structure
        '/students/dashboard/': {
            student: {
                id: 1,
                student_code: 'STU-1200-DEMO',
                full_name: 'John Student',
                email: 'student@aau.edu.et',
                phone: null,
                student_type: 'government',
                academic_year: 1,
                department: 'Computer Science'
            },
            room: {
                id: 1,
                room_number: '204',
                dorm_name: 'Unity Dorm',
                floor: 2,
                check_in_date: '2024-09-01',
                expected_check_out: '2025-06-30',
                roommate: {
                    id: 2,
                    full_name: 'Jane Doe',
                    student_code: 'STU-1201-DEMO'
                }
            },
            stats: {
                active_penalties: 0,
                pending_maintenance: 0,
                pending_laundry: 0
            }
        },
        '/students/room/': {
            room: {
                id: 1,
                room_number: '204',
                dorm: {
                    id: 1,
                    name: 'Unity Dorm',
                    type: 'male',
                    location: 'Campus A'
                },
                capacity: 4,
                current_occupancy: 2,
                floor: 2,
                amenities: ['Desk', 'Wardrobe', 'Bed']
            },
            roommates: [
                { id: 1, full_name: 'John Student', student_code: 'STU-1200-DEMO', year_of_study: 1 },
                { id: 2, full_name: 'Jane Doe', student_code: 'STU-1201-DEMO', year_of_study: 1 }
            ]
        },
        '/students/maintenance/': [],
        '/students/laundry/': [],
        '/students/penalties/': { penalties: [] },

        // Proctor endpoints
        '/proctors/dashboard/': {
            total_students: 6,
            pending_maintenance: 0,
            active_penalties: 2,
            pending_laundry: 0
        },
        '/proctors/students/': [
            { id: 1, student_id: 'ugr/1200/18', name: 'John Student', room_number: '204', penalties_count: 0 },
            { id: 2, student_id: 'ugr/1201/17', name: 'Jane Doe', room_number: '205', penalties_count: 1 }
        ],
        '/proctors/maintenance/pending/': [],
        '/proctors/laundry/pending/': [],

        // Security endpoints
        '/security/dashboard/': {
            students_in_campus: 150,
            students_out_campus: 10,
            pending_laundry: 3,
            scanned_today: 25
        },
        '/security/laundry/pending/': [],

        // Staff endpoints
        '/staff/dashboard/': {
            pending_jobs: 0,
            in_progress_jobs: 0,
            completed_jobs: 0
        },
        '/staff/maintenance/': [],
        '/staff/maintenance/my-jobs/': [],

        // Dorms and rooms
        '/dorms/': [
            { id: 1, name: 'Unity Dorm', gender: 'male', total_rooms: 50 },
            { id: 2, name: 'Peace Dorm', gender: 'female', total_rooms: 45 },
            { id: 3, name: 'Knowledge Hall', gender: 'male', total_rooms: 60 }
        ],
        '/rooms/available/': [
            { id: 1, room_number: '101', dorm_name: 'Unity Dorm', floor: 1, capacity: 2, current_occupancy: 0 },
            { id: 2, room_number: '102', dorm_name: 'Unity Dorm', floor: 1, capacity: 2, current_occupancy: 1 },
            { id: 3, room_number: '201', dorm_name: 'Peace Dorm', floor: 2, capacity: 2, current_occupancy: 0 }
        ]
    };

    // Handle POST requests with mock responses
    if (method === 'POST') {
        const body = options.body ? JSON.parse(options.body) : {};

        if (endpoint === '/students/maintenance/') {
            return Promise.resolve({
                id: Date.now(),
                request_code: 'MNT-' + Date.now().toString().slice(-6),
                ...body,
                status: 'pending_proctor',
                reported_date: new Date().toISOString()
            });
        }

        if (endpoint === '/students/laundry/') {
            return Promise.resolve({
                id: Date.now(),
                form_code: 'LAU-' + Date.now().toString().slice(-6),
                ...body,
                status: 'pending_proctor',
                submission_date: new Date().toISOString()
            });
        }

        if (endpoint === '/proctors/penalties/') {
            return Promise.resolve({
                id: Date.now(),
                penalty_code: 'PEN-' + Date.now().toString().slice(-6),
                ...body,
                status: 'active',
                assigned_date: new Date().toISOString()
            });
        }

        if (endpoint === '/proctors/assign-room/') {
            return Promise.resolve({
                id: Date.now(),
                ...body,
                status: 'active'
            });
        }
    }

    // Add delay to simulate network
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(mockData[endpoint] || {});
        }, 300);
    });
}

// API request wrapper with token handling
async function apiRequest(endpoint, options = {}) {
    // If in demo mode, return mock data
    if (window.DEMO_MODE) {
        console.log('Demo mode: Mocking API request to', endpoint);
        return getMockData(endpoint, options);
    }

    const token = localStorage.getItem('token');
    const url = `${window.API_BASE_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        // Handle 401 Unauthorized - try to refresh token
        if (response.status === 401) {
            const refreshToken = localStorage.getItem('refresh');
            if (refreshToken && !isTokenExpired(refreshToken)) {
                try {
                    const refreshResponse = await fetch(`${window.API_BASE_URL}/auth/refresh/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refresh: refreshToken })
                    });

                    if (refreshResponse.ok) {
                        const data = await refreshResponse.json();
                        localStorage.setItem('token', data.access);
                        if (data.refresh) {
                            localStorage.setItem('refresh', data.refresh);
                        }

                        // Retry original request with new token
                        headers['Authorization'] = `Bearer ${data.access}`;
                        const retryResponse = await fetch(url, {
                            ...options,
                            headers
                        });

                        if (!retryResponse.ok) {
                            throw new Error(`API Error ${retryResponse.status}`);
                        }
                        const retryData = await retryResponse.json();
                        // Unwrap the response if it has success/data structure
                        return unwrapResponse(retryData);
                    }
                } catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);
                    logout();
                    return null;
                }
            } else {
                logout();
                return null;
            }
        }

        // Handle other errors
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error ${response.status}:`, errorText);
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        // Handle empty response (204 No Content)
        if (response.status === 204) {
            return {};
        }

        // Return JSON response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const jsonData = await response.json();
            // Unwrap the response if it has success/data structure
            return unwrapResponse(jsonData);
        }

        return {};

    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Unwrap API response that has {success, data} or {success, user} structure
function unwrapResponse(response) {
    // Check if response has the success wrapper
    if (response && typeof response === 'object' && 'success' in response) {
        if (!response.success) {
            // Handle error response
            throw new Error(response.message || response.error || 'API request failed');
        }

        // Check for various wrapper patterns
        if ('data' in response) {
            return response.data;
        }
        if ('user' in response) {
            // Special case for /auth/me/ which returns {success, user}
            return response;  // Return as-is so caller can extract .user
        }

        // For responses that just have success: true with other fields
        // Remove success and return the rest
        const { success, ...rest } = response;
        if (Object.keys(rest).length > 0) {
            return rest;
        }
    }
    // Return as-is if not wrapped
    return response;
}

// Logout function
async function logout() {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refresh');

    // Try to logout via API if we have a token
    if (token && !window.DEMO_MODE) {
        try {
            await fetch(`${window.API_BASE_URL}/auth/logout/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh: refreshToken })
            });
        } catch (error) {
            console.log('Logout API call failed:', error);
        }
    }

    // Clear all storage
    localStorage.clear();
    window.location.href = 'index.html';
}

// Initialize dashboard - check auth and setup UI
function initDashboard() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    // Get current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // If not on login page and not authenticated, redirect to login
    if (!currentPage.includes('index.html') && (!user || !token)) {
        console.log('Not authenticated, redirecting to login');
        window.location.href = 'index.html';
        return null;
    }

    // If on login page with valid auth, redirect to dashboard
    if (currentPage.includes('index.html') && user && token) {
        // This is handled by login.js
        return null;
    }

    // Check if user has correct role for current page
    if (user && user.role) {
        const role = user.role.toLowerCase();
        const pageRoleMap = {
            'dashboard_student.html': 'student',
            'dashboard_proctor.html': 'proctor',
            'dashboard_security.html': 'security',
            'dashboard_staff.html': 'staff'
        };

        const expectedRole = pageRoleMap[currentPage];
        if (expectedRole && role !== expectedRole) {
            console.log('User role mismatch. User:', role, 'Expected:', expectedRole);
            // Redirect to correct dashboard
            const dashboards = {
                'student': 'dashboard_student.html',
                'proctor': 'dashboard_proctor.html',
                'security': 'dashboard_security.html',
                'staff': 'dashboard_staff.html'
            };
            const correctDashboard = dashboards[role];
            if (correctDashboard && correctDashboard !== currentPage) {
                console.log('Redirecting to correct dashboard:', correctDashboard);
                window.location.href = correctDashboard;
                return null;
            }
        }
    }

    // Check if token is expired (skip for demo mode)
    if (!window.DEMO_MODE && token && isTokenExpired(token)) {
        const refreshToken = localStorage.getItem('refresh');
        if (!refreshToken || isTokenExpired(refreshToken)) {
            console.log('Token expired, logging out');
            logout();
            return null;
        }
    }

    // Menu toggle functionality
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function () {
            sidebar.classList.toggle('active');
        });

        document.addEventListener('click', function (e) {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }

    return user;
}

// Get current user from API
async function getCurrentUser() {
    try {
        const response = await apiRequest('/auth/me/');
        // Response is unwrapped by apiRequest, but /auth/me/ returns {user: {...}}
        // after unwrapping {success, data}, we get the user object
        const userInfo = response.user || response;

        if (userInfo) {
            const mappedUser = {
                id: userInfo.id,
                username: userInfo.username,
                role: userInfo.role,
                name: userInfo.full_name || userInfo.username,
                full_name: userInfo.full_name,
                email: userInfo.email,
                phone: userInfo.phone,
                permissions: userInfo.permissions || []
            };
            localStorage.setItem('user', JSON.stringify(mappedUser));
            return mappedUser;
        }
    } catch (error) {
        console.log('Failed to get current user:', error);
    }
    return JSON.parse(localStorage.getItem('user'));
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format datetime for display
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// Calculate end date from start date and duration
function calculateEndDate(startDate, durationDays) {
    const start = new Date(startDate);
    start.setDate(start.getDate() + parseInt(durationDays));
    return start.toISOString().split('T')[0];
}