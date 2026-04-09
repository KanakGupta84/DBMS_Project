document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const isCustomer = !user || user.role !== 'admin';

    // 1. Unified Header Injection
    let headerHtml = '';
    
    if (isCustomer) {
        headerHtml = `
        <header class="unified-header bg-white border-b border-slate-200 py-2 sticky top-0 z-50">
          <div class="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <div class="flex items-center space-x-12">
              <a href="dashboard.html" class="flex items-center space-x-2 text-slate-900 font-extrabold text-xl tracking-tight uppercase group">
                <svg class="w-8 h-8 transform transition-transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="4" width="20" height="16" rx="4" fill="#0F172A"/>
                  <path d="M12 8L16 12H8L12 8Z" fill="white"/>
                  <path d="M12 16L8 12H16L12 16Z" fill="white"/>
                </svg>
                <span>InsureWise</span>
              </a>
              <nav class="hidden md:flex space-x-8">
                <a href="dashboard.html" class="nav-link" data-path="dashboard.html">Dashboard</a>
                <a href="policies.html" class="nav-link" data-path="policies.html">Policies</a>
                <a href="claims.html" class="nav-link" data-path="claims.html">Claims</a>
              </nav>
            </div>
            <div class="flex items-center space-x-4">
              <a href="profile.html" class="block w-9 h-9 rounded-full overflow-hidden border-2 border-slate-200 hover:border-slate-400 transition-colors transform hover:scale-105">
                <img alt="User" class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdrbICi30s0XsK95NIhKuFueBEppTJSV8i9evVgKwMt9Y2Pc9v4Fn8kAzL9QwpPjiBxkx1OQIZMusKg6j_o1Gj2EiCcLQ0bj8PfI8BSNhUs50EgBKNlgZ_i0nSeNh3L6TyxJ0M1P13gCHVrhedbwTpKU__wrYQB5HW1pGvAlG5Jex2sweaKdXOznPoRC4Xe88oQdUmsEMze8oNN0gfFVoK91O0x1yK5U5P3M1FOVJJMxUL8OTxUV5LhzPFpPgtxxCrvHgcownuosg" />
              </a>
              <a href="index.html" class="ml-2 text-sm font-bold text-slate-500 hover:text-slate-900 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-all">Sign out</a>
            </div>
          </div>
        </header>
        `;
    } else {
        // Admin user header
        headerHtml = `
        <header class="unified-header bg-white border-b border-slate-200 py-2 sticky top-0 z-50">
          <div class="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <div class="flex items-center space-x-12">
              <a href="admin-plans.html" class="flex items-center space-x-2 text-slate-900 font-extrabold text-xl tracking-tight uppercase group">
                <svg class="w-8 h-8 transform transition-transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="4" width="20" height="16" rx="4" fill="#0F172A"/>
                  <path d="M12 8L16 12H8L12 8Z" fill="white"/>
                  <path d="M12 16L8 12H16L12 16Z" fill="white"/>
                </svg>
                <span>InsureWise <span class="text-slate-400 font-medium text-sm">| Admin</span></span>
              </a>
              <nav class="hidden md:flex space-x-8">
                <a href="admin-plans.html" class="nav-link" data-path="admin-plans.html">Manage Plans</a>
                <a href="admin-claims.html" class="nav-link" data-path="admin-claims.html">Review Claims</a>
              </nav>
            </div>
            <div class="flex items-center space-x-4">
              <div class="flex items-center gap-3">
                  <div class="w-9 h-9 bg-slate-100 rounded-full border-2 border-slate-200 overflow-hidden flex items-center justify-center">
                    <span class="material-symbols-outlined text-slate-500 text-lg">admin_panel_settings</span>
                  </div>
                  <span class="text-slate-900 text-sm font-bold hidden sm:block">${user && user.full_name ? user.full_name : 'Admin'}</span>
              </div>
              <a href="index.html" class="ml-2 text-sm font-bold text-slate-500 hover:text-slate-900 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-all">Sign out</a>
            </div>
          </div>
        </header>
        `;
    }

    // Only inject if there's a div#global-header
    const headerPlaceholder = document.getElementById('global-header');
    if (headerPlaceholder) {
        headerPlaceholder.innerHTML = headerHtml;
    }

    // 2. Active Nav Link Logic
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-path') === currentPath) {
            link.classList.add('active');
        }
    });

    // 3. Add stagger animation to cards if present
    const cards = document.querySelectorAll('.animated-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = (index * 0.1) + 's';
        card.classList.add('fade-in-up');
    });
});
