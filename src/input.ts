const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

export class Input {
  private down = new Set<string>();
  private pressed = false;

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      if (!this.down.has(e.code) && e.code === 'Space') this.pressed = true;
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  }

  private any(...codes: string[]): boolean {
    return codes.some((c) => this.down.has(c));
  }

  get x(): number {
    return (this.any('ArrowRight', 'KeyD') ? 1 : 0) - (this.any('ArrowLeft', 'KeyA') ? 1 : 0);
  }

  /** +1 moves toward the bottom of the screen (toward the camera). */
  get y(): number {
    return (this.any('ArrowDown', 'KeyS') ? 1 : 0) - (this.any('ArrowUp', 'KeyW') ? 1 : 0);
  }

  /** True once per Space press. */
  consumeAction(): boolean {
    const p = this.pressed;
    this.pressed = false;
    return p;
  }
}
