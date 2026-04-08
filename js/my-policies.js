// document.addEventListener('DOMContentLoaded', () => {
//     const user = JSON.parse(localStorage.getItem('user'));
//     if (!user) {
//         window.location.href = "auth.html";
//         return;
//     }

//     let currentFilter = 'all';
//     let currentSearch = '';

//     // Fetch ALL policies once to calculate summary stats
//     const loadStats = async () => {
//         try {
//             const res = await fetch(`http://localhost:3000/api/my-policies?user_id=${user.id}`);
//             if (!res.ok) return;
//             const all = await res.json();

//             const total = all.length;
//             const active = all.filter(p => p.status === 'active' || p.status === 'renew_soon').length;
//             const expired = all.filter(p => p.status === 'expired').length;
//             const totalPremium = all.reduce((sum, p) => sum + Number(p.premium_amount), 0);

//             document.getElementById('stat-total').textContent = total;
//             document.getElementById('stat-active').textContent = active;
//             document.getElementById('stat-expired').textContent = expired;
//             document.getElementById('stat-premium').textContent = '₹' + totalPremium.toLocaleString();
//         } catch (err) {
//             console.error('Stats error:', err);
//         }
//     };

//     const loadMyPolicies = async () => {
//         const grid = document.getElementById('policies-grid');
//         grid.innerHTML = '<div class="col-span-full text-center py-10"><span class="material-symbols-outlined animate-spin text-4xl text-slate-400">sync</span></div>';

//         try {
//             const res = await fetch(`http://localhost:3000/api/my-policies?user_id=${user.id}&search=${encodeURIComponent(currentSearch)}&status=${currentFilter}`);
//             if (!res.ok) throw new Error('Failed to fetch');

//             const policies = await res.json();
//             grid.innerHTML = '';

//             if (policies.length === 0) {
//                 grid.innerHTML = '<div class="col-span-full text-center py-10"><p class="text-slate-500 font-bold">No policies found.</p></div>';
//                 return;
//             }

//             policies.forEach(policy => {
//                 // Determine icon based on type
//                 let icon = 'shield';
//                 let iconColor = 'text-slate-400 group-hover:text-slate-900';
//                 if (policy.type === 'health') { icon = 'medical_services'; iconColor = 'text-green-500 group-hover:text-green-600'; }
//                 if (policy.type === 'motor') { icon = 'directions_car'; iconColor = 'text-amber-500 group-hover:text-amber-600'; }
//                 if (policy.type === 'life') { icon = 'family_restroom'; iconColor = 'text-purple-500 group-hover:text-purple-600'; }

//                 // Determine badge style
//                 let badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
//                 if (policy.status === 'active') badgeClass = 'bg-green-50 text-green-700 border-green-100';
//                 if (policy.status === 'renew_soon') badgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
//                 if (policy.status === 'expired') badgeClass = 'bg-red-50 text-red-700 border-red-100';

//                 // Format dates safely
//                 const endDate = new Date(policy.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

//                 const cardHtml = `
//                 <div class="animated-card bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group ${policy.status === 'expired' ? 'opacity-70' : ''}">
//                     <div class="p-5 cursor-pointer hover:bg-slate-50 transition-colors" onclick="window.location.href='my-policy.html?id=${policy.id}'">
//                         <div class="flex items-center gap-3">
//                             <div class="w-11 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm transition-colors group-hover:border-slate-300">
//                                 <span class="material-symbols-outlined ${iconColor} transition-colors">${icon}</span>
//                             </div>
//                             <div class="flex-1 min-w-0">
//                                 <h3 class="font-bold text-base text-slate-900 leading-tight">${policy.plan_name || (policy.type.charAt(0).toUpperCase() + policy.type.slice(1) + ' Plan')}</h3>
//                                 <p class="text-[10px] text-slate-500 font-medium mt-0.5">${policy.provider_name}</p>
//                             </div>
//                             <span class="px-2.5 py-1 ${badgeClass} text-[9px] font-bold uppercase tracking-widest rounded-md border">${policy.status.replace('_', ' ')}</span>
//                         </div>
//                     </div>
//                     <div class="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-3">
//                         <button onclick="window.location.href='new-claim.html'" class="flex-1 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-slate-800 shadow-sm transition-all">File Claim</button>
//                         <a href="feedback.html?policy_id=${policy.plan_id}&name=${encodeURIComponent(policy.plan_name || policy.type + ' Plan')}" class="w-10 py-2 bg-white text-amber-500 border border-slate-200 rounded-lg hover:bg-amber-50 shadow-sm transition-all flex items-center justify-center" title="Rate this policy">
//                             <span class="material-symbols-outlined text-lg" style="font-variation-settings: 'FILL' 1;">star</span>
//                         </a>
//                         <button onclick="removePolicy(${policy.id})" class="flex-1 py-2 bg-white text-red-500 border border-red-200 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-red-50 shadow-sm transition-all">Remove</button>
//                     </div>
//                 </div>
//                 `;
//                 grid.innerHTML += cardHtml;
//             });
//         } catch (err) {
//             console.error(err);
//             grid.innerHTML = '<div class="col-span-full text-center py-10 text-red-500 font-bold">Failed to load from server.</div>';
//         }
//     };

