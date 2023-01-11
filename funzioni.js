/*jshint esversion: 7 */
function radians(x) {
  /* esisterebbe anche: THREE.Math.degToRad(x)*/
  return Math.PI / 180 * x;
}

function degrees(x) {
  /* esisterebbe anche: THREE.Math.radToDeg(x)*/
  return 180 / Math.PI * x;
}

function rpm2rad(x) {
  /* conversione rpm => rad/s
   */
  return Math.PI / 30 * x;
}

function in2body(xN, xE, psi) {
  /* conversione da componenti inerziali a locali;
  psi è l'angolo di rotazione ORARIO (rad) rispetto al nord
  l'asse x locale è quello longitudinale della barca!	*/

  var xloc, yloc;
  xloc = xE * Math.sin(psi) + xN * Math.cos(psi);
  yloc = xE * Math.cos(psi) - xN * Math.sin(psi);
  return [xloc, yloc];
}

function body2in(xloc, yloc, psi) {
  /* conversione da componenti locali a inerziali;
  psi è l'angolo di rotazione ORARIO (rad) rispetto al nord
  l'asse x locale è quello longitudinale della barca! */

  var xNord, xEst;
  xEst = xloc * Math.sin(psi) + yloc * Math.cos(psi); // componente est
  xNord = xloc * Math.cos(psi) - yloc * Math.sin(psi); // componente nord
  return [xNord, xEst];
}

function limit(x, low, high) {
  /* LIMITER
          ____ high
         /|
        / |
    ___/_ |_ _ low
     __|__|________x
      low  high
	 */

  var out;
  if (x > high) {
    out = high;
  } else if (x < low) {
    out = low;
  } else {
    out = x;
  }
  return out;
}

function modulo(x, v) {
  /* funziona come mod(x,v) in matlab; a differenza di x % v, non può essere negativo
          v|
      /|  /|  /|  /|
     / | / | / | / |
    / _|/__|/__|/__|/_ _x
      -v   0   v   2v
 */

  var dummy;
  dummy = x - v * Math.floor(x / v);
  if (dummy < 0) {
    dummy = dummy + v;
  }
  return dummy;
}

function riduciPI(x) {
  /* Riduce x all'intervallo +/-PI*/
  return modulo(x - Math.PI, 2 * Math.PI) - Math.PI;
}

function riduci2PI(x) {
  /* Riduce x all'intervallo 0-2*PI
   */
  if (x < 0) {
    x = x + 2 * Math.PI;
  }
  return x;
}

function riduciPImezzi(x) {
  /* riduce un angolo (tipicamente latitudine) all'intervallo +/-PI/2
   */
  if (x > Math.PI / 2) {
    out = Math.PI - x;
  } else if (x < -Math.PI / 2) {
    out = -Math.PI - x;
  } else {
    out = x;
  }
  return out;
}

function cart2latlon(refLat, refLon, deltaXN, deltaXE, RT = 6.378137e6) {
  /* calcola lat e long (in rad) di un punto su una sfera di raggio RT conoscendo:
  #  le sue coordinate lungo i meridiani (deltaXN) e i paralleli (deltaXE) rispetto ad un altro punto
  #  lat e long del punto di riferimento, refLat, refLon (rad)*/
  var lat, lon;
  lat = refLat + 1 / RT * deltaXN;
  lon = refLon + 1 / RT / Math.cos(refLat) * deltaXE;
  return [lat, lon];
}

function distBearing(lat, lon, latTgt, lonTgt, R = 6.378137e6) {
  /*Distanza e bearing di un punto di coord (latTgt, lonTgt) rispetto
  ad uno di coordinate (lat, lon) su pianeta sferico di raggio R.
  Sono valori approssimati (bisognerebbe usare le coordinate di Mercatore
  e calcolare la distanza lungo la rotta usando la formula appropriata),
  ma l'errore che si commette è trascurabile (v. swr barge 2014, pag. 8)
  */
  var deltaE, deltaN, tgtDist, tgtBeta;

  // variabili di comodo:
  deltaE = (lonTgt - lon) * Math.cos(lat);
  deltaN = latTgt - lat;

  tgtDist = R * Math.hypot(deltaE, deltaN); // distanza da target;
  tgtBeta = Math.atan2(deltaE, deltaN); // bearing risp. al nord (definito tra +/-pi)

  return [tgtDist, tgtBeta];
}

function primOrdine(x, yOld, tau, dt, bypass = false) {
  /* filtro del primordine con opzione bypass
  # yOld e' l'uscita all'iterazione precedente
  # tau è la costante di tempo*/
  var y, KF;
  if (bypass == true) {
    y = x;
  } else {
    KF = 1 - Math.exp(-dt / tau); // costante del filtro
    y = yOld + KF * (x - yOld);
  }
  return y;
}

