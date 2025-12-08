import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { FaAngleRight } from 'react-icons/fa';

interface DataPoint {
  fecha: string
  casos: number
  comunidad: string
}

interface CovidChartProps {
  data: DataPoint[]
}

export default function CovidChart({ data }: CovidChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
        <p className="text-gray-500">No hay datos para mostrar</p>
      </div>
    )
  }

  // Agrupar por fecha para ver evolución total
  const byDate = data.reduce((acc, curr) => {
    if (!acc[curr.fecha]) {
      acc[curr.fecha] = { fecha: curr.fecha, total: 0, madrid: 0, cataluna: 0 }
    }
    acc[curr.fecha].total += curr.casos
    if (curr.comunidad === 'Madrid') acc[curr.fecha].madrid = curr.casos
    if (curr.comunidad === 'Cataluña') acc[curr.fecha].cataluna = curr.casos
    return acc
  }, {} as Record<string, any>)

  const chartData = Object.values(byDate).sort((a: any, b: any) => 
    new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  )

  // Datos por comunidad (última fecha)
  const latestData = data.filter(d => {
    const latestDate = Math.max(...data.map(item => new Date(item.fecha).getTime()))
    return new Date(d.fecha).getTime() === latestDate
  })

  return (
    <div className="space-y-8">
      {/* Gráfico de líneas */}
      <div>
        <h3 className="text-lg font-semibold mb-4"><FaAngleRight /> Evolución Total de Casos</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#8884d8" name="Total España" />
            <Line type="monotone" dataKey="madrid" stroke="#82ca9d" name="Madrid" />
            <Line type="monotone" dataKey="cataluna" stroke="#ffc658" name="Cataluña" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de barras por comunidad */}
      <div>
        <h3 className="text-lg font-semibold mb-4"><FaAngleRight /> Casos por Comunidad</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={latestData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="comunidad" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="casos" fill="#4f46e5" name="Casos" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
