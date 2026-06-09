<template>
  <svg class="mascot-duo" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <g class="xueliang">
      <path class="hair hair-blue" d="M3.8 18.8c-.5-5.7 2.8-10.9 7.2-10.9 4.5 0 7.6 5.1 7.1 10.9l-2.4-1.4c-.4 2.2-1.8 4.1-4.7 4.1s-4.3-1.9-4.7-4.1z" />
      <path class="face-fill" d="M7.4 13.9c.5-2.4 2.2-4 4.3-4 2.2 0 3.8 1.6 4.2 4 .4 3-1.1 5.4-4.2 5.4s-4.7-2.4-4.3-5.4Z" />
      <path d="M5.4 18.5c-.5-5.5 2.5-10.4 6.5-10.4 4.1 0 7 4.9 6.4 10.4M7.5 13.8c.4-2.3 2.1-4 4.2-4 2.2 0 3.8 1.7 4.2 4 .4 3-1.1 5.4-4.2 5.4s-4.6-2.4-4.2-5.4Z" />
      <path d="M7.3 12.9c2-.5 3.4-1.6 4.5-3.3.8 1.7 2.6 2.8 4.3 3.1" />
      <path class="eye" d="M10.1 14.8h.1M13.7 14.8h.1" />
      <path d="M10.5 17.1c.7.5 1.6.5 2.4 0" />
      <path class="accent-fill" d="M7.8 7.1 9.1 5l1.4 2.1 2.4.7-2.1 1.4.1 2.5-1.8-1.6-1.9 1.6.2-2.5-2.1-1.4z" />
      <path d="M7 19.1c-1.6 1.2-2.4 2.7-2.8 4.8M15.4 19.1c1.4 1.1 2.2 2.5 2.6 4.4" />
    </g>

    <g class="rena">
      <path class="hair hair-gold" d="M15.5 19c-.5-5.3 2.4-10.2 6.6-10.2 4.3 0 7.1 4.9 6.6 10.2l-2.1-1.1c-.5 2.2-2 3.9-4.5 3.9-2.6 0-4.1-1.7-4.6-3.9z" />
      <path class="face-fill" d="M18.1 14.2c.3-2.2 1.8-3.7 3.9-3.7 2.2 0 3.7 1.5 4 3.7.4 2.8-1.1 5.1-4 5.1s-4.4-2.3-3.9-5.1Z" />
      <path d="M16.1 18.8c-.5-5.4 2.4-10.2 6.6-10.2s7 4.8 6.5 10.2M18.1 14.2c.3-2.2 1.8-3.7 3.9-3.7 2.2 0 3.7 1.5 4 3.7.4 2.8-1.1 5.1-4 5.1s-4.4-2.3-3.9-5.1Z" />
      <path d="M18.2 13.1c1.5-.4 3-1.2 4.4-2.7.9 1.6 2.4 2.4 4 2.8" />
      <path class="eye" d="M20.5 15h.1M24 15h.1" />
      <path d="M21 17.2c.6.4 1.5.4 2.2 0" />
      <path class="accent-fill" d="M22 7.2c.9-1.4 2.2-1.4 2.9-.3.9-.7 2.1-.2 2.2 1.1.1 1.9-2.1 2.9-4 4.1-1.7-1.4-3.8-2.4-3.7-4.2.1-1.1 1.1-1.7 2.6-.7Z" />
      <path d="M18.6 19.1c-1.4 1.1-2.1 2.4-2.5 4.2M25.8 19.1c1.3 1.1 2.1 2.5 2.4 4.4" />
    </g>
  </svg>
</template>

<style scoped>
.mascot-duo {
  position: relative;
  z-index: 2;
  width: 25px;
  height: 25px;
  stroke: var(--sticker-line);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.55;
}

.face-fill {
  fill: rgba(255, 255, 255, 0.92);
}

.hair-blue {
  fill: #dff0ff;
}

.hair-gold {
  fill: #ffedbd;
}

.accent-fill {
  fill: var(--sticker-accent);
  stroke: var(--sticker-line);
}

.eye {
  stroke-width: 2.5;
}

.xueliang {
  transform: translate(-1px, 2px) scale(0.76);
  transform-origin: center;
}

.rena {
  transform: translate(4px, 2px) scale(0.76);
  transform-origin: center;
}
</style>
