import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

const data = [
  { fecha: '2023-01-01', casos: 1500 },
  { fecha: '2023-01-02', casos: 1600 },
  { fecha: '2023-01-03', casos: 1700 },
  { fecha: '2023-01-04', casos: 1800 },
]

export function CovidDataChart() {
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">📈 Evolución COVID (Demo)</h3>
      <LineChart width={400} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="fecha" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="casos" stroke="#8884d8" />
      </LineChart>
    </div>
  )
}
