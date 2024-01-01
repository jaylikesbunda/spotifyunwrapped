document.addEventListener('DOMContentLoaded', () => {
    // Spotify API and App Settings
    const clientId = '949476dd2ad545b68eedc66ccc7fdf8b'; // Replace with your client ID
    const redirectUri = 'https://jaylikesbunda.github.io/spotifyunwrapped/'; // Your redirect URI
    const authEndpoint = 'https://accounts.spotify.com/authorize';
    const scopes = ['user-read-private', 'user-read-email', 'user-top-read'];
    const state = generateRandomString(16); // A random string for security purposes

    // UI Elements
    const loginButton = document.getElementById('login-button');
    const userProfile = document.getElementById('user-profile');
    const profileInfo = document.getElementById('profile');
    const logoutButton = document.getElementById('logout-button');
    const topTracksSection = document.getElementById('top-tracks'); // Add this in your HTML
    const topArtistsSection = document.getElementById('top-artists'); // Add this in your HTML

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

        // Fetch user profile and other data
        fetchAllData(params.access_token);
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

    // Fetch user profile and additional data using the access token
    async function fetchAllData(token) {
        try {
            const profile = await fetchUserProfile(token);
            displayUserProfile(profile);

            const [topTracks, topArtists] = await Promise.all([
                fetchTopTracks(token),
                fetchTopArtists(token)
            ]);
            displayTopTracks(topTracks);
            displayTopArtists(topArtists);
        } catch (error) {
            console.error('Error:', error);
            displayError('Error fetching data. Please try logging in again.');
        }
    }

    // Fetch the user's profile
    async function fetchUserProfile(token) {
        const response = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    }

    // Fetch the user's top tracks
    async function fetchTopTracks(token) {
        const response = await fetch('https://api.spotify.com/v1/me/top/tracks', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    }

    // Fetch the user's top artists
    async function fetchTopArtists(token) {
        const response = await fetch('https://api.spotify.com/v1/me/top/artists', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    }

    // Display functions
    function displayUserProfile(profile) {
        profileInfo.innerHTML = `
            <p>Display Name: ${profile.display_name}</p>
            <p>Email: ${profile.email}</p>
            <p>Country: ${profile.country}</p>
        `;
    }

	function displayTopTracks(tracks) {
		const topTracksSection = document.getElementById('top-tracks'); // Ensure this element exists in your HTML
		topTracksSection.innerHTML = ''; // Clear previous content

		tracks.items.forEach(track => {
			const trackElement = document.createElement('div');
			trackElement.className = 'track-item';
			trackElement.innerHTML = `
				<img src="${track.album.images[0].url}" alt="${track.name}" class="track-image">
				<div class="track-info">
					<h3>${track.name}</h3>
					<p>${track.artists.map(artist => artist.name).join(', ')}</p>
				</div>
			`;
			topTracksSection.appendChild(trackElement);
		});
	}

	function displayTopArtists(artists) {
		const topArtistsSection = document.getElementById('top-artists'); // Ensure this element exists in your HTML
		topArtistsSection.innerHTML = ''; // Clear previous content

		artists.items.forEach(artist => {
			const artistElement = document.createElement('div');
			artistElement.className = 'artist-item';
			artistElement.innerHTML = `
				<img src="${artist.images[0].url}" alt="${artist.name}" class="artist-image">
				<h3>${artist.name}</h3>
			`;
			topArtistsSection.appendChild(artistElement);
		});
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
