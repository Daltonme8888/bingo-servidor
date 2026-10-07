let bolasValidas = []; 
let bingoCantado = false;
let modoJuegoActual = "quina"; 

const sonidoBola = new Audio('bola.mp3');
const sonidoMarca = new Audio('marca.mp3');
const sonidoBingo = new Audio('bingo.mp3');

const urlParams = new URLSearchParams(window.location.search);
const miToken = urlParams.get('token');

window.ingresarConCodigo = function() {
    const codigoIngresado = document.getElementById('codigo-manual').value.trim().toUpperCase();
    if(codigoIngresado !== "") {
        window.location.href = window.location.pathname + "?token=" + codigoIngresado;
    } else {
        Swal.fire({
            title: '¡Falta el código!',
            text: 'Por favor, ingresa tu código manual para entrar.',
            icon: 'warning',
            confirmButtonColor: '#e74c3c'
        });
    }
};

function verificarVictoria() {
    const casillas = document.querySelectorAll('.casilla');
    const matriz = [];
    let indice = 0;
    let marcadasReales = 0;

    for(let i=0; i<5; i++){
        matriz.push([]);
        for(let j=0; j<5; j++){
            let esMarcada = casillas[indice].classList.contains('marcada');
            let esLibre = casillas[indice].classList.contains('libre');
            
            matriz[i].push(esMarcada);
            
            if (esMarcada && !esLibre) {
                marcadasReales++;
            }
            indice++;
        }
    }

    if (modoJuegoActual === "tabla_completa") return marcadasReales === 24;
    if (modoJuegoActual === "quina_loca") return marcadasReales >= 5;

    let lineasPosibles = [];
    for(let i=0; i<5; i++) lineasPosibles.push([matriz[i][0], matriz[i][1], matriz[i][2], matriz[i][3], matriz[i][4]]);
    for(let j=0; j<5; j++) lineasPosibles.push([matriz[0][j], matriz[1][j], matriz[2][j], matriz[3][j], matriz[4][j]]);
    lineasPosibles.push([matriz[0][0], matriz[1][1], matriz[2][2], matriz[3][3], matriz[4][4]]);
    lineasPosibles.push([matriz[0][4], matriz[1][3], matriz[2][2], matriz[3][1], matriz[4][0]]);

    for (let linea of lineasPosibles) {
        if (linea.every(celda => celda === true)) return true;
    }
    return false;
}

function lanzarConfeti() {
    const duracion = 5 * 1000;
    const fin = Date.now() + duracion;
    (function frame() {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
        if (Date.now() < fin) { requestAnimationFrame(frame); }
    }());
}

