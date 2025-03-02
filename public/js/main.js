document.addEventListener('DOMContentLoaded', function() {
    const learnMoreBtn = document.getElementById('learn-more-btn');
    const learnMoreSection = document.getElementById('learn-more-section');
    const closeLearnMoreBtn = document.getElementById('close-learn-more');
    
    learnMoreBtn.addEventListener('click', function(e) {
        e.preventDefault();
        learnMoreSection.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling behind the panel
    });
    
    closeLearnMoreBtn.addEventListener('click', function() {
        learnMoreSection.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    });
    
    // Close panel when clicking outside of it
    learnMoreSection.addEventListener('click', function(e) {
        if (e.target === learnMoreSection) {
            learnMoreSection.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    
    // Early Access form functionality
    const earlyAccessBtn = document.querySelector('.btn-primary');
    const earlyAccessSection = document.getElementById('early-access-section');
    const closeEarlyAccessBtn = document.getElementById('close-early-access');
    const earlyAccessForm = document.getElementById('early-access-form');
    const roleSelect = document.getElementById('role');
    const otherRoleGroup = document.getElementById('other-role-group');
    const otherRoleInput = document.getElementById('other-role');
    const submissionSuccess = document.getElementById('submission-success');
    
    // Open modal when clicking "Get Early Access" button
    earlyAccessBtn.addEventListener('click', function(e) {
        e.preventDefault();
        earlyAccessSection.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling behind the modal
    });
    
    // Close modal when clicking the X button
    closeEarlyAccessBtn.addEventListener('click', function() {
        earlyAccessSection.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    });
    
    // Close modal when clicking outside of it
    earlyAccessSection.addEventListener('click', function(e) {
        if (e.target === earlyAccessSection) {
            earlyAccessSection.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    
    // Show/hide "other" field based on role selection
    roleSelect.addEventListener('change', function() {
        if (this.value === 'other') {
            otherRoleGroup.style.display = 'flex';
            otherRoleInput.setAttribute('required', 'required');
        } else {
            otherRoleGroup.style.display = 'none';
            otherRoleInput.removeAttribute('required');
        }
    });
    
    // Form submission
    earlyAccessForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(earlyAccessForm);
        const data = {
            email: formData.get('email'),
            name: formData.get('full-name'),
            role: formData.get('role'),
            otherRole: formData.get('other-role'),
            company: formData.get('company'),
            useCase: formData.get('use-case')
        };

        try {
            const response = await fetch('/api/early-access', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            // Hide both form and intro paragraph
            const introText = document.querySelector('.early-access-intro');
            introText.style.display = 'none';
            earlyAccessForm.style.display = 'none';
            
            // Show success message
            submissionSuccess.style.display = 'block';
            
            // Reset form after submission
            setTimeout(function() {
                earlyAccessForm.reset();
                otherRoleGroup.style.display = 'none';
            }, 1000);

        } catch (error) {
            console.error('Error:', error);
            alert('There was an error submitting your request. Please try again.');
        }
    });

    // Subscribe form functionality
    const emailForm = document.querySelector('.email-form');
    const emailInput = document.querySelector('.email-input');
    const subscriptionSuccess = document.querySelector('.subscription-success');

    emailForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        
        if (!email) {
            alert('Please enter your email address.');
            return;
        }

        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            // Hide the form and show success message
            emailForm.style.display = 'none';
            subscriptionSuccess.style.display = 'block';

        } catch (error) {
            console.error('Error:', error);
            alert('There was an error processing your subscription. Please try again.');
        }
    });
}); 