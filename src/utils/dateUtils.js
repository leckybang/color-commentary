export function getWeekRange(date = new Date()) {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export function getWeekId(date = new Date()) {
  const { start } = getWeekRange(date)
  return start.toISOString().split('T')[0]
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatWeekRange(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  const sMonth = s.toLocaleDateString('en-US', { month: 'short' })
  const eMonth = e.toLocaleDateString('en-US', { month: 'short' })
  if (sMonth === eMonth) {
    return `${sMonth} ${s.getDate()} - ${e.getDate()}, ${s.getFullYear()}`
  }
  return `${sMonth} ${s.getDate()} - ${eMonth} ${e.getDate()}, ${s.getFullYear()}`
}

export function getRelativeWeek(offset) {
  const date = new Date()
  date.setDate(date.getDate() + offset * 7)
  return getWeekRange(date)
}
