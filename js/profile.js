document.addEventListener('DOMContentLoaded', () => {
    // Load User Data from Local Storage
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            
            // Set Sidebar
            document.getElementById('sidebar-name').textContent = user.full_name;
            
            // Set Form Data
            document.getElementById('profile-email').value = user.email;
            
            // Split Full Name into First and Last
            const nameParts = user.full_name.trim().split(' ');
            document.getElementById('profile-fname').value = nameParts[0] || '';
            document.getElementById('profile-lname').value = nameParts.slice(1).join(' ') || '';
            
        } catch (e) {
            console.error("Error parsing user data", e);
        }
    } else {
        // If not logged in, redirect to login
        window.location.href = 'index.html';
    }

    // Tab Switching Logic
    const tabs = document.querySelectorAll('.profile-tab');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-target');
            
            // Remove active class from all
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            
            // Add active class to target
            tab.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });

    // Form Submissions
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm mr-2 inline-block -translate-y-[1px]">sync</span> Saving...';
            btn.disabled = true;

            setTimeout(() => {
                btn.innerHTML = 'Saved Successfully!';
                btn.classList.add('bg-green-600');
                btn.classList.remove('bg-slate-900', 'hover:bg-slate-800');
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    btn.classList.remove('bg-green-600');
                    btn.classList.add('bg-slate-900', 'hover:bg-slate-800');
                }, 2000);
            }, 800);
        });
    });

    // Dummy Upload interaction
    const uploadBtn = document.getElementById('upload-avatar');
    if(uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            console.log('File picker opened to upload new avatar.');
        });
    }
});
