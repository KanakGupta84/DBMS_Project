// admin-claims.js — Dynamic data loading for Admin Claims Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') { window.location.href = 'auth.html'; return; }

    const tbody = document.querySelector('tbody');
    try {
        const res = await fetch('http://localhost:3000/api/admin/claims');
        if (!res.ok) throw new Error('Fetch failed');
        const claims = await res.json();

        // 1. Update Metrics
        const pendingCount = claims.filter(c => c.status === 'pending').length;
        const approvedCount = claims.filter(c => c.status === 'approved').length;
        const declinedCount = claims.filter(c => c.status === 'declined').length;

        if (document.getElementById('stat-pending')) document.getElementById('stat-pending').textContent = pendingCount;
        if (document.getElementById('stat-approved')) document.getElementById('stat-approved').textContent = approvedCount;
        if (document.getElementById('stat-declined')) document.getElementById('stat-declined').textContent = declinedCount;
        // Also handle old IDs if they exist
        if (document.getElementById('total-claims-count')) document.getElementById('total-claims-count').textContent = claims.length;
        if (document.getElementById('pending-claims-count')) document.getElementById('pending-claims-count').textContent = pendingCount;
        if (document.getElementById('approved-claims-count')) document.getElementById('approved-claims-count').textContent = approvedCount;
        if (document.getElementById('declined-claims-count')) document.getElementById('declined-claims-count').textContent = declinedCount;

        // 2. Render Table
        if (claims.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-slate-500 font-bold">No claims found.</td></tr>`;
            return;
        }

        tbody.innerHTML = claims.map((claim, index) => {
            const date = new Date(claim.incident_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const amount = '₹' + Number(claim.estimated_amount).toLocaleString();
            const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
            const opacityClass = claim.status !== 'pending' ? 'opacity-60' : '';

            let statusHtml = '';
            let actionHtml = '';

            if (claim.status === 'pending') {
                statusHtml = `<span class="inline-block px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-widest rounded-full border border-amber-200">Pending</span>`;
                actionHtml = `
                    <div class="actions-container flex items-center justify-center gap-2">
                        <button onclick="updateClaimStatus(${claim.id}, 'approved', this)" class="btn-accept w-8 h-8 rounded-lg bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 hover:scale-105 transition-all flex items-center justify-center shadow-sm" title="Accept Claim">
                            <span class="material-symbols-outlined text-sm font-bold">check</span>
                        </button>
                        <button onclick="updateClaimStatus(${claim.id}, 'declined', this)" class="btn-decline w-8 h-8 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:scale-105 transition-all flex items-center justify-center shadow-sm" title="Decline Claim">
                            <span class="material-symbols-outlined text-sm font-bold">close</span>
                        </button>
                    </div>
                `;
            } else if (claim.status === 'approved') {
                statusHtml = `<span class="inline-block px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-full border border-green-200">Approved</span>`;
                actionHtml = `<div class="flex items-center justify-center gap-2 text-xs font-bold text-slate-400">Processed</div>`;
            } else {
                statusHtml = `<span class="inline-block px-3 py-1 bg-red-50 text-red-700 text-[10px] font-bold uppercase tracking-widest rounded-full border border-red-200">Declined</span>`;
                actionHtml = `<div class="flex items-center justify-center gap-2 text-xs font-bold text-slate-400">Processed</div>`;
            }

            return `
                <tr class="${bgClass} hover:bg-slate-100 transition-colors border-b border-slate-100 group ${opacityClass}" data-id="${claim.id}">
                    <td class="p-4 text-sm font-bold text-slate-900">${claim.claim_id}</td>
                    <td class="p-4">
                        <p class="text-sm font-bold text-slate-900 leading-tight">${claim.full_name}</p>
                        <p class="text-[10px] text-slate-500 font-medium truncate w-32" title="${claim.policy_number}">${claim.policy_number}</p>
                    </td>
                    <td class="p-4">
                        <span class="inline-block px-2 py-1 bg-slate-100 text-slate-600 text-[9px] font-bold uppercase tracking-widest rounded-md border border-slate-200">${claim.type}</span>
                    </td>
                    <td class="p-4 text-xs font-medium text-slate-600">${date}</td>
                    <td class="p-4 text-sm font-bold text-slate-900 text-right">${amount}</td>
                    <td class="p-4 text-center status-cell">${statusHtml}</td>
                    <td class="p-4 text-center">${actionHtml}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-red-500 font-bold">Error loading claims.</td></tr>`;
    }
});

// Global function to update status
window.updateClaimStatus = async (id, status, btnElement) => {
    if (!confirm(`Are you sure you want to ${status.slice(0,-1)} this claim?`)) return;

    try {
        const res = await fetch(`http://localhost:3000/api/admin/claims/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (res.ok) {
            // Reload page to refresh stats and table
            window.location.reload();
        } else {
            alert('Failed to update claim status.');
        }
    } catch (err) {
        console.error(err);
        alert('Error updating claim status.');
    }
};
