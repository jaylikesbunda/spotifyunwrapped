function getHashParams() {
    const hashParams = {};
    const regex = /([^&;=]+)=?([^&;]*)/g;
    const windowHash = window.location.hash.substring(1);

    let e;
    while ((e = regex.exec(windowHash))) {
        hashParams[e[1]] = decodeURIComponent(e[2]);
    }

    return hashParams;
}