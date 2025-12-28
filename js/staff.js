// Staff dashboard functionality - DHMS Frontend
document.addEventListener('DOMContentLoaded', async function () {
    // Initialize dashboard
    const user = initDashboard();
    if (!user) return;

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
    async function loadMaintenanceJobs() {
        const container = document.getElementById('maintenanceJobsTable');
        if (!container) return;

        try {
            // Get available jobs and my jobs
            const availableData = await apiRequest('/staff/maintenance/');
            const myJobsData = await apiRequest('/staff/maintenance/my-jobs/');

            // Extract jobs arrays handling { jobs: [] } structure
            const availableJobs = availableData.jobs || availableData || [];
            const myJobs = myJobsData.jobs || myJobsData || [];

            console.log('Available jobs:', availableJobs);
            console.log('My jobs:', myJobs);

            // Combine jobs, prioritizing my jobs
            const allJobs = [...myJobs];

            // Add available jobs that aren't already in my jobs
            if (Array.isArray(availableJobs)) {
                availableJobs.forEach(job => {
                    if (!allJobs.find(j => j.id === job.id)) {
                        allJobs.push(job);
                    }
                });
            }

            container.innerHTML = '';

            if (allJobs.length === 0) {
                container.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No maintenance jobs available.</td></tr>';
                return;
            }

            // Sort: In Progress > Assigned > Pending > Completed
            allJobs.sort((a, b) => {
                const order = {
                    'in_progress': 1,
                    'assigned': 2,
                    'approved': 3, // approved = pending assignment
                    'pending_assignment': 3,
                    'completed': 4,
                    'rejected': 5
                };
                // Fallback for unknown status
                const rankA = order[a.status] || 99;
                const rankB = order[b.status] || 99;

                return rankA - rankB;
            });

            allJobs.forEach(job => {
                const row = createJobRow(job);
                container.appendChild(row);
            });

        } catch (error) {
            console.log('Maintenance jobs load failed:', error);
            container.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Failed to load jobs.</td></tr>';
        }
    }

    // Helper to create job row
    function createJobRow(job) {
        const row = document.createElement('tr');

        // Map backend fields
        const jobId = job.id;
        const requestCode = job.request_code || `MNT-${jobId}`;
        const roomNumber = job.room_number || job.room || 'N/A';
        const issueType = job.issue_type || job.title || 'Maintenance Issue';
        const description = job.description || '';
        const studentName = job.student_name || 'Unknown';
        const urgency = job.urgency || 'low';
        const status = job.status || 'approved';

        let statusBadge = '';
        let actionButton = '';

        // Determine badge and action based on status
        switch (status) {
            case 'approved':
            case 'pending_assignment':
                statusBadge = '<span class="badge badge-warning">Pending Assignment</span>';
                actionButton = `
                    <button class="btn btn-sm btn-primary" onclick="acceptJob(${jobId})">
                        <i class="fas fa-hand-paper"></i> Accept
                    </button>
                `;
                break;
            case 'assigned':
                statusBadge = '<span class="badge badge-info">Assigned</span>';
                actionButton = `
                    <button class="btn btn-sm btn-success" onclick="startJob(${jobId})">
                        <i class="fas fa-play"></i> Start
                    </button>
                `;
                break;
            case 'in_progress':
                statusBadge = '<span class="badge badge-primary">In Progress</span>';
                actionButton = `
                    <button class="btn btn-sm btn-success" onclick="completeJob(${jobId})">
                        <i class="fas fa-check"></i> Complete
                    </button>
                `;
                break;
            case 'completed':
                statusBadge = '<span class="badge badge-success">Completed</span>';
                actionButton = '<span class="text-muted"><i class="fas fa-check-circle"></i> Done</span>';
                break;
            default:
                statusBadge = `<span class="badge badge-secondary">${status.replace(/_/g, ' ')}</span>`;
                actionButton = '-';
        }

        // Urgency badge
        const urgencyClass = urgency === 'high' ? 'badge-danger' :
            urgency === 'medium' ? 'badge-warning' : 'badge-success';
        const urgencyBadge = `<span class="badge ${urgencyClass}">${urgency.toUpperCase()}</span>`;

        row.innerHTML = `
            <td><strong>${requestCode}</strong></td>
            <td>${roomNumber}</td>
            <td>
                <div><strong>${issueType}</strong></div>
                <small class="text-muted">${description.substring(0, 30)}${description.length > 30 ? '...' : ''}</small>
            </td>
            <td>${studentName}</td>
            <td>${urgencyBadge}</td>
            <td>${statusBadge}</td>
            <td>${actionButton}</td>
        `;

        return row;
    }

    // Accept Job
    window.acceptJob = async function (jobId) {
        if (!confirm('Are you sure you want to accept this job?')) return;

        try {
            await apiRequest(`/staff/maintenance/${jobId}/accept/`, { method: 'POST' });
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
            await apiRequest(`/staff/maintenance/${jobId}/start/`, { method: 'POST' });
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
                method: 'POST',
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
});