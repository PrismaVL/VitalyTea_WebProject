document.addEventListener("DOMContentLoaded", function () {
    updateCheckoutButtonVisibility();

    const carousels = document.querySelectorAll('.carousel');
    carousels.forEach(carousel => {
        const firstItem = carousel.querySelector('.carousel-item');
        if (firstItem) {
            firstItem.classList.add('active');
        }
    });

    const customHeaders = document.querySelectorAll('.custom-header');

    customHeaders.forEach(header => {
        setTimeout(() => {
            header.classList.add('loaded');
        }, 100);
    });
});

function prevSlide(carouselId) {
    const carousel = document.getElementById(carouselId);
    const inner = carousel.querySelector('.carousel-inner');
    const items = inner.querySelectorAll('.carousel-item');
    const activeItem = inner.querySelector('.carousel-item.active');

    let prevItem = activeItem.previousElementSibling;
    if (!prevItem) {
        prevItem = items[items.length - 1];
    }

    activeItem.classList.remove('active');
    activeItem.style.opacity = '0';
    activeItem.style.transform = 'scale(0.8)';

    prevItem.classList.add('active');
    prevItem.style.opacity = '1';
    prevItem.style.transform = 'scale(1)';
}

function nextSlide(carouselId) {
    const carousel = document.getElementById(carouselId);
    const inner = carousel.querySelector('.carousel-inner');
    const items = inner.querySelectorAll('.carousel-item');
    const activeItem = inner.querySelector('.carousel-item.active');

    let nextItem = activeItem.nextElementSibling;
    if (!nextItem) {
        nextItem = items[0];
    }

    activeItem.classList.remove('active');
    activeItem.style.opacity = '0';
    activeItem.style.transform = 'scale(0.8)';

    nextItem.classList.add('active');
    nextItem.style.opacity = '1';
    nextItem.style.transform = 'scale(1)';
}

/*Drink Modal Logic*/

const modal = document.getElementById("itemModal");
const closeBtn = document.querySelector(".close");

const modalItemName = document.getElementById("modalItemName");
const sizeSelect = document.getElementById("size");
const quantityInput = document.getElementById("quantity");
const modalPrice = document.getElementById("modalPrice");

function openModal(item) {
    const itemName = item.getAttribute("data-name");
    const itemSizes = JSON.parse(item.getAttribute("data-sizes"));

    modalItemName.textContent = itemName;
    sizeSelect.innerHTML = ""; 

    for (const [size, price] of Object.entries(itemSizes)) {
        const option = document.createElement("option");
        option.value = size;
        option.textContent = `${size} - P ${price.toFixed(2)}`;
        sizeSelect.appendChild(option);
    }

    sizeSelect.addEventListener("change", () => {
        const selectedSize = sizeSelect.value;
        const price = itemSizes[selectedSize];
        modalPrice.textContent = `Price: P ${price.toFixed(2)}`;
    });

    modal.style.display = "block";
}

function closeModal() {
    modal.style.display = "none";
}

document.querySelectorAll(".carousel-item").forEach(item => {
    item.addEventListener("click", () => openModal(item));
});

closeBtn.addEventListener("click", closeModal);

window.addEventListener("click", (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

document.getElementById("itemForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const selectedSize = sizeSelect.value;
    const quantity = quantityInput.value;
    const price = JSON.parse(document.querySelector(".carousel-item").getAttribute("data-sizes"))[selectedSize];

    addToCart(modalItemName.textContent, selectedSize, parseInt(quantity), parseFloat(price));

    closeModal();
});

const sandwichModal = document.getElementById("sandwichModal");
const sandwichCloseBtn = sandwichModal.querySelector(".close");

const sandwichItemName = document.getElementById("sandwichItemName");
const sandwichPrice = document.getElementById("sandwichPrice");

function openSandwichModal(item) {
    const itemName = item.getAttribute("data-name");
    const itemPrice = parseFloat(item.getAttribute("data-price"));

    sandwichItemName.textContent = itemName;
    sandwichPrice.textContent = `Price: P ${itemPrice.toFixed(2)}`;

    sandwichModal.style.display = "block";
}

function closeSandwichModal() {
    sandwichModal.style.display = "none";
}

document.querySelectorAll("#carousel2 .carousel-item").forEach(item => {
    item.addEventListener("click", () => openSandwichModal(item));
});

sandwichCloseBtn.addEventListener("click", closeSandwichModal);

window.addEventListener("click", (event) => {
    if (event.target === sandwichModal) {
        closeSandwichModal();
    }
});

document.getElementById("sandwichForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const quantity = document.getElementById("sandwichQuantity").value;
    const price = parseFloat(document.querySelector("#carousel2 .carousel-item").getAttribute("data-price"));

    addToCart(sandwichItemName.textContent, null, parseInt(quantity), parseFloat(price));

    closeSandwichModal();
});

function addToCart(name, size, quantity, price) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    const totalPrice = price * quantity;

    const cartItem = {
        name,
        size: size || null,
        quantity,
        price,
        totalPrice,
    };

    cart.push(cartItem);

    localStorage.setItem('cart', JSON.stringify(cart));

    updateCheckoutButtonVisibility();
}

function showCheckoutButton() {
    const checkoutButton = document.getElementById('checkoutButton');
    if (checkoutButton) {
        checkoutButton.style.display = 'block';
    }
}

function updateCheckoutButtonVisibility() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const checkoutButton = document.getElementById('checkoutButton');

    if (cart.length > 0) {
        checkoutButton.style.display = 'block';
    } else {
        checkoutButton.style.display = 'none';
    }
}
