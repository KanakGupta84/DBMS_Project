document.addEventListener('DOMContentLoaded', () => {
    let currentPage = 1;
    const limit = 6;
    let currentSearch = '';
    let currentType = 'all';
    let debounceTimer = null;

    // ── Type config with subtle accent colors (no side border) ───────────
    const TYPE_CONFIG = {
        health: {
            icon:        'medical_services',
            label:       'Health',
            iconBg:      'bg-emerald-50',
            iconColor:   'text-emerald-600',
            badge:       'bg-emerald-50 text-emerald-700 border border-emerald-100',
            cardBorder:  '',
            activeTab:   'bg-emerald-600 border-emerald-600 text-white shadow-emerald-200',
            starFull:    '#10b981',
            btnClass:    'border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white'
        },
        motor: {
            icon:        'directions_car',
            label:       'Motor',
            iconBg:      'bg-blue-50',
            iconColor:   'text-blue-600',
            badge:       'bg-blue-50 text-blue-700 border border-blue-100',
            cardBorder:  '',
            activeTab:   'bg-blue-600 border-blue-600 text-white shadow-blue-200',
            starFull:    '#3b82f6',
            btnClass:    'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'
        },
        life: {
            icon:        'family_restroom',
            label:       'Life',
            iconBg:      'bg-violet-50',
            iconColor:   'text-violet-600',
            badge:       'bg-violet-50 text-violet-700 border border-violet-100',
            cardBorder:  '',
            activeTab:   'bg-violet-600 border-violet-600 text-white shadow-violet-200',
            starFull:    '#8b5cf6',
            btnClass:    'border-violet-600 text-violet-600 hover:bg-violet-600 hover:text-white'
        },
    };

    function getConf(type) { return TYPE_CONFIG[type] || TYPE_CONFIG['health']; }

    function renderStars(rating, conf) {
        const full = Math.round(parseFloat(rating) || 0);
        const color = conf.starFull || '#94a3b8';
        return [1,2,3,4,5].map(i =>
            `<span class="material-symbols-outlined" style="font-size:13px;color:${i<=full?color:'#e2e8f0'};font-variation-settings:'FILL' 1">star</span>`
        ).join('');
    }

    // ── Plan cards ────────────────────────────────────────────────────
    function renderCards(plans) {
        const grid = document.getElementById('policies-grid');
        if (!plans || plans.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full flex flex-col items-center py-20 text-center">
                    <span class="material-symbols-outlined text-slate-300 mb-3" style="font-size:48px">search_off</span>
                    <p class="text-slate-500 font-semibold text-sm">No plans found</p>
                    <p class="text-slate-400 text-xs mt-1">Try a different search or filter</p>
                </div>`;
            return;
        }

        grid.innerHTML = plans.map(plan => {
            const conf = getConf(plan.type);
            const rating = parseFloat(plan.avg_rating) || 0;
            const reviews = plan.feedback_count || 0;

            return `
            <div class="animated-card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-300 ${conf.cardBorder}">
                <div class="p-5 flex flex-col flex-grow">
                    <!-- Header -->
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl ${conf.iconBg} flex items-center justify-center flex-shrink-0">
                                <span class="material-symbols-outlined ${conf.iconColor}" style="font-size:20px;font-variation-settings:'FILL' 1">${conf.icon}</span>
                            </div>
                            <span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${conf.badge}">${conf.label}</span>
                        </div>
                        <div class="text-right">
                            <button onclick="openReviewsModal(${plan.id}, '${plan.name.replace(/'/g,"\\'")}', ${rating}, ${reviews})" class="text-right group/rating hover:opacity-80 transition-opacity focus:outline-none">
                                <div class="flex justify-end">${renderStars(rating, conf)}</div>
                                <p class="text-[10px] text-slate-400 mt-0.5 group-hover/rating:text-amber-600 font-medium transition-colors">${reviews > 0 ? reviews + ' reviews' : 'No reviews'}</p>
                            </button>
                        </div>
                    </div>

                    <!-- Name & Provider -->
                    <h3 class="font-extrabold text-slate-900 text-base leading-tight mb-0.5">${plan.name}</h3>
                    <p class="text-xs text-slate-400 font-medium mb-3">${plan.provider_name || '—'}</p>

                    ${plan.description ? `<p class="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">${plan.description}</p>` : ''}

                    <!-- Coverage & Network chips -->
                    <div class="flex flex-wrap gap-2 mb-4">
                        ${plan.coverage_limit ? `<span class="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">Coverage: ${plan.coverage_limit}</span>` : ''}
                        ${plan.network       ? `<span class="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">Network: ${plan.network}</span>` : ''}
                    </div>

                    <div class="flex-grow"></div>

                    <!-- Premium + CTA -->
                    <div class="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                        <div>
                            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">/ Month</p>
                            <p class="text-xl font-extrabold text-slate-900">₹${parseFloat(plan.premium_amount).toLocaleString('en-IN')}</p>
                        </div>
                        <button
                            onclick="selectPlan(${plan.id}, '${plan.name.replace(/'/g,"\\'")}', '${plan.type}', ${plan.premium_amount}, '${plan.provider_name}')"
                            class="px-4 py-2 text-xs font-extrabold rounded-xl border-2 transition-all uppercase tracking-wider ${conf.btnClass}">
                            Select Plan
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    // ── Pagination ────────────────────────────────────────────────────
    function renderPagination(pagination) {
        const container = document.getElementById('pagination-container');
        if (!pagination || pagination.totalPages <= 1) { container.innerHTML = ''; return; }
        container.innerHTML = Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(i => `
            <button onclick="goToPage(${i})"
                class="w-9 h-9 rounded-xl text-sm font-bold transition-all
                       ${i === pagination.page ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'}">
                ${i}
            </button>`).join('');
    }

    // ── Load plans ────────────────────────────────────────────────────
    const loadPlans = async (page, search = '', type = 'all') => {
        const grid = document.getElementById('policies-grid');
        const countSpan = document.getElementById('policies-count');
        grid.innerHTML = `<div class="col-span-full flex flex-col items-center py-20">
            <span class="material-symbols-outlined text-slate-300 animate-spin mb-3" style="font-size:40px">progress_activity</span>
            <p class="text-slate-400 text-sm">Loading plans...</p>
        </div>`;

        try {
            let url = `http://localhost:3000/api/plans?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
            if (type && type !== 'all') url += `&type=${encodeURIComponent(type)}`;
            const res = await fetch(url);
            const data = await res.json();
            countSpan.textContent = data.pagination.total;
            renderCards(data.plans);
            renderPagination(data.pagination);
        } catch {
            grid.innerHTML = `<div class="col-span-full flex flex-col items-center py-20 text-center">
                <span class="material-symbols-outlined text-slate-300 mb-3" style="font-size:48px">error</span>
                <p class="text-slate-500 font-semibold text-sm">Could not load plans</p>
                <p class="text-slate-400 text-xs mt-1">Make sure the server is running on port 3000</p>
            </div>`;
        }
    };

    window.goToPage = (page) => {
        currentPage = page;
        loadPlans(currentPage, currentSearch, currentType);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── Filter tabs ───────────────────────────────────────────────────
    document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(b => {
                b.classList.remove('active-tab', 'active-health', 'active-motor', 'active-life');
            });
            btn.classList.add('active-tab');
            const type = btn.dataset.type;
            if (type !== 'all') btn.classList.add('active-' + type);
            currentType = type;
            currentPage = 1;
            loadPlans(currentPage, currentSearch, currentType);
        });
    });

    // ── Search ────────────────────────────────────────────────────────
    document.getElementById('search-input').addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentSearch = e.target.value.trim();
            currentPage = 1;
            loadPlans(currentPage, currentSearch, currentType);
        }, 350);
    });

    // ── Nominee user search ───────────────────────────────────────────
    let nomineeTimer = null;
    const nomineeInput    = document.getElementById('nominee_user_search');
    const nomineeResults  = document.getElementById('nominee_search_results');
    const nomineeInfo     = document.getElementById('nominee_selected_info');
    const nomineeIdInput  = document.getElementById('nominee_user_id');

    if (nomineeInput) {
        nomineeInput.addEventListener('input', () => {
            clearTimeout(nomineeTimer);
            const q = nomineeInput.value.trim();
            if (nomineeIdInput) nomineeIdInput.value = '';
            if (nomineeInfo) nomineeInfo.classList.add('hidden');
            if (q.length < 2) { nomineeResults.classList.add('hidden'); return; }

            nomineeTimer = setTimeout(async () => {
                try {
                    const res = await fetch(`http://localhost:3000/api/users/search?q=${encodeURIComponent(q)}`);
                    const users = await res.json();
                    if (users.length === 0) {
                        nomineeResults.innerHTML = `<p class="text-xs text-slate-400 px-4 py-3">No users found</p>`;
                    } else {
                        nomineeResults.innerHTML = users.map(u => `
                            <button type="button"
                                class="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-0 transition-colors"
                                onclick="selectNomineeUser(${u.id}, '${u.full_name.replace(/'/g,"\\'")}', '${u.email}')">
                                <div class="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0">
                                    ${u.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p class="text-sm font-semibold text-slate-800">${u.full_name}</p>
                                    <p class="text-xs text-slate-400">${u.email}</p>
                                </div>
                            </button>`).join('');
                    }
                    nomineeResults.classList.remove('hidden');
                } catch { /* silently fail */ }
            }, 300);
        });

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!nomineeInput.contains(e.target) && !nomineeResults.contains(e.target)) {
                nomineeResults.classList.add('hidden');
            }
        });
    }

    window.selectNomineeUser = (id, name, email) => {
        if (nomineeIdInput) nomineeIdInput.value = id;
        if (nomineeInput) nomineeInput.value = '';
        if (nomineeResults) nomineeResults.classList.add('hidden');

        // Auto-fill nominee_name if empty
        const nameField = document.getElementById('nominee_name');
        if (nameField && !nameField.value) nameField.value = name;

        if (nomineeInfo) {
            nomineeInfo.innerHTML = `
                <span class="material-symbols-outlined text-slate-500" style="font-size:14px;font-variation-settings:'FILL' 1">verified_user</span>
                Linked to <strong>${name}</strong> (${email})
                <button type="button" onclick="clearNomineeUser()" class="ml-1 text-slate-400 hover:text-slate-700">✕</button>`;
            nomineeInfo.classList.remove('hidden');
        }
    };

    window.clearNomineeUser = () => {
        if (nomineeIdInput) nomineeIdInput.value = '';
        if (nomineeInfo) nomineeInfo.classList.add('hidden');
    };

    // ── SELECT PLAN — open modal & show correct fields ────────────────
    window.selectPlan = (planId, planName, planType, premium, provider) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            alert('Please log in first to purchase a plan.');
            window.location.href = 'auth.html';
            return;
        }

        const conf = getConf(planType);

        document.getElementById('modal-plan-id').value = planId;
        document.getElementById('modal-plan-type').value = planType;
        document.getElementById('modal-title').textContent = planName;
        document.getElementById('modal-subtitle').textContent = provider || '';
        document.getElementById('modal-price').textContent = `₹${parseFloat(premium).toLocaleString('en-IN')} / mo`;

        // Colored type badge
        document.getElementById('modal-type-badge').className =
            `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${conf.badge}`;
        document.getElementById('modal-type-badge').innerHTML =
            `<span class="material-symbols-outlined ${conf.iconColor}" style="font-size:12px;font-variation-settings:'FILL' 1">${conf.icon}</span>${conf.label} Insurance`;

        // Hide all type fields + clear required
        ['health-fields','motor-fields','life-fields'].forEach(id => {
            document.getElementById(id).classList.add('hidden');
        });
        document.querySelectorAll('#health-fields [required], #motor-fields [required], #life-fields [required]')
            .forEach(el => el.removeAttribute('required'));

        // Hide vehicle warning banner
        hideVehicleWarning();

        // Show correct section + restore required
        const section = document.getElementById(planType + '-fields');
        if (section) {
            section.classList.remove('hidden');
            section.querySelectorAll('input:not([id="pre_existing_conditions"]), select').forEach(el => el.setAttribute('required', ''));
        }

        // Reset form
        document.getElementById('purchase-form').reset();
        document.getElementById('modal-plan-id').value = planId;
        document.getElementById('modal-plan-type').value = planType;
        if (nomineeIdInput) nomineeIdInput.value = '';
        if (nomineeInfo) nomineeInfo.classList.add('hidden');

        // Show modal
        const modal = document.getElementById('purchase-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    window.closeModal = () => {
        document.getElementById('purchase-modal').classList.add('hidden');
        document.getElementById('purchase-modal').classList.remove('flex');
    };

    // Close on backdrop click
    document.getElementById('purchase-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    // ── Vehicle duplicate warning helpers ─────────────────────────────
    function hideVehicleWarning() {
        const warn = document.getElementById('vehicle-warning-banner');
        if (warn) warn.classList.add('hidden');
        window._forceMotor = false;
    }

    window.proceedForcePurchase = async () => {
        window._forceMotor = true;
        document.getElementById('purchase-form').dispatchEvent(new Event('submit', { cancelable: true }));
    };

    // ── Form submit ───────────────────────────────────────────────────
    document.getElementById('purchase-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const user = JSON.parse(localStorage.getItem('user'));
        const planId   = document.getElementById('modal-plan-id').value;
        const planType = document.getElementById('modal-plan-type').value;
        const btn = document.getElementById('submit-btn');

        let details = {};

        if (planType === 'health') {
            details = {
                patient_name:            document.getElementById('patient_name').value.trim(),
                date_of_birth:           document.getElementById('date_of_birth').value,
                blood_group:             document.getElementById('blood_group').value,
                pre_existing_conditions: document.getElementById('pre_existing_conditions').value.trim() || null,
            };
        } else if (planType === 'motor') {
            details = {
                vehicle_number:    document.getElementById('vehicle_number').value.trim().toUpperCase(),
                vehicle_model:     document.getElementById('vehicle_model').value.trim(),
                registration_year: document.getElementById('registration_year').value,
            };
        } else if (planType === 'life') {
            details = {
                nominee_name:     document.getElementById('nominee_name').value.trim(),
                nominee_relation: document.getElementById('nominee_relation').value,
                nominee_dob:      document.getElementById('nominee_dob').value,
                nominee_user_id:  nomineeIdInput ? (nomineeIdInput.value || null) : null,
            };
        }

        btn.disabled = true;
        btn.innerHTML = `<span class="material-symbols-outlined animate-spin" style="font-size:18px">progress_activity</span> Processing...`;

        try {
            const res = await fetch('http://localhost:3000/api/my-policies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id:     user.id,
                    plan_id:     parseInt(planId),
                    details,
                    force_motor: planType === 'motor' && !!window._forceMotor,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                closeModal();
                showToast(`🎉 Policy purchased! No. ${data.policyNumber}`, 'success');
            } else if (res.status === 409 && data.vehicle_duplicate) {
                // Show inline warning — don't close modal
                const warn = document.getElementById('vehicle-warning-banner');
                document.getElementById('vehicle-warning-msg').textContent = data.error;
                warn.classList.remove('hidden');
                warn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                showToast(data.error || 'Something went wrong.', 'error');
            }
        } catch {
            showToast('Server error — make sure backend is running.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px">shield_check</span> Confirm & Purchase Policy`;
        }
    });

    // ── Toast ─────────────────────────────────────────────────────────
    function showToast(message, type = 'success') {
        const existing = document.getElementById('toast-notif');
        if (existing) existing.remove();
        const colors = type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white';
        const icon   = type === 'success' ? 'check_circle' : 'error';
        const t = document.createElement('div');
        t.id = 'toast-notif';
        t.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${colors}`;
        t.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px;font-variation-settings:'FILL' 1">${icon}</span>${message}`;
        document.body.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(12px)';
            setTimeout(() => t.remove(), 400);
        }, 4000);
    }

    // ── Reviews Modal Logic ───────────────────────────────────────────
    window.openReviewsModal = async (planId, planName, avgRating = 0, totalReviews = 0) => {
        document.getElementById('reviews-modal-title').textContent = planName;
        
        const statsEl = document.getElementById('reviews-modal-stats');
        if (totalReviews > 0) {
            document.getElementById('reviews-modal-avg').textContent = parseFloat(avgRating).toFixed(1);
            document.getElementById('reviews-modal-stars').innerHTML = renderStars(avgRating, getConf('health'));
            document.getElementById('reviews-modal-count').textContent = `(${totalReviews})`;
            statsEl.classList.remove('hidden');
        } else {
            statsEl.classList.add('hidden');
        }

        const modal = document.getElementById('reviews-modal');
        const content = document.getElementById('reviews-modal-content');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // animation tick
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
        }, 10);

        const container = document.getElementById('reviews-container');
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10 text-slate-400">
                <span class="material-symbols-outlined animate-spin text-3xl mb-2">sync</span>
                <p class="text-xs font-medium">Loading reviews...</p>
            </div>
        `;

        try {
            const res = await fetch(`http://localhost:3000/api/feedback?plan_id=${planId}`);
            if (!res.ok) throw new Error('Fetch failed');
            const data = await res.json();
            
            if (data.length === 0) {
                container.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-12 text-center h-full">
                        <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3 border border-slate-200 shadow-sm">
                            <span class="material-symbols-outlined text-slate-300" style="font-size:32px">speaker_notes_off</span>
                        </div>
                        <p class="text-slate-700 font-bold text-sm">No reviews yet</p>
                        <p class="text-slate-400 text-xs mt-1 max-w-[200px]">Be the first to review this plan from your dashboard after purchasing!</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = '<div class="space-y-4 pb-4">' + data.map(r => {
                const date = new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                return `
                <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-black text-sm flex items-center justify-center uppercase border border-slate-200 shadow-sm">
                                ${r.user_name.charAt(0)}
                            </div>
                            <div>
                                <p class="text-sm font-extrabold text-slate-800 leading-tight">${r.user_name}</p>
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">${date}</p>
                            </div>
                        </div>
                        <div class="flex">${renderStars(r.rating, getConf('health'))}</div>
                    </div>
                    <p class="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 mt-4">${r.feedback_text}</p>
                </div>`;
            }).join('') + '</div>';

        } catch (e) {
            container.innerHTML = '<p class="text-red-500 text-center py-10 text-sm font-bold flex flex-col items-center"><span class="material-symbols-outlined text-3xl mb-2">error</span>Failed to load reviews.</p>';
        }
    };

    window.closeReviewsModal = () => {
        const modal = document.getElementById('reviews-modal');
        const content = document.getElementById('reviews-modal-content');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    };

    // Close Reviews Modal on backdrop click
    document.getElementById('reviews-modal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeReviewsModal();
    });

    // ── Initial load ──────────────────────────────────────────────────
    loadPlans(currentPage, currentSearch, currentType);
});