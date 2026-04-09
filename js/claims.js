document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = "auth.html";
        return;
    }

    let currentSearch = '';

    // Fetch all claims to calculate stat cards
    const loadClaimStats = async () => {
        try {
            const res = await fetch(`http://localhost:3000/api/my-claims?user_id=${user.id}`);
            if (!res.ok) return;
            const claims = await res.json();

            const total = claims.length;
            const pending = claims.filter(c => c.status === 'pending');
            const approved = claims.filter(c => c.status === 'approved');

            const pendingAmount = pending.reduce((s, c) => s + Number(c.estimated_amount), 0);
            const approvedAmount = approved.reduce((s, c) => s + Number(c.estimated_amount), 0);

            document.getElementById('stat-total-claims').textContent = total;
            document.getElementById('stat-pending-amount').textContent = '₹' + pendingAmount.toLocaleString();
            document.getElementById('stat-pending-count').textContent = pending.length + ' claims';
            document.getElementById('stat-approved-amount').textContent = '₹' + approvedAmount.toLocaleString();
        } catch (err) {
            console.error('Stats error:', err);
        }
    };

    const loadMyClaims = async () => {
        const tableBody = document.getElementById('claims-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-10"><span class="material-symbols-outlined animate-spin text-4xl text-slate-400">sync</span></td></tr>';

        try {
            const res = await fetch(`http://localhost:3000/api/my-claims?user_id=${user.id}&search=${encodeURIComponent(currentSearch)}`);
            if (!res.ok) throw new Error('Failed to fetch');

            const claims = await res.json();
            tableBody.innerHTML = '';

            if (claims.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-10"><p class="text-slate-500 font-bold">No claims found.</p></td></tr>';
                return;
            }

            claims.forEach(claim => {
                // Status styles
                let statusClass = 'bg-slate-100 text-slate-600 border-slate-200';
                if (claim.status === 'approved') statusClass = 'bg-green-50 text-green-700 border-green-100';
                if (claim.status === 'pending') statusClass = 'bg-amber-50 text-amber-700 border-amber-100';
                if (claim.status === 'declined') statusClass = 'bg-red-50 text-red-700 border-red-100';

                // Dot color
                let dotColor = 'bg-slate-400';
                if (claim.policy_type === 'health') dotColor = 'bg-green-500';
                if (claim.policy_type === 'motor') dotColor = 'bg-blue-500';
                if (claim.policy_type === 'life') dotColor = 'bg-purple-500';

                const filingDate = new Date(claim.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                const rowHtml = `
                <tr class="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                    <td class="px-6 py-5 font-mono font-bold text-slate-900">${claim.claim_id}</td>
                    <td class="px-6 py-5 text-slate-500 font-medium">${filingDate}</td>
                    <td class="px-6 py-5">
                        <div class="flex items-center gap-3">
                            <div class="w-2.5 h-2.5 rounded-full ${dotColor} shadow-sm"></div>
                            <span class="font-medium capitalize">${claim.policy_type} - ${claim.policy_provider}</span>
                        </div>
                    </td>
                    <td class="px-6 py-5">
                        <span class="px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider ${statusClass} uppercase border">${claim.status}</span>
                    </td>
                    <td class="px-6 py-5 text-right font-extrabold text-slate-900">₹${Number(claim.estimated_amount).toLocaleString()}</td>
                    <td class="px-6 py-5 text-center">
                        <button class="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all group-hover:bg-white shadow-[0_0_0_1px_transparent] group-hover:shadow-slate-200">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
                        </button>
                    </td>
                </tr>
                `;
                tableBody.innerHTML += rowHtml;
            });
        } catch (err) {
            console.error(err);
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-red-500 font-bold">Failed to load from server.</td></tr>';
        }
    };

    // Search input logic (DB Search)
    const searchInput = document.getElementById('claims-search');
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearch = e.target.value;
                loadMyClaims();
            }, 300);
        });
    }

    loadClaimStats();
    loadMyClaims();
});
