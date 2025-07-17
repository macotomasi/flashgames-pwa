import { useState, useEffect } from 'react'
import { Card } from '@/types'
import { useReviewStore, useCardStore, useProgressionStore } from '@/store'

interface FlashcardModalProps {
  card: Card
  onAnswer: (correct: boolean) => void
  isBossCard?: boolean
}

export default function FlashcardModal({ card, onAnswer, isBossCard = false }: FlashcardModalProps) {
  const [showAnswer, setShowAnswer] = useState(false)
  const [userChoice, setUserChoice] = useState<'know' | 'dontknow' | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [multipleChoices, setMultipleChoices] = useState<string[]>([])
  const { submitGameAnswer } = useReviewStore()
  const { getRandomCards } = useCardStore()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { checkForBossCard } = useProgressionStore()

  // Generate multiple choice options when answer is shown
  useEffect(() => {
    const generateChoices = async () => {
      if (showAnswer && multipleChoices.length === 0) {
        // Get 3 random wrong answers
        const wrongAnswers = await getRandomCards(card.deckId, 3, card.id)
        const wrongChoices = wrongAnswers.map(c => c.back)
        
        // Mix with correct answer
        const allChoices = [...wrongChoices, card.back]
        
        // Shuffle
        const shuffled = allChoices.sort(() => Math.random() - 0.5)
        setMultipleChoices(shuffled)
      }
    }
    
    generateChoices()
  }, [showAnswer, card, getRandomCards, multipleChoices.length])

  const handleInitialChoice = (choice: 'know' | 'dontknow') => {
    setUserChoice(choice)
    setShowAnswer(true)
  }

  const handleMultipleChoice = async (answer: string) => {
    setSelectedAnswer(answer)
    const isCorrect = answer === card.back
    
    // Save with FSRS
    await submitGameAnswer(card, isCorrect && userChoice === 'know', userChoice!)
    
    // Determine if it's really a correct answer for bonus/penalty
    const actuallyCorrect = userChoice === 'know' && isCorrect
    
    // Notify game for bonus/penalties
    onAnswer(actuallyCorrect)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        {isBossCard && (
          <div className="bg-red-600 text-white px-4 py-2 rounded-lg mb-4 text-center font-bold">
            ⚠️ ATTENTION QUESTION DE BOSS ! ⚠️
          </div>
        )}
        
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
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              {userChoice === 'know' ? 'Vérifiez votre réponse' : 'Voici les options'}
            </h2>
            <p className="text-lg mb-4 text-gray-800">{card.front}</p>
            
            {!selectedAnswer ? (
              <div className="space-y-2">
                {multipleChoices.map((choice, index) => (
                  <button
                    key={index}
                    onClick={() => handleMultipleChoice(choice)}
                    className="w-full text-left p-3 rounded-lg border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    {choice}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {multipleChoices.map((choice, index) => {
                  const isCorrectChoice = choice === card.back
                  const isSelected = choice === selectedAnswer
                  const bgColor = isSelected
                    ? isCorrectChoice
                      ? 'bg-green-100 border-green-500'
                      : 'bg-red-100 border-red-500'
                    : isCorrectChoice
                    ? 'bg-green-100 border-green-500'
                    : 'bg-gray-100 border-gray-300'
                  
                  return (
                    <div
                      key={index}
                      className={`w-full text-left p-3 rounded-lg border-2 ${bgColor}`}
                    >
                      {choice}
                      {isSelected && !isCorrectChoice && ' ❌'}
                      {isCorrectChoice && ' ✓'}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          Le jeu continue en arrière-plan !
        </p>
      </div>
    </div>
  )
}