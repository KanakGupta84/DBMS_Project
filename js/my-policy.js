// my-policy.js — Load and display a single policy's details
document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) { window.location.href = 'auth.html'; return; }

    const urlParams = new URLSearchParams(window.location.search);
    const policyId = urlParams.get('id');
    if (!policyId) { window.location.href = 'my-policies.html'; return; }

    try {
        const res = await fetch(`http://localhost:3000/api/my-policies/${policyId}?user_id=${user.id}`);
        if (!res.ok) throw new Error('Not found');
        const policy = await res.json();

        // --- Header ---
        const el = (id) => document.getElementById(id);
        el('mp-title').textContent = policy.plan_name || (policy.type.charAt(0).toUpperCase() + policy.type.slice(1) + ' Plan');
        el('mp-policy-no').textContent = policy.policy_number;

        // Status badge — override DB status if expiry date has already passed
        const today = new Date();
        today.setHours(0, 0, 0, 0); // strip time for a clean date comparison
        const expiryDate = new Date(policy.end_date);
        expiryDate.setHours(0, 0, 0, 0);

        const effectiveStatus = (policy.status === 'active' && expiryDate < today)
            ? 'expired'
            : policy.status;

            const statusEl = el('mp-status');
            const statusText = effectiveStatus.replace('_', ' ');
            if (effectiveStatus === 'active') {
                statusEl.textContent = '● Active';
                statusEl.className = 'self-start md:self-end bg-green-50 text-green-700 text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md border border-green-100';
            } else if (effectiveStatus === 'expired') {
                statusEl.textContent = '● Expired';
                statusEl.className = 'self-start md:self-end bg-red-50 text-red-700 text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md border border-red-100';
            } else {
                statusEl.textContent = '● ' + statusText;
                statusEl.className = 'self-start md:self-end bg-amber-50 text-amber-700 text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md border border-amber-100';
            }


        // --- Overview Stats ---
        el('mp-sum').textContent = '₹' + Number(policy.sum_insured).toLocaleString();
        el('mp-network').textContent = policy.network || '—';
        el('mp-expiry').textContent = new Date(policy.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        // Coverage For — based on type-specific details
        if (policy.details) {
            if (policy.type === 'health') {
                el('mp-coverage-for').textContent = policy.details.patient_name || 'Self';
            } else if (policy.type === 'motor') {
                el('mp-coverage-for').textContent = policy.details.vehicle_model || '—';
            } else if (policy.type === 'life') {
                el('mp-coverage-for').textContent = policy.details.nominee_name || '—';
            }
        } else {
            el('mp-coverage-for').textContent = '—';
        }

        // --- Plan Description ---
        el('mp-description').textContent = policy.plan_description || 'No description available for this plan.';

        // --- Premium Details (Sidebar) ---
        el('mp-last-premium').textContent = '₹' + Number(policy.premium_amount).toLocaleString();
        el('mp-next-due').textContent = new Date(policy.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        el('mp-pay-freq').textContent = 'Monthly';

    } catch (err) {
        console.error(err);
        document.querySelector('main') && (document.querySelector('main').innerHTML = `
            <div class="text-center py-20">
                <span class="material-symbols-outlined text-5xl text-slate-300 mb-4">error</span>
                <p class="text-slate-500 font-bold text-lg">Policy not found</p>
                <a href="my-policies.html" class="text-sm text-slate-900 font-bold underline mt-2 inline-block">← Back to My Policies</a>
            </div>
        `);
    }
});
