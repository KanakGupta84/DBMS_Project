document.addEventListener('DOMContentLoaded', async () => {
    // Get policy details from URL (e.g., ?policy_id=1&name=Allianz%20Global%20Health)
    const urlParams = new URLSearchParams(window.location.search);
    let policyId = urlParams.get('policy_id');
    let policyName = urlParams.get('name');
    
    if (!policyId) policyId = 1;
    if (!policyName) policyName = 'General Feedback';

    document.getElementById('policy-name-display').textContent = policyName;

    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('user'));
    const form = document.getElementById('feedback-form');
    const authWarning = document.getElementById('auth-warning');
    const submitBtn = document.getElementById('submit-feedback-btn');

    if (!user) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        authWarning.classList.remove('hidden');
        form.style.display = 'none';
    } else {
        // Check if user has purchased this policy before allowing feedback
        try {
            const res = await fetch(`http://localhost:3000/api/my-policies?user_id=${user.id}`);
            if (res.ok) {
                const policies = await res.json();
                const hasPurchased = policies.some(p => String(p.plan_id) === String(policyId));
                if (!hasPurchased) {
                    form.style.display = 'none';
                    authWarning.classList.remove('hidden');
                    authWarning.innerHTML = '<span class="material-symbols-outlined text-sm mr-1 align-middle">info</span> You can only leave feedback for policies you have purchased. <a href="policies.html" class="font-bold underline hover:text-amber-900">Browse policies</a>';
                }
            }
        } catch(err) {
            console.error('Could not verify policy ownership:', err);
        }
    }

    // Star Rating Logic
    const stars = document.querySelectorAll('.star-btn');
    const ratingInput = document.getElementById('rating-value');

    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            const value = parseInt(e.target.getAttribute('data-value'));
            ratingInput.value = value;
            
            // Highlight stars
            stars.forEach(s => {
                const sVal = parseInt(s.getAttribute('data-value'));
                if (sVal <= value) {
                    s.classList.remove('text-slate-300');
                    s.classList.add('text-amber-400');
                    // Ensure the icon is filled
                    s.style.fontVariationSettings = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24";
                } else {
                    s.classList.remove('text-amber-400');
                    s.classList.add('text-slate-300');
                    s.style.fontVariationSettings = "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24";
                }
            });
        });
    });

    // Load Feedback Function
    const loadFeedback = async () => {
        const listDiv = document.getElementById('feedback-list');
        const countSpan = document.getElementById('review-count');

        try {
            const res = await fetch(`http://localhost:3000/api/feedback?policy_id=${encodeURIComponent(policyId)}`);
            if (res.ok) {
                const reviews = await res.json();
                
                if (reviews.length === 0) {
                    listDiv.innerHTML = `
                        <div class="p-8 text-center bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
                            <span class="material-symbols-outlined text-slate-400 text-4xl mb-2">forum</span>
                            <p class="text-slate-500 font-medium text-sm">No reviews yet for this policy. Be the first!</p>
                        </div>
                    `;
                    countSpan.textContent = '0';
                    return;
                }

                countSpan.textContent = reviews.length;
                listDiv.innerHTML = ''; // clear

                reviews.forEach(review => {
                    // Generate stars HTML
                    let starsHtml = '';
                    for(let i=1; i<=5; i++) {
                        if (i <= review.rating) {
                            starsHtml += `<span class="material-symbols-outlined text-amber-400 text-sm" style="font-variation-settings: 'FILL' 1;">star</span>`;
                        } else {
                            starsHtml += `<span class="material-symbols-outlined text-slate-300 text-sm">star</span>`;
                        }
                    }

                    const dateStr = new Date(review.created_at).toLocaleDateString();

                    const reviewCard = document.createElement('div');
                    reviewCard.className = "bg-white p-5 border border-slate-200 rounded-2xl shadow-sm flex flex-col gap-3";
                    reviewCard.innerHTML = `
                        <div class="flex justify-between items-center">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs uppercase">${review.user_name.charAt(0)}</div>
                                <div>
                                    <p class="text-sm font-bold text-slate-900">${review.user_name}</p>
                                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">${dateStr}</p>
                                </div>
                            </div>
                            <div class="flex">${starsHtml}</div>
                        </div>
                        <p class="text-sm text-slate-600 font-medium leading-relaxed">${review.feedback_text}</p>
                    `;
                    listDiv.appendChild(reviewCard);
                });
            }
        } catch(err) {
            console.error(err);
            listDiv.innerHTML = `
                <div class="p-8 text-center bg-red-50 border border-red-200 rounded-2xl">
                    <p class="text-red-600 font-bold text-sm">Could not load reviews. Is the backend running?</p>
                </div>
            `;
        }
    };

    // Load initial feedback
    loadFeedback();

    // Submit Feedback
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!user) return; // double check

        const rating = ratingInput.value;
        const text = document.getElementById('feedback-text').value;

        if (!rating) {
            alert('Please select a star rating.');
            return;
        }

        submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm mr-2 inline-block -translate-y-[1px]">data_usage</span> Submitting...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('http://localhost:3000/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    plan_id: parseInt(policyId), 
                    rating: parseInt(rating), 
                    feedbackText: text,
                    userId: user.id 
                })
            });

            if (response.ok) {
                alert('Feedback submitted successfully!');
                form.reset();
                ratingInput.value = '';
                stars.forEach(s => {
                    s.classList.remove('text-amber-400');
                    s.classList.add('text-slate-300');
                    s.style.fontVariationSettings = "'FILL' 0";
                });
                // Reload feedback list
                loadFeedback();
            } else {
                const data = await response.json();
                alert('Failed to submit: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Could not connect to the server.');
        } finally {
            submitBtn.innerHTML = 'Submit Feedback';
            submitBtn.disabled = false;
        }
    });
});