function rateLim(x, yOld, maxRate, dt) {
  /* RATE LIMITER
	yOld e' l'uscita all'iterazione precedente
	maxRate è espresso in unit/sec (esempio: °/s)*/
  var rateDem, y;
  rateDem = (x - yOld) / dt;
  if (Math.abs(rateDem) < maxRate) {
    y = x;
  } else {
    y = yOld + Math.sign(rateDem) * maxRate * dt;
  }
  return y;
}

function mercatore(lat) {
  // Calcola la latitudine di Mercatore
  return Math.log(Math.tan(Math.PI / 4 + lat / 2));
}

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds) {
      break;
    }
  }
}

function linInterp(v, vx, vy) {
  /* INTERPOLAZIONE DI FUNZIONE LINEARE A TRATTI
  # vx e vy sono le coordinate dei punti (minimo 2) in cui è data la funzione
  # i valori in vx devono essere strettamente crescenti
  # i valori fuori range restituiscono gli estremi: vy[0] e vy[N-1]
  */

  N = vx.length; // numero di elementi dei vettori dei dati
  if ((vx[0] < v) && (v < vx[N - 1])) {
    for (let i = 0; i <= N - 2; i++) { // i varia tra 0 ed N-2
      if ((vx[i] <= v) && (v <= vx[i + 1])) {
        slope = (vy[i + 1] - vy[i]) / (vx[i + 1] - vx[i]);
        out = vy[i] + slope * (v - vx[i]);
        break; // trovato l'intervallo, è inutile continuare la ricerca
      }
    }
  } else if (v <= vx[0]) {
    out = vy[0];
  } else {
    out = vy[N - 1];
  }
  return out;
}

/* FUNZIONI GEOMETRICHE 3D
 ************************/
function eul2quat(phi, tet, psi) {
  // angoli di eulero => quaternioni

  var cf = Math.cos(phi / 2),
    sf = Math.sin(phi / 2);
  var ct = Math.cos(tet / 2),
    st = Math.sin(tet / 2);
  var cp = Math.cos(psi / 2),
    sp = Math.sin(psi / 2);

  return [cf * ct * cp + sf * st * sp,
    sf * ct * cp - cf * st * sp,
    cf * st * cp + sf * ct * sp,
    cf * ct * sp - sf * st * cp
  ]; // [e0, ex, ey, ez]
}

function eul2mat(phi, tet, psi) {
  // angoli di eulero => matrice di rotazione

  var Cf = Math.cos(phi),
    Sf = Math.sin(phi);
  var Ct = Math.cos(tet),
    St = Math.sin(tet);
  var Cp = Math.cos(psi),
    Sp = Math.sin(psi);

  var body2NED = new THREE.Matrix3();
  body2NED.set(Ct * Cp, Sf * St * Cp - Cf * Sp, Cf * St * Cp + Sf * Sp,
    Ct * Sp, Sf * St * Sp + Cf * Cp, Cf * St * Sp - Sf * Cp,
    -St, Sf * Ct, Cf * Ct);

  return body2NED; // può essere trattata come matrice, essendo stata dichiarata tale
}

function pqr2eulDot(p, q, r, phi, tet, psi) {
  // p, q, r => derivate angoli di eulero

  var Cf = Math.cos(phi),
    Sf = Math.sin(phi);
  var Ct = Math.cos(tet),
    Tt = Math.tan(tet);

  return [p + Sf * Tt * q + Cf * Tt * r,
    Cf * q - Sf * r,
    Sf / Ct * q + Cf / Ct * r
  ];
}

function pqr2quatDot(p, q, r, e0, ex, ey, ez) {
  // p, q, r => derivate quaternioni

  return [0.5 * (-ex * p - ey * q - ez * r),
    0.5 * (e0 * p - ez * q + ey * r),
    0.5 * (ez * p + e0 * q - ex * r),
    0.5 * (-ey * p + ex * q + e0 * r)
  ];
}

function quat2eul(e0, ex, ey, ez) {
  // quaternioni => angoli eulero

  return [Math.atan2(2 * (e0 * ex + ey * ez), (e0 * e0 + ez * ez - ex * ex - ey * ey)),
    Math.asin(2 * (e0 * ey - ex * ez)),
    Math.atan2(2 * (e0 * ez + ex * ey), (e0 * e0 + ex * ex - ey * ey - ez * ez))
  ]; // [phi, tet, psi]
}

function quat2mat(e0, ex, ey, ez) {
  // quaternioni => matrice di rotazione

  var body2NED = new THREE.Matrix3();
  body2NED.set(e0 * e0 + ex * ex - ey * ey - ez * ez, 2 * (ex * ey - e0 * ez), 2 * (ex * ez + e0 * ey),
    2 * (ex * ey + e0 * ez), e0 * e0 - ex * ex + ey * ey - ez * ez, 2 * (ey * ez - e0 * ex),
    2 * (ex * ez - e0 * ey), 2 * (ey * ez + e0 * ex), e0 * e0 - ex * ex - ey * ey + ez * ez);

  return body2NED;
}

/* FINE FUNZIONI GEOMETRICHE 3D
 *****************************/
