/* styles/slider-buttons.css */
:root {
    /* Light theme page range */
    --light-page-start: #4b5b62;
    --light-page-end: #ffffff;
  
    /* Dark theme page range */
    --dark-page-start: #000000;
    --dark-page-end: #96b7c4;
  
    /* Light theme slider container range */
    --light-slider-start: #7c8e94; /* 34% of range between #4b5b62 and #ffffff */
    --light-slider-end: #a0b2b8; /* 68% of range between #4b5b62 and #ffffff */
  
    /* Dark theme slider container range */
    --dark-slider-start: #384c59; /* 34% of range between #000000 and #96b7c4 */
    --dark-slider-end: #6c7f8b; /* 68% of range between #000000 and #96b7c4 */
  
    /* Active button gradient colors */
    --active-button-start: #6a0dad; /* Purple */
    --active-button-end: #4169e1; /* Royal Blue */
  
    /* Store percentage values for JavaScript to read */
    --light-slider-start-percent: 34;
    --light-slider-end-percent: 68;
    --dark-slider-start-percent: 34;
    --dark-slider-end-percent: 68;
  }
  
  /* Override to prevent truncation in selectors */
  .theme-selector .option h3,
  .time-format-selector .option h3 {
    white-space: nowrap;
    overflow: visible;
    text-overflow: clip;
    max-width: none;
    font-size: clamp(0.5rem, 1.2vw, 2.3rem);
    margin: 0;
    font-weight: bold;
    position: relative;
    z-index: 3;
    transition: color 0.5s ease;
    padding: 2px 8px; /* Added padding to text instead of button */
  }
  
  /* Common styles for both selector types */
  .theme-selector,
  .time-format-selector {
    display: inline-flex;
    position: relative;
    height: auto;
    border-radius: 9999px;
    background: linear-gradient(
      -25deg,
      var(--light-slider-start) 0%,
      var(--light-slider-end) 100%
    ); /* Light theme slider container */
    overflow: visible; /* Allow natural content flow */
    padding: 0; /* Removed padding */
    gap: 4px; /* Kept the 4px gap as requested */
  }
  
  /* Container styles */
  .theme-container,
  .time-format-container {
    display: flex;
    justify-content: center;
    margin: 20px 0;
  }
  
  /* Dark theme slider container */
  body[data-theme="dark"] .theme-selector,
  body[data-theme="dark"] .time-format-selector {
    background: linear-gradient(
      -25deg,
      var(--dark-slider-start) 0%,
      var(--dark-slider-end) 100%
    );
  }
  
  /* Container border animation */
  .theme-selector .border-container,
  .time-format-selector .border-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
    /* Add clip-path to match the container's shape */
    clip-path: inset(0 0 0 0 round 9999px);
  }
  
  /* Border segments */
  .border-segment {
    position: absolute;
    background: linear-gradient(
      to right,
      var(--active-button-start),
      var(--active-button-end)
    );
    opacity: 1;
    transition: transform 0.8s cubic-bezier(0.1, 0.8, 0.2, 1);
  }
  
  /* Top and bottom segments only */
  .border-top,
  .border-bottom {
    height: 1px;
    width: 100px; /* Default width, will be set in JS */
  }
  
  .border-top {
    top: 0;
  }
  
  .border-bottom {
    bottom: 0;
  }
  
  .option {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    cursor: pointer;
    z-index: 1;
    transition: color 0.5s ease;
    padding: 0; /* Removed padding */
    border-radius: 9999px;
    overflow: visible; /* Allow natural content flow */
    width: 110px; /* Add fixed width to prevent expansion */
  }
  
  .selector-background {
    position: absolute;
    top: 0;
    bottom: 0;
    height: 100%;
    border-radius: 9999px;
    background: linear-gradient(
      145deg,
      var(--active-button-start),
      var(--active-button-end)
    );
    z-index: 0;
  }
  
  /* Settings container styles */
  .settings-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin: 20px 0;
    align-items: center;
    justify-content: center;
    opacity: 1; /* Set to 1 by default to avoid fade-in animation */
  }
  
  /* Make loading faster */
  .loading-indicator {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100px; /* Reduced height */
    width: 100%;
    font-size: 1.2rem;
    background-color: transparent;
    position: relative;
  }
  
  .loading-indicator::after {
    content: "";
    width: 30px;
    height: 30px;
    border: 3px solid rgba(100, 100, 100, 0.2);
    border-top-color: royalblue;
    border-radius: 50%;
    position: absolute;
    left: calc(50% - 15px);
    top: calc(50% + 15px);
    animation: spin 0.5s linear infinite; /* Faster animation */
  }
  
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }