import { useEffect, useState } from 'react'

function App() {
  const [health, setHealth] = useState<string>('Loading...')

  useEffect(() => {
    fetch('http://localhost:5000/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setHealth(data.message)
        } else {
          setHealth('Error: Backend not running correctly')
        }
      })
      .catch(() => setHealth('Error: Could not connect to backend'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
        ContribHQ
      </h1>
      
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4 text-gray-300">Backend Status</h2>
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${health.includes('Error') ? 'bg-red-500' : health.includes('Loading') ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
          <p className="text-lg font-medium">{health}</p>
        </div>
      </div>
    </div>
  )
}

export default App
