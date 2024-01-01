// app.js
document.addEventListener('DOMContentLoaded', () => {
    const clientId = 'YOUR_CLIENT_ID'; // Replace with your client ID
    const redirectUri = 'https://jaylikesbunda.github.io/spotifyunwrapped/'; // Your redirect URI
    const authEndpoint = 'https://accounts.spotify.com/authorize';
    const scopes = ['user-read-private', 'user-read-email', 'user-top-read'];
    const state = generateRandomString(16); // A random string for security purposes

    const loginButton = document.getElementById('login-button');
    const userProfile = document.getElementById('user-profile');
    const profileInfo = document.getElementById('profile');
    const logoutButton = document.getElementById('logout-button');

    // Event Listener for Login Button
    loginButton.addEventListener('click', () => {
        const url = `${authEndpoint}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}&response_type=token&state=${state}&show_dialog=true`;
        window.location.href = url;
    });

    // Event Listener for Logout Button
    logoutButton.addEventListener('click', () => {
        logout();
    });

    // Check for Access Token in the URL Fragment
    const params = getHashParams();
    if (params.access_token && params.state === state) {
        // Hide login and show user profile
        loginButton.style.display = 'none';
        userProfile.style.display = 'block';

        // Fetch user profile
        fetchUserProfile(params.access_token);
    }

    // Generate a random string for the OAuth state parameter
    function generateRandomString(length) {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    // Fetch the user's profile using the access token
    function fetchUserProfile(token) {
        fetch('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            displayUserProfile(data);
        })
        .catch(error => {
            console.error('Error fetching user profile:', error);
            displayError('Error fetching user profile. Please try logging in again.');
        });
    }

    // Display the user's profile information
    function displayUserProfile(profile) {
        profileInfo.innerHTML = `
            <p>Display Name: ${profile.display_name}</p>
            <p>Email: ${profile.email}</p>
            <p>Country: ${profile.country}</p>
        `;
    }

    // Logout the user
    function logout() {
        // Clear session data
        window.location.hash = '';
        window.location.reload();
    }

    // Display error messages
    function displayError(message) {
        userProfile.innerHTML = `<p class="error">${message}</p>`;
    }
});
