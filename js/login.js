// Login functionality - DHMS Frontend
document.addEventListener('DOMContentLoaded', function () {
    // Set API base URL if not already set
    if (!window.API_BASE_URL) {
        window.API_BASE_URL = 'https://dhms-b8w3.onrender.com/aau-dhms-api';
    }

    // Check if already logged in - redirect to appropriate dashboard
    const existingToken = localStorage.getItem('token');
    const existingUser = localStorage.getItem('user');
    if (existingToken && existingUser) {
        try {
            const user = JSON.parse(existingUser);
            if (user && user.role) {
                redirectToDashboard(user.role);
                return;
            }
        } catch (e) {
            // Clear invalid data
            localStorage.clear();
        }
    }

    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            showLoginError('Please enter both ID and password');
            return;
        }

        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        submitBtn.disabled = true;

        try {
            // Attempt backend API login
            console.log('Attempting backend login for:', username);
            const response = await fetch(`${window.API_BASE_URL}/auth/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            console.log('Login response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Login response data:', data);

                // Check if login was successful
                if (data.success === false) {
                    showLoginError(data.message || 'Login failed');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    return;
                }

                // Backend returns "token" not "access" for the JWT token
                const accessToken = data.token || data.access;
                const refreshToken = data.refresh;

                if (!accessToken) {
                    showLoginError('Invalid response from server');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    return;
                }

                // Store tokens
                localStorage.setItem('token', accessToken);
                if (refreshToken) {
                    localStorage.setItem('refresh', refreshToken);
                }
                localStorage.removeItem('demo_mode');

                // Get user data - backend returns user in login response
                let userData = null;

                if (data.user) {
                    // User data is included in login response
                    userData = {
                        id: data.user.id,
                        username: data.user.username,
                        role: data.user.role,
                        name: data.user.full_name || data.user.username,
                        full_name: data.user.full_name,
                        email: data.user.email,
                        phone: data.user.phone,
                        permissions: data.user.permissions || []
                    };
                } else {
                    // Try to get user data from /auth/me/ endpoint
                    try {
                        const userResponse = await fetch(`${window.API_BASE_URL}/auth/me/`, {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (userResponse.ok) {
                            const userResult = await userResponse.json();
                            // /auth/me/ response is wrapped in {success, user}
                            const userInfo = userResult.user || userResult;

                            userData = {
                                id: userInfo.id,
                                username: userInfo.username,
                                role: userInfo.role,
                                name: userInfo.full_name || userInfo.username,
                                full_name: userInfo.full_name,
                                email: userInfo.email,
                                phone: userInfo.phone,
                                permissions: userInfo.permissions || []
                            };
                        }
                    } catch (userError) {
                        console.log('Could not fetch user from /auth/me/:', userError);
                    }
                }

                // If still no user data, create from username
                if (!userData) {
                    const userRole = determineRoleFromUsername(username);
                    userData = {
                        id: username,
                        username: username,
                        role: userRole,
                        name: username,
                        email: null
                    };
                }

                // Store user data
                localStorage.setItem('user', JSON.stringify(userData));
                console.log('Stored user data:', userData);
                console.log('User role:', userData.role);

                // Show success and redirect
                showLoginSuccess('Login successful! Redirecting...');

                // Redirect based on role - use setTimeout to ensure storage is complete
                setTimeout(() => {
                    redirectToDashboard(userData.role);
                }, 500);

            } else {
                // API login failed
                let errorMessage = 'Invalid credentials';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.detail || errorMessage;
                } catch (e) { }

                console.log('API login failed:', response.status, errorMessage);

                if (response.status === 401) {
                    // Try fallback demo login
                    useFallbackDemoLogin(username, password, submitBtn, originalText);
                } else {
                    showLoginError(errorMessage);
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }

        } catch (error) {
            console.error('Network error:', error);
            // Network error - use fallback demo mode
            useFallbackDemoLogin(username, password, submitBtn, originalText);
        }
    });

    // Fallback demo login when API is unavailable
    function useFallbackDemoLogin(username, password, submitBtn, originalText) {
        console.log('Using fallback demo login for:', username);

        const demoUsers = {
            'ugr/1200/18': { password: 'student123', role: 'student', name: 'John Student' },
            'ugr/1201/17': { password: 'student123', role: 'student', name: 'Jane Doe' },
            'proctor101': { password: 'proctor123', role: 'proctor', name: 'Sarah Proctor' },
            'proctor102': { password: 'proctor123', role: 'proctor', name: 'Michael Proctor' },
            'staff301': { password: 'staff123', role: 'staff', name: 'David Staff' },
            'security201': { password: 'security123', role: 'security', name: 'Alex Security' }
        };

        // Also check by lowercase
        const lowerUsername = username.toLowerCase();
        let matchedUser = demoUsers[username] || demoUsers[lowerUsername];

        if (matchedUser && matchedUser.password === password) {
            // Create a demo token
            localStorage.setItem('token', 'demo-token-' + Date.now());
            localStorage.setItem('demo_mode', 'true');

            // Store user info
            const userData = {
                id: username,
                username: username,
                role: matchedUser.role,
                name: matchedUser.name,
                email: null
            };
            localStorage.setItem('user', JSON.stringify(userData));

            console.log('Demo login successful, role:', matchedUser.role);
            showLoginWarning('DEMO MODE: Backend unavailable');

            setTimeout(() => {
                redirectToDashboard(matchedUser.role);
            }, 1000);

        } else {
            showLoginError('Invalid credentials. Check the demo credentials below.');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    // Determine role from username pattern
    function determineRoleFromUsername(username) {
        const lower = username.toLowerCase();
        if (lower.startsWith('ugr/') || lower.includes('stu')) return 'student';
        if (lower.includes('proc')) return 'proctor';
        if (lower.includes('staff')) return 'staff';
        if (lower.includes('sec')) return 'security';
        return 'student';
    }

    // Redirect to appropriate dashboard based on role
    function redirectToDashboard(role) {
        // Ensure role is lowercase for comparison
        const normalizedRole = (role || '').toLowerCase().trim();

        console.log('Redirecting based on role:', normalizedRole);

        const dashboards = {
            'student': 'dashboard_student.html',
            'proctor': 'dashboard_proctor.html',
            'security': 'dashboard_security.html',
            'staff': 'dashboard_staff.html'
        };

        const dashboard = dashboards[normalizedRole];

        if (dashboard) {
            console.log('Redirecting to:', dashboard);
            window.location.href = dashboard;
        } else {
            console.warn('Unknown role:', role, '- defaulting to student');
            window.location.href = 'dashboard_student.html';
        }
    }

    // Show login messages
    function showLoginError(message) {
        showLoginMessage(message, 'error');
    }

    function showLoginSuccess(message) {
        showLoginMessage(message, 'success');
    }

    function showLoginWarning(message) {
        showLoginMessage(message, 'warning');
    }

    function showLoginMessage(message, type) {
        const existingMessages = document.querySelectorAll('.login-message');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = `login-message login-message-${type}`;
        messageDiv.textContent = message;

        if (!document.getElementById('login-message-styles')) {
            const style = document.createElement('style');
            style.id = 'login-message-styles';
            style.textContent = `
                .login-message {
                    padding: 12px 16px;
                    border-radius: 8px;
                    margin-bottom: 16px;
                    font-size: 14px;
                    text-align: center;
                    animation: fadeIn 0.3s ease;
                }
                .login-message-error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
                .login-message-success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
                .login-message-warning { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            document.head.appendChild(style);
        }

        const form = document.getElementById('loginForm');
        form.parentNode.insertBefore(messageDiv, form);
    }

    // Username format validation
    document.getElementById('username').addEventListener('input', function () {
        const value = this.value.trim();
        const hint = document.getElementById('formatHint');

        if (value.startsWith('ugr/') || value.startsWith('UGR/')) {
            const ugrPattern = /^ugr\/\d{4}\/(15|16|17|18)$/i;
            const isValid = ugrPattern.test(value);

            this.classList.remove('input-valid', 'input-invalid');
            if (value.length > 0) {
                this.classList.add(isValid ? 'input-valid' : 'input-invalid');
            }

            if (!isValid && value.length > 4) {
                hint.textContent = 'Format: ugr/xxxx/15-18';
                hint.style.color = '#E53E3E';
            } else if (isValid) {
                hint.textContent = '✓ Valid student ID';
                hint.style.color = '#38A169';
            } else {
                hint.textContent = '';
            }
        } else {
            this.classList.remove('input-valid', 'input-invalid');
            hint.textContent = '';
        }
    });
});