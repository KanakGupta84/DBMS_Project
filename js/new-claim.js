// new-claim.js — Dummy interactive events for the New Claim form

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('claim-form');

    // Form submission handler
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const policyNumber = document.getElementById('policy_number')?.value || '';
            const incidentDate = document.getElementById('incident_date')?.value || '';
            const claimAmount = document.getElementById('claim_amount')?.value || '';
            const providerName = document.getElementById('provider_name')?.value || '';

            const description = document.getElementById('description')?.value || '';

            if (!policyNumber || !incidentDate || !claimAmount) {
                console.error('Please fill in all required fields');
                return;
            }

            // Save to sessionStorage to pass to Step 2
            const claimData = {
                policy_number: policyNumber,
                incident_date: incidentDate,
                amount: claimAmount,
                provider_name: providerName,
                description: description
            };
            sessionStorage.setItem('pendingClaimData', JSON.stringify(claimData));

            window.location.href = 'new-claim-step2.html';
        });
    }

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
