import { useState } from 'react'
import { Card } from '@/types'
import { useReviewStore } from '@/store'

interface FlashcardModalProps {
  card: Card
  onAnswer: (correct: boolean) => void
}

export default function FlashcardModal({ card, onAnswer }: FlashcardModalProps) {
  const [showAnswer, setShowAnswer] = useState(false)
  const [userChoice, setUserChoice] = useState<'know' | 'dontknow' | null>(null)
  const { submitGameAnswer } = useReviewStore()

  const handleInitialChoice = (choice: 'know' | 'dontknow') => {
    setUserChoice(choice)
    setShowAnswer(true)
  }

  const handleFinalAnswer = async (isCorrect: boolean) => {
    // Sauvegarder avec FSRS
    await submitGameAnswer(card, isCorrect, userChoice!)
    
    // Déterminer si c'est vraiment une bonne réponse pour le bonus/pénalité
    const actuallyCorrect = userChoice === 'know' && isCorrect
    
    // Notifier le jeu pour les bonus/pénalités
    onAnswer(actuallyCorrect)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        {!showAnswer ? (
          <>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Question</h2>
            <p className="text-xl mb-6 text-gray-800">{card.front}</p>
            <div className="flex gap-4">
              <button
                onClick={() => handleInitialChoice('know')}
                className="flex-1 btn-primary"
              >
                Je sais
              </button>
              <button
                onClick={() => handleInitialChoice('dontknow')}
                className="flex-1 btn-secondary"
              >
                Je ne sais pas
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Réponse</h2>
            <p className="text-xl mb-2 text-gray-800">{card.front}</p>
            <p className="text-lg text-gray-600 mb-6">→ {card.back}</p>
            <p className="mb-4 text-gray-700">Votre réponse était-elle correcte ?</p>
            <div className="flex gap-4">
              <button
                onClick={() => handleFinalAnswer(true)}
                className="flex-1 btn-primary"
              >
                Correcte
              </button>
              <button
                onClick={() => handleFinalAnswer(false)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Incorrecte
              </button>
            </div>
          </>
        )}
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          Le jeu continue en arrière-plan !
        </p>
      </div>
    </div>
  )
}