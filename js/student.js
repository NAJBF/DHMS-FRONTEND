// Student dashboard functionality - DHMS Frontend
document.addEventListener('DOMContentLoaded', async function () {
    // Initialize dashboard
    const user = initDashboard();
    if (!user) return;

    // Store student's room ID for maintenance requests
    let studentRoomId = null;
    let studentData = null;

    // Update student info display
    const studentNameEl = document.getElementById('studentName');
    const studentIdEl = document.getElementById('studentIdDisplay');
    const welcomeEl = document.getElementById('welcomeHeading');

    if (studentNameEl) studentNameEl.textContent = user.name || user.username;
    if (studentIdEl) studentIdEl.textContent = user.username || user.id;
    if (welcomeEl) welcomeEl.textContent = `Welcome, ${user.name || 'Student'}!`;

    // Set current section
    const currentSectionEl = document.getElementById('currentSection');
    if (currentSectionEl) currentSectionEl.textContent = 'Welcome';

    // Load profile image from localStorage
    loadProfileImage();

    // Load initial data
    await loadDashboardData();
    await loadRoomInfo();
    await loadPenalties();
    await loadLaundryForms(); // Load laundry to show active QR codes

    // Show section function
    window.showSection = function (sectionId) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active-section');
        });

        // Show selected section
        const targetSection = document.getElementById(sectionId + 'Section');
        if (targetSection) {
            targetSection.style.display = 'block';
            targetSection.classList.add('active-section');
        }

        // Update current section text
        const sectionNames = {
            'room': 'My Room',
            'maintenance': 'Maintenance Request',
            'laundry': 'Laundry Form',
            'penalties': 'Penalties',
            'photo': 'Upload Photo',
            'welcome': 'Welcome'
        };
        if (currentSectionEl) {
            currentSectionEl.textContent = sectionNames[sectionId] || 'Welcome';
        }

        // Update active menu
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.classList.remove('active');
        });
        if (event && event.currentTarget) {
            event.currentTarget.classList.add('active');
        }

        // Load data for specific sections
        if (sectionId === 'maintenance') {
            loadMaintenanceRequests();
        } else if (sectionId === 'laundry') {
            loadLaundryForms();
        } else if (sectionId === 'penalties') {
            loadPenalties();
        }

        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.classList.remove('active');
        }
    };

          // Load profile image from localStorage on page load
    function loadProfileImage() {
        const savedImage = localStorage.getItem('student_profile_image');
        if (savedImage) {
            console.log('Photo exists in localStorage, loading...');

            // Update sidebar student photo
            const studentPhoto = document.getElementById('studentPhoto');
            if (studentPhoto) {
                studentPhoto.src = savedImage;
                console.log('Updated sidebar photo');
            }

            // Update current photo preview in upload section
            const currentPhotoPreview = document.getElementById('currentPhotoPreview');
            const noPhotoMessage = document.getElementById('noPhotoMessage');
            if (currentPhotoPreview) {
                currentPhotoPreview.src = savedImage;
                currentPhotoPreview.style.display = 'block';
                if (noPhotoMessage) noPhotoMessage.style.display = 'none';
                console.log('Updated current photo preview');
            }

            // CRITICAL: Immediately hide the upload form
            disablePhotoUpload();
            
        } else {
            console.log('No photo in localStorage');
            // Set default placeholder if no saved image
            const studentPhoto = document.getElementById('studentPhoto');
            if (studentPhoto && !studentPhoto.src) {
                studentPhoto.src = 'https://ui-avatars.com/api/?name=Student&background=2c5282&color=fff&size=128';
            }
        }
    }
    
    // Function to hide upload form and show only instructions after upload
    function disablePhotoUpload() {
        console.log('Running disablePhotoUpload()');
        
        // Get all elements
        const uploadForm = document.querySelector('.upload-form');
        const photoContainer = document.querySelector('.photo-upload-container');
        const photoInstructions = document.querySelector('.photo-instructions');
        
        console.log('Elements found:', {
            uploadForm: !!uploadForm,
            photoContainer: !!photoContainer,
            photoInstructions: !!photoInstructions
        });

        // Hide the entire upload form container
        if (photoContainer) {
            photoContainer.style.display = 'none';
            console.log('Hid photo-upload-container');
        } else if (uploadForm) {
            // Fallback if container not found
            uploadForm.style.display = 'none';
            console.log('Hid upload-form directly');
        }

        // Update photo instructions to show completion message
        if (photoInstructions) {
            console.log('Updating photo instructions');
            photoInstructions.innerHTML = `
                <div class="photo-uploaded-success">
                    <h3>✅ Profile Photo Successfully Uploaded</h3>
                    
                    <div class="important-info">
                        <h3><i class="fas fa-exclamation-circle"></i> Important Information</h3>
                        <ul>
                            <li><i class="fas fa-lock"></i> Your photo cannot be changed after upload</li>
                            <li><i class="fas fa-id-card"></i> This photo is used for campus identification</li>
                        </ul>
                    </div>
                    
                    <div class="contact-info">
                        <h4><i class="fas fa-info-circle"></i> If you need to update your photo due to an error, please contact your dormitory proctor.</h4>
                    </div>
                </div>
            `;
        }
    }
    

    // Load dashboard data
    async function loadDashboardData() {
        try {
            const data = await apiRequest('/students/dashboard/');
            if (data) {
                // Store full data for later use
                studentData = data;

                // Backend returns: { student: {...}, room: {...}, stats: {...} }

                // Update student info if available
                if (data.student) {
                    const student = data.student;
                    if (studentNameEl) studentNameEl.textContent = student.full_name || user.name || user.username;
                    if (studentIdEl) studentIdEl.textContent = student.student_code || user.username;
                    if (welcomeEl) welcomeEl.textContent = `Welcome, ${student.full_name || user.name || 'Student'}!`;
                }

                // Store room ID for maintenance requests
                if (data.room && data.room.id) {
                    studentRoomId = data.room.id;
                    console.log('Student room ID:', studentRoomId);
                }

                // Update room info in welcome section
                if (data.room) {
                    const roomCard = document.querySelector('.stat-card:first-child');
                    if (roomCard) {
                        const h3 = roomCard.querySelector('h3');
                        const p = roomCard.querySelector('p');
                        if (h3) h3.textContent = `Room ${data.room.room_number || 'N/A'}`;
                        if (p) p.textContent = data.room.dorm_name || 'Not Assigned';
                    }
                }

                // Update stats
                if (data.stats) {
                    const penaltiesEl = document.getElementById('activePenaltiesCount');
                    if (penaltiesEl) penaltiesEl.textContent = data.stats.active_penalties || 0;
                }

                // Update campus status (if available)
                updateCampusStatus(data.status || 'in_campus');
            }
        } catch (error) {
            console.log('Dashboard data load failed:', error);
        }
    }

    // Load room information
    async function loadRoomInfo() {
        try {
            const data = await apiRequest('/students/room/');
            if (data) {
                const roomSection = document.getElementById('roomSection');
                if (roomSection) {
                    // Backend returns: { room: {..., dorm: {...}}, roommates: [...] }
                    const room = data.room || data;
                    const roommates = data.roommates || [];
                    const dorm = room.dorm || {};

                    // Store room ID if not already set
                    if (room.id && !studentRoomId) {
                        studentRoomId = room.id;
                    }

                    // Build roommates HTML
                    let roommatesHtml = 'No roommates assigned';
                    if (roommates.length > 0) {
                        // Filter out current user from roommates
                        const otherRoommates = roommates.filter(r =>
                            r.student_code !== user.username &&
                            r.id !== user.id &&
                            r.student_code !== (studentData?.student?.student_code)
                        );
                        if (otherRoommates.length > 0) {
                            roommatesHtml = otherRoommates.map(r =>
                                `<strong>${r.full_name}</strong> (${r.student_code})`
                            ).join('<br>');
                        }
                    }

                    // Build amenities HTML
                    let amenitiesHtml = 'Standard room amenities';
                    if (room.amenities && room.amenities.length > 0) {
                        amenitiesHtml = room.amenities.join(', ');
                    }

                    roomSection.innerHTML = `
                        <div class="card">
                            <div class="card-header">
                                <h3>My Room Details</h3>
                            </div>
                            <div class="card-body">
                                <div class="room-details">
                                    <div class="detail">
                                        <label>Room Number:</label>
                                        <p><strong>${room.room_number || 'Not assigned'}</strong></p>
                                    </div>
                                    <div class="detail">
                                        <label>Dormitory:</label>
                                        <p><strong>${dorm.name || room.dorm_name || 'Not assigned'}</strong></p>
                                    </div>
                                    <div class="detail">
                                        <label>Floor:</label>
                                        <p><strong>${room.floor || 'N/A'}</strong></p>
                                    </div>
                                    <div class="detail">
                                        <label>Capacity:</label>
                                        <p><strong>${room.current_occupancy || 0}/${room.capacity || 0} occupied</strong></p>
                                    </div>
                                    <div class="detail">
                                        <label>Roommates:</label>
                                        <p>${roommatesHtml}</p>
                                    </div>
                                    <div class="detail">
                                        <label>Amenities:</label>
                                        <p><strong>${amenitiesHtml}</strong></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.log('Room info load failed:', error);
        }
    }

    // Load maintenance requests
    async function loadMaintenanceRequests() {
        const container = document.getElementById('maintenanceRequests');
        if (!container) return;

        try {
            const data = await apiRequest('/students/maintenance/');
            // Backend returns: { requests: [...] }
            const requests = data.requests || data || [];

            if (Array.isArray(requests)) {
                container.innerHTML = '';

                if (requests.length === 0) {
                    container.innerHTML = '<div class="status-card"><p>No maintenance requests submitted yet.</p></div>';
                    return;
                }

                requests.forEach(request => {
                    const statusCard = createMaintenanceStatusCard(request);
                    container.appendChild(statusCard);
                });
            }
        } catch (error) {
            console.log('Maintenance load failed:', error);
            container.innerHTML = '<div class="status-card"><p>No maintenance requests submitted yet.</p></div>';
        }
    }

    // Load laundry forms
    async function loadLaundryForms() {
        const container = document.getElementById('laundryRequests');
        const activeQRContainer = document.getElementById('activeQRCodes');
        if (!container) return;

        try {
            const data = await apiRequest('/students/laundry/');
            // Backend returns: { forms: [...] } or { laundry: [...] }
            const forms = data.forms || data.laundry || data || [];

            if (Array.isArray(forms)) {
                container.innerHTML = '';

                if (forms.length === 0) {
                    container.innerHTML = '<div class="status-card"><p>No laundry forms submitted yet.</p></div>';
                    if (activeQRContainer) activeQRContainer.innerHTML = '';
                    return;
                }

                // Separate active forms (approved/verified) and others
                const activeForms = forms.filter(f =>
                    f.status === 'approved' || f.status === 'verified' || f.status === 'pending_security'
                );

                // Show active QR codes section
                if (activeQRContainer && activeForms.length > 0) {
                    activeQRContainer.innerHTML = `
                        <div class="card active-qr-section">
                            <div class="card-header">
                                <h3><i class="fas fa-qrcode"></i> Active Laundry QR Codes</h3>
                            </div>
                            <div class="card-body">
                                <div class="qr-cards-container">
                                    ${activeForms.map(form => createActiveQRCard(form)).join('')}
                                </div>
                            </div>
                        </div>
                    `;
                } else if (activeQRContainer) {
                    activeQRContainer.innerHTML = '';
                }

                // Show all forms
                forms.forEach(form => {
                    const statusCard = createLaundryStatusCard(form);
                    container.appendChild(statusCard);
                });
            }
        } catch (error) {
            console.log('Laundry load failed:', error);
            container.innerHTML = '<div class="status-card"><p>No laundry forms submitted yet.</p></div>';
        }
    }

    // Create active QR card HTML - compact with preview button
     function createActiveQRCard(form) {
        const formCode = form.form_code || `LAU-${form.id}`;
        const qrLink = form.qr_link || `${window.API_BASE_URL}/public/laundry/${formCode}/taken/`;
        const status = form.status || 'approved';
        const statusLabel = status === 'verified' ? 'Verified' : status === 'pending_security' ? 'Pending Verification' : 'Approved';
        const badgeClass = status === 'verified' ? 'success' : 'warning';

        return `
            <div class="qr-card-compact">
                <div class="qr-card-info">
                    <span class="form-code">${formCode}</span>
                    <div class="card-meta">
                        <span class="badge badge-${badgeClass}">${statusLabel}</span>
                        <span class="item-count">${form.item_count || 0} items</span>
                    </div>
                </div>
                <button class="btn btn-primary preview-btn" onclick="showQRModal('${formCode}', '${qrLink}', ${form.item_count || 0})">
                    <i class="fas fa-qrcode"></i> Show QR
                </button>
            </div>
        `;
    }

    // QR codes are now generated on-demand when preview is clicked

    // Load penalties
    async function loadPenalties() {
        const container = document.getElementById('penaltiesBody');
        if (!container) return;

        try {
            const data = await apiRequest('/students/penalties/');
            // Backend returns: { penalties: [...] }
            const penalties = data.penalties || data || [];

            if (Array.isArray(penalties)) {
                container.innerHTML = '';

                if (penalties.length === 0) {
                    container.innerHTML = '<tr id="noPenaltiesRow"><td colspan="6" style="text-align: center;">No penalties assigned yet. 🎉</td></tr>';
                    const countEl = document.getElementById('activePenaltiesCount');
                    if (countEl) countEl.textContent = '0';
                    return;
                }

                // Count active penalties
                const activePenalties = penalties.filter(p => p.status === 'active');
                const countEl = document.getElementById('activePenaltiesCount');
                if (countEl) countEl.textContent = activePenalties.length;

                penalties.forEach(penalty => {
                    const row = document.createElement('tr');

                    // Map backend fields
                    const penaltyId = penalty.penalty_code || penalty.id;
                    const reason = penalty.violation_type || penalty.reason;
                    const duration = penalty.duration_days || penalty.duration;
                    const assignedDate = penalty.assigned_date || penalty.start_date;
                    const endDate = penalty.end_date;
                    const status = penalty.status;

                    row.innerHTML = `
                        <td>${penaltyId}</td>
                        <td>${formatDate(assignedDate)}</td>
                        <td>${formatViolationType(reason)}</td>
                        <td>${duration} days</td>
                        <td>${formatDate(endDate)}</td>
                        <td><span class="badge ${status === 'active' ? 'badge-warning' : 'badge-success'}">${status === 'active' ? 'Active' : 'Completed'}</span></td>
                    `;
                    container.appendChild(row);
                });
            }
        } catch (error) {
            console.log('Penalties load failed:', error);
            container.innerHTML = '<tr id="noPenaltiesRow"><td colspan="6" style="text-align: center;">No penalties assigned yet.</td></tr>';
        }
    }

    // Format violation type for display
    function formatViolationType(type) {
        if (!type) return 'Unknown';
        const types = {
            'noise': 'Noise Violation',
            'damage': 'Property Damage',
            'curfew': 'Curfew Violation',
            'smoking': 'Smoking in Room',
            'visitor': 'Unauthorized Visitor',
            'other': 'Other'
        };
        return types[type] || type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
    }

    // Create status card for maintenance request
    function createMaintenanceStatusCard(request) {
        const card = document.createElement('div');
        card.className = 'status-card';

        // Map backend fields
        const requestId = request.request_code || request.id;
        const status = request.status || 'pending_proctor';
        const issueType = request.issue_type;
        const title = request.title || issueType;
        const description = request.description;
        const urgency = request.urgency;
        const reportedDate = request.reported_date || request.created_at;

        let statusText = status.replace(/_/g, ' ').toUpperCase();
        let statusClass = 'status-pending';

        if (status.includes('approved') || status === 'approved') statusClass = 'status-approved';
        if (status.includes('completed') || status === 'completed') statusClass = 'status-completed';
        if (status.includes('progress') || status === 'in_progress') statusClass = 'status-in-progress';
        if (status.includes('reject') || status === 'rejected') statusClass = 'status-rejected';

        card.innerHTML = `
            <div class="status-header">
                <h4>Request #${requestId}</h4>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <div class="status-body">
                <p><strong>Title:</strong> ${title}</p>
                <p><strong>Issue Type:</strong> ${formatIssueType(issueType)}</p>
                <p><strong>Description:</strong> ${description}</p>
                <p><strong>Urgency:</strong> <span class="badge badge-${urgency === 'high' ? 'danger' : urgency === 'medium' ? 'warning' : 'success'}">${urgency}</span></p>
                <p><strong>Submitted:</strong> ${formatDateTime(reportedDate)}</p>
            </div>
        `;

        return card;
    }

    // Format issue type for display
    function formatIssueType(type) {
        if (!type) return 'Other';
        const types = {
            'plumbing': 'Plumbing',
            'electrical': 'Electrical',
            'furniture': 'Furniture',
            'hvac': 'HVAC/Heating',
            'other': 'Other'
        };
        return types[type] || type.charAt(0).toUpperCase() + type.slice(1);
    }

    // Create status card for laundry form
    function createLaundryStatusCard(form) {
        const card = document.createElement('div');
        card.className = 'status-card';

        // Map backend fields
        const formCode = form.form_code || `LAU-${form.id}`;
        const status = form.status || 'pending_proctor';
        const itemCount = form.item_count;
        const itemList = form.item_list;
        const specialInstructions = form.special_instructions;
        const submissionDate = form.submission_date || form.created_at;
        const qrLink = form.qr_link;

        let statusText = status.replace(/_/g, ' ').toUpperCase();
        let statusClass = 'status-pending';

        if (status === 'approved' || status.includes('approved')) statusClass = 'status-approved';
        if (status === 'verified' || status.includes('verified')) statusClass = 'status-verified';
        if (status === 'taken_out' || status.includes('taken')) statusClass = 'status-taken';
        if (status.includes('reject')) statusClass = 'status-rejected';

        // Show QR preview button for any form that's not rejected or pending_proctor
        let qrButton = '';
        const isApprovedOrBeyond = (status.includes('approved'));

        if (isApprovedOrBeyond) {
            const link = qrLink || `${window.API_BASE_URL}/public/laundry/${formCode}/taken/`;
            qrButton = `
                <div class="qr-preview-actions">
                    <button class="btn btn-sm btn-primary" onclick="showQRModal('${formCode}', '${link}', ${itemCount || 0})">
                        <i class="fas fa-eye"></i> Preview QR Code
                    </button>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="status-header">
                <h4>Laundry Form #${formCode}</h4>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <div class="status-body">
                <p><strong>Items:</strong> ${itemCount} items</p>
                <p><strong>Details:</strong> ${itemList}</p>
                ${specialInstructions ? `<p><strong>Special Instructions:</strong> ${specialInstructions}</p>` : ''}
                <p><strong>Submitted:</strong> ${formatDateTime(submissionDate)}</p>
                ${qrButton}
            </div>
        `;

        return card;
    }

    // Update campus status display
    function updateCampusStatus(status) {
        const statusElement = document.getElementById('campusStatus');
        const statusTextElement = document.getElementById('campusStatusText');

        if (statusElement && statusTextElement) {
            if (status === 'out_campus' || status === 'out') {
                statusElement.textContent = 'Out of Campus';
                statusElement.className = 'status-badge status-out-campus';
                statusTextElement.textContent = 'Out of Campus';
            } else {
                statusElement.textContent = 'In Campus';
                statusElement.className = 'status-badge status-in-campus';
                statusTextElement.textContent = 'In Campus';
            }
        }
    }

    // Show QR Modal with generated QR code
    window.showQRModal = function (formCode, qrLink, itemCount) {
        const modal = document.getElementById('qrModal');
        const qrContainer = document.getElementById('qrcode');

        if (!modal || !qrContainer) return;

        // Clear previous QR code
        qrContainer.innerHTML = '';

        // Generate QR code with the link
        if (typeof QRCode !== 'undefined') {
            // Calculate optimal size based on screen width
            const screenWidth = window.innerWidth;
            const qrSize = screenWidth < 480 ? 220 : 240;
            
            new QRCode(qrContainer, {
                text: qrLink,
                width: qrSize,
                height: qrSize,
                colorDark: "#1a365d",    // Dark blue
                colorLight: "#ffffff",   // White background
                correctLevel: QRCode.CorrectLevel.H,
                margin: 2
            });

            // Update modal info
            const formIdEl = document.getElementById('qrFormId');
            const studentNameEl = document.getElementById('qrStudentName');
            const itemCountEl = document.getElementById('qrItemCount');
            const timestampEl = document.getElementById('qrTimestamp');

            if (formIdEl) formIdEl.textContent = formCode;
            if (studentNameEl) studentNameEl.textContent = studentData?.student?.full_name || user.name || 'Student';
            if (itemCountEl) itemCountEl.textContent = `${itemCount} items`;
            if (timestampEl) timestampEl.textContent = formatDateTime(new Date().toISOString());

            // Show modal
            modal.style.display = 'block';
            
            // Scroll to top of modal to ensure everything is visible
            modal.scrollTop = 0;
            
        } else {
            showAlert('QR Code library not loaded', 'error');
        }
    };

    // Close QR Modal
    window.closeQRModal = function () {
        const modal = document.getElementById('qrModal');
        if (modal) modal.style.display = 'none';
    };

    // Print QR Code
    window.printQRCode = function () {
        const qrCode = document.getElementById('qrcode');
        const formId = document.getElementById('qrFormId')?.textContent || 'Unknown';

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Laundry QR Code - ${formId}</title>
                <style>
                    body { text-align: center; padding: 50px; font-family: Arial, sans-serif; }
                    h2 { color: #2c5282; }
                    .qr-container { margin: 20px 0; }
                    .info { margin: 10px 0; color: #666; }
                </style>
            </head>
            <body>
                <h2>Laundry Exit QR Code</h2>
                <p class="info">Form ID: ${formId}</p>
                <div class="qr-container">${qrCode.innerHTML}</div>
                <p class="info">Show this QR code to security when leaving campus</p>
                <p class="info">AAU Dormitory Management System</p>
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    };

    // Save QR Code as image
    window.saveQRCode = function () {
        const canvas = document.querySelector('#qrcode canvas');
        const formId = document.getElementById('qrFormId')?.textContent || 'laundry';

        if (canvas) {
            const link = document.createElement('a');
            link.download = `qr-${formId}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showAlert('QR code saved!', 'success');
        } else {
            showAlert('Could not save QR code', 'error');
        }
    };

    // Maintenance form submission
    const maintenanceForm = document.getElementById('maintenanceForm');
    if (maintenanceForm) {
        maintenanceForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Check if we have room ID
            if (!studentRoomId) {
                showAlert('Could not find your room assignment. Please refresh the page.', 'error');
                return;
            }

            const issueType = document.getElementById('issueType').value;
            const title = document.getElementById('issueTitle')?.value ||
                document.getElementById('issueType').options[document.getElementById('issueType').selectedIndex].text;
            const description = document.getElementById('issueDescription').value;
            const urgency = document.getElementById('urgency').value;

            // Backend expects: room_id, issue_type, title, description, urgency
            const requestData = {
                room_id: studentRoomId,
                issue_type: issueType,
                title: title,
                description: description,
                urgency: urgency
            };

            console.log('Submitting maintenance request:', requestData);

            try {
                const response = await apiRequest('/students/maintenance/', {
                    method: 'POST',
                    body: JSON.stringify(requestData)
                });

                showAlert('Maintenance request submitted successfully!', 'success');
                maintenanceForm.reset();
                await loadMaintenanceRequests();

            } catch (error) {
                console.error('Maintenance submission error:', error);
                showAlert('Failed to submit maintenance request. Please try again.', 'error');
            }
        });
    }

    // Laundry form submission
    const laundryForm = document.getElementById('laundryForm');
    if (laundryForm) {
        laundryForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const itemCount = document.getElementById('itemCount').value;
            const itemList = document.getElementById('itemList').value;
            const specialInstructions = document.getElementById('specialInstructions')?.value || '';

            // Backend expects: item_count, item_list, special_instructions
            const formData = {
                item_count: parseInt(itemCount, 10),
                item_list: itemList,
                special_instructions: specialInstructions
            };

            try {
                const response = await apiRequest('/students/laundry/', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });

                // Response includes: { id, form_code, status, qr_link }
                showAlert('Laundry form submitted successfully!', 'success');

                // If we got a QR link, show the QR code immediately
                if (response && response.qr_link) {
                    const formCode = response.form_code || `LAU-${response.id}`;
                    showQRModal(formCode, response.qr_link, parseInt(itemCount, 10));
                }

                laundryForm.reset();
                await loadLaundryForms();

            } catch (error) {
                console.error('Laundry submission error:', error);
                showAlert('Failed to submit laundry form. Please try again.', 'error');
            }
        });
    }

    // Photo upload - stores in localStorage
    const photoUploadForm = document.getElementById('photoUploadForm');
    const photoInput = document.getElementById('photoInput');

    // Load profile image on page load
    loadProfileImage();

    // Handle photo selection preview
    if (photoInput) {
        photoInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file size (max 2MB)
                if (file.size > 2 * 1024 * 1024) {
                    showAlert('Image too large. Please select an image under 2MB.', 'error');
                    this.value = ''; // Clear the input
                    return;
                }

                const reader = new FileReader();
                reader.onload = function (e) {
                    const preview = document.getElementById('photoPreview');
                    const placeholder = document.querySelector('.preview-placeholder');
                    if (preview) {
                        preview.src = e.target.result;
                        preview.style.display = 'block';
                    }
                    if (placeholder) {
                        placeholder.style.display = 'none';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Handle photo form submission
    if (photoUploadForm) {
        photoUploadForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const preview = document.getElementById('photoPreview');
            if (preview && preview.src && preview.src !== '') {
                // Save to localStorage
                localStorage.setItem('student_profile_image', preview.src);

                // Update sidebar photo
                const studentPhoto = document.getElementById('studentPhoto');
                if (studentPhoto) studentPhoto.src = preview.src;
                
                // Update current photo preview
                const currentPhotoPreview = document.getElementById('currentPhotoPreview');
                if (currentPhotoPreview) {
                    currentPhotoPreview.src = preview.src;
                    currentPhotoPreview.style.display = 'block';
                }
                
                // Hide "no photo" message
                const noPhotoMessage = document.getElementById('noPhotoMessage');
                if (noPhotoMessage) noPhotoMessage.style.display = 'none';

                // Hide upload form
                disablePhotoUpload();

                showAlert('Profile photo saved successfully!', 'success');
            } else {
                showAlert('Please select a photo first.', 'warning');
            }
        });
    }

    // Cancel photo upload
    window.cancelPhotoUpload = function () {
        const photoInput = document.getElementById('photoInput');
        const preview = document.getElementById('photoPreview');
        const placeholder = document.querySelector('.preview-placeholder');

        if (photoInput) photoInput.value = '';
        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
        }
        if (placeholder) {
            placeholder.style.display = 'flex';
        }
    };

    // Cancel photo upload
    window.cancelPhotoUpload = function () {
        const photoInput = document.getElementById('photoInput');
        const preview = document.getElementById('photoPreview');
        const placeholder = document.querySelector('.preview-placeholder');

        if (photoInput) photoInput.value = '';
        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
        }
        if (placeholder) {
            placeholder.style.display = 'flex';
        }
    };

    // Modal close functionality
    const modal = document.getElementById('qrModal');
    const closeBtn = document.querySelector('.close-modal');

    if (closeBtn) {
        closeBtn.onclick = function () {
            if (modal) modal.style.display = 'none';
        };
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
});