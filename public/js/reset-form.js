// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const resetToken = urlParams.get('token');

// Check if token exists
if (!resetToken) {
  document.getElementById('message').innerHTML = '<div class="message error">❌ No valid token found. Please use the link from your email.</div>';
  document.getElementById('resetForm').style.display = 'none';
}

// Handle form submission
document.getElementById('resetForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const messageDiv = document.getElementById('message');
  const submitBtn = document.getElementById('submitBtn');
  const loading = document.getElementById('loading');
  const form = document.getElementById('resetForm');
  
  // Clear previous messages
  messageDiv.innerHTML = '';
  
  // Validation
  if (password !== confirmPassword) {
    messageDiv.innerHTML = '<div class="message error">❌ Passwords do not match!</div>';
    return;
  }
  
  if (password.length < 6) {
    messageDiv.innerHTML = '<div class="message error">❌ Password must be at least 6 characters!</div>';
    return;
  }
  
  // Show loading
  submitBtn.disabled = true;
  submitBtn.textContent = 'Resetting...';
  loading.style.display = 'block';
  
  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        token: resetToken,
        password: password
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      messageDiv.innerHTML = '<div class="message success">✅ Password reset successful! You can now login with your new password.</div>';
      form.style.display = 'none';
    } else {
      messageDiv.innerHTML = '<div class="message error">❌ ' + (data.message || 'Password reset failed') + '</div>';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Reset Password';
    }
  } catch (error) {
    messageDiv.innerHTML = '<div class="message error">❌ Network error. Please try again.</div>';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Reset Password';
  }
  
  // Hide loading
  loading.style.display = 'none';
});