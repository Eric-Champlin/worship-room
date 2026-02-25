import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Loader2, XCircle } from 'lucide-react'
import { apiClient, HealthResponse, HelloResponse } from '@/api/client'
import { Layout } from '@/components/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export function Health() {
  const navigate = useNavigate()
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [hello, setHello] = useState<HelloResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [healthData, helloData] = await Promise.all([
          apiClient.getHealth(),
          apiClient.getHello(),
        ])
        setHealth(healthData)
        setHello(helloData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <Layout>
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle>Backend Health Check</CardTitle>
        </CardHeader>
        <CardContent>

          {loading && (
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <p>Loading...</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-md border border-red-300 bg-red-50 p-4">
              <XCircle className="h-5 w-5 flex-shrink-0 text-red-600" aria-hidden="true" />
              <div>
                <strong className="text-red-900">Error:</strong>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-6">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
                  <h2 className="text-xl font-semibold text-gray-800">Health Status</h2>
                </div>
                <pre className="overflow-x-auto rounded-md bg-gray-100 p-4 text-sm">
                  {JSON.stringify(health, null, 2)}
                </pre>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
                  <h2 className="text-xl font-semibold text-gray-800">Hello Response</h2>
                </div>
                <pre className="overflow-x-auto rounded-md bg-gray-100 p-4 text-sm">
                  {JSON.stringify(hello, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="mt-8">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </Layout>
  )
}
