/**
 * User Settings Configuration
 *
 * Central configuration for all user settings components
 * based on the User Settings Plan document.
 */
window.UserSettingsConfig = {
  // Personal Info section
  personalInfo: {
    firstName: {
      type: "alpha-numeric-input",
      id: "first-name",
      placeholder: "Enter first name",
      storageKey: "userFirstName",
      validation: {
        pattern: "^[A-Za-z\\-\\s']+$",
        message: "Please enter a valid name",
      },
    },
    lastName: {
      type: "alpha-numeric-input",
      id: "last-name",
      placeholder: "Enter last name",
      storageKey: "userLastName",
      validation: {
        pattern: "^[A-Za-z\\-\\s']+$",
        message: "Please enter a valid name",
      },
    },
    profilePicture: {
      type: "file-uploader",
      id: "profile-picture",
      storageKey: "userProfilePicture",
      accept: "image/*",
      maxSize: 5242880, // 5MB
    },
  },

  // Appearance & Language section
  appearance: {
    theme: {
      type: "slider-selector",
      name: "theme",
      selector: ".theme-selector",
      values: ["light", "system", "dark"],
      labels: ["Light", "System Theme", "Dark"],
      defaultValue: "dark",
      storageKey: "userThemePreference",
    },
    language: {
      type: "slider-selector",
      name: "language",
      selector: ".language-selector",
      values: ["en-gb", "en-us", "fr", "de", "es"],
      labels: ["UK English", "US English", "Français", "Deutsch", "Español"],
      defaultValue: "en-gb",
      storageKey: "userLanguagePreference",
    },
  },

  // Time & Date section
  timeDate: {
    timeZone: {
      type: "dropdown-select",
      name: "timeZone",
      selector: ".time-zone-selector",
      values: ["system", "utc", "gmt", "est", "cst", "pst", "ist", "jst"],
      labels: [
        "System time zone",
        "UTC",
        "GMT",
        "EST",
        "CST",
        "PST",
        "IST",
        "JST",
      ],
      defaultValue: "system",
      storageKey: "userTimeZonePreference",
      icon: "GlobeSpinner",
      searchable: true,
    },
    firstDayOfWeek: {
      type: "slider-selector",
      name: "firstDayOfWeek",
      selector: ".first-day-selector",
      values: ["monday", "sunday", "saturday"],
      labels: ["Monday", "Sunday", "Saturday"],
      defaultValue: "monday",
      storageKey: "userFirstDayPreference",
    },
    dateFormat: {
      type: "slider-selector",
      name: "dateFormat",
      selector: ".date-format-selector",
      values: ["dd-mmm-yyyy", "yyyymmdd"],
      labels: ["dd-MMM-yyyy", "yyyyMMdd"],
      defaultValue: "dd-mmm-yyyy",
      storageKey: "userDateFormatPreference",
    },
    timeFormat: {
      type: "slider-selector",
      name: "timeFormat",
      selector: ".time-format-selector",
      values: ["24", "12"],
      labels: ["24-hour", "12-hour"],
      defaultValue: "24",
      storageKey: "userTimeFormatPreference",
    },
    birthDate: {
      type: "date-picker",
      id: "birth-date",
      storageKey: "userBirthDate",
      format: "dd-mmm-yyyy",
    },
  },

  // Work Hours section
  workHours: {
    morning: {
      type: "time-range-picker",
      name: "morningHours",
      selector: ".morning-hours-picker",
      defaultValue: ["08:00", "12:00"],
      storageKey: "userMorningWorkHours",
    },
    afternoon: {
      type: "time-range-picker",
      name: "afternoonHours",
      selector: ".afternoon-hours-picker",
      defaultValue: ["13:00", "17:00"],
      storageKey: "userAfternoonWorkHours",
    },
  },

  // Units & Currency section
  unitsCurrency: {
    currency: {
      type: "dropdown-select",
      name: "currency",
      selector: ".currency-selector",
      values: ["system", "usd", "eur", "gbp", "jpy", "cny", "inr"],
      labels: [
        "System currency",
        "USD ($)",
        "EUR (€)",
        "GBP (£)",
        "JPY (¥)",
        "CNY (¥)",
        "INR (₹)",
      ],
      defaultValue: "system",
      storageKey: "userCurrencyPreference",
      searchable: true,
    },
    units: {
      type: "slider-selector",
      name: "units",
      selector: ".units-selector",
      values: ["metric", "imperial"],
      labels: ["Metric", "Imperial"],
      defaultValue: "metric",
      storageKey: "userUnitsPreference",
    },
  },

  // Contact Info section
  contactInfo: {
    email: {
      type: "alpha-numeric-input",
      id: "email",
      placeholder: "Enter email address",
      storageKey: "userEmail",
      validation: {
        pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
        message: "Please enter a valid email address",
      },
    },
    phone: {
      type: "alpha-numeric-input",
      id: "phone",
      placeholder: "Enter phone number",
      storageKey: "userPhone",
      validation: {
        pattern: "^[0-9+\\-\\s()]+$",
        message: "Please enter a valid phone number",
      },
    },
    sms: {
      type: "alpha-numeric-input",
      id: "sms",
      placeholder: "Enter SMS number",
      storageKey: "userSMS",
      validation: {
        pattern: "^[0-9+\\-\\s()]+$",
        message: "Please enter a valid SMS number",
      },
    },
  },

  // Notifications section
  notifications: {
    communicationPreferences: {
      type: "round-button-group",
      name: "communicationPreferences",
      selector: ".communication-preferences",
      options: ["email", "phone", "sms"],
      labels: ["Email", "Phone", "SMS"],
      defaultValues: ["email"],
      storageKey: "userCommunicationPreferences",
    },
  },
};
