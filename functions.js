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

function loadActivities() {
    const activities = readActivities();
    const blocks = document.getElementById('blocks');
    blocks.innerHTML = '';

    const maxDuration = activities.reduce((max, activity) => Math.max(max, activity.duration), 0);

    activities.forEach(activity => {
        const width = maxDuration > 0 ? Math.round((activity.duration / maxDuration) * 100) : 0;

        const block = document.createElement('article');
        block.className = 'block';
        block.dataset.id = activity.id;
        block.innerHTML = `
            <div class="blockHead">
                <span class="blockId">${String(activity.id).padStart(2, '0')}</span>
                <span class="blockName">${activity.name}</span>
                <span class="blockDuration">${activity.duration} MIN</span>
                <span class="blockLive" hidden></span>
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

function updateStats(activities) {
    const total = activities.reduce((sum, activity) => sum + activity.duration, 0);
    document.getElementById('statBlocks').textContent = String(activities.length).padStart(2, '0');
    document.getElementById('statMinutes').textContent = total > 0 ? formatearHora(total * 60) : '00:00';
}

function addActivity() {
    const name = document.getElementById('name').value.trim();
    const duration = parseInt(document.getElementById('duration').value, 10);

    if (!name || isNaN(duration) || duration <= 0) {
        setFormAviso('Designa el bloque y una duración mayor a 0.');
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
    resetTurno();

    document.getElementById('name').value = '';
    document.getElementById('duration').value = '';

    loadActivities();
}

function deleteActivity(event) {
    const activityId = parseInt(event.target.getAttribute('data-id'), 10);
    const activities = readActivities().filter(activity => activity.id !== activityId);

    saveActivities(activities);
    resetTurno();
    loadActivities();
}

document.getElementById('addActivity').addEventListener('click', addActivity);

loadActivities();

let turno = { enMarcha: false, terminado: false, indice: 0, restantes: [], ultimoTick: 0, timerId: null, aviso60: false };
let consignaId = null;
let consignaIdx = 0;

const CONSIGNAS = [
    'RITMO CONSTANTE. EL TURNO NO SE DETIENE.',
    'CERO TIEMPO MUERTO. SIGUE.',
    'LA PLANTA NO DUERME. MANTÉN EL PULSO.',
    'BLOQUE A BLOQUE SE GANA EL TURNO.',
    'PRESIÓN CONSTANTE, RESULTADO SEGURO.',
    'QUE EL RELOJ TRABAJE PARA TI.'
];

function formatearHora(segundos) {
    const total = Math.max(0, Math.ceil(segundos));
    const horas = Math.floor(total / 3600);
    const minutos = Math.floor((total % 3600) / 60);
    const segundosRestantes = total % 60;
    const pad = valor => String(valor).padStart(2, '0');
    return horas > 0 ? `${horas}:${pad(minutos)}:${pad(segundosRestantes)}` : `${pad(minutos)}:${pad(segundosRestantes)}`;
}

function totalRestante() {
    return turno.restantes.reduce((suma, resto) => suma + resto, 0);
}

function contextoAudio() {
    try {
        turno.ctx = turno.ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (turno.ctx.state === 'suspended') turno.ctx.resume();
        return turno.ctx;
    } catch (error) {
        return null;
    }
}

function beep(frecuencia, duracion, retraso) {
    const ctx = contextoAudio();
    if (!ctx) return;
    try {
        const inicio = ctx.currentTime + (retraso || 0);
        const oscilador = ctx.createOscillator();
        const ganancia = ctx.createGain();
        oscilador.type = 'square';
        oscilador.frequency.value = frecuencia;
        ganancia.gain.setValueAtTime(0.0001, inicio);
        ganancia.gain.exponentialRampToValueAtTime(0.25, inicio + 0.02);
        ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
        oscilador.connect(ganancia);
        ganancia.connect(ctx.destination);
        oscilador.start(inicio);
        oscilador.stop(inicio + duracion + 0.05);
    } catch (error) {}
}

function alertaBloque() {
    beep(880, 0.18, 0);
    beep(880, 0.18, 0.25);
    beep(1174, 0.3, 0.5);
}

function alertaFinal() {
    beep(1174, 0.25, 0);
    beep(1174, 0.25, 0.3);
    beep(1174, 0.25, 0.6);
    beep(1568, 0.5, 0.9);
}

function setConsigna(mensaje) {
    document.getElementById('consigna').textContent = mensaje;
}

function rotarConsigna() {
    setConsigna(CONSIGNAS[consignaIdx % CONSIGNAS.length]);
    consignaIdx++;
}

function flash() {
    const velo = document.getElementById('flash');
    if (!velo) return;
    velo.classList.add('show');
    setTimeout(() => velo.classList.remove('show'), 320);
}

function renderControles() {
    const hayBloques = readActivities().length > 0;
    document.getElementById('startBtn').disabled = turno.enMarcha || !hayBloques;
    document.getElementById('pauseBtn').disabled = !turno.enMarcha;
}

function detenerMotor() {
    if (turno.timerId) clearInterval(turno.timerId);
    if (consignaId) clearInterval(consignaId);
    turno.timerId = null;
    consignaId = null;
}

function resetTurno() {
    detenerMotor();
    turno.enMarcha = false;
    turno.terminado = false;
    turno.indice = 0;
    turno.restantes = [];
    turno.aviso60 = false;
    document.getElementById('statEstado').textContent = 'EN ESPERA';
    document.getElementById('statMinutesLabel').textContent = 'PLANIFICADO';
    renderControles();
}

function startTurno() {
    if (turno.enMarcha) return;
    const bloques = readActivities();
    if (bloques.length === 0) {
        setFormAviso('Registra al menos un bloque para arrancar.');
        return;
    }
    hideFormAviso();

    if (turno.terminado || turno.restantes.length === 0) {
        turno.restantes = bloques.map(bloque => bloque.duration * 60);
        turno.indice = 0;
        turno.terminado = false;
        turno.aviso60 = false;
        document.getElementById('statMinutesLabel').textContent = 'RESTANTE';
        setConsigna('OPERACIÓN EN CURSO. RITMO CONSTANTE.');
    } else {
        setConsigna('OPERACIÓN REANUDADA. SIN PAUSAS.');
    }

    turno.enMarcha = true;
    turno.ultimoTick = Date.now();
    turno.timerId = setInterval(tick, 250);
    rotarConsigna();
    consignaId = setInterval(rotarConsigna, 8000);
    document.getElementById('statEstado').textContent = 'EN CURSO';
    renderControles();
    renderTurno();
}

function pausarTurno() {
    if (!turno.enMarcha) return;
    turno.enMarcha = false;
    detenerMotor();
    document.getElementById('statEstado').textContent = 'EN PAUSA';
    setConsigna('TURNO EN PAUSA. EL TIEMPO NO PERDONA: REANUDA.');
    renderControles();
}

function reiniciarTurno() {
    resetTurno();
    loadActivities();
    setConsigna('TURNO EN ESPERA. REGISTRA BLOQUES Y ARRANCA LA OPERACIÓN.');
}

function tick() {
    if (!turno.enMarcha) return;
    const ahora = Date.now();
    const transcurrido = (ahora - turno.ultimoTick) / 1000;
    turno.ultimoTick = ahora;

    const bloques = readActivities();
    if (turno.indice >= bloques.length) {
        finalizarTurno();
        return;
    }

    turno.restantes[turno.indice] -= transcurrido;
    const restante = turno.restantes[turno.indice];

    if (restante <= 60 && !turno.aviso60) {
        turno.aviso60 = true;
        beep(660, 0.2, 0);
        setConsigna('VENTANA CRÍTICA: ÚLTIMO MINUTO DEL BLOQUE.');
    }

    if (restante <= 0) {
        completarBloque(bloques);
        return;
    }
    renderTurno();
}

function completarBloque(bloques) {
    const id = bloques[turno.indice].id;
    const elemento = document.querySelector(`#blocks article[data-id="${id}"]`);
    if (elemento) elemento.classList.add('is-done');
    alertaBloque();
    flash();

    turno.indice++;
    turno.aviso60 = false;

    if (turno.indice >= bloques.length) {
        finalizarTurno();
        return;
    }
    setConsigna(`BLOQUE COMPLETO. SIGUIENTE: ${bloques[turno.indice].name.toUpperCase()}.`);
    renderTurno();
}

function finalizarTurno() {
    turno.enMarcha = false;
    turno.terminado = true;
    turno.restantes = turno.restantes.map(() => 0);
    detenerMotor();
    document.querySelectorAll('#blocks article').forEach(article => {
        article.classList.remove('is-active', 'is-critical');
    });
    document.getElementById('statEstado').textContent = 'COMPLETO';
    document.getElementById('statMinutes').textContent = '0:00:00';
    setConsigna('TURNO COMPLETO. OPERACIÓN FINALIZADA. RITMO SOSTENIDO.');
    alertaFinal();
    flash();
    renderControles();
}

function renderTurno() {
    const bloques = readActivities();
    document.querySelectorAll('#blocks article').forEach(article => {
        article.classList.remove('is-active', 'is-critical');
    });

    bloques.forEach((bloque, i) => {
        if (i < turno.indice) return;
        const elemento = document.querySelector(`#blocks article[data-id="${bloque.id}"]`);
        if (!elemento) return;
        const enVivo = elemento.querySelector('.blockLive');
        const barra = elemento.querySelector('.barFill');
        if (i === turno.indice && turno.enMarcha) {
            const restante = Math.max(0, turno.restantes[i] ?? bloque.duration * 60);
            elemento.classList.add('is-active');
            if (enVivo) {
                enVivo.hidden = false;
                enVivo.textContent = `${formatearHora(restante)} RESTANTE`;
            }
            if (barra) barra.style.width = `${Math.max(0, (restante / (bloque.duration * 60)) * 100)}%`;
            if (restante <= 60) elemento.classList.add('is-critical');
        } else if (enVivo) {
            enVivo.hidden = true;
        }
    });

    document.getElementById('statMinutes').textContent = formatearHora(totalRestante());
}

document.getElementById('startBtn').addEventListener('click', startTurno);
document.getElementById('pauseBtn').addEventListener('click', pausarTurno);
document.getElementById('resetBtn').addEventListener('click', reiniciarTurno);
renderControles();
