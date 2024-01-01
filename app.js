document.addEventListener('DOMContentLoaded', () => {
    // Spotify API credentials and endpoints
    const clientId = '949476dd2ad545b68eedc66ccc7fdf8b'; // Replace with your actual client ID
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    const authEndpoint = 'https://accounts.spotify.com/authorize';
    const scopes = ['user-read-private', 'user-read-email', 'user-top-read'];

    // Generating a random state for OAuth 2.0 authentication
    const state = sessionStorage.getItem('state') || generateRandomString(16);
    sessionStorage.setItem('state', state);

    // DOM element references
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const userProfile = document.getElementById('user-profile');
    const profileInfo = document.getElementById('profile');
    const topTracksSection = document.getElementById('top-tracks');
    const topArtistsSection = document.getElementById('top-artists');
    const timeRangeDropdown = document.getElementById('time-range'); // Added dropdown element reference

    // Event listeners
    loginButton.addEventListener('click', initiateLogin);
    logoutButton.addEventListener('click', logout);
    timeRangeDropdown.addEventListener('change', handleTimeRangeChange); // Added listener for time range changes

    // Handling OAuth redirection
    handleRedirect();

    // Utility function to generate a random string
    function generateRandomString(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return [...Array(length)].map(() => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
    }

    // Initiating the login process
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

    // Handling redirection after authentication
    function handleRedirect() {
        const params = getHashParams();
        if (params.access_token && params.state === sessionStorage.getItem('state')) {
            sessionStorage.setItem('accessToken', params.access_token);
            fetchAllData(params.access_token);
        } else if (sessionStorage.getItem('accessToken')) {
            fetchAllData(sessionStorage.getItem('accessToken'));
        }
    }

	// Function to fetch all necessary data after authentication
	async function fetchAllData(token) {
		showLoading(); // Show loading indicator
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
		} finally {
			hideLoading(); // Hide loading indicator
		}
	}

	// Function to fetch recently played tracks
	async function fetchRecentlyPlayed(token) {
		return await fetchData('https://api.spotify.com/v1/me/player/recently-played', token);
	}

	// Function to fetch data from Spotify API
	async function fetchData(url, token) {
		const proxyUrl = 'https://cors-anywhere.herokuapp.com/'; // For development purposes
		const spotifyUrl = proxyUrl + url;
		const response = await fetch(spotifyUrl, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'X-Requested-With': 'XMLHttpRequest'
			}
		});
		if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
		return response.json();
	}

	// Function to display user profile information
	function displayUserProfile(profile) {
		profileInfo.innerHTML = `
			<h3>${profile.display_name}</h3>
			<p><strong>Email:</strong> ${profile.email}</p>
			<p><strong>Country:</strong> ${profile.country}</p>
		`;
		profileInfo.classList.add('user-info');
	}

	// Function to display recently played tracks
	function displayRecentlyPlayed(recentlyPlayed) {
		const recentlyPlayedSection = document.getElementById('recently-played');
		recentlyPlayedSection.innerHTML = recentlyPlayed.items.map(item => `
			<div class="track-item">
				<img src="${item.track.album.images[0].url}" alt="${item.track.name}" class="track-image">
				<div class="track-info">
					<h3>${item.track.name}</h3>
					<p>${item.track.artists.map(artist => artist.name).join(', ')}</p>
				</div>
			</div>
		`).join('');
	}

	// Function to display listening statistics using Chart.js
	function displayListeningStatistics(data) {
		const ctx = document.getElementById('listening-statistics-chart').getContext('2d');
		new Chart(ctx, {
			type: 'bar',
			data: {
				labels: data.map(item => item.name),
				datasets: [{
					label: 'Listening Statistics',
					data: data.map(item => item.value),
					backgroundColor: 'rgba(0, 123, 255, 0.5)',
					borderColor: 'rgba(0, 123, 255, 1)',
					borderWidth: 1
				}]
			},
			options: {
				scales: {
					yAxes: [{ ticks: { beginAtZero: true } }]
				}
			}
		});
	}

	// Function to display top tracks
	function displayTopTracks(tracks) {
		topTracksSection.innerHTML = '<h2>Top Tracks</h2>' + tracks.items.map(track => `
			<div class="track-item">
				<img src="${track.album.images[0].url}" alt="${track.name}" class="track-image">
				<div class="track-info">
					<h3>${track.name}</h3>
					<p>${track.artists.map(artist => artist.name).join(', ')}</p>
				</div>
			</div>
		`).join('');
	}

	// Function to display top artists
	function displayTopArtists(artists) {
		topArtistsSection.innerHTML = '<h2>Top Artists</h2>' + artists.items.map(artist => `
			<div class="artist-item">
				<img src="${artist.images[0].url}" alt="${artist.name}" class="artist-image">
				<h3>${artist.name}</h3>
			</div>
		`).join('');
	}

	// Function to handle logout
	function logout() {
		sessionStorage.clear();
		window.location.assign(redirectUri);
	}

	// Function to handle errors
	function handleError(error) {
		console.error('Error:', error);
		displayError('An error occurred while fetching data. Please try logging in again.');
	}

	// Function to display error messages
	function displayError(message) {
		profileInfo.innerHTML = `<p class="error">${message}</p>`;
		updateAppState(false);
	}

	// Function to update the application state based on login status
	function updateAppState(isLoggedIn) {
		loginButton.style.display = isLoggedIn ? 'none' : 'block';
		userProfile.style.display = isLoggedIn ? 'block' : 'none';
		if (!isLoggedIn) {
			topTracksSection.innerHTML = '';
			topArtistsSection.innerHTML = '';
		}
	}
	function getHashParams() {
		const hashParams = {};
		const regex = /([^&;=]+)=?([^&;]*)/g;
		const query = window.location.hash.substring(1);

		let match;
		while (match = regex.exec(query)) {
			hashParams[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);
		}

		// Clears the URL hash to hide the access token
		history.replaceState(null, null, ' ');
		return hashParams;
	}
}); 