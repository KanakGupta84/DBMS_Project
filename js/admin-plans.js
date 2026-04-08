document.addEventListener('DOMContentLoaded', () => {
    // Admin auth check
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
        alert('Access Denied: You must be an administrator.');
        window.location.href = 'dashboard.html';
        return;
    }

    const TYPE_ICONS = { health: 'medical_services', motor: 'directions_car', life: 'family_restroom' };
    let pendingDeleteId = null;

    // ── Load & render all plans ──────────────────────────────────────
    window.loadPlans = async () => {
        const list = document.getElementById('plans-list');
        list.innerHTML = `<div class="text-center py-10 text-slate-400 text-sm">
            <span class="material-symbols-outlined animate-spin block mb-2" style="font-size:32px">progress_activity</span>
            Loading plans...
        </div>`;

        try {
            const res = await fetch('http://localhost:3000/api/admin/plans');
            const plans = await res.json();

            if (!plans.length) {
                list.innerHTML = `<p class="text-center text-slate-400 text-sm py-10">No plans published yet.</p>`;
                return;
            }

            list.innerHTML = plans.map(plan => {
                const icon = TYPE_ICONS[plan.type] || 'shield';
                const activeCount = plan.active_count || 0;
                const hasActive = activeCount > 0;

                const statusBadge = hasActive
                    ? `<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                           <span class="material-symbols-outlined" style="font-size:11px;font-variation-settings:'FILL' 1">warning</span>
                           ${activeCount} active ${activeCount === 1 ? 'policy' : 'policies'}
                       </span>`
                    : `<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                           <span class="material-symbols-outlined" style="font-size:11px">check_circle</span>
                           No active policies
                       </span>`;

                const removeBtn = hasActive
                    ? `<button disabled title="Cannot remove — active policies exist"
                            class="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed">
                           <span class="material-symbols-outlined" style="font-size:14px">lock</span>Locked
                       </button>`
                    : `<button onclick="openDeleteModal(${plan.id}, '${plan.name.replace(/'/g, "\\'")}')"
                            class="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-all">
                           <span class="material-symbols-outlined" style="font-size:14px">delete</span>Remove
                       </button>`;

                return `
                <div class="bg-white rounded-xl border ${hasActive ? 'border-amber-100' : 'border-slate-200'} shadow-sm p-4 flex items-center gap-4 transition-all hover:shadow-md">
                    <!-- Icon -->
                    <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span class="material-symbols-outlined text-slate-500" style="font-size:20px;font-variation-settings:'FILL' 1">${icon}</span>
                    </div>
                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap mb-0.5">
                            <span class="font-extrabold text-sm text-slate-900">${plan.name}</span>
                            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${plan.type}</span>
                        </div>
                        <p class="text-xs text-slate-400 mb-2">${plan.provider_name} · ₹${parseFloat(plan.premium_amount).toLocaleString('en-IN')}/mo</p>
                        ${statusBadge}
                    </div>
                    <!-- Action -->
                    <div class="flex-shrink-0">${removeBtn}</div>
                </div>`;
            }).join('');

        } catch {
            list.innerHTML = `<p class="text-center text-red-500 text-sm py-10">Could not load plans. Is the server running?</p>`;
        }
    };

    // ── Delete modal ─────────────────────────────────────────────────
    window.openDeleteModal = (planId, planName) => {
        pendingDeleteId = planId;
        document.getElementById('delete-modal-text').textContent =
            `You are about to permanently remove "${planName}" from the catalog. This cannot be undone.`;
        const modal = document.getElementById('delete-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    window.closeDeleteModal = () => {
        pendingDeleteId = null;
        document.getElementById('delete-modal').classList.add('hidden');
        document.getElementById('delete-modal').classList.remove('flex');
    };

    document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
        if (!pendingDeleteId) return;
        const btn = document.getElementById('confirm-delete-btn');
        btn.disabled = true;
        btn.innerHTML = `<span class="material-symbols-outlined animate-spin" style="font-size:16px">progress_activity</span> Removing...`;

        try {
            const res = await fetch(`http://localhost:3000/api/admin/plans/${pendingDeleteId}`, {
                method: 'DELETE'
            });
            const data = await res.json();

            closeDeleteModal();

            if (res.ok) {
                showToast(data.message, 'success');
                loadPlans(); // refresh list
            } else {
                showToast(data.error, 'error');
            }
        } catch {
            closeDeleteModal();
            showToast('Server error. Make sure backend is running.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px">delete</span> Yes, Remove`;
        }
    });

    // Close modal on backdrop click
    document.getElementById('delete-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeDeleteModal();
    });

    // ── Publish new plan form ────────────────────────────────────────
    const form = document.getElementById('add-plan-form');
    const submitBtn = document.getElementById('submit-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        let icon_type = 'shield';
        for (const radio of document.getElementsByName('plan-icon')) {
            if (radio.checked) { icon_type = radio.value; break; }
        }

        const duration_days = parseInt(document.getElementById('plan-duration').value) || 365;
        const renew_warning_days = parseInt(document.getElementById('plan-renew-warning').value) || 0;

        if (renew_warning_days >= duration_days) {
            showToast('Renew warning must be less than the total duration.', 'error');
            return;
        }

        submitBtn.innerHTML = `<span class="material-symbols-outlined animate-spin" style="font-size:18px">progress_activity</span> Publishing...`;
        submitBtn.disabled = true;

        try {
            const res = await fetch('http://localhost:3000/api/admin/plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name:           document.getElementById('plan-name').value,
                    type:           document.getElementById('plan-type').value,
                    provider_name:  document.getElementById('plan-provider').value,
                    premium_amount: document.getElementById('plan-premium').value,
                    coverage_limit: document.getElementById('plan-coverage').value,
                    network:        document.getElementById('plan-network').value,
                    description:    document.getElementById('plan-description').value,
                    icon_type,
                    duration_days,
                    renew_warning_days
                })
            });

            const data = await res.json();
            if (res.ok) {
                form.reset();
                showToast('Plan published and live on the catalog!', 'success');
                loadPlans(); // refresh list
            } else {
                showToast('Error: ' + data.error, 'error');
            }
        } catch {
            showToast('Could not connect to backend server.', 'error');
        } finally {
            submitBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px">publish</span> Publish Plan`;
            submitBtn.disabled = false;
        }
    });

    // ── Toast ────────────────────────────────────────────────────────
    function showToast(message, type = 'success') {
        const existing = document.getElementById('admin-toast');
        if (existing) existing.remove();
        const colors = type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white';
        const icon   = type === 'success' ? 'check_circle' : 'error';
        const t = document.createElement('div');
        t.id = 'admin-toast';
        t.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${colors}`;
        t.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px;font-variation-settings:'FILL' 1">${icon}</span>${message}`;
        document.body.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(12px)';
            setTimeout(() => t.remove(), 400);
        }, 4000);
    }

    // ── Init ─────────────────────────────────────────────────────────
    loadPlans();
});
