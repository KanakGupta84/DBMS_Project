document.addEventListener('DOMContentLoaded', () => {
    // Handle File Inputs UI
    const photosInput = document.getElementById('photos_upload');
    const photosName = document.getElementById('photos_name');
    
    if (photosInput && photosName) {
        photosInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                photosName.textContent = `${e.target.files.length} file(s) selected`;
                photosName.classList.remove('hidden');
                photosInput.parentElement.classList.add('border-green-500', 'bg-green-50');
            }
        });
    }

    const billsInput = document.getElementById('bills_upload');
    const billsName = document.getElementById('bills_name');
    
    if (billsInput && billsName) {
        billsInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                billsName.textContent = `${e.target.files.length} file(s) selected`;
                billsName.classList.remove('hidden');
                billsInput.parentElement.classList.add('border-green-500', 'bg-green-50');
            }
        });
    }

    // Handle Form Submission
    const form = document.getElementById('claim-step2-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) { window.location.href = 'auth.html'; return; }

            const accName = document.getElementById('account_name')?.value || '';
            const accNum = document.getElementById('account_number')?.value || '';
            const ifsc = document.getElementById('ifsc_code')?.value || '';

            if (!accName || !accNum || !ifsc) {
                console.error('Please fill in your bank details for the payout.');
                return;
            }

            const pendingDataStr = sessionStorage.getItem('pendingClaimData');
            if (!pendingDataStr) {
                alert('Claim data missing. Please start from Step 1.');
                window.location.href = 'new-claim.html';
                return;
            }

            const pendingData = JSON.parse(pendingDataStr);
            const fullClaimPayload = {
                user_id: user.id,
                ...pendingData,
                account_name: accName,
                account_number: accNum,
                ifsc_code: ifsc
            };

            const btn = form.querySelector('button[type="submit"]');
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-lg">sync</span> Submitting...';
            btn.disabled = true;

            try {
                const res = await fetch('http://localhost:3000/api/claims', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(fullClaimPayload)
                });

                const data = await res.json();

                if (res.ok) {
                    btn.innerHTML = `<span class="material-symbols-outlined text-lg">check_circle</span> Claim Registered!`;
                    btn.classList.add('bg-green-600');
                    btn.classList.remove('bg-slate-900', 'hover:bg-slate-800');
                    sessionStorage.removeItem('pendingClaimData');
                    
                    setTimeout(() => {
                        window.location.href = 'claims.html';
                    }, 1500);
                } else {
                    alert(data.error || 'Failed to submit claim. Check policy number.');
                    btn.innerHTML = 'Submit Claim <span class="material-symbols-outlined text-lg">check_circle</span>';
                    btn.disabled = false;
                }
            } catch (err) {
                console.error(err);
                alert('Server error occurred.');
                btn.innerHTML = 'Submit Claim <span class="material-symbols-outlined text-lg">check_circle</span>';
                btn.disabled = false;
            }
        });
    }
});
