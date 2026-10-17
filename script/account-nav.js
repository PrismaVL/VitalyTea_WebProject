(() => {
    const navigation = document.querySelector(".nav-links");
    const script = document.currentScript;
    if (!navigation || !script?.src) {
        return;
    }

    const accountUrl = new URL("../account/login.php", script.src);
    const profileUrl = new URL("../account/profile.php", script.src);
    const logoutUrl = new URL("../account/logout.php", script.src);
    const sessionUrl = new URL("../account/session.php", script.src);
    const accountNav = document.createElement("div");
    accountNav.className = "account-nav";
    const signInLink = document.createElement("a");
    signInLink.className = "account-nav-trigger";
    signInLink.href = accountUrl.href;
    signInLink.setAttribute("aria-label", "Sign in");
    signInLink.title = "Sign in";
    signInLink.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/></svg>';
    accountNav.append(signInLink);
    navigation.append(accountNav);

    fetch(sessionUrl, { credentials: "same-origin", cache: "no-store" })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Account status request failed with HTTP ${response.status}.`);
            }
            return response.json();
        })
        .then((account) => {
            if (!account.authenticated) {
                return;
            }

            const trigger = document.createElement("button");
            trigger.className = "account-nav-trigger";
            trigger.type = "button";
            trigger.setAttribute("aria-label", "Account menu");
            trigger.setAttribute("aria-expanded", "false");
            trigger.setAttribute("aria-haspopup", "true");
            trigger.setAttribute("aria-controls", "account-dropdown-menu");
            trigger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/></svg>';

            const menu = document.createElement("div");
            menu.className = "account-dropdown";
            menu.id = "account-dropdown-menu";
            menu.setAttribute("aria-hidden", "true");
            menu.hidden = true;

            const profileLink = document.createElement("a");
            profileLink.href = profileUrl.href;
            profileLink.textContent = "My account";

            const logoutForm = document.createElement("form");
            logoutForm.method = "post";
            logoutForm.action = logoutUrl.href;
            const csrfInput = document.createElement("input");
            csrfInput.type = "hidden";
            csrfInput.name = "csrf_token";
            csrfInput.value = account.csrfToken;
            const logoutButton = document.createElement("button");
            logoutButton.type = "submit";
            logoutButton.textContent = "Log out";
            logoutForm.append(csrfInput, logoutButton);

            menu.append(profileLink, logoutForm);
            accountNav.replaceChildren(trigger, menu);

            let closeTimer;
            const closeMenu = () => {
                window.clearTimeout(closeTimer);
                trigger.setAttribute("aria-expanded", "false");
                menu.setAttribute("aria-hidden", "true");
                menu.classList.remove("is-open");
                closeTimer = window.setTimeout(() => {
                    menu.hidden = true;
                }, 180);
            };

            trigger.addEventListener("click", () => {
                const isOpen = trigger.getAttribute("aria-expanded") === "true";
                if (isOpen) {
                    closeMenu();
                    return;
                }

                window.clearTimeout(closeTimer);
                menu.hidden = false;
                menu.setAttribute("aria-hidden", "false");
                trigger.setAttribute("aria-expanded", "true");
                menu.getBoundingClientRect();
                menu.classList.add("is-open");
            });
            profileLink.addEventListener("click", closeMenu);
            document.addEventListener("click", (event) => {
                if (!accountNav.contains(event.target)) {
                    closeMenu();
                }
            });
            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    closeMenu();
                }
            });
        })
        .catch((error) => {
            console.error("Unable to load account navigation status.", error);
        });
})();
