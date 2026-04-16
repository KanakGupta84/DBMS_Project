// new-claim.js — Dummy interactive events for the New Claim form

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('claim-form');

    let pendingClaimForStep2 = null;

    // Prep-fill policy if coming from My Policies page
    const urlParams = new URLSearchParams(window.location.search);
    const policyParam = urlParams.get('policy');
    if (policyParam) {
        const policyInput = document.getElementById('policy_number');
        if (policyInput) policyInput.value = policyParam;
    }

    // Form submission handler
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                window.location.href = "auth.html";
                return;
            }

            const policyNumber = document.getElementById('policy_number')?.value || '';
            const incidentDate = document.getElementById('incident_date')?.value || '';
            const claimAmountStr = document.getElementById('claim_amount')?.value || '';
            const claimAmount = parseFloat(claimAmountStr);
            const providerName = document.getElementById('provider_name')?.value || '';
            const description = document.getElementById('description')?.value || '';

            if (!policyNumber || !incidentDate || !claimAmountStr) {
                alert('Please fill in all required fields');
                return;
            }

            try {
                const submitBtn = form.querySelector('button[type="submit"]');
                const origText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-lg">autorenew</span> Checking Policy...';
                submitBtn.disabled = true;

                const res = await fetch(`http://localhost:3000/api/policies/check-claim?policy_number=${encodeURIComponent(policyNumber)}&user_id=${user.id}`);
                const data = await res.json();
                
                submitBtn.innerHTML = origText;
                submitBtn.disabled = false;

                if (!res.ok) {
                    alert(data.error);
                    return;
                }

                if (claimAmount > data.remaining_amount) {
                    alert(`Claim amount exceeds the remaining sum insured. Maximum value you can claim is ₹${data.remaining_amount.toLocaleString('en-IN')}.`);
                    return;
                }

                const claimData = {
                    policy_number: policyNumber,
                    incident_date: incidentDate,
                    amount: claimAmountStr,
                    provider_name: providerName,
                    description: description
                };

                if (data.used_amount > 0) {
                    // Show modal
                    pendingClaimForStep2 = claimData;
                    document.getElementById('claim-modal-text').innerHTML = `A partial claim of <b>₹${data.used_amount.toLocaleString('en-IN')}</b> has already been taken on this policy.<br><br><b>Remaining Limit:</b> ₹${data.remaining_amount.toLocaleString('en-IN')}`;
                    openClaimModal();
                } else {
                    sessionStorage.setItem('pendingClaimData', JSON.stringify(claimData));
                    window.location.href = 'new-claim-step2.html';
                }
            } catch (err) {
                console.error(err);
                alert("Network error. Please try again.");
            }
        });
    }

    window.openClaimModal = () => {
        const modal = document.getElementById('claim-modal');
        const content = document.getElementById('claim-modal-content');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
        }, 10);
    };

    window.closeClaimModal = () => {
        const modal = document.getElementById('claim-modal');
        const content = document.getElementById('claim-modal-content');
        modal.classList.add('opacity-0');
        content.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    };

    window.proceedToStep2 = () => {
        if (pendingClaimForStep2) {
            sessionStorage.setItem('pendingClaimData', JSON.stringify(pendingClaimForStep2));
            window.location.href = 'new-claim-step2.html';
        }
    };

    // Claim type radio button animation feedback
    const claimTypeInputs = document.querySelectorAll('input[name="claim_type"]');
    claimTypeInputs.forEach(input => {
        input.addEventListener('change', () => {
            const selectedLabel = input.closest('label').querySelector('.ct-icon');
            // Quick pulse animation
            if (selectedLabel) {
                selectedLabel.style.transform = 'scale(1.2)';
                setTimeout(() => { selectedLabel.style.transform = 'scale(1)'; }, 200);
            }
        });
    });
});
