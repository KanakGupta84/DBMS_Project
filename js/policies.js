document.addEventListener('DOMContentLoaded', () => {
    let currentPage = 1;
    const limit = 4;

    const loadPlans = async (page, search = '') => {
        const grid = document.getElementById('policies-grid');
        const countSpan = document.getElementById('policies-count');
        const paginationContainer = document.getElementById('pagination-container');

        grid.innerHTML = '<div class="text-center py-10">Loading...</div>';

        try {
            const res = await fetch(`http://localhost:3000/api/plans?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
            const data = await res.json();

            grid.innerHTML = '';
            countSpan.textContent = data.pagination.total;

            data.plans.forEach(plan => {
                const cardHtml = `
                <div class="bg-white p-4 rounded-xl border">
                    <h3 class="font-bold">${plan.name}</h3>
                    <p>${plan.provider_name}</p>
                    <p>₹${plan.premium_amount}/mo</p>
                    <button onclick="selectPlan(${plan.id}, '${plan.name}', '${plan.type}')">Select Plan</button>
                </div>
                `;
                grid.innerHTML += cardHtml;
            });

        } catch (err) {
            grid.innerHTML = 'Error loading plans';
        }
    };

    // ============================
    // ✅ SELECT PLAN MODAL
    // ============================
    window.selectPlan = (planId, planName, planType) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            alert('Login first');
            window.location.href = 'auth.html';
            return;
        }

        document.getElementById('modal-plan-id').value = planId;
        document.getElementById('modal-plan-type').value = planType;
        document.getElementById('purchase-modal').classList.remove('hidden');
    };

    window.closeModal = () => {
        document.getElementById('purchase-modal').classList.add('hidden');
    };

    // ============================
    // ✅ FIXED FORM SUBMISSION
    // ============================
    document.getElementById('purchase-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const user = JSON.parse(localStorage.getItem('user'));
        const planId = document.getElementById('modal-plan-id').value;
        const planType = document.getElementById('modal-plan-type').value;

        // ✅ NEW: GET END DATE
        const end_date = document.getElementById('end_date').value;

        if (!end_date) {
            alert('Please select expiry date');
            return;
        }

        let details = {};

        if (planType === 'health') {
            details = {
                patient_name: document.getElementById('patient_name').value,
                date_of_birth: document.getElementById('date_of_birth').value,
                blood_group: document.getElementById('blood_group').value
            };
        } else if (planType === 'motor') {
            details = {
                vehicle_number: document.getElementById('vehicle_number').value,
                vehicle_model: document.getElementById('vehicle_model').value
            };
        } else if (planType === 'life') {
            details = {
                nominee_name: document.getElementById('nominee_name').value,
                nominee_relation: document.getElementById('nominee_relation').value
            };
        }

        try {
            const res = await fetch('http://localhost:3000/api/my-policies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    plan_id: parseInt(planId),
                    end_date: end_date,   // ✅ MAIN FIX
                    details
                })
            });

            const data = await res.json();

            if (res.ok) {
                alert('Policy purchased successfully!');
                closeModal();
            } else {
                alert(data.error);
            }

        } catch (err) {
            console.error(err);
            alert('Server error');
        }
    });

    loadPlans(currentPage);
});