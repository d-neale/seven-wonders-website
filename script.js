document.addEventListener("DOMContentLoaded", () => {
    const WONDERS = [
        { page: "chichén_itzá.html", coords: [-88.5678, 20.6843] },
        { page: "christ_the_redeemer.html", coords: [-43.2105, -22.9519] },
        { page: "colosseum.html", coords: [12.4922, 41.8902] },
        { page: "great_pyramid_of_giza.html", coords: [31.1342, 29.9792] },
        { page: "great_wall_of_china.html", coords: [116.5704, 40.4319] },
        { page: "machu_picchu.html", coords: [-72.5450, -13.1631] },
        { page: "petra.html", coords: [35.4444, 30.3285] },
        { page: "taj_mahal.html", coords: [78.0421, 27.1751] }
    ];

    // Match wonder page filename from URL (works on GitHub Pages and locally).
    const pages = WONDERS.map(w => w.page);
    const pathSegment = decodeURIComponent(location.pathname.split("/").filter(Boolean).pop() || "");
    const currentPage = pathSegment.endsWith(".html") ? pathSegment : "";
    const currentIndex = pages.indexOf(currentPage);
    const isIndex = document.body.classList.contains("index-page");
    const isWonder = document.body.classList.contains("wonder-page");

    const showFormToast = (message) => {
        let toast = document.getElementById("formToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "formToast";
            toast.className = "form-toast";
            toast.setAttribute("role", "status");
            toast.setAttribute("aria-live", "polite");
            toast.addEventListener("animationend", (e) => {
                if (e.animationName === "form-toast-out") {
                    toast.classList.remove("is-hiding");
                }
            });
            document.body.appendChild(toast);
        }

        clearTimeout(toast._hideTimer);
        toast.classList.remove("is-hiding");
        toast.textContent = message;
        void toast.offsetWidth;
        toast.classList.add("is-visible");

        toast._hideTimer = setTimeout(() => {
            toast.classList.add("is-hiding");
            toast.classList.remove("is-visible");
        }, 3000);
    };

    const reviewFormHtml = `
        <div class="review_form">
            <h2>Leave a review</h2>
            <form>
                <label for="first_name">First Name:</label>
                <input type="text" id="first_name" name="first_name" placeholder="First Name">
                <label for="last_name">Last Name:</label>
                <input type="text" id="last_name" name="last_name" placeholder="Last Name">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" placeholder="Email" autocomplete="email">
                <label for="date">Date of Visit:</label>
                <input type="date" id="date" name="date">
                <label for="experience">Your experience:</label>
                <textarea id="experience" name="experience" rows="4" placeholder="Describe your experience"></textarea>
                <input type="submit" value="Submit">
            </form>
        </div>`;

    const scrollHintHtml = `
        <div class="scroll-hint hidden" id="scrollHint">
            <p>Scroll down to leave a review</p>
            <div class="arrow"></div>
        </div>`;

    if (isWonder && currentIndex !== -1) {
        // Injected by JS so wonder HTML stays static; form lives below the fold.
        document.querySelector(".wonder-content").insertAdjacentHTML("beforeend", reviewFormHtml);
        document.getElementById("page-footer").innerHTML = scrollHintHtml;
    }

    const blurredBackground = document.getElementById("blurred-background");
    const slides = document.querySelectorAll("#slideshow-container img");
    const navItems = document.querySelectorAll("#destination_list li");

    if (isIndex) {
        // Desktop: hover preview. Touch: first tap previews, second tap follows the link.
        let tappedIndex = null;
        const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

        const showSlide = (i) => {
            if (!slides[i]) return;
            slides.forEach((s, j) => s.style.display = j === i ? "block" : "none");
            if (blurredBackground) {
                blurredBackground.style.backgroundImage = `url(${slides[i].src})`;
            }
        };

        const setPreviewActive = (i) => {
            navItems.forEach((item, j) => {
                item.querySelector("a")?.classList.toggle("preview-active", i >= 0 && j === i);
            });
        };

        navItems.forEach((item, i) => {
            const link = item.querySelector("a");

            item.addEventListener("focusin", () => showSlide(i));

            if (canHover) {
                item.addEventListener("pointerenter", () => {
                    showSlide(i);
                    setPreviewActive(-1);
                    tappedIndex = null;
                });
            } else {
                link.addEventListener("click", (e) => {
                    if (tappedIndex === i) return;
                    e.preventDefault();
                    showSlide(i);
                    setPreviewActive(i);
                    tappedIndex = i;
                });
            }
        });
    }

    const hint = document.getElementById("scrollHint");
    const formSection = document.querySelector(".review_form");
    if (hint && formSection) {
        const syncHint = (inView) => hint.classList.toggle("hidden", inView);

        new IntersectionObserver(([entry]) => {
            hint.classList.add("ready");
            syncHint(entry.isIntersecting);
        }, { threshold: 0.1 }).observe(formSection);

        // scroll restoration finishes after DOMContentLoaded — wait before first show
        window.addEventListener("load", () => {
            const rect = formSection.getBoundingClientRect();
            syncHint(rect.top < innerHeight && rect.bottom > 0);
            hint.classList.add("ready");
        }, { once: true });

        hint.addEventListener("click", () => formSection.scrollIntoView({ behavior: "smooth" }));
    }

    const mapEl = document.getElementById("map");
    const wonder = WONDERS[currentIndex];
    if (mapEl && wonder) {
        // MapLibre expects [longitude, latitude]
        const map = new maplibregl.Map({
            container: "map",
            style: "https://tiles.openfreemap.org/styles/liberty",
            center: wonder.coords,
            zoom: 12,
            pitch: 45
        });
        new maplibregl.Marker().setLngLat(wonder.coords).addTo(map);
    }

    const form = document.querySelector(".review_form form");
    if (form) {
        const nameRule = (v) =>
            v.length < 2 ? "Name must be at least 2 characters" : /^[A-Za-z\s-]+$/.test(v) ? "" : "Letters only please";

        const validate = {
            first_name: nameRule,
            last_name: nameRule,
            experience: (v) => (v.length >= 20 ? "" : "Experience must be at least 20 characters")
        };

        form.addEventListener("submit", e => {
            e.preventDefault();
            let valid = true;

            form.querySelectorAll("input, textarea").forEach(field => {
                field.nextElementSibling?.classList.contains("error-message") && field.nextElementSibling.remove();

                const val = field.value.trim();
                let error = "";

                if (!val) error = "This field must be completed";
                else if (field.type === "email" && !field.checkValidity()) error = "Invalid email address";
                else if (validate[field.id]) error = validate[field.id](val);
                else if (field.type === "date" && new Date(val) > new Date()) error = "Date cannot be in the future";

                if (error) {
                    valid = false;
                    field.insertAdjacentHTML("afterend", `<span class="error-message">${error}</span>`);
                }
            });

            if (valid) {
                form.reset();
                showFormToast("Thank you for your review!");
            }
        });
    }
});