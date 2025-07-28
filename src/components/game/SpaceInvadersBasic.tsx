import { useNavigate } from 'react-router-dom'

export default function SpaceInvadersBasic() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1a1a2e',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/play')}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ← Retour aux jeux
        </button>
      </div>

      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
        🚀 SPACE INVADERS 👾
      </h1>
      
      <p style={{ fontSize: '24px', marginBottom: '20px' }}>
        Version de base - ça marche !
      </p>

      <div style={{
        width: '600px',
        height: '400px',
        backgroundColor: 'black',
        border: '2px solid white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        color: 'lime'
      }}>
        Zone de jeu - Canvas sera ici
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <p>Score: 0 | Vies: ❤️❤️❤️</p>
        <p style={{ fontSize: '14px', opacity: 0.7 }}>
          Contrôles: ← → Espace
        </p>
      </div>
    </div>
  )
}