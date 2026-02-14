import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export function Home() {
  return (
    <Layout>
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Heart className="h-10 w-10 text-purple-600" />
            <CardTitle>Worship Room</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-lg text-gray-600">
            Welcome to the Worship Room application!
          </p>
          <nav>
            <Link to="/health">
              <Button>Check Backend Health</Button>
            </Link>
          </nav>
        </CardContent>
      </Card>
    </Layout>
  )
}
