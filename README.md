# 🎱 CueRogue: Billar Roguelike (Balatro × Pool Arcade)

**CueRogue** es un videojuego web completo, modular y altamente pulido que fusiona la física de precisión del billar arcade con el adictivo bucle roguelike y la fórmula de puntuación de *Balatro*.

Desarrollado desde cero con **HTML5 Canvas**, **CSS Moderno (Cyberpunk / Casino Noir)**, y **JavaScript Vanilla (ES6+ modular)** con síntesis procedural de sonido mediante **Web Audio API** y cero dependencias externas.

---

## 🚀 Cómo Iniciar el Juego

El juego corre como módulos nativos ES6 estándar. Puedes ejecutarlo con cualquier servidor estático local o usando el script ligero incluido:

```bash
# Iniciar con Node.js
node server.js
```

Abre tu navegador en:  
👉 **`http://localhost:3000/`**

---

## 🏛️ Arquitectura del Software

```
s:\Antigravity\Billar\
├── index.html              # Maquetación completa HUD, cajas Balatro, modales y canvas
├── style.css               # Estética Cyberpunk Casino Noir, sin barras de scroll, efectos neón
├── main.js                 # Inicialización, Game Loop (rAF + dt), escala Hi-DPI y raycasting
├── server.js               # Servidor estático Node.js zero-dependency
├── package.json            # Metadatos del proyecto y scripts
├── engine/
│   ├── physics.js          # Motor 2D con sub-stepping (8 sub-pasos), fricción de paño,
│   │                       # colisiones elásticas, atracción gravitacional y efecto Spin
│   ├── audio.js            # Sintetizador procedural con Web Audio API (impactos, carambolas,
│   │                       # troneras, explosiones, clics de compra, fanfare y derrota)
│   └── particles.js        # Partículas para impactos, estelas, tiza, explosiones, vórtices,
│                           # textos flotantes animados (+50 PTS, x2 MULT) y Screen Shake
├── game/
│   ├── entities.js         # Clases Ball, Pocket, Obstacle, Cue con sombreado 3D por código
│   ├── roguelike.js        # Progresión por Actos, Jefes, Reliquias, Bolas Especiales y Tienda
│   └── state.js            # Máquina de estados (MENU, AIMING, BALLS_MOVING, EVALUATING, SHOP, etc.)
└── ui/
    └── hud.js              # Controlador del HUD, caja de puntaje [PUNTOS] x [MULT],
                            # widget de efecto/English de bola blanca, tooltips y tienda
```

---

## 🎯 Mecánicas de Juego y Bucle Roguelike

### 1. Puntuación Estilo *Balatro*
$$\text{Puntaje del Tiro} = (\text{Puntos Base de Bolas Embocadas}) \times (\text{Multiplicador del Tiro})$$
- Cada rebote en banda antes de embocar suma **`+1` al Multiplicador**.
- Las carambolas y embocar múltiples bolas en un mismo tiro disparan el combo.
- **Scratch (Meter la blanca):** Pierdes 1 tiro, se reinicia el multiplicador del turno y pasas a **Bola en Mano** (*Ball-in-Hand*) para reposicionar la blanca libremente con el mouse.

### 2. Estructura de Progresión (3 Actos, 12 Mesas)
Cada Acto consta de 3 Mesas Normales y 1 Mesa de Jefe:
- **Acto 1:** El Club Clandestino
  - *Jefe: El Arquitecto* (2 pilares de madera maciza en el centro que rebotan las bolas).
- **Acto 2:** El Casino Cyberpunk
  - *Jefe: El Usurero* (Cada tiro cuesta $1 de tu banco en concepto de comisión).
- **Acto 3:** La Cripta del Abismo
  - *Jefe Final: El Abismo* (Dos troneras rojas son trampas mortales: no otorgan puntos y restan 1 tiro).

### 3. Economía
Al superar la meta de puntos de una mesa:
- **`$5`** base por victoria.
- **`+$1`** por cada tiro sobrante.
- **`+$1`** de interés por cada `$5` ahorrados en el banco (hasta `$5` máx).
- Tienda entre rondas con **Reroll (`$2`)** y compra de Reliquias o Bolas Especiales.

---

## 🔮 Catálogo de Bolas Especiales (8 Tipos)

1. **Estándar (1 al 15):** Otorgan `10 + Número de bola` en puntos base. Las bolas 1-8 son lisas y 9-15 son rayadas.
2. **Bola de Oro (★):** Otorga `20 pts` y genera `+$3` en efectivo al embocarse.
3. **Bola de Cristal (✦):** Multiplica `x2` el Multiplicador del tiro, pero tiene 25% de probabilidad de romperse en impactos fuertes.
4. **Bola Explosiva (💣):** Al embocarla o chocar a alta velocidad, detona una onda expansiva que empuja a las bolas cercanas y otorga `50 pts`.
5. **Bola Fantasma (👻):** Atraviesa otras bolas sin colisionar (fase espectral), pero sí rebota en bandas y suma puntos.
6. **Bola Imán (🧲):** Emite un campo magnético pulsante que atrae suavemente a las bolas vecinas.
7. **Bola Vampiro (🦇):** Cada choque con otra bola le absorbe `5 pts` de valor base y los acumula en sí misma durante la mesa.
8. **Bola Arcoíris (🌈):** Suma `+3` al Multiplicador por cada banda que toque antes de caer en la tronera.

---

## 🃏 Catálogo de Reliquias (10 Mejoras Pasivas)

1. **Taco de Carbono:** Aumenta la potencia máxima de tiro en un `+30%`.
2. **Mira Láser:** Duplica la longitud del raycasting de predicción de tiro.
3. **Tiza Mágica:** Los tiros con Top Spin o Back Spin inician con `+2` de Multiplicador.
4. **Geometría Sagrada:** Cada rebote en banda suma `+15 Puntos Base` al tiro.
5. **Agujero Negro:** Aumenta el radio de captura de las troneras en un `+25%`.
6. **Bolsillos Rotos:** Otorga `+2 Tiros` adicionales al inicio de cada mesa.
7. **Física Cuántica:** El primer choque de cada tiro duplica el Multiplicador actual (`x2`).
8. **Moneda de la Suerte:** Embocar en las troneras centrales otorga `$2` instantáneos.
9. **Paño de Hielo:** Reduce la fricción de la mesa en un `40%` (las bolas ruedan mucho más lejos).
10. **Último Aliento:** En tu último tiro disponible de la mesa, el Multiplicador total se triplica (`x3`).

---

## 🕹️ Controles

| Acción | Control |
|---|---|
| **Apuntar** | Mover el cursor alrededor de la bola blanca en la mesa |
| **Cargar Potencia y Disparar** | Clic izquierdo y arrastrar hacia atrás (o mantener presionado) y soltar |
| **Efecto de Bola (Spin / English)** | Arrastrar el punto rojo en el widget de la bola blanca del panel izquierdo (Arriba: *Top Spin*, Abajo: *Back Spin*, Lados: *English*) |
| **Bola en Mano (*Scratch*)** | Mover el cursor para situar la bola blanca sobre el tapete y hacer clic para fijarla |
| **Inspeccionar Cartas / Bolas** | Pasar el cursor sobre cualquier reliquia o ficha de bola para ver su tooltip detallado |
| **Silenciar / Activar Audio** | Botón de bocina 🔊 en la barra superior |
