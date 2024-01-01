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
    const timeRangeDropdown = document.getElementById('time-range'); // Dropdown element reference

    // Event listeners
    loginButton.addEventListener('click', initiateLogin);
    logoutButton.addEventListener('click', logout);

    // Check if timeRangeDropdown exists before adding an event listener
    if (timeRangeDropdown) {
        timeRangeDropdown.addEventListener('change', handleTimeRangeChange); // Listener for time range changes
    }

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

	function displayListeningStatistics(data) {
		const statsContainer = document.getElementById('listening-statistics-section').querySelector('.stats-container');
		statsContainer.innerHTML = data && data.length > 0 ? createStatsList(data) : '<p>No listening statistics available.</p>';
		if (data.length > 5) {
			const showMoreButton = createShowMoreButton('listening-stats');
			statsContainer.parentNode.appendChild(showMoreButton);
		}
	}

	function createStatsList(data) {
		const listHTML = data.map(item => `<li class='listening-stats-item'>${item.name}: ${item.value}</li>`).join('');
		return `<ul class='listening-stats-list'>${listHTML}</ul>`;
	}

	function displayTopTracks(tracks) {
		if (!tracks || !tracks.items) {
			console.error('Invalid track data');
			return;
		}
		const topTracksSection = document.getElementById('top-tracks');
		topTracksSection.classList.add('grid-layout'); // Add grid layout class
		topTracksSection.innerHTML = tracks.items.map(track => createTrackItem(track)).join('');

		// Slice the array to only show the first 5 items initially
		toggleVisibleItems(topTracksSection, 5);

		// Add 'Show More' button if there are more tracks
		if (tracks.items.length > 5) {
			const showMoreButton = createShowMoreButton('top-tracks');
			topTracksSection.parentNode.appendChild(showMoreButton);
		}
	}

	function createTrackItem(track) {
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
	}

	function displayTopArtists(artists) {
		if (!artists || !artists.items) {
			console.error('Invalid artist data');
			return;
		}
		const topArtistsSection = document.getElementById('top-artists');
		topArtistsSection.classList.add('grid-layout'); // Add grid layout class
		topArtistsSection.innerHTML = artists.items.map(artist => createArtistItem(artist)).join('');

		// Slice the array to only show the first 5 items initially
		toggleVisibleItems(topArtistsSection, 5);

		// Add 'Show More' button if there are more artists
		if (artists.items.length > 5) {
			const showMoreButton = createShowMoreButton('top-artists');
			topArtistsSection.parentNode.appendChild(showMoreButton);
		}
	}

	function createArtistItem(artist) {
		const image = artist.images[0] ? artist.images[0].url : 'default-image.png';
		return `
			<div class="artist-item">
				<img src="${image}" alt="${artist.name}" class="artist-image">
				<h3>${artist.name}</h3>
			</div>
		`;
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


	// Revised function to generate a user's Spotify summary
	async function generateSummary(token, timeRange = 'medium_term', listeningStats) {
	  try {
		// Fetch user's top track and artist using the Spotify API
		const topTracks = await fetchData(`https://api.spotify.com/v1/me/top/tracks?limit=1&time_range=${timeRange}`, token);
		const topArtists = await fetchData(`https://api.spotify.com/v1/me/top/artists?limit=1&time_range=${timeRange}`, token);

		// Assume additional listening statistics are provided in a suitable format
		const listeningStatistics = await fetchListeningStatistics(token, timeRange);

		// Generate summary tiles
		const topTrackTile = createSummaryTile('Top Track', topTracks.items[0].name, `${topTracks.items[0].popularity} popularity score`);
		const topArtistTile = createSummaryTile('Top Artist', topArtists.items[0].name, `${topArtists.items[0].popularity} popularity score`);
		const listeningTimeTile = createSummaryTile('Listening Time', '', `${listeningStats.totalTime} hours`);

		// Clear existing content and add new summary tiles
		const summaryContent = document.getElementById('summary-content');
		summaryContent.innerHTML = '';
		summaryContent.appendChild(topTrackTile);
		summaryContent.appendChild(topArtistTile);
		summaryContent.appendChild(listeningTimeTile);
		// ... add more tiles as needed based on the data available
	  } catch (error) {
		console.error('Error generating summary:', error);
		// Handle error appropriately
	  }
	}

	// Function to fetch listening statistics
	async function fetchListeningStatistics(token) {
	  try {
		const recentlyPlayedResponse = await fetchData('https://api.spotify.com/v1/me/player/recently-played?limit=50', token); // Fetch last 50 tracks
		let totalTimeMs = recentlyPlayedResponse.items.reduce((total, item) => total + item.track.duration_ms, 0);
		let totalTimeHours = (totalTimeMs / (1000 * 60 * 60)).toFixed(2); // Convert milliseconds to hours

		return {
		  totalTime: totalTimeHours // Example data in hours
		};
	  } catch (error) {
		console.error('Error fetching listening statistics:', error);
		return {
		  totalTime: 0 // Return 0 if there's an error
		};
	  }
	}

	// Existing function to create summary tiles
	function createSummaryTile(title, subtitle, detail) {
	  const tile = document.createElement('div');
	  tile.className = 'summary-tile';
	  tile.innerHTML = `
		<h3>${title}</h3>
		<strong>${subtitle}</strong>
		<p>${detail}</p>
	  `;
	  return tile;
	}
	function createShowMoreButton(targetId) {
		const button = document.createElement('button');
		button.className = 'btn show-more';
		button.textContent = 'Show More';
		button.dataset.target = targetId;
		button.onclick = () => toggleShowMore(targetId);
		return button;
	}

	function toggleShowMore(targetId) {
		const target = document.getElementById(targetId);
		const showMoreButton = target.nextSibling;
		const itemsToShow = showMoreButton.dataset.state === 'more' ? target.children.length : 5;
		toggleVisibleItems(target, itemsToShow);

		showMoreButton.dataset.state = showMoreButton.dataset.state === 'more' ? 'less' : 'more';
		showMoreButton.textContent = showMoreButton.dataset.state === 'more' ? 'Show Less' : 'Show More';
	}

	// Helper function to show only a limited number of items initially
	function toggleVisibleItems(container, limit) {
		Array.from(container.children).forEach((child, index) => {
			child.style.display = index < limit ? 'flex' : 'none';
		});
	}

	function updateAppState(isLoggedIn) {
		const loginSection = document.getElementById('login-section');
		const userProfileSection = document.getElementById('user-profile');
		const statsSection = document.getElementById('stats-section');
		const summarySection = document.getElementById('summary-section');
		const timeRangeSelector = document.getElementById('time-range');
		const logoutButton = document.getElementById('logout-button');

		// Toggle visibility of login/logout sections
		loginSection.classList.toggle('hidden', isLoggedIn);
		userProfileSection.classList.toggle('hidden', !isLoggedIn);
		logoutButton.classList.toggle('hidden', !isLoggedIn);

		// Check if timeRangeSelector exists before toggling its visibility
		if (timeRangeSelector) {
			timeRangeSelector.classList.toggle('hidden', !isLoggedIn);
		}

		// Manage the visibility of stats and summary sections
		if (isLoggedIn) {
			statsSection.classList.remove('hidden');
			summarySection.classList.remove('hidden');
		} else {
			statsSection.classList.add('hidden');
			summarySection.classList.add('hidden');
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