async function pedirCartonAPython() {
    if (!miToken) {
        document.body.innerHTML = `
            <div style="text-align: center; margin-top: 50px; font-family: Arial;">
                <h1 style="color: #2c3e50;">¡Bienvenido al Bingo!</h1>
                <p style="color: #7f8c8d; margin-bottom: 30px;">Escanea el código QR con tu cámara o ingresa tu pase único.</p>
                <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); display: inline-block; max-width: 350px;">
                    <button id="btn-camara" style="background: #8e44ad; color: white; border: none; padding: 12px 25px; font-size: 16px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%; margin-bottom: 15px;">📷 Escanear Código QR</button>
                    <div id="lector-qr" style="width: 100%; display: none; margin-bottom: 15px;"></div>
                    <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;">
                    <h3 style="color: #34495e; margin-top:0;">O Ingresar Código Manual</h3>
                    <input type="text" id="codigo-manual" placeholder="Ej: X7B9A2" style="padding: 10px; font-size: 20px; border: 2px solid #bdc3c7; border-radius: 5px; text-transform: uppercase; width: 100%; box-sizing: border-box; text-align: center; font-weight: bold; margin-bottom: 15px;">
                    <button onclick="ingresarConCodigo()" style="background: #27ae60; color: white; border: none; padding: 12px 25px; font-size: 16px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%;">Entrar al Juego</button>
                </div>
            </div>
        `;

        setTimeout(() => {
            document.getElementById('codigo-manual').addEventListener('keypress', function(event) {
                if (event.key === 'Enter') ingresarConCodigo();
            });

            document.getElementById('btn-camara').onclick = function() {
                const btn = document.getElementById('btn-camara');
                const lector = document.getElementById('lector-qr');
                btn.style.display = 'none';
                lector.style.display = 'block';

                const html5QrCode = new Html5Qrcode("lector-qr");
                html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (codigoEscaneado) => {
                        html5QrCode.stop();
                        window.location.href = codigoEscaneado;
                    },
                    (error) => {}
                ).catch((err) => {
                    Swal.fire('Cámara bloqueada', 'No se pudo iniciar la cámara. Asegúrate de dar permisos en tu navegador.', 'error');
                    btn.style.display = 'block';
                    lector.style.display = 'none';
                });
            };
        }, 200);
        return;
    }

    try {
        const respuesta = await fetch(`https://bingo-servidor-djow.onrender.com/carton/${miToken}`);
        
        if (!respuesta.ok) {
            document.body.innerHTML = `
                <div style="text-align: center; margin-top: 50px; font-family: Arial;">
                    <h1 style="color: #e74c3c;">⛔ CÓDIGO INCORRECTO ⛔</h1>
                    <p>El pase <b>${miToken}</b> no existe o ya caducó.</p>
                    <button onclick="window.location.href=window.location.pathname" style="background: #3498db; color: white; border: none; padding: 10px 20px; font-size: 16px; border-radius: 5px; cursor: pointer; margin-top: 20px;">Volver a intentar</button>
                </div>
            `;
            return;
        }

        const datos = await respuesta.json();
        const tablero = document.getElementById('tablero');
        const columnas = ['B', 'I', 'N', 'G', 'O'];

        let marcadasMemoria = JSON.parse(localStorage.getItem(`bingo_marcas_${miToken}`)) || [];

        for (let fila = 0; fila < 5; fila++) {
            for (let letra of columnas) {
                const valor = datos.carton[letra][fila];
                const div = document.createElement('div');
                div.className = 'casilla';
                div.dataset.bola = letra + valor; 
                
                if (valor === 'LIBRE') {
                    div.classList.add('libre', 'marcada');
                } else if (marcadasMemoria.includes(div.dataset.bola)) {
                    div.classList.add('marcada');
                }
                div.textContent = valor;

                div.onclick = async function() {
                    if (valor === 'LIBRE' || bingoCantado) return;
                    
                    if (bolasValidas.includes(div.dataset.bola)) {
                        if (!div.classList.contains('marcada')) { 
                            div.classList.add('marcada');
                            
                            marcadasMemoria.push(div.dataset.bola);
                            localStorage.setItem(`bingo_marcas_${miToken}`, JSON.stringify(marcadasMemoria));
                            
                            sonidoMarca.currentTime = 0; 
                            sonidoMarca.play(); 

                            if (verificarVictoria()) {
                                bingoCantado = true;
                                await fetch('https://bingo-servidor-djow.onrender.com/cantar-bingo');
                            }
                        }
                    } else {
                        Swal.fire({
                            title: '¡Uy!',
                            text: 'Esa bola aún no ha salido de la tómbola.',
                            icon: 'info',
                            confirmButtonColor: '#3498db',
                            timer: 2000
                        });
                    }
                };
                tablero.appendChild(div);
            }
        }
    } catch (error) { console.error(error); }
}

function agregarBolaVisual(bola) {
    const historial = document.querySelector('.historial');
    document.querySelectorAll('.bola-historial').forEach(el => el.classList.remove('ultima-bola'));
    const nuevaBola = document.createElement('div');
    nuevaBola.className = 'bola-historial ultima-bola';
    nuevaBola.textContent = bola;
    historial.appendChild(nuevaBola);
    if (historial.children.length > 8) historial.removeChild(historial.firstChild);
}

pedirCartonAPython();

