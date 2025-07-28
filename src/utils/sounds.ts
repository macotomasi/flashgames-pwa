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

  private async ensureAudioContext() {
    if (!this.audioContext && typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new AudioContext()
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume()
      } catch (e) {
        // ignore
      }
    }
  }

  private async playTone(frequency: number, duration: number, volume: number = 0.3) {
    try {
      await this.ensureAudioContext()
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
    } catch (err) {
      // Empêche tout crash silencieux
    }
  }

  // Success sound (kawaii)
  async playSuccess() {
    await this.playTone(523, 0.1)
    setTimeout(() => this.playTone(659, 0.1), 100)
    setTimeout(() => this.playTone(784, 0.2), 200)
  }
  async playVictory() {
    await this.playTone(523, 0.1)
    setTimeout(() => this.playTone(659, 0.1), 100)
    setTimeout(() => this.playTone(784, 0.1), 200)
    setTimeout(() => this.playTone(1047, 0.3), 300)
  }
  async playLineClear() {
    await this.playTone(440, 0.1)
    setTimeout(() => this.playTone(523, 0.1), 50)
    setTimeout(() => this.playTone(659, 0.1), 100)
    setTimeout(() => this.playTone(880, 0.2), 150)
  }
  async playError() {
    await this.playTone(220, 0.3, 0.2)
  }
  async playAchievement() {
    await this.playTone(523, 0.1)
    setTimeout(() => this.playTone(659, 0.1), 100)
    setTimeout(() => this.playTone(784, 0.1), 200)
    setTimeout(() => this.playTone(1047, 0.1), 300)
    setTimeout(() => this.playTone(1319, 0.3), 400)
  }
  async playBossAlert() {
    await this.playTone(196, 0.2)
    setTimeout(() => this.playTone(196, 0.2), 250)
    setTimeout(() => this.playTone(196, 0.2), 500)
    setTimeout(() => this.playTone(156, 0.6), 750)
  }
}

export const soundManager = new SoundManager()