function getHashParams() {
    const hashParams = {};
    const regex = /([^&;=]+)=([^&;]*)/g;
    const windowHash = window.location.hash.substring(1);

    let match;
    while ((match = regex.exec(windowHash))) {
        hashParams[match[1]] = decodeURIComponent(match[2]);
    }

    return hashParams;
}
