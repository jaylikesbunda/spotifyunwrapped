document.addEventListener('DOMContentLoaded', () => {
    const clientId = '949476dd2ad545b68eedc66ccc7fdf8b'; // Replace with your actual client ID
    const redirectUri = 'https://jaylikesbunda.github.io/spotifyunwrapped/'; // Replace with your actual redirect URI
    const authEndpoint = 'https://accounts.spotify.com/authorize';
    const scopes = ['user-read-private', 'user-read-email', 'user-top-read'];
    const state = generateRandomString(16);

    const loginButton = document.getElementById('login-button');
    const userProfile = document.getElementById('user-profile');
    const profileInfo = document.getElementById('profile');
    const logoutButton = document.getElementById('logout-button');

    loginButton.addEventListener('click', initiateLogin);
    logoutButton.addEventListener('click', logout);

    const params = getHashParams();
    if (params.access_token && params.state === state) {
        updateAppState(true);
        fetchAllData(params.access_token).catch(handleError);
    }

    function generateRandomString(length) {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from({ length }, () => possible.charAt(Math.floor(Math.random() * possible.length))).join('');
    }

    function initiateLogin() {
        const authUrl = new URL(authEndpoint);
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('scope', scopes.join(' '));
        authUrl.searchParams.set('response_type', 'token');
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('show_dialog', 'true');
        window.location.href = authUrl;
    }

    async function fetchAllData(token) {
        const profile = await fetchUserProfile(token);
        displayUserProfile(profile);

        const [topTracks, topArtists] = await Promise.all([
            fetchTopTracks(token),
            fetchTopArtists(token)
        ]);
        displayTopTracks(topTracks);
        displayTopArtists(topArtists);
    }

    async function fetchData(url, token) {
        const headers = new Headers({ 'Authorization': `Bearer ${token}` });
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    }

    function fetchUserProfile(token) {
        return fetchData('https://api.spotify.com/v1/me', token);
    }

    function fetchTopTracks(token) {
        return fetchData('https://api.spotify.com/v1/me/top/tracks', token);
    }

    function fetchTopArtists(token) {
        return fetchData('https://api.spotify.com/v1/me/top/artists', token);
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
        window.location.hash = '';
        window.location.reload();
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
    }
});