//     // Filter Buttons logic
//     document.querySelectorAll('[data-filter]').forEach(btn => {
//         btn.addEventListener('click', () => {
//             document.querySelectorAll('[data-filter]').forEach(b => {
//                 b.className = 'px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-slate-50 transition-all';
//             });
//             btn.className = 'px-4 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm';

//             currentFilter = btn.dataset.filter;
//             loadMyPolicies();
//         });
//     });

//     // DB Backend Search Input Logic
//     const searchInput = document.getElementById('policy-search');
//     let searchTimeout;
//     if (searchInput) {
//         searchInput.addEventListener('input', (e) => {
//             clearTimeout(searchTimeout);
//             searchTimeout = setTimeout(() => {
//                 currentSearch = e.target.value;
//                 loadMyPolicies();
//             }, 300);
//         });
//     }

//     // Remove Policy
//     window.removePolicy = async (policyId) => {
//         if (!confirm('Are you sure you want to remove this policy?\n\nThis action cannot be undone.')) return;

//         try {
//             const res = await fetch(`http://localhost:3000/api/my-policies/${policyId}`, {
//                 method: 'DELETE',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ user_id: user.id })
//             });

//             const data = await res.json();
//             if (res.ok) {
//                 alert('✅ Policy removed successfully.');
//                 loadStats();
//                 loadMyPolicies();
//             } else {
//                 alert('⚠️ ' + data.error);
//             }
//         } catch (err) {
//             console.error(err);
//             alert('Could not connect to the server.');
//         }
//     };

