import { useState, useEffect, memo } from 'react'
import { Card } from '@/types'
import { useReviewStore, useCardStore, useProgressionStore } from '@/store'
import { logger } from '@/utils/logger'
import { fisherYatesShuffle } from '@/utils/shuffle'

interface FlashcardModalProps {
  card: Card
  onAnswer: (correct: boolean) => void
  isBossCard?: boolean
  onGamePauseChange?: (paused: boolean) => void
}

const FlashcardModal = memo(function FlashcardModal({ card, onAnswer, isBossCard = false, onGamePauseChange }: FlashcardModalProps) {
  
  const [showAnswer, setShowAnswer] = useState(false)
  const [userChoice, setUserChoice] = useState<'know' | 'dontknow' | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [multipleChoices, setMultipleChoices] = useState<string[]>([])
  const [showFeedback, setShowFeedback] = useState(false)
  const [isGamePaused, setIsGamePaused] = useState(false)
  
  // Optimiser les sélecteurs Zustand
  const submitGameAnswer = useReviewStore(state => state.submitGameAnswer)
  const getRandomCards = useCardStore(state => state.getRandomCards)

  // Corriger le useEffect avec dépendances et cancellation
  useEffect(() => {
    if (!showAnswer || multipleChoices.length > 0) return
    
    let cancelled = false
    const generateChoices = async () => {
      try {
        // Get 3 random wrong answers
        const wrongAnswers = await getRandomCards(card.deckId, 3, card.id)
        const wrongChoices = wrongAnswers.map(c => c.back)
        
        // Mix with correct answer
        const allChoices = [...wrongChoices, card.back]
        
        // Shuffle using Fisher-Yates algorithm
        const shuffled = fisherYatesShuffle(allChoices)
        
        if (!cancelled) {
          setMultipleChoices(shuffled)
        }
      } catch (error) {
        logger.error('Error generating flashcard choices', { error, cardId: card.id })
        if (!cancelled) {
          setMultipleChoices([card.back])
        }
      }
    }
    
    generateChoices()
    return () => { 
      cancelled = true 
    }
  }, [showAnswer, card.id, card.deckId, multipleChoices.length, getRandomCards])

  const handleInitialChoice = (choice: 'know' | 'dontknow') => {
    setUserChoice(choice)
    setShowAnswer(true)
  }

  const handlePauseToggle = (checked: boolean) => {
    setIsGamePaused(checked)
    if (onGamePauseChange) {
      onGamePauseChange(checked)
    }
  }

  const handleMultipleChoice = async (answer: string) => {
    setSelectedAnswer(answer)
    
    // Cas spécial pour "Erreur"
    const isError = answer === '__error__'
    const isCorrect = !isError && answer === card.back
    
    // Show feedback message
    setShowFeedback(true)
    
    // Save with FSRS - si erreur, considérer comme faux même si userChoice === 'know'
    await submitGameAnswer(card, isCorrect && userChoice === 'know', userChoice!)
    
    // Determine if it's really a correct answer for bonus/penalty
    const actuallyCorrect = userChoice === 'know' && isCorrect && !isError
    
    // Wait 2 seconds then notify game and unpause if needed
    setTimeout(() => {
      if (isGamePaused && onGamePauseChange) {
        onGamePauseChange(false)
      }
      onAnswer(actuallyCorrect)
    }, 2000)
  }

  if (!card || !card.front || !card.back) {
    logger.error('Invalid flashcard data', { card })
    return <div>Erreur: carte invalide</div>
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      data-testid="flashcard-modal"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(2px)',
      }}
    >
      {/* VRAIE CARTE ARCADE STYLE */}
      <div
        className="relative p-6 md:p-8 max-w-md md:max-w-2xl w-full font-mono text-white"
        style={{
          backgroundColor: '#000000',
          border: '4px solid #00ffff',
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(0, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(0, 255, 0, 0.1) 0%, transparent 50%)
          `,
          boxShadow: '0 0 30px rgba(0, 255, 255, 0.5), inset 0 0 30px rgba(0, 255, 255, 0.1)',
          minHeight: '320px',
        }}
      >
        {/* Coins de carte avec effet néon */}
        <div className="absolute top-2 left-2 w-4 h-4" style={{borderLeft: '2px solid #00ffff', borderTop: '2px solid #00ffff'}}></div>
        <div className="absolute top-2 right-2 w-4 h-4" style={{borderRight: '2px solid #00ffff', borderTop: '2px solid #00ffff'}}></div>
        <div className="absolute bottom-2 left-2 w-4 h-4" style={{borderLeft: '2px solid #00ffff', borderBottom: '2px solid #00ffff'}}></div>
        <div className="absolute bottom-2 right-2 w-4 h-4" style={{borderRight: '2px solid #00ffff', borderBottom: '2px solid #00ffff'}}></div>
        
        {/* Badge BOSS si nécessaire */}
        {isBossCard && (
          <div className="text-center mb-6">
            <div 
              className="inline-block px-6 py-2 font-bold text-xl animate-pulse"
              style={{
                backgroundColor: '#7f1d1d',
                border: '2px solid #ef4444',
                color: '#fca5a5'
              }}
            >
              ⚠️ BOSS CARD ⚠️
            </div>
          </div>
        )}
        
        {!showAnswer ? (
          <>
            {/* En-tête de carte */}
            <div className="text-center mb-8">
              <h2 
                className="text-4xl font-bold mb-4" 
                style={{
                  color: '#00ffff',
                  textShadow: '0 0 10px cyan'
                }}
              >
                FLASHCARD
              </h2>
              <div 
                className="h-1"
                style={{
                  background: 'linear-gradient(to right, transparent, #00ffff, transparent)'
                }}
              ></div>
            </div>
            
            {/* Question */}
            <div 
              className="p-8 mb-8 text-center"
              style={{
                backgroundColor: '#111827',
                border: '2px solid #22c55e'
              }}
            >
              <p 
                className="text-2xl font-bold leading-relaxed" 
                style={{
                  color: '#4ade80',
                  textShadow: '0 0 5px lime'
                }}
              >
                {card.front}
              </p>
            </div>
            
            {/* Option figer le jeu */}
            <div className="text-center mb-8">
              <label className="flex items-center justify-center gap-3 cursor-pointer" style={{color: '#facc15'}}>
                <input
                  type="checkbox"
                  checked={isGamePaused}
                  onChange={(e) => handlePauseToggle(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-lg">🎮 PAUSE GAME</span>
              </label>
            </div>
            
            {/* Boutons arcade */}
            <div className="flex gap-6 justify-center">
              <button
                onClick={() => handleInitialChoice('know')}
                className="px-8 py-4 text-xl font-bold transition-all duration-200"
                style={{
                  backgroundColor: '#14532d',
                  border: '3px solid #4ade80',
                  color: '#4ade80',
                  textShadow: '0 0 10px lime',
                  boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#166534'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#14532d'}
                data-testid="know-button"
              >
                [ I KNOW ]
              </button>
              <button
                onClick={() => handleInitialChoice('dontknow')}
                className="px-8 py-4 text-xl font-bold transition-all duration-200"
                style={{
                  backgroundColor: '#7f1d1d',
                  border: '3px solid #f87171',
                  color: '#f87171',
                  textShadow: '0 0 10px red',
                  boxShadow: '0 0 20px rgba(255, 0, 0, 0.3)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#991b1b'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7f1d1d'}
                data-testid="dontknow-button"
              >
                [ I DON'T KNOW ]
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Mode réponse */}
            <div className="text-center mb-8">
              <h2 
                className="text-3xl font-bold" 
                style={{
                  color: '#facc15',
                  textShadow: '0 0 10px yellow'
                }}
              >
                {userChoice === 'know' ? 'VERIFY ANSWER' : 'SELECT ANSWER'}
              </h2>
            </div>
            
            <div 
              className="p-6 mb-8 text-center"
              style={{
                backgroundColor: '#111827',
                border: '2px solid #22c55e'
              }}
            >
              <p className="text-lg" style={{color: '#4ade80'}}>{card.front}</p>
            </div>
            
            {!selectedAnswer ? (
              <div className="space-y-5">
                {multipleChoices.map((choice, index) => (
                  <button
                    key={index}
                    onClick={() => handleMultipleChoice(choice)}
                    className="w-full text-left p-4 text-lg transition-all duration-200"
                    style={{
                      backgroundColor: '#1f2937',
                      border: '2px solid #4b5563',
                      color: '#ffffff'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#00ffff'
                      e.currentTarget.style.backgroundColor = '#374151'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#4b5563'
                      e.currentTarget.style.backgroundColor = '#1f2937'
                    }}
                  >
                    {String.fromCharCode(65 + index)}) {choice}
                  </button>
                ))}
                
                {userChoice === 'know' && (
                  <button
                    onClick={() => handleMultipleChoice('__error__')}
                    className="w-full p-4 text-lg text-center transition-all duration-200"
                    style={{
                      backgroundColor: '#7c2d12',
                      border: '2px solid #fb923c',
                      color: '#fb923c'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9a3412'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7c2d12'}
                  >
                    ❌ ERROR - I WAS WRONG
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-8">
                  {multipleChoices.map((choice, index) => {
                    const isCorrectChoice = choice === card.back
                    const isSelected = choice === selectedAnswer
                    
                    let borderColor = '#4b5563'
                    let bgColor = '#1f2937'
                    let textColor = '#ffffff'
                    
                    if (isCorrectChoice) {
                      borderColor = '#4ade80'
                      bgColor = '#14532d'
                      textColor = '#4ade80'
                    } else if (isSelected) {
                      borderColor = '#f87171'
                      bgColor = '#7f1d1d'
                      textColor = '#f87171'
                    }
                    
                    return (
                      <div
                        key={index}
                        className="w-full text-left p-4 text-lg"
                        style={{
                          border: `2px solid ${borderColor}`,
                          backgroundColor: bgColor,
                          color: textColor
                        }}
                      >
                        {String.fromCharCode(65 + index)}) {choice}
                        {isSelected && !isCorrectChoice && ' ❌'}
                        {isCorrectChoice && ' ✓'}
                      </div>
                    )
                  })}
                </div>
                
                {showFeedback && selectedAnswer && (
                  <div 
                    className="p-6 text-center font-bold text-xl"
                    style={{
                      border: selectedAnswer === '__error__' || selectedAnswer !== card.back 
                        ? '2px solid #f87171' 
                        : '2px solid #4ade80',
                      backgroundColor: selectedAnswer === '__error__' || selectedAnswer !== card.back 
                        ? '#7f1d1d' 
                        : '#14532d',
                      color: selectedAnswer === '__error__' || selectedAnswer !== card.back 
                        ? '#f87171' 
                        : '#4ade80'
                    }}
                  >
                    {selectedAnswer === '__error__' ? (
                      <div>
                        <p>ERROR ACKNOWLEDGED ✅</p>
                        <p className="text-sm mt-2">CORRECT ANSWER: {card.back}</p>
                      </div>
                    ) : selectedAnswer === card.back ? (
                      userChoice === 'know' ? (
                        <p>CORRECT! ✅</p>
                      ) : (
                        <div>
                          <p>CORRECT! 👍</p>
                          <p className="text-sm mt-2">(NO POINTS - YOU SAID YOU DIDN'T KNOW)</p>
                        </div>
                      )
                    ) : (
                      <div>
                        <p>WRONG ❌</p>
                        <p className="text-sm mt-2">CORRECT ANSWER: {card.back}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
        
        {/* Status en bas */}
        <div className="text-center mt-6 text-sm" style={{color: '#00ffff'}}>
          {isGamePaused ? '⏸️ GAME PAUSED' : '⏯️ GAME CONTINUES'}
        </div>
      </div>
    </div>
  )
})

export default FlashcardModal