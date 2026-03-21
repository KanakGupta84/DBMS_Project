document.addEventListener('DOMContentLoaded', () => {
    // Interactivity for buttons on the Policy Details page
    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent.trim();
      
      if (text === 'Download ID Card') {
        btn.addEventListener('click', () => {});
      }
      else if (text === 'Renew Policy') {
        btn.addEventListener('click', () => {});
      }
      else if (text === 'Request Hard Copy') {
        btn.addEventListener('click', () => {});
      }
      else if (text === 'Start Live Chat') {
        btn.addEventListener('click', () => {});
      }
      else if (text === 'File a New Claim') {
        btn.addEventListener('click', () => window.location.href = 'claims.html');
      }
    });

    // Make breadcrumb clickable to policies
    const breadcrumbs = document.querySelectorAll('nav a');
    breadcrumbs.forEach(b => {
        if(b.textContent.includes('Policies')) {
            b.href = 'policies.html';
        }
    });

    // Sub-item clicking
    document.querySelectorAll('.document-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Downloading secure document payload...');
        });
    });
});
