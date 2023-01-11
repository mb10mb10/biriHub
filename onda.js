var width = window.innerWidth, height = window.innerHeight

var gui = {
	alfa: 90, // direzione d'arrivo rispetto al Nord, deg
	A: 0.5,	// m
	T: 5, 	// sec
	L: 20,  // lunghezza d'onda, m
	phi: 0,	// deg
	tet: 0,	// deg
	psi: 0,	// deg
	quota: 0, // m
	X0: 0, 	// m
	Y0: 0, 	// m
	psi0: 30 // deg
}

var ctrlPanel = new dat.GUI()

var folder1 = ctrlPanel.addFolder('COMANDI')
folder1.add(gui, 'alfa', -180, 180).name('direz Onda (°)').step(1)
folder1.add(gui, 'A', 0, 5).name('ampiezza (m)').step(0.1)
folder1.add(gui, 'T', 2, 15).name('periodo (s)').step(1)
folder1.add(gui, 'L', 1, 20).name('lambda (m)').step(1)
folder1.add(gui, 'psi0', -180, 180).name('orient body (°)').step(1)
folder1.open()

var folder2 = ctrlPanel.addFolder('DEBUG VARS')
folder2.add(gui, 'phi').name('phi (°)').step(1).listen().listen()
folder2.add(gui, 'tet').name('tet (°)').step(1).listen().listen()
folder2.add(gui, 'psi').name('psi (°)').step(1).listen().listen()
folder2.add(gui, 'quota').name('quota (m)').step(0.1).listen()
// folder2.add(gui, 'tempo').name('tempo (s)').step(0.1).listen()
folder2.open()

// Create a renderer and add it to the DOM.
var renderer = new THREE.WebGLRenderer()
renderer.setSize(width, height)
document.body.appendChild(renderer.domElement)

// Crea la scena
var scene = new THREE.Scene()

// griglia  
var gridSize = 20
var gridDivisions = 20
var gridHelperXZ = new THREE.GridHelper(gridSize, gridDivisions)
scene.add(gridHelperXZ)

// Create a camera
var camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000)
camera.position.set(5, 5, 10)
scene.add(camera)

// Create a light
var light = new THREE.PointLight(0xffffff)
light.position.set(-100, 200, 100)
scene.add(light)

// Add OrbitControls so that we can pan around with the mouse.
var orbitControls = new THREE.OrbitControls(camera, renderer.domElement)

/* Aggiunge Oggetti */

// Assi Nord (x), Est (z), Up (y)
var axes = new THREE.AxesHelper(50)
scene.add(axes)

// Assi Corpo
var axesBody = new THREE.AxesHelper(2, 2, 2)
axesBody.rotation.x = Math.PI/2 // z verso il basso, y verso dx
scene.add(axesBody)

// Freccia
var dir = new THREE.Vector3(-Math.cos(radians(gui.alfa)), 0, -Math.sin(radians(gui.alfa)))
// dir.normalize(); è già normalizzata
const origin = new THREE.Vector3(0, 0.1, 0)
const length = 3
const arrow = new THREE.ArrowHelper(dir, origin, length, 'white')
arrow.position.x = 7*Math.cos(radians(gui.alfa))
arrow.position.z = 7*Math.sin(radians(gui.alfa))
scene.add(arrow)

// Parallelepipedo
var material = new THREE.MeshNormalMaterial()
var boxGeom = new THREE.BoxGeometry(3, 0.4, 1)
var body = new THREE.Mesh(boxGeom, material)
scene.add(body)
body.add(axesBody)
//body.rotation.y = -radians(30)

window.addEventListener('resize', resize) // resize definita in fondo

var clk = new THREE.Clock(); // orologio di sistema

var tracciaOnda = buildOnda(100, gui.A, gui.L, gui.T, 0, 'gold')
scene.add(tracciaOnda)

animate()

