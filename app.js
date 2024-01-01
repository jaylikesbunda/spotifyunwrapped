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
	showLoading();
    hideLoading();

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
		const state = sessionStorage.getItem('state');
		const accessToken = sessionStorage.getItem('accessToken');
		
		if (params.access_token && params.state === state) {
			sessionStorage.setItem('accessToken', params.access_token);
			updateAppState(true); // Update UI to logged-in state
			fetchAllData(params.access_token); // Fetch data with the new token
		} else if (accessToken) {
			updateAppState(true); // Already logged in
			fetchAllData(accessToken); // Fetch data with the existing token
		}
	}


	function handleTimeRangeChange(event) {
		const timeRange = event.target.value;
		const accessToken = sessionStorage.getItem('accessToken');
		if (accessToken) {
			fetchAllData(accessToken, timeRange); // Fetch data with the selected time range
		}
	}

	function showLoading() {
		let loader = document.getElementById('loading-indicator');
		if (!loader) {
			loader = document.createElement('div');
			loader.id = 'loading-indicator';
			loader.textContent = 'Loading...';
			document.body.appendChild(loader);
		}
		loader.style.display = 'block'; // Show the loader
	}

	function hideLoading() {
		const loader = document.getElementById('loading-indicator');
		if (loader) {
			loader.style.display = 'none'; // Hide the loader
		}
	}


	// Modify fetchAllData to accept timeRange as a parameter
	async function fetchAllData(token, timeRange = 'medium_term') {
		showLoading(); // Show loading indicator
		try {
			// Use timeRange to fetch the correct data
			const profile = await fetchData('https://api.spotify.com/v1/me', token);
			const topTracks = await fetchData(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}`, token);
			const topArtists = await fetchData(`https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}`, token);
			
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

	// Function to display user profile information with additional styling
	function displayUserProfile(profile) {
		// Check if the profile image is available
		const profileImageUrl = profile.images && profile.images.length > 0 ? profile.images[0].url : 'default-profile.png'; // Replace 'default-profile.png' with the path to your default profile image
		
		// Constructing the HTML content with template literals
		profileInfo.innerHTML = `
			<div class="user-profile-header">
				<img src="${profileImageUrl}" alt="${profile.display_name}" class="user-profile-image">
				<h2 class="user-profile-name">${profile.display_name}</h2>
			</div>
			<div class="user-profile-details">
				<p class="user-profile-email"><strong>Email:</strong> ${profile.email}</p>
				<p class="user-profile-country"><strong>Country:</strong> ${profile.country}</p>
				<p class="user-profile-followers"><strong>Followers:</strong> ${profile.followers.total.toLocaleString()}</p> <!-- Assuming 'followers' object is present -->
			</div>
		`;

    // Adding classes for styling
    profileInfo.classList.add('user-info');
}

	// Assuming the 'recently-played' section is defined in your HTML
	function displayRecentlyPlayed(recentlyPlayed) {
		const recentlyPlayedSection = document.getElementById('recently-played');
		if (recentlyPlayedSection) {
			recentlyPlayedSection.innerHTML = recentlyPlayed.items.map(item => `
				<div class="track-item">
					<img src="${item.track.album.images[0].url}" alt="${item.track.name}" class="track-image">
					<div class="track-info">
						<h3>${item.track.name}</h3>
						<p>${item.track.artists.map(artist => artist.name).join(', ')}</p>
					</div>
				</div>
			`).join('');
			// Toggle expansion if needed
			recentlyPlayedSection.classList.toggle('expanded', recentlyPlayed.items.length > 0);
		}
	}
	
	
		// Function to toggle the expansion of a stats block
	function toggleStatsBlockExpansion(blockId) {
		const block = document.getElementById(blockId);
		block.classList.toggle('expanded');
	}

	// Updated function to handle the Chart.js display
	function displayListeningStatistics(data) {
		const ctx = document.getElementById('listening-statistics-chart').getContext('2d');
		const chartContainer = ctx.canvas.parentElement;
		
		// Check if data is available and the chart container exists
		if (data && data.length && chartContainer) {
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
						y: [{ ticks: { beginAtZero: true } }]
					}
				}
			});
			// Toggle expansion
			chartContainer.classList.add('expanded');
		}
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

	function logout() {
		sessionStorage.clear();
		updateAppState(false); // Update UI to reflect that the user has logged out
		window.location.assign(redirectUri); // Redirect to the home page
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

	function updateAppState(isLoggedIn) {
		const body = document.body;
		const loginSection = document.getElementById('login-section');
		const logoutButton = document.getElementById('logout-button');

		// Toggle classes based on user state
		body.classList.toggle('user-logged-in', isLoggedIn);
		loginSection.style.display = isLoggedIn ? 'none' : 'block';
		logoutButton.style.display = isLoggedIn ? 'block' : 'none';

		// Show or hide sections based on isLoggedIn
		document.querySelectorAll('.collapsible').forEach(section => {
			section.style.display = isLoggedIn ? 'block' : 'none';
		});

		// If logged in, also show the time range selector
		const timeRangeSelector = document.getElementById('time-range');
		timeRangeSelector.style.display = isLoggedIn ? 'block' : 'none';
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