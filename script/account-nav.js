(() => {
    const navigation = document.querySelector(".nav-links");
    const script = document.currentScript;
    if (!navigation || !script?.src) {
        return;
    }

    const accountUrl = new URL("../account/login.php", script.src);
    const sessionUrl = new URL("../account/session.php", script.src);
    const link = document.createElement("a");
    link.className = "account-nav-link";
    link.href = accountUrl.href;
    link.textContent = "Sign in";
    link.setAttribute("aria-label", "Sign in to your account");
    navigation.append(link);

    fetch(sessionUrl, { credentials: "same-origin", cache: "no-store" })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Account status request failed with HTTP ${response.status}.`);
            }
            return response.json();
        })
        .then((account) => {
            if (account.authenticated) {
                link.href = new URL("../account/profile.php", script.src).href;
                link.textContent = "My account";
                link.setAttribute("aria-label", "View your account profile");
            }
        })
        .catch((error) => {
            console.error("Unable to load account navigation status.", error);
        });
})();
