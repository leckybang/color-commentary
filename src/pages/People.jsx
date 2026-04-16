import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, MessageCircle } from 'lucide-react'
import Friends from './Friends'
import Together from './Together'

const TABS = [
  { key: 'friends', label: 'Friends', icon: Users },
  { key: 'chat', label: 'Group Chat', icon: MessageCircle },
]

export default function People() {
  const [params, setParams] = useSearchParams()
  const initialTab = TABS.find(t => t.key === params.get('tab'))?.key || 'friends'
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    const current = params.get('tab')
    if (current !== activeTab) {
      setParams({ tab: activeTab }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-bg-secondary border border-border rounded-xl p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'bg-accent-primary/15 text-accent-primary' : 'text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'friends' && <Friends />}
      {activeTab === 'chat' && <Together />}
    </div>
  )
}