// ANIMAZIONE GRAFICA
function animate() {

	var time = clk.getElapsedTime()
	renderer.render(scene, camera)
	orbitControls.update()
	var KK = 2.*Math.PI*gui.A/gui.L    	// ampiezza della derivata spaziale dell'onda
	
	// Coseni direttori del vettore intorno al quale ruota l'oggetto per effetto dell'onda RISP AD ASSI CORPO:
	var [Ex, Ey, Ez] = [-Math.sin(radians(gui.alfa-gui.psi0)), Math.cos(radians(gui.alfa-gui.psi0)), 0]
	var dist = Ex*gui.X0 - Ey*gui.Y0    // distanza dall'origine del fronte d'onda passante per la nave (metri)
	var arg = 2.*Math.PI*(time/gui.T + dist/gui.L)
	var onda = -gui.A*Math.cos(arg) // Onda(t, x) = -A*cos[2*pi*(t/T + x/L)]
	var beta = Math.atan(KK*Math.sin(arg)) // angolo di inclinazione dell'onda: tan(beta) = dOnda/dx = pendenza dell'onda

	var [phi, tet, psi] = angVec2eul(beta, Ex, Ey, Ez) // risp a sistema di rif ruotato di psi0 in azimuth
		
	// orienta e posiziona l'oggetto
	var eulero = new THREE.Euler()
	eulero.set(phi, riduciPI(-psi-radians(gui.psi0)), tet, 'YZX') // risp a sistema di rif globale (NED)
	body.setRotationFromEuler(eulero)
	
	// si assume fattore di scala: 1 unità = 1 m
	body.position.x = gui.X0
	body.position.y = onda
	body.position.z = gui.Y0
	
    arrow.setDirection(new THREE.Vector3(-Math.cos(radians(gui.alfa)), 0, -Math.sin(radians(gui.alfa))))
	arrow.position.x = 5*Math.cos(radians(gui.alfa))
	arrow.position.z = 5*Math.sin(radians(gui.alfa))

    scene.remove(tracciaOnda)
    tracciaOnda = buildOnda(100, gui.A, gui.L, gui.T, time, 'cyan')
	tracciaOnda.rotateY(radians(-gui.alfa))
	scene.add(tracciaOnda)
	
	// Aggiorna pannello di controllo
	gui.phi = degrees(eulero.x)
	gui.tet = degrees(eulero.z)
	gui.psi = degrees(-eulero.y)
	gui.quota = onda
	
	requestAnimationFrame(animate)
}

function resize() {
	var w = window.innerWidth
	var h = window.innerHeight

	renderer.setSize(w, h)
	camera.aspect = w / h
	camera.updateProjectionMatrix()
}

function angVec2eul(angle, Ex, Ey, Ez){
	// angolo/vettore => quaternioni
	var e0 = Math.cos(angle/2.)
	var Sangle = Math.sin(angle/2.)
	var modVec = Math.sqrt(Ex*Ex + Ey*Ey + Ez*Ez)
	var [Ex, Ey, Ez] = [Ex/modVec, Ey/modVec, Ez/modVec] // normalizzazione
	var [ex, ey, ez] = [Ex*Sangle, Ey*Sangle, Ez*Sangle]
	// quaternioni => angoli eulero
	var fi = Math.atan2(2.*(e0*ex+ey*ez), (e0*e0+ez*ez-ex*ex-ey*ey))
	var tet = Math.asin(2.*(e0*ey-ex*ez))
	var psi = Math.atan2(2.*(e0*ez+ex*ey), (e0*e0+ex*ex-ey*ey-ez*ez))
	return [fi, tet, psi] // radianti
}

function buildOnda(nPunti, Amp, lambda, periodo, tempo, colore) {
    // crea un'onda sinusoidale lungo l'asse x, di nPunti e parametri A, T, L:
	// fotografata all'istante t: Onda(t, x) = -A*cos[2*pi*(t/T + x/L)]
    var material = new THREE.LineBasicMaterial({color: colore})
    var punti = []
    for (i = 0; i < nPunti; i++) {
        punti.push(new THREE.Vector3(10 - 20*i/nPunti, -Amp*Math.cos(2*Math.PI*(tempo/periodo + (10 - 20*i/nPunti)/lambda)), 0))
    }
    var geometry = new THREE.BufferGeometry().setFromPoints(punti)
    var line = new THREE.Line(geometry, material)
    return line
}
