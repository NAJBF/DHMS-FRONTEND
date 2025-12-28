// Proctor dashboard functionality - DHMS Frontend
document.addEventListener('DOMContentLoaded', async function () {
    // Initialize dashboard
    const user = initDashboard();
    if (!user) return;

    // Store available rooms and students for forms
    let availableRooms = [];
    let students = [];
    let dorms = [];

    // Update proctor name in sidebar
    const proctorNameEl = document.getElementById('proctorName');
    if (proctorNameEl) {
        proctorNameEl.textContent = user.name || user.full_name || user.username || 'Proctor';
    }

    // Load initial data
    await loadDashboardData();
    await loadDorms();
    await loadAvailableRooms();
    await loadStudents();
    await loadPendingMaintenance();
    await loadPendingLaundry();

    // Initialize date pickers
    initializeDatePickers();

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
            'assign': 'Assign Room',
            'maintenance': 'Maintenance Approval',
            'laundry': 'Laundry Approval',
            'penalty': 'Assign Penalty',
            'students': 'Students',
            'dashboard': 'Dashboard'
        };
        const currentSectionEl = document.getElementById('currentSection');
        if (currentSectionEl) {
            currentSectionEl.textContent = sectionNames[sectionId] || 'Dashboard';
        }

        // Update active menu
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.classList.remove('active');
        });
        if (event && event.currentTarget) {
            event.currentTarget.classList.add('active');
        }

        // Refresh data for specific sections
        if (sectionId === 'maintenance') {
            loadPendingMaintenance();
        } else if (sectionId === 'laundry') {
            loadPendingLaundry();
        } else if (sectionId === 'students') {
            loadStudents();
        }

        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.classList.remove('active');
        }
    };

    // Initialize date pickers with today's date
    function initializeDatePickers() {
        const today = getTodayDate();

        const penaltyStartDate = document.getElementById('penaltyStartDate');
        if (penaltyStartDate) {
            penaltyStartDate.value = today;
            penaltyStartDate.min = today;
        }

        const assignmentDate = document.getElementById('assignmentDate');
        if (assignmentDate) {
            assignmentDate.value = today;
            assignmentDate.min = today;
        }
    }

    // Load dashboard data
    async function loadDashboardData() {
        try {
            const data = await apiRequest('/proctors/dashboard/');
            // Response structure: { proctor: {...}, stats: {...} }

            if (data) {
                // Update proctor info
                if (data.proctor) {
                    const proctorNameEl = document.getElementById('proctorName');
                    if (proctorNameEl) {
                        proctorNameEl.textContent = data.proctor.full_name || user.name || 'Proctor';
                    }

                    // Update assigned dorm display
                    const dormBadge = document.querySelector('.proctor-dorm');
                    if (dormBadge && data.proctor.assigned_dorm) {
                        dormBadge.textContent = data.proctor.assigned_dorm;
                    }
                }

                // Update stats
                if (data.stats) {
                    const totalStudentsEl = document.getElementById('totalStudents');
                    const pendingMaintenanceEl = document.getElementById('pendingMaintenance');
                    const activePenaltiesEl = document.getElementById('activePenalties');
                    const pendingLaundryEl = document.getElementById('pendingLaundry');

                    if (totalStudentsEl) totalStudentsEl.textContent = data.stats.total_students || students.length || 0;
                    if (pendingMaintenanceEl) pendingMaintenanceEl.textContent = data.stats.pending_maintenance || 0;
                    if (activePenaltiesEl) activePenaltiesEl.textContent = data.stats.active_penalties || 0;
                    if (pendingLaundryEl) pendingLaundryEl.textContent = data.stats.pending_laundry || 0;
                }
            }
        } catch (error) {
            console.log('Dashboard data load failed:', error);
        }
    }

    // Load dorms for dropdown
    // Load dorms for dropdown
    async function loadDorms() {
        try {
            const data = await apiRequest('/dorms/');
            // Response structure: { dorms: [...] }
            const dormList = data.dorms || data || [];

            if (Array.isArray(dormList)) {
                dorms = dormList;

                const dormSelect = document.getElementById('assignDormitory');
                if (dormSelect) {
                    dormSelect.innerHTML = '<option value="">Select dormitory</option>';
                    dormList.forEach(dorm => {
                        const option = document.createElement('option');
                        option.value = dorm.id;
                        option.textContent = `${dorm.name} (${dorm.type}, ${dorm.current_occupancy || 0}/${dorm.capacity || 0})`;
                        option.dataset.dormId = dorm.id;
                        dormSelect.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.log('Dorms load failed:', error);
        }
    }

    // Load available rooms
    async function loadAvailableRooms() {
        try {
            const data = await apiRequest('/rooms/available/');
            // Response structure: { rooms: [...] }
            const roomList = data.rooms || data || [];

            if (Array.isArray(roomList)) {
                availableRooms = roomList;
                updateRoomDropdown();
            }
        } catch (error) {
            console.log('Available rooms load failed:', error);
        }
    }

    // Update room dropdown based on selected dorm
    // Update room dropdown based on selected dorm
    async function updateRoomDropdown(dormId = null) {
        const roomSelect = document.getElementById('assignRoomNumber');
        if (!roomSelect) return;

        roomSelect.innerHTML = '<option value="">Loading rooms...</option>';
        roomSelect.disabled = true;

        if (!dormId) {
            roomSelect.innerHTML = '<option value="">Select dormitory first</option>';
            return;
        }

        try {
             // Fetch rooms for the specific dorm from API
            const data = await apiRequest(`/dorms/${dormId}/rooms/`);
            const roomList = data.rooms || data || [];

            roomSelect.innerHTML = '<option value="">Select room</option>';
            
            if (Array.isArray(roomList)) {
                roomList.forEach(room => {
                    const option = document.createElement('option');
                    option.value = room.id;
                    option.textContent = `Room ${room.room_number} - Floor ${room.floor || 1} (${room.current_occupancy || 0}/${room.capacity || 4})`;
                    option.dataset.roomId = room.id;
                    roomSelect.appendChild(option);
                });
                roomSelect.disabled = false;
            } else {
                 roomSelect.innerHTML = '<option value="">No rooms found</option>';
            }

        } catch (error) {
            console.log('Failed to load rooms for dorm:', error);
            roomSelect.innerHTML = '<option value="">Error loading rooms</option>';
        }
    }

    // Listen for dorm selection change
    const dormSelect = document.getElementById('assignDormitory');
    if (dormSelect) {
        dormSelect.addEventListener('change', function () {
            const dormId = this.value;
            if (dormId) {
                // Filter rooms for selected dorm
                updateRoomDropdown(dormId);
            } else {
                updateRoomDropdown();
            }
        });
    }

    // Load students
    async function loadStudents() {
        try {
            const data = await apiRequest('/proctors/students/');
            // Response structure: { students: [...] }
            const studentList = data.students || data || [];

            if (Array.isArray(studentList)) {
                students = studentList;

                // Update student selects
                updateStudentSelects(studentList);

                // Update total students count
                const totalStudentsEl = document.getElementById('totalStudents');
                if (totalStudentsEl) {
                    totalStudentsEl.textContent = studentList.length;
                }

                // Update student table
                const tableBody = document.getElementById('studentsTableBody');
                if (tableBody) {
                    tableBody.innerHTML = '';

                    if (studentList.length === 0) {
                        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No students found.</td></tr>';
                        return;
                    }

                    studentList.forEach(student => {
                        const row = document.createElement('tr');
                        const studentCode = student.student_code || student.username || student.id;
                        const name = student.full_name || student.name || 'Unknown';
                        const roomNumber = student.room_number || 'Not assigned';
                        const status = student.status || 'active';

                        row.innerHTML = `
                            <td>${studentCode}</td>
                            <td>${name}</td>
                            <td>${roomNumber}</td>
                            <td><span class="badge badge-${status === 'active' ? 'success' : 'secondary'}">${status}</span></td>
                            <td>
                                <button class="btn btn-sm btn-info" onclick="viewStudent(${student.id})">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        `;
                        tableBody.appendChild(row);
                    });
                }
            }
        } catch (error) {
            console.log('Students load failed:', error);
        }
    }

    // View student details
    window.viewStudent = function (studentId) {
        const student = students.find(s => s.id === studentId);
        if (student) {
            alert(`Student: ${student.full_name}\nCode: ${student.student_code}\nRoom: ${student.room_number || 'Not assigned'}\nStatus: ${student.status}`);
        }
    };

    // Update student select dropdowns
    function updateStudentSelects(studentList) {
        const assignSelect = document.getElementById('assignStudentId');
        const penaltySelect = document.getElementById('penaltyStudentId');

        if (assignSelect) {
            assignSelect.innerHTML = '<option value="">Select student</option>';
            studentList.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                const displayCode = student.student_code || student.username || student.id;
                const displayName = student.full_name || student.name || 'Unknown';
                option.textContent = `${displayCode} (${displayName})`;
                option.dataset.studentId = student.id;
                assignSelect.appendChild(option);
            });
        }

        if (penaltySelect) {
            penaltySelect.innerHTML = '<option value="">Select student</option>';
            studentList.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                const displayCode = student.student_code || student.username || student.id;
                const displayName = student.full_name || student.name || 'Unknown';
                option.textContent = `${displayCode} (${displayName})`;
                option.dataset.studentId = student.id;
                penaltySelect.appendChild(option);
            });
        }
    }

    // Load pending maintenance requests
    async function loadPendingMaintenance() {
        const container = document.getElementById('maintenanceApprovalContainer');
        if (!container) return;

        try {
            const data = await apiRequest('/proctors/maintenance/pending/');
            // Response structure: { requests: [...] }
            const requests = data.requests || data || [];

            if (Array.isArray(requests)) {
                if (requests.length === 0) {
                    container.innerHTML = '<p class="no-data">No pending maintenance requests.</p>';
                    const countEl = document.getElementById('pendingMaintenanceCount');
                    if (countEl) countEl.textContent = '0 Pending';
                    return;
                }

                let html = `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Request ID</th>
                                <th>Student</th>
                                <th>Room</th>
                                <th>Issue</th>
                                <th>Urgency</th>
                                <th>Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                requests.forEach(request => {
                    const requestId = request.id;
                    const requestCode = request.request_code || `MNT-${requestId}`;
                    const studentName = request.student_name || 'Unknown';
                    const roomNumber = request.room_number || 'N/A';
                    const issueType = request.issue_type || request.title || 'N/A';
                    const urgency = request.urgency || 'low';
                    const reportedDate = request.reported_date || request.created_at;

                    html += `
                        <tr>
                            <td>${requestCode}</td>
                            <td>${studentName}</td>
                            <td>${roomNumber}</td>
                            <td>${formatIssueType(issueType)}</td>
                            <td><span class="badge ${urgency === 'high' ? 'badge-danger' : urgency === 'medium' ? 'badge-warning' : 'badge-success'}">${urgency}</span></td>
                            <td>${formatDate(reportedDate)}</td>
                            <td>
                                <button class="btn btn-sm btn-success" onclick="approveMaintenance(${requestId})">
                                    <i class="fas fa-check"></i> Approve
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="rejectMaintenance(${requestId})">
                                    <i class="fas fa-times"></i> Reject
                                </button>
                            </td>
                        </tr>
                    `;
                });

                html += '</tbody></table>';
                container.innerHTML = html;

                const countEl = document.getElementById('pendingMaintenanceCount');
                if (countEl) countEl.textContent = `${requests.length} Pending`;
            }
        } catch (error) {
            console.log('Pending maintenance load failed:', error);
            container.innerHTML = '<p class="no-data">No pending maintenance requests.</p>';
        }
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

    // Load pending laundry forms
    async function loadPendingLaundry() {
        const container = document.getElementById('laundryApprovalContainer');
        if (!container) return;

        try {
            const data = await apiRequest('/proctors/laundry/pending/');
            // Response structure: { forms: [...] } or { laundry: [...] }
            const forms = data.forms || data.laundry || data || [];

            if (Array.isArray(forms)) {
                if (forms.length === 0) {
                    container.innerHTML = '<p class="no-data">No pending laundry forms.</p>';
                    const countEl = document.getElementById('pendingLaundryCount');
                    if (countEl) countEl.textContent = '0 Pending';
                    return;
                }

                let html = `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Form Code</th>
                                <th>Student</th>
                                <th>Items</th>
                                <th>Count</th>
                                <th>Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                forms.forEach(form => {
                    const formId = form.id;
                    const formCode = form.form_code || `LAU-${formId}`;
                    const studentName = form.student_name || 'Unknown';
                    const itemList = form.item_list || '';
                    const itemCount = form.item_count || 0;
                    const submissionDate = form.submission_date || form.created_at;

                    html += `
                        <tr>
                            <td>${formCode}</td>
                            <td>${studentName}</td>
                            <td>${itemList.substring(0, 50)}${itemList.length > 50 ? '...' : ''}</td>
                            <td>${itemCount}</td>
                            <td>${formatDate(submissionDate)}</td>
                            <td>
                                <button class="btn btn-sm btn-success" onclick="approveLaundry(${formId})">
                                    <i class="fas fa-check"></i> Approve
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="rejectLaundry(${formId})">
                                    <i class="fas fa-times"></i> Reject
                                </button>
                            </td>
                        </tr>
                    `;
                });

                html += '</tbody></table>';
                container.innerHTML = html;

                const countEl = document.getElementById('pendingLaundryCount');
                if (countEl) countEl.textContent = `${forms.length} Pending`;
            }
        } catch (error) {
            console.log('Pending laundry load failed:', error);
            container.innerHTML = '<p class="no-data">No pending laundry forms.</p>';
        }
    }

    // Approve maintenance request
    window.approveMaintenance = async function (requestId) {
        try {
            await apiRequest(`/proctors/maintenance/${requestId}/approve/`, {
                method: 'PUT'
            });

            showAlert('Maintenance request approved!', 'success');
            await loadPendingMaintenance();
            await loadDashboardData();

        } catch (error) {
            console.error('Approve maintenance error:', error);
            showAlert('Failed to approve maintenance request.', 'error');
        }
    };

    // Reject maintenance request
    window.rejectMaintenance = async function (requestId) {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        try {
            await apiRequest(`/proctors/maintenance/${requestId}/reject/`, {
                method: 'PUT',
                body: JSON.stringify({ rejection_reason: reason })
            });

            showAlert('Maintenance request rejected.', 'warning');
            await loadPendingMaintenance();
            await loadDashboardData();

        } catch (error) {
            console.error('Reject maintenance error:', error);
            showAlert('Failed to reject maintenance request.', 'error');
        }
    };

    // Approve laundry form
    window.approveLaundry = async function (formId) {
        try {
            await apiRequest(`/proctors/laundry/${formId}/approve/`, {
                method: 'PUT'
            });

            showAlert('Laundry form approved!', 'success');
            await loadPendingLaundry();
            await loadDashboardData();

        } catch (error) {
            console.error('Approve laundry error:', error);
            showAlert('Failed to approve laundry form.', 'error');
        }
    };

    // Reject laundry form
    window.rejectLaundry = async function (formId) {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        try {
            await apiRequest(`/proctors/laundry/${formId}/reject/`, {
                method: 'PUT',
                body: JSON.stringify({ rejection_reason: reason })
            });

            showAlert('Laundry form rejected.', 'warning');
            await loadPendingLaundry();
            await loadDashboardData();

        } catch (error) {
            console.error('Reject laundry error:', error);
            showAlert('Failed to reject laundry form.', 'error');
        }
    };

    // Assign room form submission
    const assignForm = document.getElementById('assignForm');
    if (assignForm) {
        assignForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const studentId = document.getElementById('assignStudentId').value;
            const roomId = document.getElementById('assignRoomNumber').value;
            const assignmentDate = document.getElementById('assignmentDate')?.value || getTodayDate();
            const expectedCheckOut = document.getElementById('expectedCheckOut')?.value || null;

            if (!studentId || !roomId || !assignmentDate || !expectedCheckOut) {
                showAlert('Please fill in all required fields.', 'warning');
                return;
            }

            const requestData = {
                student_id: parseInt(studentId, 10),
                room_id: parseInt(roomId, 10),
                assignment_date: assignmentDate,
                expected_check_out: expectedCheckOut
            };

            try {
                await apiRequest('/proctors/assign-room/', {
                    method: 'POST',
                    body: JSON.stringify(requestData)
                });

                showAlert('Room assigned successfully!', 'success');
                assignForm.reset();
                initializeDatePickers();
                
                // Clear room dropdown
                const roomSelect = document.getElementById('assignRoomNumber');
                if(roomSelect) {
                    roomSelect.innerHTML = '<option value="">Select dormitory first</option>';
                    roomSelect.disabled = true;
                }

                await loadStudents();
                // We don't need to reload available rooms generally as we now fetch per dorm

            } catch (error) {
                console.error('Assign room error:', error);
                showAlert('Failed to assign room. The student may already have a room assigned.', 'error');
            }
        });
    }

    // Penalty form submission
    const penaltyForm = document.getElementById('penaltyForm');
    if (penaltyForm) {
        penaltyForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const studentId = document.getElementById('penaltyStudentId').value;
            const violationType = document.getElementById('violationType').value;
            const description = document.getElementById('penaltyDescription').value;
            const durationDays = document.getElementById('penaltyDuration').value;
            const startDate = document.getElementById('penaltyStartDate')?.value || getTodayDate();
            const consequences = document.getElementById('penaltyConsequences')?.value || '';

            if (!studentId || !violationType || !description) {
                showAlert('Please fill in all required fields.', 'warning');
                return;
            }

            const requestData = {
                student_id: parseInt(studentId, 10),
                violation_type: violationType,
                description: description,
                duration_days: parseInt(durationDays, 10),
                start_date: startDate,
                consequences: consequences
            };

            try {
                await apiRequest('/proctors/penalties/', {
                    method: 'POST',
                    body: JSON.stringify(requestData)
                });

                showAlert('Penalty assigned successfully!', 'success');
                penaltyForm.reset();
                initializeDatePickers();
                await loadDashboardData();
                await loadStudents();

            } catch (error) {
                console.error('Assign penalty error:', error);
                showAlert('Failed to assign penalty.', 'error');
            }
        });
    }

    // Update penalty duration and end date based on violation type
    window.updatePenaltyDuration = function () {
        const violationType = document.getElementById('violationType').value;
        const durationInput = document.getElementById('penaltyDuration');
        const startDateInput = document.getElementById('penaltyStartDate');
        const endDateInput = document.getElementById('penaltyEndDate');

        const durations = {
            'noise': 3,
            'damage': 10,
            'curfew': 5,
            'smoking': 7,
            'visitor': 3,
            'other': 3
        };

        const duration = durations[violationType] || 3;
        if (durationInput) durationInput.value = duration;

        // Calculate end date
        if (startDateInput && endDateInput) {
            const startDate = startDateInput.value || getTodayDate();
            endDateInput.value = calculateEndDate(startDate, duration);
        }
    };

    // Update end date when start date or duration changes
    const startDateInput = document.getElementById('penaltyStartDate');
    const durationInput = document.getElementById('penaltyDuration');

    if (startDateInput) {
        startDateInput.addEventListener('change', function () {
            const endDateInput = document.getElementById('penaltyEndDate');
            const durationInput = document.getElementById('penaltyDuration');
            if (endDateInput && durationInput) {
                endDateInput.value = calculateEndDate(this.value, durationInput.value);
            }
        });
    }

    if (durationInput) {
        durationInput.addEventListener('change', function () {
            const endDateInput = document.getElementById('penaltyEndDate');
            const startDateInput = document.getElementById('penaltyStartDate');
            if (endDateInput && startDateInput) {
                endDateInput.value = calculateEndDate(startDateInput.value || getTodayDate(), this.value);
            }
        });
    }
});
