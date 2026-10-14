
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function displayCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItemDetails = document.getElementById("cartItemDetails");

    if (cart.length > 0) {
        let cartHTML = '';
        let totalCartPrice = 0;
 
        cart.forEach(item => {

            const itemTotalPrice = item.price * item.quantity;
            totalCartPrice += itemTotalPrice;

            cartHTML += `
                <div class="cart-item">
                    <p><strong>Item:</strong> ${escapeHtml(item.name)}</p>
                    ${item.size ? `<p><strong>Size:</strong> ${escapeHtml(item.size)}</p>` : ''}
                    <p><strong>Quantity:</strong> ${item.quantity}</p>
                    <p><strong>Price per Item:</strong> ₱${item.price.toFixed(2)}</p>
                    <p><strong>Total Price:</strong> ₱${itemTotalPrice.toFixed(2)}</p>
                </div>
            `;
        });

        cartHTML += `<div class="cart-item"><p><strong>Total Cart Price:</strong> ₱${totalCartPrice.toFixed(2)}</p></div>`;
        cartItemDetails.innerHTML = cartHTML;
    } else {
        cartItemDetails.innerHTML = "<p>No items in the cart.</p>";
    }
}

function clearCart() {
    localStorage.removeItem('cart'); // Clear the cart from localStorage
    displayCart(); // Refresh the cart display
    updateCheckoutButtonVisibility(); // Update the checkout button visibility
}

// Function to check if the cart is empty and toggle the checkout button visibility
function updateCheckoutButtonVisibility() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const checkoutButton = document.getElementById('checkoutButton');

    if (!checkoutButton) {
        return;
    }

    if (cart.length > 0) {
        checkoutButton.style.display = 'block'; // Show the button if the cart is not empty
    } else {
        checkoutButton.style.display = 'none'; // Hide the button if the cart is empty
    }
}

function resetFormFields() {
    document.getElementById('name').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('address').value = '';
    document.getElementById('cash').value = '';
}

function openModal() {
    document.getElementById('receiptModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('receiptModal').style.display = 'none';
}

document.getElementById('orderForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;
    const cash = Number(document.getElementById('cash').value);

    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    if (cart.length === 0) {
        alert("Your cart is empty. Add items before placing an order.");
        return;
    }

    const totalBill = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (!Number.isFinite(cash) || cash < 0) {
        alert("Please enter a valid cash amount.");
        return;
    }

    if (cash < totalBill) {
        alert("Insufficient cash! Please provide enough cash to complete the order.");
        return;
    }

    const change = cash - totalBill;

    const receiptDetails = `
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
        <p><strong>Address:</strong> ${escapeHtml(address)}</p>
        <p><strong>Total Bill:</strong> ₱${totalBill.toFixed(2)}</p>
        <p><strong>Cash:</strong> ₱${cash.toFixed(2)}</p>
        <p><strong>Change:</strong> ₱${change.toFixed(2)}</p>
        <h3>Order Items:</h3>
        <ul>
            ${cart.map(item => `
                <li>${escapeHtml(item.name)} (${escapeHtml(item.size || 'N/A')}) - ${item.quantity} x ₱${item.price.toFixed(2)} = ₱${(item.price * item.quantity).toFixed(2)}</li>
            `).join('')}
        </ul>
    `;

    document.getElementById('receiptDetails').innerHTML = receiptDetails;
    openModal();

    resetFormFields();

    clearCart();
});

displayCart();