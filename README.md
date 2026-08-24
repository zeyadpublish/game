# Strike Vector

An original browser-based tactical FPS built with Three.js. It uses the supplied city, soldier, animation, and weapon assets, plus procedural materials and original arena dressing.

## Run it

```bash
npm install
npm run dev
```

Open the local URL Vite reports. Click the scene to capture the mouse.

Controls: **WASD** move, **Shift** sprint, **Ctrl/C** crouch, **left mouse** fire, **right mouse** aim, and **R** reload. Touch controls appear automatically on touch devices.

## Build targets

```bash
npm run build       # static web output in dist/
npm run electron    # desktop shell after building
npm run cap:sync    # syncs the built web app into Android
```

The game includes an original three-zone progression: Civic District, Foundry Transit, and Blackout Quarter. The visual language is original and does not reproduce Call of Duty UI or level content.
