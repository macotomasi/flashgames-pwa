export default function TestComponent() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'red',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px'
    }}>
      <h1>TEST COMPONENT WORKS!</h1>
      <p>This should be visible if routing works</p>
    </div>
  )
}