// js/settings/time-format-slider.js
window.timeFormatSlider = (function () {
  // Core slider instance we'll use
  let sliderInstance = null;

  // Element to display current time
  let timeDisplayElement = null;

  // Interval ID for updating time
  let timeUpdateInterval = null;

  // Current format (12 or 24)
  let currentFormat = "12";

  // Utility function to format current time based on preference
  function formatCurrentTime(use24Hour = false) {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");

    if (use24Hour) {
      // 24-hour format
      hours = hours.toString().padStart(2, "0");
      return `${hours}:${minutes}:${seconds}`;
    } else {
      // 12-hour format with AM/PM
      const period = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // Convert 0 to 12 for 12 AM
      return `${hours}:${minutes}:${seconds} ${period}`;
    }
  }

  // Function to update the time display
  function updateTimeDisplay() {
    if (!timeDisplayElement) return;

    timeDisplayElement.textContent = formatCurrentTime(currentFormat === "24");
  }

  // Initialize the time display
  function initTimeDisplay() {
    // Look for or create a time display element
    timeDisplayElement = document.getElementById("current-time-display");

    if (!timeDisplayElement) {
      // Create it if it doesn't exist
      timeDisplayElement = document.createElement("div");
      timeDisplayElement.id = "current-time-display";
      timeDisplayElement.className = "time-display";

      // Insert after time format selector
      const timeFormatContainer = document.querySelector(
        ".time-format-container"
      );
      if (timeFormatContainer) {
        timeFormatContainer.parentNode.insertBefore(
          timeDisplayElement,
          timeFormatContainer.nextSibling
        );
      } else {
        // Fallback - insert before theme selector
        const themeContainer = document.querySelector(".theme-container");
        if (themeContainer) {
          themeContainer.parentNode.insertBefore(
            timeDisplayElement,
            themeContainer
          );
        }
      }
    }

    // Update time immediately and set interval
    updateTimeDisplay();

    // Clear any existing interval
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval);
    }

    // Set new interval to update every second
    timeUpdateInterval = setInterval(updateTimeDisplay, 1000);
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
    // Get the format from data attribute or text
    const formatName =
      option.getAttribute("data-format") ||
      option.querySelector("h3").textContent.match(/(\d+)/)[1];

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

    // Initialize the slider
    const result = window.sliderButtons.init(".time-format-selector");

    if (!result) {
      console.error("Failed to initialize the time format slider");
      return false;
    }

    // Set the callback
    window.sliderButtons.onOptionSelected = handleOptionSelected;

    // Initialize the time display
    initTimeDisplay();

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
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval);
      timeUpdateInterval = null;
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
