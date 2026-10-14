document.addEventListener("DOMContentLoaded", () => {
    const menuButton = document.querySelector(".hamburger");
    const navLinks = document.querySelector(".nav-links");

    const closeMenu = () => {
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation menu");
        navLinks.classList.remove("is-open");
    };

    menuButton.addEventListener("click", () => {
        const isOpen = menuButton.getAttribute("aria-expanded") === "true";
        menuButton.setAttribute("aria-expanded", String(!isOpen));
        menuButton.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
        navLinks.classList.toggle("is-open", !isOpen);
    });

    navLinks.addEventListener("click", (event) => {
        if (event.target instanceof HTMLAnchorElement) {
            closeMenu();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMenu();
        }
    });

    document.addEventListener("click", (event) => {
        if (
            menuButton.getAttribute("aria-expanded") === "true" &&
            event.target instanceof Node &&
            !menuButton.contains(event.target) &&
            !navLinks.contains(event.target)
        ) {
            closeMenu();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 680) {
            closeMenu();
        }
    });

    const revealElements = document.querySelectorAll(".footer-section, .footer-bottom");
    if (
        revealElements.length > 0 &&
        "IntersectionObserver" in window &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
        const observer = new IntersectionObserver((entries, currentObserver) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    currentObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        document.body.classList.add("motion-ready");
        revealElements.forEach((element) => {
            element.classList.add("reveal");
            observer.observe(element);
        });
    }
});
