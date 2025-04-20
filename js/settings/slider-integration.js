// js/settings/slider-integration.js
// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // This function will be called both on initial site load and when the settings page is loaded
  initSliders();
});

// Also listen for the page loaded event to initialize when settings page is loaded
document.addEventListener("pageLoaded", function (event) {
  if (event.detail.pageName === "settings") {
    // Short delay to ensure DOM elements are available
    setTimeout(initSliders, 100);
  }
});

function initSliders() {
  // Check if we're on the settings page by looking for the slider containers
  const themeSliderElement = document.getElementById("theme-selector");
  const timeFormatSliderElement = document.getElementById(
    "time-format-selector"
  );

  // Initialize sliders if they exist
  if (themeSliderElement) {
    initializeThemeSlider();
  }

  if (timeFormatSliderElement) {
    initializeTimeFormatSlider();
  }
}

function initializeThemeSlider() {
  // Check if we're on the settings page by looking for the slider container
  const themeSliderElement = document.getElementById("theme-selector");
  if (!themeSliderElement) return;

  // Check if sliderButtons is defined in the global scope
  if (
    typeof window.sliderButtons === "undefined" ||
    typeof window.sliderButtons.initThemeSlider !== "function"
  ) {
    console.warn("Slider buttons not available yet");
    return;
  }

  // Initialize the theme slider
  window.sliderButtons.initThemeSlider();

  // Add event listener for theme changes
  themeSliderElement.addEventListener("sliderChange", function (event) {
    // Handle specific theme change logic if needed
    const themeName = event.detail.value;
    console.log("Theme changed to:", themeName);

    // Additional theme-specific handling can be added here
  });
}

function initializeTimeFormatSlider() {
  // Check if we're on the settings page by looking for the slider container
  const timeFormatSliderElement = document.getElementById(
    "time-format-selector"
  );
  if (!timeFormatSliderElement) return;

  // Check if sliderButtons is defined in the global scope
  if (
    typeof window.sliderButtons === "undefined" ||
    typeof window.sliderButtons.initTimeFormatSlider !== "function"
  ) {
    console.warn("Slider buttons not available yet");
    return;
  }

  // Initialize the time format slider
  window.sliderButtons.initTimeFormatSlider();

  // Add event listener for time format changes
  timeFormatSliderElement.addEventListener("sliderChange", function (event) {
    // Handle time format change logic
    const timeFormat = event.detail.value;
    console.log("Time format changed to:", timeFormat);

    // Set the time format in localStorage for the entire site
    localStorage.setItem("timeFormat", timeFormat);
  });

  // Apply the current time format setting to any time displays
  applyTimeFormat();
}

// Apply time format to any time displays on the page
function applyTimeFormat() {
  // Get the current time format setting
  const timeFormat = localStorage.getItem("timeFormat") || "24h";

  // Apply time format to any time elements
  // This is just a placeholder - you would need to implement specific logic
  // based on how time is displayed on your site
  console.log("Applying time format:", timeFormat);

  // Example: Update all elements with the class "time-display"
  document.querySelectorAll(".time-display").forEach((element) => {
    // Logic to format the time based on the selected format
    // This is just an example, replace with your actual implementation
    const time = element.getAttribute("data-time");
    if (time) {
      try {
        const date = new Date(time);
        if (timeFormat === "12h") {
          element.textContent = date.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        } else {
          element.textContent = date.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        }
      } catch (e) {
        console.error("Failed to format time:", e);
      }
    }
  });
}