//     loadStats();
//     loadMyPolicies();
// });

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = "auth.html";
        return;
    }

    let currentFilter = 'all';
    let currentSearch = '';

    // Helper: resolve effective status based on end_date
    const getEffectiveStatus = (policy) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(policy.end_date);
        endDate.setHours(0, 0, 0, 0);
        if (endDate < today && policy.status !== 'active') return 'expired';
        if (endDate < today && policy.status === 'active') return 'expired';
        if (policy.status === 'renew_soon' && endDate >= today) return 'renew_soon';
        return policy.status;
    };

    // Fetch ALL policies once to calculate summary stats
    const loadStats = async () => {
        try {
            const res = await fetch(`http://localhost:3000/api/my-policies?user_id=${user.id}`);
            if (!res.ok) return;
            const all = await res.json();

            const total = all.length;
            const active = all.filter(p => {
                const s = getEffectiveStatus(p);
                return s === 'active' || s === 'renew_soon';
            }).length;
            const expired = all.filter(p => getEffectiveStatus(p) === 'expired').length;
            const totalPremium = all.reduce((sum, p) => sum + Number(p.premium_amount), 0);

            document.getElementById('stat-total').textContent = total;
            document.getElementById('stat-active').textContent = active;
            document.getElementById('stat-expired').textContent = expired;
            document.getElementById('stat-premium').textContent = '₹' + totalPremium.toLocaleString();
        } catch (err) {
            console.error('Stats error:', err);
        }
    };

    const loadMyPolicies = async () => {
        const grid = document.getElementById('policies-grid');
        grid.innerHTML = '<div class="col-span-full text-center py-10"><span class="material-symbols-outlined animate-spin text-4xl text-slate-400">sync</span></div>';

        try {
            const res = await fetch(`http://localhost:3000/api/my-policies?user_id=${user.id}&search=${encodeURIComponent(currentSearch)}&status=${currentFilter}`);
            if (!res.ok) throw new Error('Failed to fetch');

            const policies = await res.json();
            grid.innerHTML = '';

            if (policies.length === 0) {
                grid.innerHTML = '<div class="col-span-full text-center py-10"><p class="text-slate-500 font-bold">No policies found.</p></div>';
                return;
            }

            policies.forEach(policy => {
                // Resolve effective status (fix renew_soon/active if past end_date)
                const effectiveStatus = getEffectiveStatus(policy);

                // Determine icon based on type
                let icon = 'shield';
                let iconColor = 'text-slate-400 group-hover:text-slate-900';
                if (policy.type === 'health') { icon = 'medical_services'; iconColor = 'text-green-500 group-hover:text-green-600'; }
                if (policy.type === 'motor') { icon = 'directions_car'; iconColor = 'text-amber-500 group-hover:text-amber-600'; }
                if (policy.type === 'life') { icon = 'family_restroom'; iconColor = 'text-purple-500 group-hover:text-purple-600'; }

                // Determine badge style based on effectiveStatus
                let badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
                if (effectiveStatus === 'active') badgeClass = 'bg-green-50 text-green-700 border-green-100';
                if (effectiveStatus === 'renew_soon') badgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
                if (effectiveStatus === 'expired') badgeClass = 'bg-red-50 text-red-700 border-red-100';

                // Format dates safely
                const endDate = new Date(policy.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                const cardHtml = `
                <div class="animated-card bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group ${effectiveStatus === 'expired' ? 'opacity-70' : ''}">
                    <div class="p-5 cursor-pointer hover:bg-slate-50 transition-colors" onclick="window.location.href='my-policy.html?id=${policy.id}'">
                        <div class="flex items-center gap-3">
                            <div class="w-11 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm transition-colors group-hover:border-slate-300">
                                <span class="material-symbols-outlined ${iconColor} transition-colors">${icon}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h3 class="font-bold text-base text-slate-900 leading-tight">${policy.plan_name || (policy.type.charAt(0).toUpperCase() + policy.type.slice(1) + ' Plan')}</h3>
                                <p class="text-[10px] text-slate-500 font-medium mt-0.5">${policy.provider_name}</p>
                            </div>
                            <span class="px-2.5 py-1 ${badgeClass} text-[9px] font-bold uppercase tracking-widest rounded-md border">${effectiveStatus.replace('_', ' ')}</span>
                        </div>
                    </div>
                    <div class="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-3">
                        <button onclick="window.location.href='new-claim.html'" class="flex-1 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-slate-800 shadow-sm transition-all">File Claim</button>
                        <a href="feedback.html?policy_id=${policy.plan_id}&name=${encodeURIComponent(policy.plan_name || policy.type + ' Plan')}" class="w-10 py-2 bg-white text-amber-500 border border-slate-200 rounded-lg hover:bg-amber-50 shadow-sm transition-all flex items-center justify-center" title="Rate this policy">
                            <span class="material-symbols-outlined text-lg" style="font-variation-settings: 'FILL' 1;">star</span>
                        </a>
                        <button onclick="removePolicy(${policy.id})" class="flex-1 py-2 bg-white text-red-500 border border-red-200 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-red-50 shadow-sm transition-all">Remove</button>
                    </div>
                </div>
                `;
                grid.innerHTML += cardHtml;
            });
        } catch (err) {
            console.error(err);
            grid.innerHTML = '<div class="col-span-full text-center py-10 text-red-500 font-bold">Failed to load from server.</div>';
        }
    };

    // Filter Buttons logic
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-filter]').forEach(b => {
                b.className = 'px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-slate-50 transition-all';
            });
            btn.className = 'px-4 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm';

            currentFilter = btn.dataset.filter;
            loadMyPolicies();
        });
    });

    // DB Backend Search Input Logic
    const searchInput = document.getElementById('policy-search');
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearch = e.target.value;
                loadMyPolicies();
            }, 300);
        });
    }

    // Remove Policy
    window.removePolicy = async (policyId) => {
        if (!confirm('Are you sure you want to remove this policy?\n\nThis action cannot be undone.')) return;

        try {
            const res = await fetch(`http://localhost:3000/api/my-policies/${policyId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id })
            });

            const data = await res.json();
            if (res.ok) {
                alert('✅ Policy removed successfully.');
                loadStats();
                loadMyPolicies();
            } else {
                alert('⚠️ ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Could not connect to the server.');
        }
    };

    loadStats();
    loadMyPolicies();
});