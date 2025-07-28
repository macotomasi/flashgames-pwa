import { useNavigate } from 'react-router-dom'

export default function SpaceInvadersGameSimple() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-purple-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-6xl font-bold mb-8">🚀 SPACE INVADERS 👾</h1>
      <p className="text-2xl mb-8">Le jeu fonctionne !</p>
      
      <button
        onClick={() => navigate('/play')}
        className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg text-xl"
      >
        ← Retour aux jeux
      </button>
      
      <div className="mt-8 p-4 bg-black border-2 border-green-500 rounded">
        <p className="text-green-400">DEBUG: Space Invaders component loaded successfully</p>
      </div>
    </div>
  )
}