// Security dashboard functionality - DHMS Frontend
document.addEventListener('DOMContentLoaded', async function () {
    // Initialize dashboard
    const user = initDashboard();
    if (!user) return;

    // Update security name in sidebar
    const securityNameEl = document.getElementById('securityName');
    if (securityNameEl) {
        securityNameEl.textContent = user.name || user.full_name || user.username || 'Security';
    }

    // Load initial data
    await loadDashboardData();
    await loadPendingLaundry();

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
            'verification': 'Laundry Verification',
            'scanner': 'QR Scanner',
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
        if (sectionId === 'verification') {
            loadPendingLaundry();
        } else if (sectionId === 'scanner') {
            initQRScanner();
        }

        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.classList.remove('active');
        }
    };

    // Load dashboard data
    async function loadDashboardData() {
        try {
            const data = await apiRequest('/security/dashboard/');
            // Response structure: { security: {...}, stats: {...} }

            if (data) {
                // Update security info
                if (data.security) {
                    const securityNameEl = document.getElementById('securityName');
                    if (securityNameEl) {
                        securityNameEl.textContent = data.security.full_name || user.name || 'Security';
                    }

                    // Update shift and post info
                    const shiftEl = document.getElementById('securityShift');
                    const postEl = document.getElementById('securityPost');
                    if (shiftEl) shiftEl.textContent = (data.security.shift || 'day').charAt(0).toUpperCase() + (data.security.shift || 'day').slice(1) + ' Shift';
                    if (postEl) postEl.textContent = data.security.assigned_post || 'Main Gate';
                }

                // Update stats
                if (data.stats) {
                    const pendingEl = document.getElementById('pendingVerification');
                    const verifiedEl = document.getElementById('verifiedToday');
                    const takenOutEl = document.getElementById('takenOutToday');

                    if (pendingEl) pendingEl.textContent = data.stats.pending_verification || 0;
                    if (verifiedEl) verifiedEl.textContent = data.stats.verified_today || 0;
                    if (takenOutEl) takenOutEl.textContent = data.stats.taken_out_today || 0;
                }
            }
        } catch (error) {
            console.log('Dashboard data load failed:', error);
        }
    }

    // Load pending laundry forms for verification
    async function loadPendingLaundry() {
        const container = document.getElementById('laundryVerificationList');
        if (!container) return;

        try {
            const data = await apiRequest('/security/laundry/pending/');
            // Response structure: { forms: [...] }
            const forms = data.forms || data || [];

            if (Array.isArray(forms)) {
                container.innerHTML = '';

                if (forms.length === 0) {
                    container.innerHTML = '<div class="no-data"><i class="fas fa-check-circle"></i><p>No forms pending verification</p></div>';
                    return;
                }

                forms.forEach(form => {
                    const card = createLaundryVerificationCard(form);
                    container.appendChild(card);
                });
            }
        } catch (error) {
            console.log('Pending laundry load failed:', error);
            container.innerHTML = '<div class="no-data"><p>Failed to load pending forms</p></div>';
        }
    }

    // Create laundry verification card
    function createLaundryVerificationCard(form) {
        const card = document.createElement('div');
        card.className = 'verification-card';
        card.id = `form-${form.id}`;

        const formCode = form.form_code || `LAU-${form.id}`;
        const studentName = form.student_name || 'Unknown Student';
        const studentCode = form.student_code || '';
        const itemCount = form.item_count || 0;
        const itemList = form.item_list || '';
        const specialInstructions = form.special_instructions || '';
        const submissionDate = form.submission_date || form.created_at;
        const approvedDate = form.approved_date;
        const status = form.status || 'approved';

        card.innerHTML = `
            <div class="verification-header">
                <div class="form-info">
                    <h4>${formCode}</h4>
                    <span class="badge badge-warning">${status.replace(/_/g, ' ')}</span>
                </div>
                <div class="student-info">
                    <strong>${studentName}</strong>
                    <small>${studentCode}</small>
                </div>
            </div>
            <div class="verification-body">
                <div class="item-details">
                    <p><strong>Items:</strong> ${itemCount} items</p>
                    <p><strong>List:</strong> ${itemList}</p>
                    ${specialInstructions ? `<p><strong>Instructions:</strong> ${specialInstructions}</p>` : ''}
                </div>
                <div class="date-info">
                    <p><small>Submitted: ${formatDateTime(submissionDate)}</small></p>
                    ${approvedDate ? `<p><small>Approved: ${formatDateTime(approvedDate)}</small></p>` : ''}
                </div>
            </div>
            <div class="verification-actions">
                <button class="btn btn-success" onclick="verifyLaundryForm(${form.id}, '${formCode}')">
                    <i class="fas fa-check"></i> Verify
                </button>
                <button class="btn btn-primary" onclick="markLaundryTakenOut(${form.id}, '${formCode}')">
                    <i class="fas fa-sign-out-alt"></i> Mark Taken Out
                </button>
            </div>
        `;

        return card;
    }

    // Verify laundry form
    window.verifyLaundryForm = async function (formId, formCode) {
        const notes = prompt('Enter verification notes (optional):') || 'Verified by security';

        try {
            await apiRequest(`/security/laundry/${formId}/verify/`, {
                method: 'PUT',
                body: JSON.stringify({ verification_notes: notes })
            });

            showAlert(`Form ${formCode} verified successfully!`, 'success');

            // Remove card from list
            const card = document.getElementById(`form-${formId}`);
            if (card) {
                card.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => card.remove(), 300);
            }

            // Refresh data
            await loadDashboardData();

        } catch (error) {
            console.error('Verify error:', error);
            showAlert('Failed to verify form', 'error');
        }
    };

    // Mark laundry as taken out
    window.markLaundryTakenOut = async function (formId, formCode) {
        if (!confirm(`Confirm that student is taking out laundry ${formCode}?`)) return;

        try {
            await apiRequest(`/security/laundry/${formId}/taken-out/`, {
                method: 'PUT'
            });

            showAlert(`Form ${formCode} marked as taken out!`, 'success');

            // Remove card from list
            const card = document.getElementById(`form-${formId}`);
            if (card) {
                card.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => card.remove(), 300);
            }

            // Refresh data
            await loadDashboardData();

        } catch (error) {
            console.error('Taken out error:', error);
            showAlert('Failed to mark as taken out', 'error');
        }
    };

    // QR Scanner functionality
    let videoStream = null;
    let scanInterval = null;

    function initQRScanner() {
        const video = document.getElementById('qrVideo');
        const startBtn = document.getElementById('startScanner');
        const stopBtn = document.getElementById('stopScanner');

        if (startBtn) {
            startBtn.onclick = startCamera;
        }
        if (stopBtn) {
            stopBtn.onclick = stopCamera;
        }
    }

    async function startCamera() {
        const video = document.getElementById('qrVideo');
        const canvas = document.getElementById('qrCanvas');
        const ctx = canvas?.getContext('2d');
        const resultDiv = document.getElementById('scanResult');

        if (!video) {
            showAlert('Video element not found', 'error');
            return;
        }

        try {
            // Request camera permission
            videoStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' } // Use back camera on mobile
            });

            video.srcObject = videoStream;
            video.style.display = 'block';
            video.play();

            // Show stop button, hide start button
            const startBtn = document.getElementById('startScanner');
            const stopBtn = document.getElementById('stopScanner');
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-flex';

            // Start scanning for QR codes
            if (typeof jsQR !== 'undefined') {
                scanInterval = setInterval(() => {
                    if (video.readyState === video.HAVE_ENOUGH_DATA) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const code = jsQR(imageData.data, imageData.width, imageData.height);

                        if (code) {
                            console.log('QR Code detected:', code.data);
                            processQRCode(code.data);
                            stopCamera(); // Stop after successful scan
                        }
                    }
                }, 100);
            } else {
                showAlert('QR scanner library not loaded', 'warning');
            }

            showAlert('Camera started. Point at a QR code.', 'info');

        } catch (error) {
            console.error('Camera error:', error);
            showAlert('Could not access camera. Please allow camera permission.', 'error');
        }
    }

    function stopCamera() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }

        if (scanInterval) {
            clearInterval(scanInterval);
            scanInterval = null;
        }

        const video = document.getElementById('qrVideo');
        if (video) {
            video.srcObject = null;
            video.style.display = 'none';
        }

        // Show start button, hide stop button
        const startBtn = document.getElementById('startScanner');
        const stopBtn = document.getElementById('stopScanner');
        if (startBtn) startBtn.style.display = 'inline-flex';
        if (stopBtn) stopBtn.style.display = 'none';
    }

    // Process scanned QR code
    // Process scanned QR code
    async function processQRCode(qrData) {
        const resultDiv = document.getElementById('scanResult');

        // Extract form code from URL or use as-is
        let formCode = qrData;

        // If it's a URL, extract the form code
        if (qrData.includes('/public/laundry/')) {
            const match = qrData.match(/\/public\/laundry\/([^\/]+)/);
            if (match) {
                formCode = match[1];
            }
        }

        console.log('Processing QR code:', formCode);

        // Show processing status
        if (resultDiv) {
            resultDiv.innerHTML = `
                <div class="scan-result-card">
                    <h4><i class="fas fa-spinner fa-spin"></i> Processing...</h4>
                    <p><strong>Code:</strong> ${formCode}</p>
                </div>
            `;
        }

        // Auto-process the code
        await processScannedCode(formCode);
    }

    // Process scanned code via API
    window.processScannedCode = async function (qrCode) {
        try {
            const result = await apiRequest('/security/laundry/scan/', {
                method: 'POST',
                body: JSON.stringify({ qr_code: qrCode })
            });

            if (result) {
                showAlert('Laundry form processed successfully!', 'success');

                // Show result details
                const resultDiv = document.getElementById('scanResult');
                if (resultDiv && result.form) {
                    resultDiv.innerHTML = `
                        <div class="scan-result-card success">
                            <h4><i class="fas fa-check-circle"></i> Success!</h4>
                            <p><strong>Form:</strong> ${result.form.form_code || qrCode}</p>
                            <p><strong>Student:</strong> ${result.form.student_name || 'Unknown'}</p>
                            <p><strong>Items:</strong> ${result.form.item_count || 0} items</p>
                            <p><strong>Status:</strong> ${result.form.status || 'processed'}</p>
                        </div>
                    `;
                }

                await loadDashboardData();
            }
        } catch (error) {
            console.error('Scan process error:', error);
            showAlert('Failed to process QR code', 'error');
        }
    };

    // Manual QR code entry
    window.scanQRCode = function () {
        const input = document.getElementById('scanInput');
        if (!input) return;

        const qrCode = input.value.trim();
        if (!qrCode) {
            showAlert('Please enter a form code', 'warning');
            return;
        }

        processScannedCode(qrCode);
    };

    // Initialize scanner section if visible
    initQRScanner();
});
