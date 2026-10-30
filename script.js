
"use strict";

// 1. Get HTML elements
const assignmentForm = document.getElementById("assignmentForm");
const titleInput = document.getElementById("title");
const subjectInput = document.getElementById("subject");
const dueDateInput = document.getElementById("dueDate");
const priorityInput = document.getElementById("priority");
const notesInput = document.getElementById("notes");

const assignmentList = document.getElementById("assignmentList");
const emptyState = document.getElementById("emptyState");
const formMessage = document.getElementById("formMessage");
const formHeading = document.getElementById("formHeading");
const submitButton = document.getElementById("submitButton");
const cancelEditButton = document.getElementById("cancelEditButton");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const completedCount = document.getElementById("completedCount");
const overdueCount = document.getElementById("overdueCount");
const visibleCount = document.getElementById("visibleCount");
const todayLabel = document.getElementById("todayLabel");

// 2. Load saved assignments
const STORAGE_KEY = "assignmentDeadlineTracker_v1";
let assignments = [];
let editingId = null;

try {
  const savedData = localStorage.getItem(STORAGE_KEY);
  const parsedData = savedData ? JSON.parse(savedData) : [];

  if (Array.isArray(parsedData)) {
    assignments = parsedData.filter(item =>
      item &&
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      typeof item.subject === "string" &&
      typeof item.dueDate === "string" &&
      ["Low", "Medium", "High"].includes(item.priority) &&
      typeof item.completed === "boolean"
    );
  }
} catch (error) {
  console.error("Could not load saved assignments:", error);
}

// 3. Helper functions
function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  const parts = dateString.split("-");

  if (parts.length !== 3) {
    return dateString;
  }

  const date = new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  );

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function isOverdue(assignment) {
  return !assignment.completed &&
    assignment.dueDate < getToday();
}
// Calculate days remaining until deadline
function getDaysRemaining(dueDate) {
  const [year, month, day] = dueDate.split("-").map(Number);

  const [todayYear, todayMonth, todayDay] =
    getToday().split("-").map(Number);

  const due = Date.UTC(year, month - 1, day);
  const today = Date.UTC(
    todayYear,
    todayMonth - 1,
    todayDay
  );

  return Math.round((due - today) / 86400000);
}
function getStatus(assignment) {
  if (assignment.completed) {
    return "completed";
  }

  if (isOverdue(assignment)) {
    return "overdue";
  }

  return "pending";
}

function showMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("error", isError);
}

function clearMessage() {
  showMessage("");
}

function makeElement(tag, className, text = "") {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

// 4. Save data to browser storage
function saveAssignments() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(assignments)
    );

    return true;
  } catch (error) {
    console.error("Could not save assignments:", error);
    showMessage(
      "Could not save data. Check your browser storage settings.",
      true
    );
    return false;
  }
}

// 5. Update the dashboard numbers
function updateDashboard() {
  const total = assignments.length;
  const completed = assignments.filter(
    item => item.completed
  ).length;

  const overdue = assignments.filter(
    item => isOverdue(item)
  ).length;

  totalCount.textContent = total;
  pendingCount.textContent = total - completed - overdue;
  completedCount.textContent = completed;
  overdueCount.textContent = overdue;
}

// 6. Create an assignment card
function createAssignmentCard(assignment) {
  const status = getStatus(assignment);

  const card = makeElement(
    "article",
    `assignment-card${assignment.completed ? " is-completed" : ""}`
  );

  const main = makeElement("div", "assignment-main");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-check";
  checkbox.checked = assignment.completed;
  checkbox.setAttribute(
    "aria-label",
    `Mark ${assignment.title} as completed`
  );

  checkbox.addEventListener("change", () => {
    const previousValue = assignment.completed;
    assignment.completed = checkbox.checked;

    if (!saveAssignments()) {
      assignment.completed = previousValue;
      checkbox.checked = previousValue;
      return;
    }

    clearMessage();
    renderAssignments();
  });

  const content = makeElement("div", "task-content");

  const title = makeElement(
    "h3",
    "task-title",
    assignment.title
  );

  const subject = makeElement(
    "p",
    "task-subject",
    assignment.subject
  );

  content.append(title, subject);

  if (assignment.notes) {
    const notes = makeElement(
      "p",
      "task-notes",
      assignment.notes
    );
    content.appendChild(notes);
  }

  const meta = makeElement("div", "task-meta");

  const priority = makeElement(
    "span",
    `priority priority-${assignment.priority.toLowerCase()}`,
    `${assignment.priority} priority`
  );

  const statusLabels = {
    pending: "Pending",
    completed: "Completed",
    overdue: "Overdue"
  };

  const statusPill = makeElement(
    "span",
    `status-pill status-${status}`,
    statusLabels[status]
  );

  const dueLabel = makeElement(
    "span",
    "due-label",
    `Due: ${formatDate(assignment.dueDate)}`
  );
// Show deadline countdown
const daysLeft = getDaysRemaining(assignment.dueDate);

let countdownText = "";

if (assignment.completed) {
  countdownText = "Completed";
} else if (daysLeft < 0) {
  countdownText = `Overdue by ${Math.abs(daysLeft)} days`;
} else if (daysLeft === 0) {
  countdownText = "Due today";
} else if (daysLeft === 1) {
  countdownText = "1 day left";
} else {
  countdownText = `${daysLeft} days left`;
}

const countdown = makeElement(
  "span",
  "countdown-label",
  countdownText
);
  meta.append(priority, statusPill, dueLabel,countdown);
  content.appendChild(meta);
  main.append(checkbox, content);

  // Edit and delete buttons
  const actions = makeElement("div", "task-actions");

  const editButton = makeElement(
    "button",
    "action-btn",
    "Edit"
  );
  editButton.type = "button";
  editButton.addEventListener("click", () => {
    startEditing(assignment.id);
  });

  const deleteButton = makeElement(
    "button",
    "action-btn action-delete",
    "Delete"
  );
  deleteButton.type = "button";
  deleteButton.addEventListener("click", () => {
    deleteAssignment(assignment.id);
  });

  actions.append(editButton, deleteButton);
  card.append(main, actions);

  return card;
}

