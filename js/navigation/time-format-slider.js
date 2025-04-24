// js/navigation/time-format-slider.js
window.timeFormatSlider = (function () {
  // Core slider instance we'll use
  let sliderInstance = null;

  // Current format (12 or 24)
  let currentFormat = "12";

  // Update interval ID
  let updateInterval = null;

  // Option elements
  let option12h = null;
  let option24h = null;

  // Utility function to format current time based on preference
  function formatCurrentTime(use24Hour = false) {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");

    if (use24Hour) {
      // 24-hour format
      hours = hours.toString().padStart(2, "0");
      return `24h ${hours}:${minutes}`;
    } else {
      // 12-hour format with AM/PM
      const period = hours >= 12 ? "pm" : "am";
      hours = hours % 12;
      hours = hours ? hours : 12; // Convert 0 to 12 for 12 AM
      return `12h ${hours}:${minutes}${period}`;
    }
  }

  // Function to update the time display in the buttons
  function updateTimeDisplay() {
    if (!option12h || !option24h) {
      option12h = document.querySelector(
        '.time-format-selector .option[data-format="12"] h3'
      );
      option24h = document.querySelector(
        '.time-format-selector .option[data-format="24"] h3'
      );
    }

    if (option12h) {
      option12h.textContent = formatCurrentTime(false);
    }

    if (option24h) {
      option24h.textContent = formatCurrentTime(true);
    }
  }

  // Apply time format
  function applyTimeFormat(formatName) {
    console.log("Applying time format:", formatName);

    // Store the current format
    currentFormat = formatName;

    // Update the time display
    updateTimeDisplay();
  }

  // Custom handler for when an option is selected
  function handleOptionSelected(option) {
    // Get the format from data attribute
    const formatName = option.getAttribute("data-format");

    console.log("Time format option selected:", formatName);

    // Apply the selected format
    applyTimeFormat(formatName);

    // Save preference to localStorage
    localStorage.setItem("userTimeFormatPreference", formatName);
  }

  // Initialize the time format slider
  function init() {
    // Get access to the core slider functionality
    if (!window.sliderButtons) {
      console.error("Core slider functionality not available");
      return false;
    }

    // Find time format selector buttons
    option12h = document.querySelector(
      '.time-format-selector .option[data-format="12"] h3'
    );
    option24h = document.querySelector(
      '.time-format-selector .option[data-format="24"] h3'
    );

    if (!option12h || !option24h) {
      console.error("Time format selector buttons not found");
      return false;
    }

    // Update time display in buttons
    updateTimeDisplay();

    // Set up interval to update time display
    if (updateInterval) {
      clearInterval(updateInterval);
    }
    updateInterval = setInterval(updateTimeDisplay, 1000);

    // Initialize the slider
    const result = window.sliderButtons.init(".time-format-selector");

    if (!result) {
      console.error("Failed to initialize the time format slider");
      return false;
    }

    // Set the callback
    window.sliderButtons.onOptionSelected = handleOptionSelected;

    // Apply saved preference or default
    const savedFormat =
      localStorage.getItem("userTimeFormatPreference") || "12";

    // Find the proper option to set active
    const formatOption = document.querySelector(
      `.time-format-selector .option[data-format="${savedFormat}"]`
    );

    if (formatOption) {
      // Apply the format and update the active button
      window.sliderButtons.setActiveOption(formatOption, true);
    } else {
      // Just apply the format directly
      applyTimeFormat(savedFormat);
    }

    return true;
  }

  // Clean up resources when navigating away
  function cleanup() {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  }

  // Public API
  return {
    init: init,
    cleanup: cleanup,
    applyTimeFormat: applyTimeFormat,
    handleOptionSelected: handleOptionSelected,
  };
})();
