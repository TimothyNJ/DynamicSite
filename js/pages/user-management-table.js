/**
 * user-management-table.js
 *
 * Initialises and manages the User Management table on the
 * users / org-roles-above-admin subpage.
 *
 * Extracted from standalone dynamictable56.html prototype.
 * Created: 13-Apr-2026
 */

// ── State ────────────────────────────────────────────────────────────────────
let isEditMode = false;
let userCounter = 1;
let resizeHandler = null;

// ── Sample Data ──────────────────────────────────────────────────────────────
const sampleUsers = [
  {
    id: userCounter++,
    name: 'John Smith',
    email: 'john.smith@example.com',
    endUser: true,
    adminUser: true,
    issueIdentifier: true,
    onboarding: false,
    ap: true,
    approver1: false,
    approver2: true,
    vendorMaster: false
  },
  {
    id: userCounter++,
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    endUser: true,
    adminUser: false,
    issueIdentifier: false,
    onboarding: false,
    ap: false,
    approver1: false,
    approver2: false,
    vendorMaster: false
  }
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function boolToString(value) {
  return value ? 'True' : 'False';
}

function createUserRow(user, isNewImport = false) {
  const row = document.createElement('tr');

  if (user.adminUser) row.classList.add('user-mgmt-has-admin');
  if (isNewImport) row.classList.add('user-mgmt-new-import');

  row.innerHTML = `
    <td data-label="Name"><p>${user.name}</p></td>
    <td data-label="Email"><p>${user.email}</p></td>
    <td data-label="End User">
      <div class="user-mgmt-field-container">
        <input type="text" class="user-mgmt-boolean-field" value="${boolToString(user.endUser)}" readonly
          data-field="endUser" data-user-id="${user.id}">
      </div>
    </td>
    <td data-label="Admin User">
      <div class="user-mgmt-field-container">
        <input type="text" class="user-mgmt-boolean-field" value="${boolToString(user.adminUser)}" readonly
          data-field="adminUser" data-user-id="${user.id}">
      </div>
    </td>
    <td data-label="Issue Identifier" class="user-mgmt-admin-column">
      <div class="user-mgmt-field-container">
        <input type="text" class="user-mgmt-boolean-field" value="${boolToString(user.issueIdentifier)}" readonly
          data-field="issueIdentifier" data-user-id="${user.id}">
      </div>
    </td>
    <td data-label="Onboarding" class="user-mgmt-admin-column">
      <div class="user-mgmt-field-container">
        <input type="text" class="user-mgmt-boolean-field" value="${boolToString(user.onboarding)}" readonly
          data-field="onboarding" data-user-id="${user.id}">
      </div>
    </td>
    <td data-label="AP" class="user-mgmt-admin-column">
      <div class="user-mgmt-field-container">
        <input type="text" class="user-mgmt-boolean-field" value="${boolToString(user.ap)}" readonly
          data-field="ap" data-user-id="${user.id}">
      </div>
    </td>
    <td data-label="Approver 1" class="user-mgmt-admin-column">
      <div class="user-mgmt-field-container">
        <input type="text" class="user-mgmt-boolean-field" value="${boolToString(user.approver1)}" readonly
          data-field="approver1" data-user-id="${user.id}">
      </div>
    </td>
    <td data-label="Approver 2" class="user-mgmt-admin-column">
      <div class="user-mgmt-field-container">
        <input type="text" class="user-mgmt-boolean-field" value="${boolToString(user.approver2)}" readonly
          data-field="approver2" data-user-id="${user.id}">
      </div>
    </td>
    <td data-label="Vendor Master" class="user-mgmt-admin-column">
      <div class="user-mgmt-field-container">
        <input type="text" class="user-mgmt-boolean-field" value="${boolToString(user.vendorMaster)}" readonly
          data-field="vendorMaster" data-user-id="${user.id}">
      </div>
    </td>
  `;

  return row;
}

// ── Rotated Header Adjustment ────────────────────────────────────────────────

function adjustRotatedHeaders() {
  const headers = document.querySelectorAll('.user-mgmt-rotated-header');

  headers.forEach((header) => {
    // Reset left to measure natural height
    header.style.left = '0.5em';

    const headerHeight = header.offsetHeight;
    const offsetAmount = headerHeight / 2;
    header.style.left = `calc(0.5em + ${offsetAmount}px)`;
  });
}

// ── Edit Mode ────────────────────────────────────────────────────────────────

function setEditMode(enabled, tableEl) {
  const inputs = tableEl.querySelectorAll('.user-mgmt-boolean-field');
  inputs.forEach((input) => {
    input.readOnly = !enabled;
  });

  // Toggle contentEditable on name/email cells
  const nameEmails = tableEl.querySelectorAll('td:nth-child(-n+2) p');
  nameEmails.forEach((p) => {
    p.contentEditable = enabled;
  });

  if (enabled) {
    inputs.forEach((input) => {
      input.addEventListener('focus', validateBooleanField);
      input.addEventListener('blur', validateBooleanField);
      input.addEventListener('input', validateBooleanField);
    });
  } else {
    inputs.forEach((input) => {
      input.removeEventListener('focus', validateBooleanField);
      input.removeEventListener('blur', validateBooleanField);
      input.removeEventListener('input', validateBooleanField);
    });
  }
}

function validateBooleanField(e) {
  const input = e.target;
  const value = input.value.trim();

  if (e.type === 'blur') {
    if (value !== 'True' && value !== 'False') {
      input.value = 'False';
    }

    if (input.dataset.field === 'adminUser') {
      const row = input.closest('tr');
      if (input.value === 'True') {
        row.classList.add('user-mgmt-has-admin');
      } else {
        row.classList.remove('user-mgmt-has-admin');
      }
    }
  }

  if (e.type === 'input') {
    if (!/^(|T|Tr|Tru|True|F|Fa|Fal|Fals|False)$/i.test(value)) {
      input.value = input.dataset.lastValue || '';
    } else {
      input.dataset.lastValue = input.value;
    }
  }
}

// ── Import Users ─────────────────────────────────────────────────────────────

function importUsers(users, tableEl) {
  const tbody = tableEl.querySelector('tbody');
  const existingEmails = Array.from(
    tbody.querySelectorAll('td:nth-child(2) p')
  ).map((p) => p.textContent.toLowerCase());

  users.forEach((user) => {
    if (existingEmails.includes(user.email.toLowerCase())) return;

    const row = createUserRow(user, true);
    tbody.insertBefore(row, tbody.firstChild);

    if (isEditMode) {
      const fields = row.querySelectorAll('.user-mgmt-boolean-field');
      fields.forEach((input) => {
        input.addEventListener('focus', validateBooleanField);
        input.addEventListener('blur', validateBooleanField);
        input.addEventListener('input', validateBooleanField);
      });
    }
  });
}

// ── Initialise Table ─────────────────────────────────────────────────────────

function populateTable(users, tableEl) {
  const tbody = tableEl.querySelector('tbody');
  tbody.innerHTML = '';

  users.forEach((user) => {
    tbody.appendChild(createUserRow(user));
  });

  adjustRotatedHeaders();
}

// ══════════════════════════════════════════════════════════════════════════════
// Public API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Initialise the User Management table.
 * Call after the org-roles-above-admin HTML has been injected into the DOM.
 */
export function initUserManagementTable() {
  console.log('[User Management Table] Initialising...');

  const tableEl = document.getElementById('user-mgmt-table');
  const searchInput = document.getElementById('user-mgmt-search');
  const viewToggle = document.getElementById('user-mgmt-view-toggle');
  const editToggle = document.getElementById('user-mgmt-edit-toggle');
  const addUserBtn = document.getElementById('user-mgmt-add-user-btn');
  const importUsersBtn = document.getElementById('user-mgmt-import-users-btn');

  if (!tableEl) {
    console.warn('[User Management Table] Table element not found');
    return;
  }

  // Reset state
  isEditMode = false;
  userCounter = 1;
  sampleUsers.forEach((u) => { u.id = userCounter++; });

  // Populate table
  populateTable(sampleUsers, tableEl);

  // ── Search ──
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      const searchTerm = this.value.toLowerCase();
      const rows = tableEl.querySelectorAll('tbody tr');

      rows.forEach((row) => {
        const name = row.querySelector('td:first-child p').textContent.toLowerCase();
        const email = row.querySelector('td:nth-child(2) p').textContent.toLowerCase();
        row.style.display = (name.includes(searchTerm) || email.includes(searchTerm)) ? '' : 'none';
      });
    });
  }

  // ── View / Edit Toggle ──
  if (viewToggle) {
    viewToggle.addEventListener('click', () => {
      if (isEditMode) {
        isEditMode = false;
        viewToggle.classList.add('active');
        editToggle.classList.remove('active');
        setEditMode(false, tableEl);
      }
    });
  }

  if (editToggle) {
    editToggle.addEventListener('click', () => {
      if (!isEditMode) {
        isEditMode = true;
        editToggle.classList.add('active');
        viewToggle.classList.remove('active');
        setEditMode(true, tableEl);
      }
    });
  }

  // ── Add User ──
  if (addUserBtn) {
    addUserBtn.addEventListener('click', () => {
      if (!isEditMode) {
        alert('Please switch to Edit Mode to add users.');
        return;
      }

      const newUser = {
        id: userCounter++,
        name: 'New User',
        email: 'email@example.com',
        endUser: true,
        adminUser: false,
        issueIdentifier: false,
        onboarding: false,
        ap: false,
        approver1: false,
        approver2: false,
        vendorMaster: false
      };

      const tbody = tableEl.querySelector('tbody');
      const row = createUserRow(newUser);
      tbody.insertBefore(row, tbody.firstChild);

      const newFields = row.querySelectorAll('.user-mgmt-boolean-field');
      newFields.forEach((input) => {
        input.addEventListener('focus', validateBooleanField);
        input.addEventListener('blur', validateBooleanField);
        input.addEventListener('input', validateBooleanField);
      });
    });
  }

  // ── Import Users ──
  if (importUsersBtn) {
    importUsersBtn.addEventListener('click', () => {
      if (!isEditMode) {
        alert('Please switch to Edit Mode to import users.');
        return;
      }

      const mockImportedUsers = [
        {
          id: userCounter++,
          name: 'Robert Johnson',
          email: 'robert@example.com',
          endUser: true,
          adminUser: true,
          issueIdentifier: true,
          onboarding: false,
          ap: true,
          approver1: true,
          approver2: false,
          vendorMaster: true
        },
        {
          id: userCounter++,
          name: 'Sarah Williams',
          email: 'sarah@example.com',
          endUser: true,
          adminUser: false,
          issueIdentifier: false,
          onboarding: false,
          ap: false,
          approver1: false,
          approver2: false,
          vendorMaster: false
        }
      ];

      importUsers(mockImportedUsers, tableEl);
      alert('Users imported successfully!');
    });
  }

  // ── Resize handler ──
  resizeHandler = () => adjustRotatedHeaders();
  window.addEventListener('resize', resizeHandler);

  // Initial header adjustment after render settles
  setTimeout(adjustRotatedHeaders, 50);

  console.log('[User Management Table] Initialisation complete');
}

/**
 * Clean up event listeners and state.
 * Called when navigating away from the subpage.
 */
export function cleanupUserManagementTable() {
  console.log('[User Management Table] Cleaning up...');

  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }

  isEditMode = false;
}
