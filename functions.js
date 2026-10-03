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

// Load activities from LocalStorage and display them as timeline blocks
function loadActivities() {
    const activities = readActivities();
    const blocks = document.getElementById('blocks');
    blocks.innerHTML = '';

    const maxDuration = activities.reduce((max, activity) => Math.max(max, activity.duration), 0);

    activities.forEach(activity => {
        const width = maxDuration > 0 ? Math.round((activity.duration / maxDuration) * 100) : 0;

        const block = document.createElement('article');
        block.className = 'block';
        block.innerHTML = `
            <div class="blockHead">
                <span class="blockId">${String(activity.id).padStart(2, '0')}</span>
                <span class="blockName">${activity.name}</span>
                <span class="blockDuration">${activity.duration} MIN</span>
            </div>
            <div class="barTrack"><div class="barFill" style="width: ${width}%"></div></div>
            <button type="button" class="delete-btn" data-id="${activity.id}">ELIMINAR</button>
        `;
        blocks.appendChild(block);
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', deleteActivity);
    });

    document.getElementById('emptyState').hidden = activities.length > 0;
    updateStats(activities);
}

// Update the schedule metrics
function updateStats(activities) {
    const total = activities.reduce((sum, activity) => sum + activity.duration, 0);
    document.getElementById('statBlocks').textContent = String(activities.length).padStart(2, '0');
    document.getElementById('statMinutes').textContent = String(total).padStart(3, '0');
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
