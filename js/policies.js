document.addEventListener('DOMContentLoaded', () => {
    let currentPage = 1;
    const limit = 4; // plans per page
    
    const loadPlans = async (page, search = '') => {
        const grid = document.getElementById('policies-grid');
        const countSpan = document.getElementById('policies-count');
        const paginationContainer = document.getElementById('pagination-container');
        
        grid.innerHTML = '<div class="col-span-1 xl:col-span-2 text-center py-10"><span class="material-symbols-outlined animate-spin text-4xl text-slate-400">sync</span><p class="text-slate-500 mt-2">Loading plans...</p></div>';
        
        try {
            const res = await fetch(`http://localhost:3000/api/plans?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
            if (!res.ok) throw new Error('Failed to fetch');
            
            const data = await res.json();
            
            grid.innerHTML = '';
            countSpan.textContent = data.pagination.total;
            
            if (data.plans.length === 0) {
                grid.innerHTML = '<div class="col-span-1 xl:col-span-2 text-center py-10"><p class="text-slate-500 font-bold">No plans available.</p></div>';
                paginationContainer.innerHTML = '';
                return;
            }
            
            // Render Cards
            data.plans.forEach(plan => {
                const avgRating = parseFloat(plan.avg_rating).toFixed(1);
                
                // Construct standard icon based on type/icon_type
                let iconPath = "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"; // default building
                if (plan.icon_type === 'car') iconPath = "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z";
                if (plan.icon_type === 'shield') iconPath = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z";

                const cardHtml = `
                <article class="animated-card bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col group fade-in-up">
                    <div class="p-6 flex-grow">
                        <div class="flex justify-between items-start mb-4">
                            <div class="flex items-center space-x-4">
                                <div class="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm group-hover:border-slate-400 transition-colors">
                                    <svg class="w-6 h-6 text-slate-400 group-hover:text-slate-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="${iconPath}" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                                </div>
                                <div>
                                    <h4 class="font-bold text-lg text-slate-900 leading-tight">${plan.name}</h4>
                                    <p class="text-xs text-slate-500 font-medium mt-0.5">${plan.provider_name}</p>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <p class="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Coverage Limit</p>
                                <p class="text-sm font-bold text-slate-900">${plan.coverage_limit}</p>
                            </div>
                            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <p class="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Network</p>
                                <p class="text-sm font-bold text-slate-900">${plan.network}</p>
                            </div>
                        </div>

                        <ul class="space-y-2.5 mb-2">
                            <li class="flex items-start text-xs text-slate-600 font-medium">
                                <svg class="w-4 h-4 text-green-500 mr-2 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                                ${plan.description || '<span class="text-slate-400 italic">None</span>'}
                            </li>
                        </ul>
                    </div>
                    <div class="px-6 py-5 bg-slate-50 border-t border-slate-100 mt-auto flex items-center justify-between">
                        <div>
                            <p class="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-0.5">Premium</p>
                            <p class="text-xl font-extrabold text-slate-900">₹${plan.premium_amount}<span class="text-xs font-medium text-slate-500">/mo</span></p>
                        </div>
                        <div class="flex gap-2">
                             <button onclick="viewPlanDetails(${plan.id}, '${plan.name.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', '${plan.provider_name.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', '${plan.type}')" class="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-sm font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-1">
                                <span class="material-symbols-outlined text-amber-400 text-[18px]" style="font-variation-settings: 'FILL' 1;">star</span>
                                ${avgRating > 0 ? avgRating : 'Rate'}
                             </button>
                            <button onclick="selectPlan(${plan.id}, '${plan.name.replace(/'/g, "\\'")}', '${plan.type}')" class="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:shadow-slate-900/30 transition-all">Select Plan</button>
                        </div>
                    </div>
                </article>
                `;
                grid.innerHTML += cardHtml;
            });
            
            // Render Pagination
            renderPagination(data.pagination);
            
        } catch (err) {
            console.error(err);
            grid.innerHTML = '<div class="col-span-1 xl:col-span-2 text-center py-10"><p class="text-red-500 font-bold">Failed to load plans from server.</p></div>';
            paginationContainer.innerHTML = '';
        }
    };
    
    const renderPagination = ({ page, totalPages }) => {
        const container = document.getElementById('pagination-container');
        let html = '';
        
        // Prev button
        html += `<button class="p-2.5 border border-slate-200 bg-white rounded-lg shadow-sm hover:border-slate-400 disabled:opacity-50 transition-all" ${page === 1 ? 'disabled' : ''} onclick="changePage(${page - 1})">
                    <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                </button>`;
                
        for (let i = 1; i <= totalPages; i++) {
            if (i === page) {
                html += `<button class="w-10 h-10 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-md transition-all">${i}</button>`;
            } else {
                html += `<button class="w-10 h-10 bg-white border border-slate-200 text-slate-600 hover:border-slate-400 text-xs font-bold rounded-lg transition-all" onclick="changePage(${i})">${i}</button>`;
            }
        }
        
        // Next button
        html += `<button class="p-2.5 border border-slate-200 bg-white rounded-lg shadow-sm hover:border-slate-400 disabled:opacity-50 transition-all" ${page === totalPages ? 'disabled' : ''} onclick="changePage(${page + 1})">
                    <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                </button>`;
                
        container.innerHTML = html;
    };
    
    // Make changePage available globally so onclick works
    window.changePage = (newPage) => {
        currentPage = newPage;
        const searchInput = document.getElementById('catalog-search');
        loadPlans(currentPage, searchInput ? searchInput.value : '');
    };

    // Search listener
    const searchInput = document.getElementById('catalog-search');
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                loadPlans(currentPage, e.target.value);
            }, 300); // Debounce to prevent too many requests
        });
    }

    // Modal: Open with type-specific fields
    window.selectPlan = (planId, planName, planType) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            alert('Please log in first.');
            window.location.href = 'auth.html';
            return;
        }

        const modal = document.getElementById('purchase-modal');
        document.getElementById('modal-plan-id').value = planId;
        document.getElementById('modal-plan-type').value = planType;
        document.getElementById('modal-title').textContent = `Purchase: ${planName}`;
        document.getElementById('modal-subtitle').textContent = `Fill in your ${planType} insurance details below.`;

        // Hide all field groups, show the relevant one
        document.getElementById('health-fields').classList.add('hidden');
        document.getElementById('motor-fields').classList.add('hidden');
        document.getElementById('life-fields').classList.add('hidden');

        // Disable required on hidden fields, enable on visible
        document.querySelectorAll('#health-fields input, #health-fields select').forEach(el => el.required = false);
        document.querySelectorAll('#motor-fields input').forEach(el => el.required = false);
        document.querySelectorAll('#life-fields input, #life-fields select').forEach(el => el.required = false);

        const activeFields = document.getElementById(`${planType}-fields`);
        activeFields.classList.remove('hidden');
        activeFields.querySelectorAll('input, select').forEach(el => { if (el.placeholder !== '') el.required = true; });

        // Reset form
        document.getElementById('purchase-form').reset();
        document.getElementById('modal-plan-id').value = planId;
        document.getElementById('modal-plan-type').value = planType;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    window.closeModal = () => {
        const modal = document.getElementById('purchase-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    };

    // Form submission
    document.getElementById('purchase-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));
        const planId = document.getElementById('modal-plan-id').value;
        const planType = document.getElementById('modal-plan-type').value;
        const submitBtn = document.getElementById('modal-submit-btn');

        let details = {};
        if (planType === 'health') {
            details = {
                patient_name: document.getElementById('patient_name').value,
                date_of_birth: document.getElementById('date_of_birth').value,
                blood_group: document.getElementById('blood_group').value,
                pre_existing_conditions: document.getElementById('pre_existing_conditions').value
            };
        } else if (planType === 'motor') {
            details = {
                vehicle_number: document.getElementById('vehicle_number').value.toUpperCase(),
                vehicle_model: document.getElementById('vehicle_model').value,
                registration_year: parseInt(document.getElementById('registration_year').value)
            };
        } else if (planType === 'life') {
            details = {
                nominee_name: document.getElementById('nominee_name').value,
                nominee_relation: document.getElementById('nominee_relation').value,
                nominee_dob: document.getElementById('nominee_dob').value
            };
        }

        submitBtn.textContent = 'Processing...';
        submitBtn.disabled = true;

        try {
            const res = await fetch('http://localhost:3000/api/my-policies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, plan_id: parseInt(planId), details })
            });

            const data = await res.json();
            if (res.ok) {
                closeModal();
                alert(`✅ Policy purchased!\n\nPolicy Number: ${data.policyNumber}\nView it in "My Policies".`);
            } else {
                alert('⚠️ ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Could not connect to the server.');
        } finally {
            submitBtn.textContent = 'Confirm Purchase';
            submitBtn.disabled = false;
        }
    });

    // Initial Load
    loadPlans(currentPage);

    // View Plan Details Modal
    window.viewPlanDetails = async (planId, planName, planProvider, planType) => {
        const modal = document.getElementById('detail-modal');
        document.getElementById('detail-modal-title').textContent = planName;
        document.getElementById('detail-modal-provider').textContent = planProvider;
        document.getElementById('detail-avg-rating').textContent = '—';
        document.getElementById('detail-stars').innerHTML = '';
        document.getElementById('detail-review-count').textContent = '';
        document.getElementById('detail-reviews-list').innerHTML = '<p class="text-slate-400 text-sm text-center py-4">Loading reviews...</p>';

        // Set up action buttons
        document.getElementById('detail-leave-review-btn').href = `feedback.html?policy_id=${planId}&name=${encodeURIComponent(planName)}`;
        document.getElementById('detail-select-plan-btn').onclick = () => { closeDetailModal(); selectPlan(planId, planName, planType); };

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // Fetch reviews
        try {
            const res = await fetch(`http://localhost:3000/api/feedback?plan_id=${planId}`);
            const reviews = await res.json();

            const listEl = document.getElementById('detail-reviews-list');
            const avgEl = document.getElementById('detail-avg-rating');
            const starsEl = document.getElementById('detail-stars');
            const countEl = document.getElementById('detail-review-count');

            if (reviews.length === 0) {
                avgEl.textContent = '—';
                countEl.textContent = 'No reviews yet';
                listEl.innerHTML = '<p class="text-slate-400 text-sm text-center py-6">Be the first to leave a review!</p>';
                return;
            }

            const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
            avgEl.textContent = avg;
            countEl.textContent = `${reviews.length} review${reviews.length !== 1 ? 's' : ''}`;

            // Render stars
            starsEl.innerHTML = '';
            for (let i = 1; i <= 5; i++) {
                const s = document.createElement('span');
                s.className = 'material-symbols-outlined text-xl ' + (i <= Math.round(avg) ? 'text-amber-400' : 'text-slate-200');
                if (i <= Math.round(avg)) s.style.fontVariationSettings = "'FILL' 1";
                s.textContent = 'star';
                starsEl.appendChild(s);
            }

            // Render review cards
            listEl.innerHTML = reviews.map(r => {
                const stars = Array.from({length: 5}, (_, i) => i < r.rating
                    ? `<span class="material-symbols-outlined text-amber-400 text-sm" style="font-variation-settings:'FILL' 1">star</span>`
                    : `<span class="material-symbols-outlined text-slate-200 text-sm">star</span>`
                ).join('');
                const date = new Date(r.created_at).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
                return `
                    <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <div class="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold text-xs uppercase">${r.user_name.charAt(0)}</div>
                                <p class="text-sm font-bold text-slate-900">${r.user_name}</p>
                            </div>
                            <div class="flex items-center gap-2">
                                <div class="flex">${stars}</div>
                                <span class="text-[10px] text-slate-400 font-bold">${date}</span>
                            </div>
                        </div>
                        <p class="text-sm text-slate-600 font-medium leading-relaxed">${r.feedback_text || ''}</p>
                    </div>
                `;
            }).join('');
        } catch(err) {
            document.getElementById('detail-reviews-list').innerHTML = '<p class="text-red-400 text-sm text-center py-4">Could not load reviews.</p>';
        }
    };

    window.closeDetailModal = () => {
        const modal = document.getElementById('detail-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    };
});