// 7. Display assignments and apply filters
function renderAssignments() {
  assignmentList.replaceChildren();

  const searchTerm = searchInput.value.trim().toLowerCase();
  const filterValue = statusFilter.value;

  const filteredAssignments = assignments
    .filter(assignment => {
      const matchesSearch =
        assignment.title.toLowerCase().includes(searchTerm) ||
        assignment.subject.toLowerCase().includes(searchTerm) ||
        (assignment.notes || "").toLowerCase().includes(searchTerm);

      const matchesStatus =
        filterValue === "all" ||
        getStatus(assignment) === filterValue;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return Number(a.completed) - Number(b.completed);
      }

      return a.dueDate.localeCompare(b.dueDate);
    });

  filteredAssignments.forEach(assignment => {
    assignmentList.appendChild(
      createAssignmentCard(assignment)
    );
  });

  emptyState.classList.toggle(
    "hidden",
    filteredAssignments.length > 0
  );

  if (assignments.length === 0) {
    emptyState.querySelector("h3").textContent =
      "No assignments yet";

    emptyState.querySelector("p").textContent =
      "Add your first assignment using the form.";
  } else if (filteredAssignments.length === 0) {
    emptyState.querySelector("h3").textContent =
      "No matching assignments";

    emptyState.querySelector("p").textContent =
      "Try another search or change the filter.";
  }

  visibleCount.textContent =
    `${filteredAssignments.length} ` +
    `${filteredAssignments.length === 1 ? "task" : "tasks"}`;

  updateDashboard();
}

// 8. Add a new assignment or save an edit
assignmentForm.addEventListener("submit", event => {
  event.preventDefault();
  clearMessage();

  const title = titleInput.value.trim();
  const subject = subjectInput.value.trim();
  const dueDate = dueDateInput.value;
  const priority = priorityInput.value;
  const notes = notesInput.value.trim();

  if (!title || !subject || !dueDate) {
    showMessage("Please complete all required fields.", true);
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    showMessage("Please choose a valid due date.", true);
    return;
  }

  if (Number.isNaN(Date.parse(dueDate))) {
    showMessage("Please choose a valid due date.", true);
    return;
  }

  if (!["Low", "Medium", "High"].includes(priority)) {
    showMessage("Please choose a valid priority.", true);
    return;
  }

  let updatedAssignments;

  if (editingId !== null) {
    updatedAssignments = assignments.map(item => {
      if (item.id !== editingId) {
        return item;
      }

      return {
        ...item,
        title,
        subject,
        dueDate,
        priority,
        notes
      };
    });
  } else {
    const newAssignment = {
      id: (crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`),
      title,
      subject,
      dueDate,
      priority,
      notes,
      completed: false,
      createdAt: new Date().toISOString()
    };

    updatedAssignments = [...assignments, newAssignment];
  }

  const previousAssignments = assignments;
  assignments = updatedAssignments;

  if (!saveAssignments()) {
    assignments = previousAssignments;
    return;
  }

  const wasEditing = editingId !== null;

  resetForm();
  renderAssignments();

  showMessage(
    wasEditing
      ? "Assignment updated successfully!"
      : "Assignment added successfully!"
  );
});

// 9. Edit an assignment
function startEditing(id) {
  const assignment = assignments.find(item => item.id === id);

  if (!assignment) {
    return;
  }

  editingId = id;
  titleInput.value = assignment.title;
  subjectInput.value = assignment.subject;
  dueDateInput.value = assignment.dueDate;
  priorityInput.value = assignment.priority;
  notesInput.value = assignment.notes || "";

  formHeading.textContent = "Edit assignment";
  submitButton.textContent = "Save changes";
  cancelEditButton.classList.remove("hidden");

  clearMessage();

  document.querySelector(".form-panel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  titleInput.focus();
}

// 10. Delete an assignment
function deleteAssignment(id) {
  const assignment = assignments.find(item => item.id === id);

  if (!assignment) {
    return;
  }

  const confirmed = window.confirm(
    `Delete "${assignment.title}"? This cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  const previousAssignments = assignments;
  assignments = assignments.filter(item => item.id !== id);

  if (!saveAssignments()) {
    assignments = previousAssignments;
    return;
  }

  if (editingId === id) {
    resetForm();
  }

  clearMessage();
  renderAssignments();
}

// 11. Reset the form
function resetForm() {
  assignmentForm.reset();
  editingId = null;

  formHeading.textContent = "Add an assignment";
  submitButton.textContent = "+ Add assignment";
  cancelEditButton.classList.add("hidden");

  clearMessage();
}

cancelEditButton.addEventListener("click", resetForm);

// 12. Search and filter
searchInput.addEventListener("input", renderAssignments);
statusFilter.addEventListener("change", renderAssignments);

// 13. Show today's date
todayLabel.textContent = new Date().toLocaleDateString("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric"
});

// 14. Start the application
renderAssignments();