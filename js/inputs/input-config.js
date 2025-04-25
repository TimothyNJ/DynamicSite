/**
 * Input Configuration
 *
 * Central configuration for all input fields used in the application.
 */
window.InputConfig = {
  firstName: {
    type: "text",
    name: "firstName",
    id: "first-name",
    placeholder: "Enter first name",
    storageKey: "userFirstName",
    required: false,
  },
  lastName: {
    type: "text",
    name: "lastName",
    id: "last-name",
    placeholder: "Enter last name",
    storageKey: "userLastName",
    required: false,
  },
  nickname: {
    type: "text",
    name: "nickname",
    id: "nickname",
    placeholder: "Enter nickname (optional)",
    storageKey: "userNickname",
    required: false,
  },
};
