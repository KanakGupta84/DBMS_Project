document.addEventListener('DOMContentLoaded', () => {
    // Quick admin auth check: In a real app, verify role with backend!
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
        alert("Access Denied: You must be an administrator.");
        window.location.href = "dashboard.html"; // redirect
        return;
    }

    const form = document.getElementById('add-plan-form');
    const submitBtn = document.getElementById('submit-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('plan-name').value;
        const type = document.getElementById('plan-type').value;
        const provider_name = document.getElementById('plan-provider').value;
        const premium_amount = document.getElementById('plan-premium').value;
        const coverage_limit = document.getElementById('plan-coverage').value;
        const network = document.getElementById('plan-network').value;
        const description = document.getElementById('plan-description').value;
        
        let icon_type = 'shield';
        const iconRadios = document.getElementsByName('plan-icon');
        for (let radio of iconRadios) {
            if (radio.checked) {
                icon_type = radio.value;
                break;
            }
        }

        submitBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] mr-2 animate-spin">sync</span> Publishing...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('http://localhost:3000/api/admin/plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name, type, provider_name, premium_amount,
                    coverage_limit, network, description, icon_type
                })
            });

            if (response.ok) {
                alert('Success! The new plan is now live on the Buy Policy catalog.');
                form.reset();
            } else {
                const data = await response.json();
                alert('Error publishing plan: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert("Could not connect to the backend server.");
        } finally {
            submitBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] mr-2">publish</span> Publish Plan';
            submitBtn.disabled = false;
        }
    });
});
