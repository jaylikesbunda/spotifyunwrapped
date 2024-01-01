document.addEventListener('DOMContentLoaded', () => {
    const clientId = '949476dd2ad545b68eedc66ccc7fdf8b';
    const redirectUri = window.location.origin + window.location.pathname;
    const authEndpoint = 'https://accounts.spotify.com/authorize';
    const scopes = ['user-read-private', 'user-read-email', 'user-top-read'];
    const state = generateRandomString(16);

    const loginButton = document.getElementById('login-button');
    const userProfile = document.getElementById('user-profile');
    const profileInfo = document.getElementById('profile');
    const logoutButton = document.getElementById('logout-button');

    loginButton.addEventListener('click', initiateLogin);
    logoutButton.addEventListener('click', logout);

    handleRedirect();

    function generateRandomString(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return [...Array(length)].map(() => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
    }

    function initiateLogin() {
        const url = `${authEndpoint}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}&response_type=token&state=${state}&show_dialog=true`;
        window.location.href = url;
    }

    function handleRedirect() {
        const params = getHashParams();
        if (params.access_token && params.state === state) {
            sessionStorage.setItem('accessToken', params.access_token);
            updateAppState(true);
            fetchAllData(params.access_token);
        } else if (sessionStorage.getItem('accessToken')) {
            updateAppState(true);
            fetchAllData(sessionStorage.getItem('accessToken'));
        }
    }

    async function fetchAllData(token) {
        try {
            const profile = await fetchData('https://api.spotify.com/v1/me', token);
            displayUserProfile(profile);
            const topTracks = await fetchData('https://api.spotify.com/v1/me/top/tracks', token);
            displayTopTracks(topTracks);
            const topArtists = await fetchData('https://api.spotify.com/v1/me/top/artists', token);
            displayTopArtists(topArtists);
        } catch (error) {
            handleError(error);
        }
    }

    async function fetchData(url, token) {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }

    function displayUserProfile(profile) {
        profileInfo.innerHTML = `
            <p>Display Name: ${profile.display_name}</p>
            <p>Email: ${profile.email}</p>
            <p>Country: ${profile.country}</p>
        `;
    }

    function displayTopTracks(tracks) {
        topTracksSection.innerHTML = tracks.items.map(track => `
            <div class="track-item">
                <img src="${track.album.images[0].url}" alt="${track.name}" class="track-image">
                <div class="track-info">
                    <h3>${track.name}</h3>
                    <p>${track.artists.map(artist => artist.name).join(', ')}</p>
                </div>
            </div>
        `).join('');
    }

    function displayTopArtists(artists) {
        topArtistsSection.innerHTML = artists.items.map(artist => `
            <div class="artist-item">
                <img src="${artist.images[0].url}" alt="${artist.name}" class="artist-image">
                <h3>${artist.name}</h3>
            </div>
        `).join('');
    }

    function logout() {
        sessionStorage.removeItem('accessToken');
        window.location.href = redirectUri;
    }

    function handleError(error) {
        console.error('Error:', error);
        displayError('An error occurred while fetching data. Please try logging in again.');
    }

    function displayError(message) {
        const errorContainer = document.createElement('p');
        errorContainer.textContent = message;
        errorContainer.classList.add('error');
        profileInfo.appendChild(errorContainer);
        updateAppState(false);
    }

    function updateAppState(isLoggedIn) {
        loginButton.style.display = isLoggedIn ? 'none' : 'block';
        userProfile.style.display = isLoggedIn ? 'block' : 'none';
    }
});