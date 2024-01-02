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
	  // Event listener for time range changes
	  timeRangeDropdown.addEventListener('change', async (event) => {
		const timeRange = event.target.value;
		const accessToken = sessionStorage.getItem('accessToken');
		if (accessToken) {
		  clearPreviousContent(); // Clear previous data and buttons
		  await fetchAllData(accessToken, timeRange); // Fetch new data
		  await generateSummary(accessToken, timeRange); // Generate the summary for the new time range
		}
	  });


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
		clearPreviousContent(); // Clear previous data and buttons
		fetchAllData(accessToken, timeRange); // Fetch new data
	  }
	}

	function clearContent() {
	  // Define IDs of the sections to be cleared
	  const sectionIds = ['top-tracks', 'top-artists', 'listening-statistics'];

	  // Iterate over each section ID
	  sectionIds.forEach(id => {
		// Find the section element by its ID
		const sectionElement = document.getElementById(id);

		// Check if the section element exists
		if (sectionElement) {
		  // Clear the inner HTML of the section
		  sectionElement.innerHTML = '';

		  // Locate and remove the "Show More" button if it exists
		  const moreButton = sectionElement.parentNode.querySelector('.show-more');
		  if (moreButton) {
			moreButton.remove();
		  }
		} else {
		  console.error(`Element with ID ${id} not found.`);
		}
	  });
	}


	// Revised showLoading function to be more robust
	function showLoading() {
	  let loader = document.getElementById('loading-indicator');
	  if (!loader) {
		loader = document.createElement('div');
		loader.id = 'loading-indicator';
		loader.textContent = 'Loading...';
		document.body.appendChild(loader);
	  }
	  loader.style.visibility = 'visible'; // Use visibility to maintain layout
	}

	function hideLoading() {
	  const loader = document.getElementById('loading-indicator');
	  if (loader) {
		loader.style.visibility = 'hidden';
	  }
	}
	async function fetchData(url, token, retries = 3, backoff = 300) {
	  const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
	  const spotifyUrl = proxyUrl + url;
	  try {
		const response = await fetch(spotifyUrl, {
		  headers: {
			'Authorization': `Bearer ${token}`,
			'X-Requested-With': 'XMLHttpRequest'
		  }
		});
		if (!response.ok) {
		  if (response.status === 429 && retries > 0) { // API rate limit hit
			await new Promise(resolve => setTimeout(resolve, backoff));
			return fetchData(url, token, retries - 1, backoff * 2); // Exponential backoff
		  }
		  throw new Error(`HTTP error! status: ${response.status}`);
		}
		return await response.json();
	  } catch (error) {
		throw error; // Re-throw the error for the caller to handle
	  }
	}

	// Revised fetchAllData function
	async function fetchAllData(token, timeRange = 'medium_term') {
	  showLoading();
	  try {
		// Fetch all data before proceeding
		const profilePromise = fetchData('https://api.spotify.com/v1/me', token);
		const topTracksPromise = fetchData(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}`, token);
		const topArtistsPromise = fetchData(`https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}`, token);
		const listeningStatsPromise = fetchListeningStatistics(token, timeRange);

		const [profile, topTracks, topArtists, listeningStats] = await Promise.all([profilePromise, topTracksPromise, topArtistsPromise, listeningStatsPromise]);

		// Display data only after all fetches are complete
		displayUserProfile(profile);
		displayTopTracks(topTracks);
		displayTopArtists(topArtists);
		displayListeningStatistics(listeningStats);
		await generateSummary(token, timeRange, listeningStats);
	  } catch (error) {
		handleError(error);
	  } finally {
		hideLoading();
	  }
	}
// Update or create 'Show More/Less' button
	function updateShowMoreButton(sectionId, itemCount) {
		const section = document.getElementById(sectionId);
		let button = section.parentNode.querySelector('.show-more');
		if (itemCount > 5 && !button) {
			button = createShowMoreButton(sectionId);
			section.parentNode.appendChild(button);
		} else if (itemCount <= 5 && button) {
			button.remove();
		}
	}

	// Corrected toggleVisibleItems function
	function toggleVisibleItems(containerId, shouldExpand) {
		const container = document.getElementById(containerId);
		if (!container) {
			console.error('No container found with ID:', containerId);
			return; // Exit if container is not found
		}

		const items = container.querySelectorAll('.item'); 
		const limit = shouldExpand ? items.length : 5; 

		items.forEach((item, index) => {
			item.style.display = index < limit ? 'block' : 'none';
		});

		// Update the button text accordingly
		const button = container.parentNode.querySelector('.show-more');
		if (button) {
			button.textContent = shouldExpand ? 'Show Less' : 'Show More';
			button.dataset.expanded = shouldExpand;
		}
	}

	// Corrected createShowMoreButton function
	function createShowMoreButton(targetId) {
		const button = document.createElement('button');
		button.className = 'btn show-more';
		button.textContent = 'Show More';
		button.dataset.target = targetId;
		button.dataset.state = 'less';
		button.onclick = function() {
			const isShowingMore = this.dataset.state === 'more';
			toggleVisibleItems(this.dataset.target, !isShowingMore);
			this.dataset.state = isShowingMore ? 'less' : 'more';
			this.textContent = isShowingMore ? 'Show More' : 'Show Less';
		};
		return button;
	}
	// Revised displayUserProfile function
	function displayUserProfile(profile) {
	  const imageUrl = profile.images && profile.images.length > 0 ? profile.images[0].url : 'default-profile.png';
	  const displayName = profile.display_name || 'No display name';
	  const email = profile.email || 'No email provided';
	  const country = profile.country || 'No country provided';
	  const followers = profile.followers ? profile.followers.total : 'No followers count';

	  // Building the profile HTML
	  const profileHTML = `
		<div class="user-profile-header">
		  <img src="${imageUrl}" alt="Profile image" class="user-profile-image">
		  <div class="user-profile-name">${displayName}</div>
		</div>
		<div class="user-profile-details">
		  <div class="user-profile-email">Email: ${email}</div>
		  <div class="user-profile-country">Country: ${country}</div>
		  <div class="user-profile-followers">Followers: ${followers}</div>
		</div>
	  `;
	  profileInfo.innerHTML = profileHTML;
	  profileInfo.classList.add('user-info');
	}
	
	function displayListeningStatistics(stats) {
	  const statsContainer = document.getElementById('listening-statistics-section').querySelector('.stats-container');
	  // Build the content string based on stats data
	  const content = stats.totalTime && stats.favoriteGenre ? 
		`<p>Total Listening Time: ${stats.totalTime} hours</p><p>Favorite Genre: ${stats.favoriteGenre}</p>` : 
		'<p>No listening statistics available.</p>';
	  statsContainer.innerHTML = content;
	}
	
	function createStatsList(data) {
	  // Check if data is an array and has content
	  if (!Array.isArray(data) || data.length === 0) {
		return '<p>No statistics data available.</p>';
	  }

	  const listHTML = data.map(item => `<li class='listening-stats-item'>${item.name}: ${item.value}</li>`).join('');
	  return `<ul class='listening-stats-list'>${listHTML}</ul>`;
	}

	function displayTopTracks(tracks) {
		const topTracksSection = document.getElementById('top-tracks');
		if (!tracks || !tracks.items || tracks.items.length === 0) {
			console.error('Invalid or empty track data');
			topTracksSection.innerHTML = '<p>No top tracks data available.</p>';
			return;
		}

		topTracksSection.classList.add('grid-layout');
		const trackItemsHtml = tracks.items.map(track => createTrackItem(track)).join('');
		topTracksSection.innerHTML = trackItemsHtml;

		// Add or update the 'Show More' button based on the number of tracks
		updateShowMoreButton('top-tracks', tracks.items.length);
		toggleVisibleItems(topTracksSection, 5);
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
		const topArtistsSection = document.getElementById('top-artists');
		if (!artists || !artists.items) {
			console.error('Invalid artist data');
			return;
		}

		topArtistsSection.classList.add('grid-layout');
		topArtistsSection.innerHTML = artists.items.map(artist => createArtistItem(artist)).join('');

		// Slice the array to only show the first 5 items initially
		toggleVisibleItems(topArtistsSection, 5);

		// Add 'Show More' button if there are more artists
		updateShowMoreButton('top-artists', artists.items.length);
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

    function handleError(error) {
        console.error('Error:', error);
        displayError(error.message);
        if (error.message.includes('429')) {
            displayError('You have made too many requests in a short period of time. Please wait and try again later.');
        }
    }


	function displayError(message) {
	  // Create or select the error message container
	  let errorContainer = document.getElementById('error-message');
	  if (!errorContainer) {
		errorContainer = document.createElement('div');
		errorContainer.id = 'error-message';
		document.body.prepend(errorContainer);
	  }
	  errorContainer.textContent = message;
	}

	async function generateSummary(token, timeRange, listeningStats) {
	  try {
		const topTracks = await fetchData(`https://api.spotify.com/v1/me/top/tracks?limit=1&time_range=${timeRange}`, token);
		const topArtists = await fetchData(`https://api.spotify.com/v1/me/top/artists?limit=1&time_range=${timeRange}`, token);
		if (!topTracks.items.length || !topArtists.items.length) {
		  throw new Error('Top tracks or artists data is empty');
		}

		const topTrackTile = createSummaryTile('Top Track', topTracks.items[0].name, `${topTracks.items[0].popularity} popularity score`);
		const topArtistTile = createSummaryTile('Top Artist', topArtists.items[0].name, `${topArtists.items[0].popularity} popularity score`);
		const listeningTimeTile = createSummaryTile('Listening Time', '', `${listeningStats.totalTime} hours`);

		const summaryContent = document.getElementById('summary-content');
		summaryContent.innerHTML = '';
		summaryContent.append(topTrackTile, topArtistTile, listeningTimeTile);
	  } catch (error) {
		console.error('Error generating summary:', error);
		displayError('Unable to generate summary.');
	  }
	}

	async function fetchListeningStatistics(token, timeRange) {
	  try {
		const topTracksResponse = await fetchData(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=50`, token);
		if (!topTracksResponse.items.length) {
		  throw new Error('Top tracks data is empty');
		}

		let totalTimeMs = topTracksResponse.items.reduce((total, track) => total + track.duration_ms, 0);
		let totalTimeHours = (totalTimeMs / (3600 * 1000)).toFixed(2);

		let genreCounts = topTracksResponse.items.flatMap(track => track.artists.flatMap(artist => artist.genres))
		  .reduce((acc, genre) => ({ ...acc, [genre]: (acc[genre] || 0) + 1 }), {});

		let favoriteGenre = Object.keys(genreCounts).reduce((a, b) => genreCounts[a] > genreCounts[b] ? a : b, "");

		return { totalTime: totalTimeHours, favoriteGenre: favoriteGenre };
	  } catch (error) {
		console.error('Error fetching listening statistics:', error);
		displayError('Unable to fetch listening statistics.');
		return { totalTime: 'Unavailable', favoriteGenre: 'Unavailable' };
	  }
	}

	function createSummaryTile(title, subtitle, detail) {
	  subtitle = subtitle || 'Not Available';
	  detail = detail || 'Not Available';

	  const tile = document.createElement('div');
	  tile.className = 'summary-tile';
	  tile.innerHTML = `<h3>${title}</h3><strong>${subtitle}</strong><p>${detail}</p>`;
	  return tile;
	}


	// Revised toggleShowMore function
	function toggleShowMore(targetId, button) {
	  const target = document.getElementById(targetId);
	  const isShowingMore = button.dataset.state === 'more';
	  const itemsToShow = isShowingMore ? 5 : target.children.length;
	  toggleVisibleItems(target, itemsToShow);

	  // Update the button's data-state and text
	  button.dataset.state = isShowingMore ? 'less' : 'more';
	  button.textContent = button.dataset.state === 'more' ? 'Show Less' : 'Show More';
	}


	function updateAppState(isLoggedIn) {
		const loginSection = document.getElementById('login-section');
		const userProfileSection = document.getElementById('user-profile');
		const statsSection = document.getElementById('stats-section');
		const summarySection = document.getElementById('summary-section');
		const timeRangeSelector = document.getElementById('time-range');
		const logoutButton = document.getElementById('logout-button');
		const showMoreButtons = document.querySelectorAll('.show-more');
		showMoreButtons.forEach(button => button.remove());
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

	// Helper function to toggle element visibility
	function toggleElementVisibility(elementId, shouldShow) {
	  const element = document.getElementById(elementId);
	  if (element) {
		element.classList.toggle('hidden', !shouldShow);
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