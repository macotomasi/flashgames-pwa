// Simple sound effects using Web Audio API
class SoundManager {
  private audioContext: AudioContext | null = null

  constructor() {
    // Initialize audio context on first user interaction
    this.initializeAudioContext()
  }

  private initializeAudioContext() {
    if (typeof window !== 'undefined' && window.AudioContext) {
      const initAudio = () => {
        if (!this.audioContext) {
          this.audioContext = new AudioContext()
        }
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume()
        }
        document.removeEventListener('click', initAudio)
        document.removeEventListener('touchstart', initAudio)
      }
      
      document.addEventListener('click', initAudio)
      document.addEventListener('touchstart', initAudio)
    }
  }

  private playTone(frequency: number, duration: number, volume: number = 0.3) {
    if (!this.audioContext) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.value = frequency
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)

    oscillator.start()
    oscillator.stop(this.audioContext.currentTime + duration)
  }

  // Success sound (kawaii)
  playSuccess() {
    this.playTone(523, 0.1) // C5
    setTimeout(() => this.playTone(659, 0.1), 100) // E5
    setTimeout(() => this.playTone(784, 0.2), 200) // G5
  }

  // Victory sound (level up)
  playVictory() {
    this.playTone(523, 0.1) // C5
    setTimeout(() => this.playTone(659, 0.1), 100) // E5
    setTimeout(() => this.playTone(784, 0.1), 200) // G5
    setTimeout(() => this.playTone(1047, 0.3), 300) // C6
  }

  // Line clear sound
  playLineClear() {
    this.playTone(440, 0.1) // A4
    setTimeout(() => this.playTone(523, 0.1), 50) // C5
    setTimeout(() => this.playTone(659, 0.1), 100) // E5
    setTimeout(() => this.playTone(880, 0.2), 150) // A5
  }

  // Error sound
  playError() {
    this.playTone(220, 0.3, 0.2) // A3
  }

  // Achievement unlock sound
  playAchievement() {
    this.playTone(523, 0.1) // C5
    setTimeout(() => this.playTone(659, 0.1), 100) // E5
    setTimeout(() => this.playTone(784, 0.1), 200) // G5
    setTimeout(() => this.playTone(1047, 0.1), 300) // C6
    setTimeout(() => this.playTone(1319, 0.3), 400) // E6
  }

  // Boss card alert sound
  playBossAlert() {
    this.playTone(196, 0.2) // G3
    setTimeout(() => this.playTone(196, 0.2), 250) // G3
    setTimeout(() => this.playTone(196, 0.2), 500) // G3
    setTimeout(() => this.playTone(156, 0.6), 750) // Eb3
  }
}

export const soundManager = new SoundManager()