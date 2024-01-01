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

    // New function to show a loading spinner
    function showLoading() {
        const loader = document.createElement('div');
        loader.className = 'loader';
        document.body.appendChild(loader);
    }

    // New function to hide the loading spinner
    function hideLoading() {
        const loader = document.querySelector('.loader');
        if (loader) loader.remove();
    }


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
    // Modified fetchAllData to include loading indicator
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

    // Additional data fetching functions for more categories
    async function fetchRecentlyPlayed(token) {
        return await fetchData('https://api.spotify.com/v1/me/player/recently-played', token);
    }



	async function fetchData(url, token) {
		// WARNING: This is a public proxy and should only be used for development purposes.
		const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
		const spotifyUrl = proxyUrl + url;

		const response = await fetch(spotifyUrl, {
			headers: {
				'Authorization': `Bearer ${token}`,
				// The proxy server requires this header to be set.
				'X-Requested-With': 'XMLHttpRequest'
			}
		});

		if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
		return response.json();
	}


	function displayUserProfile(profile) {
		profileInfo.innerHTML = `
			<h3>${profile.display_name}</h3>
			<p><strong>Email:</strong> ${profile.email}</p>
			<p><strong>Country:</strong> ${profile.country}</p>
		`;
		profileInfo.classList.add('user-info');
	}


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

	function displayListeningStatistics(data) {
		const ctx = document.getElementById('listening-statistics-chart').getContext('2d');
		const chart = new Chart(ctx, {
			type: 'bar', // Example: Bar chart
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



	function displayTopTracks(tracks) {
		topTracksSection.innerHTML = `<h2>Top Tracks</h2>`;
		tracks.items.forEach(track => {
			const trackEl = document.createElement('div');
			trackEl.className = 'track-item';
			trackEl.innerHTML = `
				<img src="${track.album.images[0].url}" alt="${track.name}" class="track-image">
				<div class="track-info">
					<h3>${track.name}</h3>
					<p>${track.artists.map(artist => artist.name).join(', ')}</p>
				</div>
			`;
			topTracksSection.appendChild(trackEl);
		});
	}

	function displayTopArtists(artists) {
		topArtistsSection.innerHTML = `<h2>Top Artists</h2>`;
		artists.items.forEach(artist => {
			const artistEl = document.createElement('div');
			artistEl.className = 'artist-item';
			artistEl.innerHTML = `
				<img src="${artist.images[0].url}" alt="${artist.name}" class="artist-image">
				<h3>${artist.name}</h3>
			`;
			topArtistsSection.appendChild(artistEl);
		});
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
