import { Clock, Calendar } from 'lucide-react'

const DayCounter = () => {
  const birthDate = new Date('2002-05-19T19:07:00+05:30')
  
  const calculateDaysRemaining = (targetYears: number) => {
    const targetDate = new Date(birthDate)
    targetDate.setFullYear(birthDate.getFullYear() + targetYears)
    const today = new Date()
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  const milestones = [
    { years: 25, label: '25th Birthday' },
    { years: 30, label: '30th Birthday' },
    { years: 40, label: '40th Birthday' },
    { years: 60, label: '60th Birthday' },
  ]

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Calendar className="w-6 h-6" />
        Birthday Countdown
      </h2>
      <div className="grid gap-4">
        {milestones.map(({ years, label }) => (
          <div key={years} className="bg-white/10 p-4 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="font-medium">{label}</span>
              </div>
              <span className="text-xl font-bold">
                {calculateDaysRemaining(years)} days remaining
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DayCounter