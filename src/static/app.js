document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function renderActivities(activities) {
    activitiesList.innerHTML = "";
    const placeholder = activitySelect.querySelector('option[value=""]');
    activitySelect.replaceChildren();
    if (placeholder) {
      activitySelect.appendChild(placeholder);
    }

    Object.entries(activities).forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
      `;

      const participantsSection = document.createElement("div");
      participantsSection.className = "activity-participants";

      const participantsHeading = document.createElement("h5");
      participantsHeading.textContent = "Participants";
      participantsSection.appendChild(participantsHeading);

      if (details.participants.length > 0) {
        const participantsList = document.createElement("ul");
        details.participants.forEach((participant) => {
          const participantItem = document.createElement("li");

          const participantEmail = document.createElement("span");
          participantEmail.textContent = participant;
          participantItem.appendChild(participantEmail);

          const removeButton = document.createElement("button");
          removeButton.type = "button";
          removeButton.className = "participant-remove";
          removeButton.setAttribute("aria-label", `Unregister ${participant} from ${name}`);
          removeButton.dataset.activity = name;
          removeButton.dataset.email = participant;
          removeButton.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
            </svg>
          `;
          participantItem.appendChild(removeButton);

          participantsList.appendChild(participantItem);
        });
        participantsSection.appendChild(participantsList);
      } else {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "participants-empty";
        emptyMessage.textContent = "No participants yet";
        participantsSection.appendChild(emptyMessage);
      }

      activityCard.appendChild(participantsSection);
      activitiesList.appendChild(activityCard);

      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });
  }

  async function fetchActivities() {
    const response = await fetch("/activities");
    if (!response.ok) {
      throw new Error(`Failed to load activities: ${response.status}`);
    }
    renderActivities(await response.json());
  }

  activitiesList.addEventListener("click", async (event) => {
    const removeButton = event.target.closest(".participant-remove");
    if (!removeButton) {
      return;
    }

    removeButton.disabled = true;
    let unregistered = false;
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(removeButton.dataset.activity)}/participants?email=${encodeURIComponent(removeButton.dataset.email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || "Failed to unregister participant");
      }

      messageDiv.textContent = result.message;
      messageDiv.className = "success";
      unregistered = true;
    } catch (error) {
      messageDiv.textContent = error.message || "Failed to unregister participant. Please try again.";
      messageDiv.className = "error";
      removeButton.disabled = false;
      console.error("Error unregistering participant:", error);
    }

    if (unregistered) {
      try {
        await fetchActivities();
      } catch (error) {
        messageDiv.textContent += " The participant list could not be refreshed.";
        console.error("Error refreshing activities:", error);
      }
    }

    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    let response;
    let result;
    try {
      response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );
      result = await response.json();
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
      return;
    }

    if (response.ok) {
      messageDiv.textContent = result.message;
      messageDiv.className = "success";
      signupForm.reset();

      try {
        await fetchActivities();
      } catch (error) {
        messageDiv.textContent += " The participant list could not be refreshed.";
        console.error("Error refreshing activities:", error);
      }
    } else {
      messageDiv.textContent = result.detail || "An error occurred";
      messageDiv.className = "error";
    }

    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  });

  fetchActivities().catch((error) => {
    activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
    console.error("Error fetching activities:", error);
  });
});
