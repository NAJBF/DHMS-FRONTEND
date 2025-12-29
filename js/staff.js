// Staff dashboard functionality - DHMS Frontend
document.addEventListener('DOMContentLoaded', async function () {
    // Initialize dashboard
    const user = initDashboard();
    if (!user) return;

    // Define Actions Globally FIRST
    // Accept Job
    window.acceptJob = async function (jobId) {
        if (!confirm('Are you sure you want to accept this job?')) return;

        try {
            await apiRequest(`/staff/maintenance/${jobId}/accept/`, { method: 'PUT' });
            showAlert('Job accepted successfully!', 'success');
            loadMaintenanceJobs();
            loadDashboardData();
        } catch (error) {
            console.error('Accept job error:', error);
            showAlert('Failed to accept job.', 'error');
        }
    };

    // Start Job
    window.startJob = async function (jobId) {
        try {
            await apiRequest(`/staff/maintenance/${jobId}/start/`, { method: 'PUT' });
            showAlert('Work started!', 'success');
            loadMaintenanceJobs();
            loadDashboardData();
        } catch (error) {
            console.error('Start job error:', error);
            showAlert('Failed to start job.', 'error');
        }
    };

    // Complete Job
    window.completeJob = async function (jobId) {
        const notes = prompt('Enter completion notes (optional):');

        try {
            await apiRequest(`/staff/maintenance/${jobId}/complete/`, {
                method: 'PUT',
                body: JSON.stringify({ notes: notes || '' })
            });
            showAlert('Job marked as completed!', 'success');
            loadMaintenanceJobs();
            loadDashboardData();
        } catch (error) {
            console.error('Complete job error:', error);
            showAlert('Failed to complete job.', 'error');
        }
    };

    // Load initial data
    await loadDashboardData();
    await loadMaintenanceJobs();

    // Load dashboard stats and staff info
    async function loadDashboardData() {
        try {
            const data = await apiRequest('/staff/dashboard/');
            // Response: { staff: {...}, stats: {...} }

            if (data) {
                // Update staff info
                if (data.staff) {
                    const nameEl = document.getElementById('sidebarName');
                    const roleEl = document.getElementById('sidebarRole');
                    if (nameEl) nameEl.textContent = data.staff.full_name || user.name || 'Staff';
                    if (roleEl) roleEl.textContent = data.staff.position || data.staff.department || 'Maintenance';
                }

                // Update stats
                if (data.stats) {
                    const pendingEl = document.getElementById('pendingJobsCount');
                    const inProgressEl = document.getElementById('inProgressJobsCount');
                    const completedEl = document.getElementById('completedJobsCount');

                    // Stats from backend: pending_jobs, in_progress_jobs, completed_jobs
                    if (pendingEl) pendingEl.textContent = `${data.stats.pending_jobs || 0} Pending`;
                    if (inProgressEl) inProgressEl.textContent = `${data.stats.in_progress_jobs || 0} In Progress`;
                    if (completedEl) completedEl.textContent = `${data.stats.completed_jobs || 0} Completed`;
                }
            }
        } catch (error) {
            console.log('Staff dashboard data load failed:', error);
        }
    }

    // Load maintenance jobs (pool and assigned)
    // Load maintenance jobs (pool and assigned)
    async function loadMaintenanceJobs() {
        const availableContainer = document.getElementById('availableJobsTable');
        const myJobsContainer = document.getElementById('myJobsTable');

        if (!availableContainer && !myJobsContainer) return;

        try {
            // Get available jobs
            if (availableContainer) {
                const availableData = await apiRequest('/staff/maintenance/');
                const availableJobs = availableData.jobs || availableData || [];

                availableContainer.innerHTML = '';
                if (availableJobs.length === 0) {
                    availableContainer.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No available jobs found.</td></tr>';
                } else {
                    availableJobs.forEach(job => {
                        const row = createAvailableJobRow(job);
                        availableContainer.appendChild(row);
                    });
                }
            }

            // Get my assigned jobs
            if (myJobsContainer) {
                const myJobsData = await apiRequest('/staff/maintenance/my-jobs/');
                const myJobs = myJobsData.jobs || myJobs || [];

                myJobsContainer.innerHTML = '';
                if (myJobs.length === 0) {
                    myJobsContainer.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No assigned jobs found.</td></tr>';
                } else {
                    // Sort: In Progress > Assigned > Completed
                    myJobs.sort((a, b) => {
                        const statusA = (a.status || '').toLowerCase();
                        const statusB = (b.status || '').toLowerCase();
                        const order = { 'in_progress': 1, 'assigned': 2, 'completed': 3 };
                        return (order[statusA] || 99) - (order[statusB] || 99);
                    });

                    myJobs.forEach(job => {
                        const row = createMyJobRow(job);
                        myJobsContainer.appendChild(row);
                    });
                }
            }

        } catch (error) {
            console.log('Maintenance jobs load failed:', error);
            if (availableContainer) availableContainer.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Failed to load jobs.</td></tr>';
            if (myJobsContainer) myJobsContainer.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Failed to load jobs.</td></tr>';
        }
    }

    // Create row for Available Jobs
    function createAvailableJobRow(job) {
        const row = document.createElement('tr');
        const jobId = job.id;
        const requestCode = job.request_code || `MNT-${jobId}`;
        const roomNumber = job.room_number || job.room || 'N/A';
        const issueType = job.issue_type || job.title || 'Issue';
        const urgency = job.urgency || 'low';
        const date = formatDate(job.reported_date || job.created_at);

        // Urgency badge
        const urgencyClass = urgency === 'high' ? 'badge-danger' :
            urgency === 'medium' ? 'badge-warning' : 'badge-success';
        const urgencyBadge = `<span class="badge ${urgencyClass}">${urgency.toUpperCase()}</span>`;

        row.innerHTML = `
            <td><strong>${requestCode}</strong></td>
            <td>${roomNumber}</td>
            <td>${formatIssueType(issueType)}</td>
            <td>${urgencyBadge}</td>
            <td>${date}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="acceptJob(${jobId})">
                    <i class="fas fa-hand-paper"></i> Accept
                </button>
            </td>
        `;
        return row;
    }

    // Create row for My Jobs
    function createMyJobRow(job) {
        const row = document.createElement('tr');
        const jobId = job.id;
        const requestCode = job.request_code || `MNT-${jobId}`;
        const roomNumber = job.room_number || job.room || 'N/A';
        const issueType = job.issue_type || job.title || 'Issue';
        const urgency = job.urgency || 'low';

        // Normalize status
        let status = (job.status || 'assigned').toLowerCase();

        // Urgency badge
        const urgencyClass = urgency === 'high' ? 'badge-danger' :
            urgency === 'medium' ? 'badge-warning' : 'badge-success';
        const urgencyBadge = `<span class="badge ${urgencyClass}">${urgency.toUpperCase()}</span>`;

        let statusBadge = '';
        let actionButton = '';

        // Flexible status matching
        if (status.includes('assign') || status === 'pending_staff') {
            statusBadge = '<span class="badge badge-info">Assigned</span>';
            actionButton = `
                <button class="btn btn-sm btn-success" onclick="startJob(${jobId})">
                    <i class="fas fa-play"></i> Start
                </button>
            `;
        } else if (status.includes('progress') || status.includes('start')) {
            statusBadge = '<span class="badge badge-primary">In Progress</span>';
            actionButton = `
                <button class="btn btn-sm btn-success" onclick="completeJob(${jobId})">
                    <i class="fas fa-check"></i> Complete
                </button>
            `;
        } else if (status.includes('complete') || status.includes('done')) {
            statusBadge = '<span class="badge badge-success">Completed</span>';
            actionButton = '<span class="text-muted"><i class="fas fa-check-circle"></i> Done</span>';
        } else {
            statusBadge = `<span class="badge badge-secondary">${status}</span>`;
            actionButton = '-';
        }

        row.innerHTML = `
            <td><strong>${requestCode}</strong></td>
            <td>${roomNumber}</td>
            <td>${formatIssueType(issueType)}</td>
            <td>${urgencyBadge}</td>
            <td>${statusBadge}</td>
            <td>${actionButton}</td>
        `;
        return row;
    }

    function formatIssueType(type) {
        if (!type) return 'Other';
        return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
    }

    // Helper to create job row


    // Accept Job
    // ACCEPT JOB logic moved to top


    // Start Job
    // START JOB logic moved to top


    // Complete Job
    // COMPLETE JOB logic moved to top

});
