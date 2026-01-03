import { useState, useEffect } from 'react'
import { db } from './firebase'
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore'
import './App.css'

type FrequencyUnit = 'hours' | 'days' | 'weeks' | 'months'

interface Todo {
  id: string
  event: string
  frequency: { value: number; unit: FrequencyUnit }
  lastExecuteTime: number | null
  nextExecuteTime: number
  createdAt: number
}

const COLLECTION = 'todos'

const frequencyToMs = (f: { value: number; unit: FrequencyUnit }) => {
  const ms = { hours: 3600000, days: 86400000, weeks: 604800000, months: 2592000000 }
  return f.value * ms[f.unit]
}

const formatDateTime = (ts: number | null) => {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

const formatDateInput = (ts: number | null) => {
  if (!ts) return ''
  const d = new Date(ts)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const formatRelative = (ts: number) => {
  const diff = ts - Date.now()
  const abs = Math.abs(diff)
  if (diff < 0) return 'Overdue'
  if (abs < 3600000) return `${Math.round(abs / 60000)}m`
  if (abs < 86400000) return `${Math.round(abs / 3600000)}h`
  return `${Math.round(abs / 86400000)}d`
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([])

  // Load todos from Firestore on mount
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, COLLECTION), (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data() as Todo)
      setTodos(items)
    })
    return () => unsubscribe()
  }, [])

  const saveTodo = async (todo: Todo) => {
    try {
      await setDoc(doc(db, COLLECTION, todo.id), todo)
      console.log('Saved todo:', todo.id)
    } catch (error) {
      console.error('Error saving todo:', error)
    }
  }

  const addTodo = async () => {
    const now = Date.now()
    const freq = { value: 1, unit: 'days' as FrequencyUnit }
    const todo: Todo = {
      id: crypto.randomUUID(),
      event: 'New Task',
      frequency: freq,
      lastExecuteTime: now,
      nextExecuteTime: now + frequencyToMs(freq),
      createdAt: now
    }
    await saveTodo(todo)
  }

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    const updated = { ...todo, ...updates }
    if (updates.frequency || updates.lastExecuteTime !== undefined) {
      const base = updated.lastExecuteTime ?? todo.createdAt
      updated.nextExecuteTime = base + frequencyToMs(updated.frequency)
    }
    await saveTodo(updated)
  }

  const complete = async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    const now = Date.now()
    await saveTodo({
      ...todo,
      lastExecuteTime: now,
      nextExecuteTime: now + frequencyToMs(todo.frequency)
    })
  }

  const skip = async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    const now = Date.now()
    await saveTodo({
      ...todo,
      nextExecuteTime: now + frequencyToMs(todo.frequency)
    })
  }

  const remove = async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id))
  }

  const sorted = [...todos].sort((a, b) => a.nextExecuteTime - b.nextExecuteTime)
  const overdueItems = sorted.filter(t => t.nextExecuteTime < Date.now())
  const urgentItems = sorted.filter(t => t.nextExecuteTime >= Date.now()).slice(0, 2)

  return (
    <div className="container">
      <header>
        <h1>Todo Tracker</h1>
      </header>

      <section className="summary">
        <h2>Summary</h2>
        {overdueItems.length > 0 && (
          <div className="summary-group">
            <div className="summary-label overdue">Overdue ({overdueItems.length})</div>
            <ul className="summary-list">
              {overdueItems.map(t => (
                <li key={t.id} className="summary-item overdue">
                  <span className="summary-event">{t.event}</span>
                  <span className="summary-freq">{t.frequency.value} {t.frequency.unit}</span>
                  <span className="summary-time">Last: {formatDateTime(t.lastExecuteTime)}</span>
                  <span className="summary-time">Next: {formatDateTime(t.nextExecuteTime)}</span>
                  <span className="summary-actions">
                    <button className="complete" onClick={() => complete(t.id)}>Complete</button>
                    <button className="skip" onClick={() => skip(t.id)}>Skip</button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {urgentItems.length > 0 && (
          <div className="summary-group">
            <div className="summary-label">Upcoming</div>
            <ul className="summary-list">
              {urgentItems.map(t => (
                <li key={t.id} className="summary-item">
                  <span className="summary-event">{t.event}</span>
                  <span className="summary-freq">{t.frequency.value} {t.frequency.unit}</span>
                  <span className="summary-time">Last: {formatDateTime(t.lastExecuteTime)}</span>
                  <span className="summary-time">Next: {formatDateTime(t.nextExecuteTime)} ({formatRelative(t.nextExecuteTime)})</span>
                  <span className="summary-actions">
                    <button className="complete" onClick={() => complete(t.id)}>Complete</button>
                    <button className="skip" onClick={() => skip(t.id)}>Skip</button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {todos.length === 0 && <p className="empty">No tasks yet.</p>}
      </section>

      <section className="add-section">
        <button className="add-btn" onClick={addTodo}>+ Add New Task</button>
      </section>

      <section className="tracker">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Frequency</th>
              <th>Last Execute</th>
              <th>Next Execute</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(todo => {
              const isOverdue = todo.nextExecuteTime < Date.now()
              return (
                <tr key={todo.id} className={isOverdue ? 'overdue' : ''}>
                  <td>
                    <input
                      type="text"
                      className="cell-input"
                      value={todo.event}
                      onChange={e => updateTodo(todo.id, { event: e.target.value })}
                    />
                  </td>
                  <td className="freq-cell">
                    <input
                      type="number"
                      className="cell-input freq-num"
                      min="1"
                      value={todo.frequency.value}
                      onChange={e => updateTodo(todo.id, { frequency: { ...todo.frequency, value: Number(e.target.value) } })}
                    />
                    <select
                      className="cell-input"
                      value={todo.frequency.unit}
                      onChange={e => updateTodo(todo.id, { frequency: { ...todo.frequency, unit: e.target.value as FrequencyUnit } })}
                    >
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                      <option value="weeks">weeks</option>
                      <option value="months">months</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="datetime-local"
                      className="cell-input date-input"
                      value={formatDateInput(todo.lastExecuteTime)}
                      onChange={e => {
                        if (!e.target.value) return
                        updateTodo(todo.id, { lastExecuteTime: new Date(e.target.value).getTime() })
                      }}
                    />
                  </td>
                  <td className="date-cell">{formatDateTime(todo.nextExecuteTime)}</td>
                  <td className="actions">
                    <button className="complete" onClick={() => complete(todo.id)}>Complete</button>
                    <button className="skip" onClick={() => skip(todo.id)}>Skip</button>
                    <button className="delete" onClick={() => remove(todo.id)}>×</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {todos.length === 0 && <p className="empty">Click "Add New Task" to get started.</p>}
      </section>
    </div>
  )
}

export default App
