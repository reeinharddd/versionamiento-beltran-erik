const STORAGE_KEY = 'nightShiftActivities';

function readActivities() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveActivities(activities) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
}

function setFormAviso(mensaje) {
    const aviso = document.getElementById('formAviso');
    aviso.textContent = mensaje;
    aviso.hidden = false;
}

function hideFormAviso() {
    document.getElementById('formAviso').hidden = true;
}

// Load activities from LocalStorage and display them in the table
function loadActivities() {
    const activities = readActivities();
    const tableBody = document.querySelector('#activitiesTable tbody');
    tableBody.innerHTML = '';

    activities.forEach(activity => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${activity.id}</td>
            <td>${activity.name}</td>
            <td>${activity.duration} min</td>
            <td><button class="delete-btn" data-id="${activity.id}">Eliminar</button></td>
        `;
        tableBody.appendChild(row);
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', deleteActivity);
    });
}

// Add a new activity to the night shift
function addActivity() {
    const name = document.getElementById('name').value.trim();
    const duration = parseInt(document.getElementById('duration').value, 10);

    if (!name || isNaN(duration) || duration <= 0) {
        setFormAviso('Escribe una actividad y una duración mayor a 0.');
        return;
    }
    hideFormAviso();

    const activities = readActivities();
    const newActivity = {
        id: activities.length > 0 ? activities[activities.length - 1].id + 1 : 1,
        name: name,
        duration: duration
    };

    activities.push(newActivity);
    saveActivities(activities);

    document.getElementById('name').value = '';
    document.getElementById('duration').value = '';

    loadActivities();
}

// Delete an activity by id
function deleteActivity(event) {
    const activityId = parseInt(event.target.getAttribute('data-id'), 10);
    const activities = readActivities().filter(activity => activity.id !== activityId);

    saveActivities(activities);
    loadActivities();
}

document.getElementById('addActivity').addEventListener('click', addActivity);

loadActivities();
