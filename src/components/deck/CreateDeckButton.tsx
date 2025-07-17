import { useState } from 'react'
import { useDeckStore } from '@/store'

export default function CreateDeckButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('📚')
  const { createDeck } = useDeckStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    await createDeck(name, description, icon)
    
    // Reset form
    setName('')
    setDescription('')
    setIcon('📚')
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="btn-primary flex items-center gap-2"
      >
        <span className="text-xl">+</span>
        Nouveau Deck
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 className="text-2xl font-bold mb-6">Créer un nouveau deck</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Icône
            </label>
            <div className="flex gap-2">
              {['📚', '🎯', '🌍', '🔬', '🎨', '💻', '🏃', '🍳'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`text-2xl p-2 rounded-lg border-2 transition-colors ${
                    icon === emoji 
                      ? 'border-game-primary bg-game-primary/10' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Nom du deck
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-game-primary"
              placeholder="Ex: Espagnol, Histoire..."
              required
              autoFocus
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Description (optionnel)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-game-primary"
              rows={3}
              placeholder="Description du deck..."
            />
          </div>
          
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 btn-primary"
            >
              Créer
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 btn-secondary"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}