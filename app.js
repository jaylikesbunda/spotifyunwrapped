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


	// Function to fetch all user data including profile, top tracks, and top artists
	async function fetchAllData(token, timeRange = 'medium_term') {
		showLoading(); // Show loading indicator
		try {
			const profile = await fetchData('https://api.spotify.com/v1/me', token);
			const topTracks = await fetchData(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}`, token);
			const topArtists = await fetchData(`https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}`, token);
			
			displayUserProfile(profile);
			displayTopTracks(topTracks);
			displayTopArtists(topArtists);
			setupCollapsibleSections(); // Initialize collapsible sections
			updateAppState(true); // Update UI to reflect logged-in state
		} catch (error) {
			handleError(error); // Handle any errors that occur during the fetch process
		} finally {
			hideLoading(); // Hide loading indicator once data is fetched
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

	function displayUserProfile(profile) {
	  const profileHTML = `
		<div class="user-profile-header">
		  <img src="${profile.images[0].url}" alt="Profile image" class="user-profile-image">
		  <div class="user-profile-name">${profile.display_name}</div>
		</div>
		<div class="user-profile-details">
		  <div class="user-profile-email">Email: ${profile.email}</div>
		  <div class="user-profile-country">Country: ${profile.country}</div>
		  <div class="user-profile-followers">Followers: ${profile.followers.total}</div>
		</div>
	  `;
	  profileInfo.innerHTML = profileHTML;
	  profileInfo.classList.add('user-info');
	}

	// Function to display listening statistics without Chart.js
	function displayListeningStatistics(data) {
		const statsContainer = document.getElementById('listening-statistics-section');
		const chartContainer = statsContainer.querySelector('.chart-container');

		// Clear existing content
		chartContainer.innerHTML = '';

		// Check if data is available
		if (data && data.length) {
			const list = document.createElement('ul');
			list.className = 'listening-stats-list';

			data.forEach(item => {
				const listItem = document.createElement('li');
				listItem.className = 'listening-stats-item';
				listItem.textContent = `${item.name}: ${item.value}`;
				list.appendChild(listItem);
			});

			chartContainer.appendChild(list);
			statsContainer.classList.add('expanded'); // Toggle expansion
		}
	}

	// Function to display top tracks
	function displayTopTracks(tracks) {
		if (!tracks || !tracks.items) {
			console.error('Invalid track data');
			return;
		}
		const topTracksSection = document.getElementById('top-tracks');
		topTracksSection.innerHTML = '<h2>Top Tracks</h2>' + tracks.items.map(track => {
			const image = track.album.images[0] ? track.album.images[0].url : 'default-image.png';
			return `
				<div class="track-item">
					<img src="${image}" alt="${track.name}" class="track-image">
					<div class="track-info">
						<h3>${track.name}</h3>
						<p>${track.artists.map(artist => artist.name).join(', ')}</p>
					</div>
				</div>
			`;
		}).join('');
	}

	// Function to display top artists
	function displayTopArtists(artists) {
		if (!artists || !artists.items) {
			console.error('Invalid artist data');
			return;
		}
		const topArtistsSection = document.getElementById('top-artists');
		topArtistsSection.innerHTML = '<h2>Top Artists</h2>' + artists.items.map(artist => {
			const image = artist.images[0] ? artist.images[0].url : 'default-image.png';
			return `
				<div class="artist-item">
					<img src="${image}" alt="${artist.name}" class="artist-image">
					<h3>${artist.name}</h3>
				</div>
			`;
		}).join('');
	}
	function logout() {
		sessionStorage.clear();
		updateAppState(false); // Update UI to reflect that the user has logged out
		window.location.assign(redirectUri); // Redirect to the home page
	}

	// Function to handle any errors that occur during the fetch process
	function handleError(error) {
		console.error('Error:', error);
		displayError('An error occurred while fetching data. Please try logging in again.');
	}

	// Function to display error messages
	function displayError(message) {
		profileInfo.innerHTML = `<p class="error">${message}</p>`;
		updateAppState(false);
	}

	// Function to update the application's state based on whether a user is logged in
	function updateAppState(isLoggedIn) {
		const loginSection = document.getElementById('login-section');
		const userProfileSection = document.getElementById('user-profile');
		const timeRangeSelector = document.getElementById('time-range');
		const logoutButton = document.getElementById('logout-button');

		// Toggle visibility of login/logout sections and time range selector
		loginSection.classList.toggle('hidden', isLoggedIn);
		userProfileSection.classList.toggle('hidden', !isLoggedIn);
		timeRangeSelector.classList.toggle('hidden', !isLoggedIn);
		logoutButton.classList.toggle('hidden', !isLoggedIn);

		// Manage the visibility of collapsible sections directly
		document.querySelectorAll('.collapsible').forEach(section => {
			if (isLoggedIn) {
				section.classList.remove('hidden');
				section.open = true; // Explicitly open details elements
				section.style.maxHeight = section.scrollHeight + 'px';
			} else {
				section.classList.add('hidden');
				section.removeAttribute('open');
				section.style.maxHeight = null;
			}
		});
	}

	// Function to initialize collapsible sections
	function setupCollapsibleSections() {
		document.querySelectorAll('.collapsible summary').forEach(summary => {
			summary.addEventListener('click', event => {
				const details = summary.parentNode;
				const isExpanded = details.classList.contains('expanded');
				details.classList.toggle('expanded', !isExpanded);
				details.open = !isExpanded; // Toggle the 'open' state
				details.style.maxHeight = isExpanded ? null : details.scrollHeight + 'px';
				event.preventDefault(); // Prevent default action to allow for custom behavior
			});
		});
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