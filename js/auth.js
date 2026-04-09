document.addEventListener('DOMContentLoaded', () => {
    const signupBtn = document.getElementById('btn-signup');
    const loginBtn = document.getElementById('btn-login');
    const toggleAuthText = document.getElementById('toggle-auth-text');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const submitBtn = document.getElementById('auth-submit');
    const extraFields = document.getElementById('signup-fields');
    
    let isLogin = true;

    // Toggle logic for switching between Login and Signup modes
    const toggleAuthMode = (e) => {
        if (e) e.preventDefault();
        
        // Add a slight animation to the form container
        const formContainer = document.querySelector('.auth-form-wrapper');
        formContainer.style.opacity = '0';
        formContainer.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            isLogin = !isLogin;
            
            if (isLogin) {
                authTitle.textContent = 'Welcome back';
                authSubtitle.textContent = 'Please enter your details to sign in.';
                submitBtn.textContent = 'Sign In';
                toggleAuthText.innerHTML = "Don't have an account? <a href='#' id='toggle-trigger' class='font-bold text-slate-900 hover:underline'>Sign up for free</a>";
                extraFields.style.display = 'none';
            } else {
                authTitle.textContent = 'Create an account';
                authSubtitle.textContent = 'Start managing your policies easily.';
                submitBtn.textContent = 'Create Account';
                toggleAuthText.innerHTML = 'Already have an account? <a href="#" id="toggle-trigger" class="font-bold text-slate-900 hover:underline">Log in</a>';
                extraFields.style.display = 'block';
            }
            
            document.getElementById('toggle-trigger').addEventListener('click', toggleAuthMode);
            
            formContainer.style.transition = 'all 0.3s ease';
            formContainer.style.opacity = '1';
            formContainer.style.transform = 'translateY(0)';
        }, 200);
    };

    document.getElementById('toggle-trigger').addEventListener('click', toggleAuthMode);

    // Form submission
    const form = document.querySelector('form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm mr-2 inline-block -translate-y-[1px]">data_usage</span> Processing...';
        submitBtn.disabled = true;

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            if (isLogin) {
                // Fetch to Login API
                const response = await fetch('http://localhost:3000/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Store user data in localStorage (for use in dashboard)
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    if (data.user.role === 'admin') {
                        window.location.href = 'admin-plans.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    alert('Login failed: ' + data.error);
                    submitBtn.innerHTML = 'Sign In';
                    submitBtn.disabled = false;
                }
            } else {
                // Fetch to Register API
                const fullName = document.getElementById('name').value;
                const response = await fetch('http://localhost:3000/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ full_name: fullName, email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    alert('Registration successful! Please log in.');
                    // Reload to show the login form
                    window.location.reload(); 
                } else {
                    alert('Registration failed: ' + data.error);
                    submitBtn.innerHTML = 'Create Account';
                    submitBtn.disabled = false;
                }
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Cannot connect to the server. Make sure the Node.js backend is running on port 3000.');
            submitBtn.innerHTML = isLogin ? 'Sign In' : 'Create Account';
            submitBtn.disabled = false;
        }
    });
});
