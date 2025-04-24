// Modified preloadSliderResources function to include time format slider

function preloadSliderResources() {
  // Create a container for preloaded resources
  const preloadContainer = document.createElement("div");
  preloadContainer.style.display = "none";
  preloadContainer.id = "preloaded-resources";
  document.body.appendChild(preloadContainer);

  // Add slider stylesheet
  if (!document.getElementById("slider-buttons-style")) {
    const sliderStyle = document.createElement("link");
    sliderStyle.id = "slider-buttons-style";
    sliderStyle.rel = "stylesheet";
    sliderStyle.href = "styles/slider-buttons.css";
    document.head.appendChild(sliderStyle);

    sliderStyle.onload = () => {
      preloadedResources.sliderStylesheet = true;
      console.log("Slider stylesheet preloaded");
    };
  } else {
    preloadedResources.sliderStylesheet = true;
  }

  // Add time display stylesheet
  if (!document.getElementById("time-display-style")) {
    const timeStyle = document.createElement("link");
    timeStyle.id = "time-display-style";
    timeStyle.rel = "stylesheet";
    timeStyle.href = "styles/time-display.css";
    document.head.appendChild(timeStyle);

    timeStyle.onload = () => {
      preloadedResources.timeDisplayStylesheet = true;
      console.log("Time display stylesheet preloaded");
    };
  } else {
    preloadedResources.timeDisplayStylesheet = true;
  }

  // Preload slider scripts if they're not already loaded
  if (!window.sliderButtons) {
    // Create and load the main slider script (core functionality)
    const sliderScript = document.createElement("script");
    sliderScript.id = "slider-buttons-script";
    sliderScript.src = "js/settings/slider-buttons.js";

    sliderScript.onload = () => {
      preloadedResources.sliderScript = true;
      console.log("Core slider buttons script preloaded");

      // After main script loads, load the theme-specific script
      if (!document.getElementById("theme-slider-script")) {
        const themeScript = document.createElement("script");
        themeScript.id = "theme-slider-script";
        themeScript.src = "js/settings/theme-slider.js";

        themeScript.onload = () => {
          preloadedResources.themeSliderScript = true;
          console.log("Theme slider script preloaded");

          // After theme script loads, load the theme integration script
          if (!document.getElementById("theme-slider-integration-script")) {
            const integrationScript = document.createElement("script");
            integrationScript.id = "theme-slider-integration-script";
            integrationScript.src = "js/settings/theme-slider-integration.js";

            integrationScript.onload = () => {
              preloadedResources.themeSliderIntegration = true;
              console.log("Theme slider integration script preloaded");

              // Load time format slider scripts
              loadTimeFormatSliderScripts();
            };

            document.body.appendChild(integrationScript);
          } else {
            // Load time format slider scripts if integration script is already loaded
            loadTimeFormatSliderScripts();
          }
        };

        document.body.appendChild(themeScript);
      } else {
        // Load time format slider scripts if theme script is already loaded
        loadTimeFormatSliderScripts();
      }
    };

    document.body.appendChild(sliderScript);
  } else {
    // Scripts already loaded
    preloadedResources.sliderScript = true;

    // Check if theme scripts are loaded
    if (window.themeSlider) {
      preloadedResources.themeSliderScript = true;
    } else {
      // Load theme-specific script
      const themeScript = document.createElement("script");
      themeScript.id = "theme-slider-script";
      themeScript.src = "js/settings/theme-slider.js";

      themeScript.onload = () => {
        preloadedResources.themeSliderScript = true;
        console.log("Theme slider script preloaded");
      };

      document.body.appendChild(themeScript);
    }

    // Check if theme integration is loaded
    if (window.themeSliderIntegration) {
      preloadedResources.themeSliderIntegration = true;
    } else {
      // Load theme integration script
      const integrationScript = document.createElement("script");
      integrationScript.id = "theme-slider-integration-script";
      integrationScript.src = "js/settings/theme-slider-integration.js";

      integrationScript.onload = () => {
        preloadedResources.themeSliderIntegration = true;
        console.log("Theme slider integration script preloaded");
      };

      document.body.appendChild(integrationScript);
    }

    // Load time format slider scripts
    loadTimeFormatSliderScripts();
  }

  // Function to load time format slider scripts
  function loadTimeFormatSliderScripts() {
    // Check if time format slider is already loaded
    if (window.timeFormatSlider) {
      preloadedResources.timeFormatSliderScript = true;
    } else {
      // Load time format slider script
      const timeFormatScript = document.createElement("script");
      timeFormatScript.id = "time-format-slider-script";
      timeFormatScript.src = "js/settings/time-format-slider.js";

      timeFormatScript.onload = () => {
        preloadedResources.timeFormatSliderScript = true;
        console.log("Time format slider script preloaded");
      };

      document.body.appendChild(timeFormatScript);
    }

    // Check if time format integration is loaded
    if (window.timeFormatSliderIntegration) {
      preloadedResources.timeFormatSliderIntegration = true;
    } else {
      // Load time format integration script
      const timeFormatIntegrationScript = document.createElement("script");
      timeFormatIntegrationScript.id = "time-format-slider-integration-script";
      timeFormatIntegrationScript.src =
        "js/settings/time-format-slider-integration.js";

      timeFormatIntegrationScript.onload = () => {
        preloadedResources.timeFormatSliderIntegration = true;
        console.log("Time format slider integration script preloaded");
      };

      document.body.appendChild(timeFormatIntegrationScript);
    }
  }
}

// Also update the preloadedResources object at the top of the file:
const preloadedResources = {
  sliderStylesheet: false,
  timeDisplayStylesheet: false,
  sliderScript: false,
  themeSliderScript: false,
  themeSliderIntegration: false,
  timeFormatSliderScript: false,
  timeFormatSliderIntegration: false,
};

// And update the areSliderResourcesLoaded function:
function areSliderResourcesLoaded() {
  return (
    preloadedResources.sliderStylesheet &&
    preloadedResources.sliderScript &&
    preloadedResources.themeSliderScript &&
    preloadedResources.themeSliderIntegration &&
    preloadedResources.timeDisplayStylesheet &&
    preloadedResources.timeFormatSliderScript &&
    preloadedResources.timeFormatSliderIntegration
  );
}
