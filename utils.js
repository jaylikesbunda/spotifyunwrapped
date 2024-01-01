function getHashParams() {
    const hashParams = {};
    const regex = /([^&;=]+)=?([^&;]*)/g;
    const query = window.location.hash.substring(1);

    let match;
    while ((match = regex.exec(query))) {
        hashParams[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);
    }

    return hashParams;
}
