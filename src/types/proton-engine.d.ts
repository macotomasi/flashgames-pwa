// Types TypeScript pour proton-engine
// Ces types sont basés sur l'API utilisée dans les composants SpaceInvaders

declare module 'proton-engine' {
  // Zone géométrique pour l'initialisation des particules
  export interface Zone {
    x?: number
    y?: number
  }

  // Zone ponctuelle
  export class PointZone implements Zone {
    constructor(x: number, y: number)
    x: number
    y: number
  }

  // Plage de valeurs
  export class Span {
    constructor(min: number, max: number)
    min: number
    max: number
  }

  // Taux d'émission des particules
  export class Rate {
    constructor(quantity: Span, time: Span)
    quantity: Span
    time: Span
  }

  // Initialiseurs de particules
  export class Position {
    constructor(zone: Zone)
    zone: Zone
  }

  export class Mass {
    constructor(mass: number)
    mass: number
  }

  export class Radius {
    constructor(min: number, max: number)
    min: number
    max: number
  }

  export class Life {
    constructor(min: number, max: number)
    min: number
    max: number
  }

  export class Velocity {
    constructor(span: Span, angle: Span, type?: string)
    span: Span
    angle: Span
    type?: string
  }

  // Comportements des particules
  export class Color {
    constructor(colors: string[])
    colors: string[]
  }

  export class Alpha {
    constructor(start: number, end: number)
    start: number
    end: number
  }

  export class Scale {
    constructor(start: number, end: number)
    start: number
    end: number
  }

  export class RandomDrift {
    constructor(x: number, y: number, delay: number)
    x: number
    y: number
    delay: number
  }

  // Émetteur de particules
  export class Emitter {
    constructor()
    rate: Rate
    p: { x: number; y: number }
    
    addInitialize(initializer: Position | Mass | Radius | Life | Velocity): void
    addBehaviour(behaviour: Color | Alpha | Scale | RandomDrift): void
    removeAllInitializers(): void
    removeAllBehaviours(): void
    emit(): void
    stopEmit(): void
  }

  // Renderer pour Canvas
  export class CanvasRenderer {
    constructor(canvas: HTMLCanvasElement)
    canvas: HTMLCanvasElement
  }

  // Système principal Proton
  export default class Proton {
    constructor()
    
    addRenderer(renderer: CanvasRenderer): void
    addEmitter(emitter: Emitter): void
    removeEmitter(emitter: Emitter): void
    update(): void
    destroy(): void
  }

  // Export des classes statiques pour compatibilité
  export const Proton: {
    Emitter: typeof Emitter
    Rate: typeof Rate
    Span: typeof Span
    Position: typeof Position
    Mass: typeof Mass
    Radius: typeof Radius
    Life: typeof Life
    Velocity: typeof Velocity
    Color: typeof Color
    Alpha: typeof Alpha
    Scale: typeof Scale
    RandomDrift: typeof RandomDrift
    PointZone: typeof PointZone
    CanvasRenderer: typeof CanvasRenderer
  }
}

// Interface pour l'instance Proton utilisée dans les refs
export interface ProtonEngine {
  addRenderer(renderer: any): void
  addEmitter(emitter: any): void
  removeEmitter(emitter: any): void
  update(): void
  destroy(): void
}

// Interface pour l'émetteur de particules
export interface ParticleEmitter {
  p: { x: number; y: number }
  stopEmit(): void
  removeAllInitializers(): void
  removeAllBehaviours(): void
}