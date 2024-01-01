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

	function clearPreviousContent() {
	  const sections = ['top-tracks', 'top-artists', 'listening-statistics'];
	  sections.forEach((sectionId) => {
		const section = document.getElementById(sectionId);
		section.innerHTML = ''; // Clear section content
		// Remove existing "Show More" button if present
		const showMoreButton = section.parentNode.querySelector('.show-more');
		if (showMoreButton) {
		  showMoreButton.remove();
		}
	  });
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


	async function fetchAllData(token, timeRange = 'medium_term') {
	  showLoading();
	  try {
		const profile = await fetchData('https://api.spotify.com/v1/me', token);
		const topTracks = await fetchData(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}`, token);
		const topArtists = await fetchData(`https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}`, token);
		const listeningStats = await fetchListeningStatistics(token, timeRange);
		displayUserProfile(profile);
		displayTopTracks(topTracks);
		displayTopArtists(topArtists);
		displayListeningStatistics(listeningStats);
		await generateSummary(token, timeRange, listeningStats);
		updateAppState(true);
	  } catch (error) {
		handleError(error);
	  } finally {
		hideLoading();
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

	// This function may be revised to correctly handle the statistics data
	function displayListeningStatistics(stats) {
	  const statsContainer = document.getElementById('listening-statistics-section').querySelector('.stats-container');
	  // Assuming 'stats' is an object with properties 'totalTime' and 'favoriteGenre'
	  const content = stats.totalTime && stats.favoriteGenre ? 
		`<p>Total Listening Time: ${stats.totalTime} hours</p><p>Favorite Genre: ${stats.favoriteGenre}</p>` : 
		'<p>No listening statistics available.</p>';
	  statsContainer.innerHTML = content;
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
	  topTracksSection.classList.add('grid-layout'); // Ensure this class exists in your CSS
	  topTracksSection.innerHTML = tracks.items.map(track => createTrackItem(track)).join('');

	  // Check if a 'Show More' button already exists, update or create one as necessary
	  let showMoreButton = topTracksSection.parentNode.querySelector('.show-more');
	  if (!showMoreButton) {
		showMoreButton = createShowMoreButton('top-tracks');
		topTracksSection.parentNode.appendChild(showMoreButton);
	  }

	  // Initially display only the first 5 items
	  toggleVisibleItems(topTracksSection, 5);

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
			const showMoreButton = updateShowMoreButton('top-artists');
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

	function displayError(message) {
	  const errorContainer = document.getElementById('error-message');
	  if (!errorContainer) {
		// If no error container exists, create one
		const newErrorContainer = document.createElement('div');
		newErrorContainer.id = 'error-message';
		document.body.prepend(newErrorContainer); // Adjust as needed to place it where you want in your page
	  }
	  errorContainer.textContent = message;
	}

    async function generateSummary(token, timeRange, listeningStats) {
      try {
        // Fetch user's top track and artist using the Spotify API
        const topTracks = await fetchData(`https://api.spotify.com/v1/me/top/tracks?limit=1&time_range=${timeRange}`, token);
        const topArtists = await fetchData(`https://api.spotify.com/v1/me/top/artists?limit=1&time_range=${timeRange}`, token);

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
      } catch (error) {
        console.error('Error generating summary:', error);
        displayError('Unable to generate summary.');
      }
    }

	async function fetchListeningStatistics(token, timeRange) {
	  try {
		// Fetch the user's top tracks to infer listening habits
		const topTracksResponse = await fetchData(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=50`, token);
		
		// Calculate estimated listening time
		// Assuming each track is listened to fully for the duration listed, though in reality this is an overestimation.
		let totalTimeMs = topTracksResponse.items.reduce((total, track) => total + track.duration_ms, 0);
		let totalTimeHours = (totalTimeMs / (3600 * 1000)).toFixed(2); // Convert milliseconds to hours and fix to 2 decimal places

		// Determine the most listened genre
		// Assuming the first genre listed for each artist is their primary genre
		let genreCounts = {};
		topTracksResponse.items.forEach(track => {
		  let genres = track.artists.flatMap(artist => artist.genres);
		  genres.forEach(genre => {
			genreCounts[genre] = (genreCounts[genre] || 0) + 1;
		  });
		});

		// Find the genre with the maximum count
		let favoriteGenre = Object.keys(genreCounts).reduce((a, b) => genreCounts[a] > genreCounts[b] ? a : b, "");

		// Return a statistics object with the calculated values
		return {
		  totalTime: totalTimeHours,
		  favoriteGenre: favoriteGenre
		};
	  } catch (error) {
		console.error('Error fetching listening statistics:', error);
		displayError('Unable to fetch listening statistics.');
		return {
		  totalTime: 'Unavailable',
		  favoriteGenre: 'Unavailable'
		};
	  }
	}

	function createSummaryTile(title, subtitle, detail) {
	  // Handle cases where subtitle or detail might be unavailable
	  subtitle = subtitle || 'Not Available';
	  detail = detail || 'Not Available';
	  
	  const tile = document.createElement('div');
	  tile.className = 'summary-tile';
	  tile.innerHTML = `
		<h3>${title}</h3>
		<strong>${subtitle}</strong>
		<p>${detail}</p>
	  `;
	  return tile;
	}
	
	// Ensure the 'Show More' button is appropriately updated or removed
	function updateShowMoreButton(sectionId) {
	  const section = document.getElementById(sectionId);
	  let button = section.parentNode.querySelector('.show-more');
	  if (section.children.length <= 5 && button) {
		// If there are 5 or fewer items, the button should be removed
		button.remove();
	  } else if (!button) {
		// If there are more than 5 items and no button, one should be created
		button = createShowMoreButton(sectionId);
		section.parentNode.appendChild(button);
	  }
	}

	// Revised Show More/Less logic
	function createShowMoreButton(targetId) {
	  let button = document.querySelector(`#${targetId} .show-more`);
	  if (!button) {
		button = document.createElement('button');
		button.className = 'btn show-more';
		button.textContent = 'Show More';
		button.dataset.target = targetId;
		button.dataset.state = 'less'; // Initialize the button state to 'less'
		button.addEventListener('click', function() {
		  toggleShowMore(targetId, this);
		});
	  }
	  return button;
	}

	function toggleShowMore(targetId, button) {
	  const target = document.getElementById(targetId);
	  const isShowingMore = button.dataset.state === 'more';
	  const itemsToShow = isShowingMore ? 5 : target.children.length;
	  toggleVisibleItems(target, itemsToShow);
	  button.dataset.state = isShowingMore ? 'less' : 'more';
	  button.textContent = isShowingMore ? 'Show More' : 'Show Less';
	}
	function toggleVisibleItems(container, limit) {
	  Array.from(container.children).forEach((child, index) => {
		child.style.display = index < limit ? 'block' : 'none'; // Use 'block' or another appropriate display style
	  });
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