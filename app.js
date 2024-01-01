document.addEventListener('DOMContentLoaded', () => {
    const clientId = '949476dd2ad545b68eedc66ccc7fdf8b'; // Replace with your actual client ID
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    const authEndpoint = 'https://accounts.spotify.com/authorize';
    const scopes = ['user-read-private', 'user-read-email', 'user-top-read'];
    const state = sessionStorage.getItem('state') || generateRandomString(16);
    sessionStorage.setItem('state', state); // Persist state parameter in session storage

    const loginButton = document.getElementById('login-button');
    const userProfile = document.getElementById('user-profile');
    const profileInfo = document.getElementById('profile');
    const logoutButton = document.getElementById('logout-button');
    const topTracksSection = document.getElementById('top-tracks');
    const topArtistsSection = document.getElementById('top-artists');

    loginButton.addEventListener('click', initiateLogin);
    logoutButton.addEventListener('click', logout);
    
    // Call handleRedirect on page load to handle OAuth redirection
    handleRedirect();

    function generateRandomString(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return [...Array(length)].map(() => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
    }

    function initiateLogin() {
        const url = new URL(authEndpoint);
        url.search = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: scopes.join(' '),
            response_type: 'token',
            state: state,
            show_dialog: 'true'
        }).toString();
        window.location.href = url;
    }

    function handleRedirect() {
        const params = getHashParams();
        if (params.access_token && params.state === sessionStorage.getItem('state')) {
            sessionStorage.setItem('accessToken', params.access_token);
            fetchAllData(params.access_token);
        } else if (sessionStorage.getItem('accessToken')) {
            fetchAllData(sessionStorage.getItem('accessToken'));
        }
    }

    async function fetchAllData(token) {
        try {
            const profile = await fetchData('https://api.spotify.com/v1/me', token);
            const topTracks = await fetchData('https://api.spotify.com/v1/me/top/tracks', token);
            const topArtists = await fetchData('https://api.spotify.com/v1/me/top/artists', token);
            displayUserProfile(profile);
            displayTopTracks(topTracks);
            displayTopArtists(topArtists);
            updateAppState(true);
        } catch (error) {
            handleError(error);
        }
    }

    async function fetchData(url, token) {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
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
        sessionStorage.clear(); // Clears all data from sessionStorage
        window.location.assign(redirectUri); // Redirects to the starting page
    }

    function handleError(error) {
        console.error('Error:', error);
        displayError('An error occurred while fetching data. Please try logging in again.');
    }

    function displayError(message) {
        profileInfo.innerHTML = `<p class="error">${message}</p>`;
        updateAppState(false);
    }

    function updateAppState(isLoggedIn) {
        loginButton.style.display = isLoggedIn ? 'none' : 'block';
        userProfile.style.display = isLoggedIn ? 'block' : 'none';
        if (!isLoggedIn) {
            topTracksSection.innerHTML = '';
            topArtistsSection.innerHTML = '';
        }
    }
});

function getHashParams() {
    const hashParams = {};
    const regex = /([^&;=]+)=?([^&;]*)/g;
    const query = window.location.hash.substring(1);

    let match;
    while ((match = regex.exec(query))) {
        hashParams[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);
    }

    // Clear the URL hash to hide access token
    history.replaceState(null, null, ' '); // Clears the URL hash

    return hashParams;
}
