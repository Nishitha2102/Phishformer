// popup.js
// This JavaScript file handles the popup functionality for the Chrome extension.

// Function to handle the popup opening
function openPopup() {
    const popup = document.getElementById('popup');
    if (popup) {
        popup.style.display = 'block';
    }
}

// Function to handle the popup closing
function closePopup() {
    const popup = document.getElementById('popup');
    if (popup) {
        popup.style.display = 'none';
    }
}

// Event listeners for opening and closing the popup
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('open-popup-btn').addEventListener('click', openPopup);
    document.getElementById('close-popup-btn').addEventListener('click', closePopup);
});