if (miToken) {
    const socket = new WebSocket('wss://bingo-servidor-djow.onrender.com/ws');

    socket.onmessage = function(event) {
        const datos = JSON.parse(event.data);
        
        if (datos.tipo === "nueva_bola") {
            bolasValidas.push(datos.bola);
            agregarBolaVisual(datos.bola);
            sonidoBola.currentTime = 0;
            sonidoBola.play();
            
        } else if (datos.tipo === "historial") {
            bolasValidas = datos.bolas;
            modoJuegoActual = datos.modo || "quina"; 
            document.querySelector('.historial').innerHTML = '';
            datos.bolas.slice(-8).forEach(agregarBolaVisual);
            
        } else if (datos.tipo === "cambio_modo") {
            modoJuegoActual = datos.modo;
            let nombreModo = modoJuegoActual.replace('_', ' ').toUpperCase();
            
            Swal.fire({
                title: 'Cambio de Reglas',
                text: 'El administrador cambió el modo de juego a: ' + nombreModo,
                icon: 'warning',
                confirmButtonColor: '#f39c12'
            });

        } else if (datos.tipo === "deshacer_bola") {
            bolasValidas = bolasValidas.filter(b => b !== datos.bola); 
            document.querySelectorAll('.bola-historial').forEach(el => {
                if (el.textContent === datos.bola) el.remove();
            });
            const casilla = document.querySelector(`.casilla[data-bola="${datos.bola}"]`);
            if (casilla && !casilla.classList.contains('libre')) {
                casilla.classList.remove('marcada');
                
                let marcadasMemoria = JSON.parse(localStorage.getItem(`bingo_marcas_${miToken}`)) || [];
                marcadasMemoria = marcadasMemoria.filter(b => b !== datos.bola);
                localStorage.setItem(`bingo_marcas_${miToken}`, JSON.stringify(marcadasMemoria));
            }
            
            const bolitasRestantes = document.querySelectorAll('.bola-historial');
            if(bolitasRestantes.length > 0) bolitasRestantes[bolitasRestantes.length - 1].classList.add('ultima-bola');
            
        } else if (datos.tipo === "expulsar") {
            localStorage.removeItem(`bingo_marcas_${miToken}`);
            socket.close(); 
            document.body.innerHTML = `
                <div style="text-align: center; margin-top: 50px; font-family: Arial; padding: 20px;">
                    <h1 style="color: #e74c3c;">⛔ EVENTO FINALIZADO ⛔</h1>
                    <p style="font-size: 1.2em; color: #34495e;">El administrador ha cerrado los accesos y tu pase ha sido revocado.</p>
                    <button onclick="window.location.href=window.location.pathname" style="background: #3498db; color: white; border: none; padding: 12px 25px; font-size: 16px; border-radius: 5px; cursor: pointer; margin-top: 20px; font-weight: bold;">Volver al Inicio</button>
                </div>
            `;
            
        } else if (datos.tipo === "reset") {
            bolasValidas = [];
            bingoCantado = false;
            document.querySelector('.historial').innerHTML = ''; 
            localStorage.removeItem(`bingo_marcas_${miToken}`);
            
            document.querySelectorAll('.casilla').forEach(casilla => {
                if (!casilla.classList.contains('libre')) casilla.classList.remove('marcada');
            });
            
            Swal.fire({
                title: 'Nueva Partida',
                text: 'El administrador ha iniciado un nuevo juego. ¡Tus cartones han sido limpiados!',
                icon: 'success',
                confirmButtonColor: '#27ae60'
            });
            
        } else if (datos.tipo === "bingo") {
            bingoCantado = true;
            sonidoBingo.play();
            lanzarConfeti();
            setTimeout(() => {
                Swal.fire({
                    title: '🎉 ¡BINGO! 🎉',
                    text: 'Alguien ha llenado su cartón y ganó el juego.',
                    icon: 'success',
                    confirmButtonText: '¡Genial!',
                    confirmButtonColor: '#8e44ad',
                    backdrop: `rgba(0,0,123,0.4)`
                });
            }, 1000);
        }
    };
}