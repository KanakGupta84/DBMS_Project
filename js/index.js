document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = "auth.html";
        return;
    }

    // Set welcome name
    const nameSpan = document.getElementById('dash-username');
    if (nameSpan) nameSpan.textContent = user.full_name.split(' ')[0];

    // Load user's policies for dashboard
    const loadDashPolicies = async () => {
        const grid = document.getElementById('dash-policies-grid');
        if (!grid) return;

        try {
            const res = await fetch(`http://localhost:3000/api/my-policies?user_id=${user.id}`);
            if (!res.ok) throw new Error('Failed');
            const policies = await res.json();

            grid.innerHTML = '';

            if (policies.length === 0) {
                grid.innerHTML = '<p class="col-span-full text-slate-500 text-sm font-medium py-6 text-center">No policies yet. <a href="policies.html" class="font-bold text-slate-900 underline">Buy one now!</a></p>';
                return;
            }

            // Show max 3 most recent policies on dashboard
            policies.slice(0, 3).forEach(policy => {
                let icon = 'description';
                let cornerBg = 'bg-slate-50';
                let badgeText = policy.status.replace('_', ' ');
                let badgeClass = 'text-slate-600 bg-slate-100';

                if (policy.type === 'health') icon = 'medical_services';
                if (policy.type === 'motor') { icon = 'directions_car'; cornerBg = 'bg-amber-50'; }
                if (policy.type === 'life') icon = 'family_restroom';

                if (policy.status === 'active') badgeClass = 'text-green-700 bg-green-100';
                if (policy.status === 'renew_soon') badgeClass = 'text-amber-700 bg-amber-100';
                if (policy.status === 'expired') badgeClass = 'text-red-700 bg-red-100';

                const startYear = new Date(policy.start_date).getFullYear();

                grid.innerHTML += `
                <div class="policy-card animated-card card-gradient p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group cursor-pointer" onclick="window.location.href='my-policies.html'">
                    <div class="absolute top-0 right-0 w-16 h-16 ${cornerBg} rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 transition-colors group-hover:text-slate-900 shadow-sm">
                            <span class="material-symbols-outlined text-lg">${icon}</span>
                        </div>
                        <div>
                            <h3 class="font-bold text-sm text-slate-900">${policy.plan_name || (policy.type.charAt(0).toUpperCase() + policy.type.slice(1) + ' Plan')}</h3>
                            <p class="text-[10px] text-slate-500 font-medium">${policy.provider_name}</p>
                        </div>
                    </div>
                </div>
                `;
            });
        } catch (err) {
            console.error(err);
            grid.innerHTML = '<p class="col-span-full text-red-500 font-bold text-sm text-center py-6">Could not load policies.</p>';
        }
    };

    // Load user's claims for dashboard
    const loadDashClaims = async () => {
        const container = document.getElementById('dash-claims-container');
        if (!container) return;

        try {
            const res = await fetch(`http://localhost:3000/api/my-claims?user_id=${user.id}`);
            if (!res.ok) throw new Error('Failed');
            const claims = await res.json();

            container.innerHTML = '';

            if (claims.length === 0) {
                container.innerHTML = '<p class="text-slate-500 text-sm font-medium py-4">No active claims.</p>';
                return;
            }

            // Show up to 3 most recent claims
            const recentClaims = claims.slice(0, 3);

            recentClaims.forEach(claim => {
                let statusLabel = claim.status;
                let statusColor = 'text-slate-900';
                let statusBg = 'bg-slate-100';
                if (claim.status === 'approved') { statusColor = 'text-green-700'; statusBg = 'bg-green-50'; }
                if (claim.status === 'declined') { statusColor = 'text-red-700'; statusBg = 'bg-red-50'; }
                if (claim.status === 'pending') { statusColor = 'text-amber-700'; statusBg = 'bg-amber-50'; }

                const filingDate = new Date(claim.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                let typeIcon = 'receipt_long';
                if (claim.claim_type === 'health') typeIcon = 'medical_services';
                if (claim.claim_type === 'motor') typeIcon = 'directions_car';
                if (claim.claim_type === 'life') typeIcon = 'family_restroom';

                container.innerHTML += `
                <div onclick="window.location.href='claims.html'" class="animated-card card-gradient p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-slate-400 transition-all mb-3">
                    <div class="flex items-center gap-5">
                        <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-slate-500">${typeIcon}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4 class="font-bold text-sm text-slate-900 mb-1">${claim.claim_id} • ₹${Number(claim.estimated_amount).toLocaleString()}</h4>
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-[10px] ${statusColor} ${statusBg} uppercase tracking-widest font-bold px-2 py-0.5 rounded-md capitalize">${statusLabel}</span>
                                <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                                <p class="text-xs text-slate-500 font-medium">Filed ${filingDate}</p>
                            </div>
                        </div>
                        <span class="material-symbols-outlined text-slate-400">chevron_right</span>
                    </div>
                </div>
                `;
            });
        } catch (err) {
            console.error(err);
            container.innerHTML = '<p class="text-red-500 font-bold text-sm py-4">Could not load claims.</p>';
        }
    };

    // Load nominee policies for dashboard summary + modal
    const loadNomineePolicies = async () => {
        const container = document.getElementById('dash-nominee-container');
        const summary   = document.getElementById('dash-nominee-summary');
        if (!container || !summary) return;

        try {
            const res = await fetch(`http://localhost:3000/api/my-nominee-policies?user_id=${user.id}`);
            if (!res.ok) throw new Error('Failed');
            const policies = await res.json();

            // Update sidebar summary count
            summary.innerHTML = `<p class="text-2xl font-black text-slate-900 tracking-tight">${policies.length} <span class="text-sm text-slate-500 font-medium tracking-normal">policies</span></p>`;

            if (policies.length === 0) {
                container.innerHTML = `
                    <div class="bg-white border border-slate-200 rounded-xl px-4 py-8 text-center shadow-sm">
                        <div class="w-12 h-12 bg-slate-50 mx-auto rounded-full flex items-center justify-center mb-3">
                            <span class="material-symbols-outlined text-slate-300" style="font-size:24px">family_restroom</span>
                        </div>
                        <p class="text-sm text-slate-500 font-medium">You are not listed as a nominee<br>in any active life policy.</p>
                    </div>`;
                return;
            }

            container.innerHTML = policies.map(p => {
                const statusColor = p.status === 'active' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                  : p.status === 'expired' ? 'text-slate-500 bg-slate-100 border-slate-200'
                                  : 'text-amber-700 bg-amber-50 border-amber-200';
                const endDate = new Date(p.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                return `
                <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-violet-300 hover:shadow-md transition-all group">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-violet-50 text-violet-500 flex items-center justify-center border border-violet-100">
                                <span class="material-symbols-outlined" style="font-size:16px;">family_restroom</span>
                            </div>
                            <p class="text-sm font-bold text-slate-900 leading-tight group-hover:text-violet-700 transition-colors">${p.plan_name}</p>
                        </div>
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${statusColor}">${p.status.replace('_', ' ')}</span>
                    </div>
                    
                    <div class="bg-slate-50 rounded-lg p-3 grid grid-cols-2 gap-2 mb-2">
                        <div>
                            <p class="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-0.5">Policyholder</p>
                            <p class="text-xs font-semibold text-slate-800">${p.policy_holder_name}</p>
                        </div>
                        <div>
                            <p class="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-0.5">Your Relation</p>
                            <p class="text-xs font-semibold text-slate-800 capitalize">${p.nominee_relation || '—'}</p>
                        </div>
                    </div>
                    <div class="flex justify-between items-center px-1">
                        <p class="text-[10px] text-slate-400 font-medium">Valid till: <span class="text-slate-600">${endDate}</span></p>
                        <p class="text-[10px] text-slate-400 font-medium">Sum: <span class="text-slate-600 font-bold">${p.coverage_limit}</span></p>
                    </div>
                </div>`;
            }).join('');

        } catch {
            summary.innerHTML = '<p class="text-sm text-red-500 font-medium">Error loading data.</p>';
            container.innerHTML = '<p class="text-xs text-red-500 py-2">Could not load nominee data.</p>';
        }
    };

    loadDashPolicies();
    loadDashClaims();
    loadNomineePolicies();
});
