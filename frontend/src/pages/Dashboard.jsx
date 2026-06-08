import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { practiceApi } from '../api/practice'
import { reedApi } from '../api/reeds'

function formatDuration(min) {
  if (!min) return '0m'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  })
}

export default function Dashboard() {
  const queryClient = useQueryClient()

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['practice-summary'],
    queryFn: practiceApi.summary,
  })

  const { data: recentData } = useQuery({
    queryKey: ['practice-recent'],
    queryFn: () => practiceApi.list({ limit: 5, offset: 0 }),
  })

  const { data: reeds = [] } = useQuery({
    queryKey: ['reeds'],
    queryFn: reedApi.listActive,
  })

  const { data: insights, isLoading: insightsLoading, isError: insightsError, isFetching: insightsFetching } = useQuery({
    queryKey: ['insights'],
    queryFn: practiceApi.insights,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  })

  const recentSessions = recentData?.sessions ?? []
  const flaggedReeds = reeds.filter(r => r.usageMinutes >= 1200)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h1 style={{ margin: 0 }}>Dashboard</h1>

      {/* Summary Cards */}
      <div style={cardGridStyle}>
        <SummaryCard
          label="This Week"
          value={summaryLoading ? '—' : formatDuration(summary?.totalMinutesThisWeek)}
          sub="practice time"
          color="#2563eb"
        />
        <SummaryCard
          label="This Month"
          value={summaryLoading ? '—' : formatDuration(summary?.totalMinutesThisMonth)}
          sub="practice time"
          color="#7c3aed"
        />
        <SummaryCard
          label="Streak"
          value={summaryLoading ? '—' : summary?.streak > 0 ? `${summary.streak}` : '0'}
          sub={summary?.streak === 1 ? 'day in a row' : 'days in a row'}
          color="#059669"
        />
        <SummaryCard
          label="Top Skill (Month)"
          value={summaryLoading ? '—' : summary?.topSkillThisMonth ?? '—'}
          sub="most practiced"
          color="#d97706"
        />
      </div>

      {/* Quick Access */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        <QuickLink to="/practice" label="Practice Log" desc="Log a session or review history" />
        <QuickLink to="/sight-reading" label="Sight Reading" desc="Generate and practice a passage" />
        <QuickLink to="/reeds" label="Reed Tracker" desc="Manage your reeds and usage" />
      </div>

      {/* Recent Sessions + Reed Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

        {/* Recent Sessions */}
        <section style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.875rem' }}>
            <h2 style={panelHeadStyle}>Recent Sessions</h2>
            <Link to="/practice" style={{ fontSize: '0.85rem' }}>View all →</Link>
          </div>

          {recentSessions.length === 0 && (
            <p style={mutedText}>No sessions yet. <Link to="/practice">Log your first one.</Link></p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentSessions.map(s => (
              <div key={s.id} style={recentSessionRow}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{formatDate(s.date)}</span>
                  <span style={{ fontSize: '0.85rem', color: '#555' }}>{formatDuration(s.durationMinutes)}</span>
                </div>
                {(s.pieces.length > 0 || s.skills.length > 0) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
                    {s.pieces.slice(0, 2).map(p => <Chip key={p} label={p} bg="#eff6ff" color="#1d4ed8" />)}
                    {s.skills.slice(0, 3).map(sk => <Chip key={sk} label={sk} bg="#f0fdf4" color="#166534" />)}
                    {(s.pieces.length + s.skills.length) > 5 && (
                      <Chip label={`+${s.pieces.length + s.skills.length - 5}`} bg="#f3f4f6" color="#6b7280" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Reed Status */}
        <section style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.875rem' }}>
            <h2 style={panelHeadStyle}>Reed Status</h2>
            <Link to="/reeds" style={{ fontSize: '0.85rem' }}>Manage →</Link>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.875rem' }}>
            <Stat label="Active reeds" value={reeds.length} />
            <Stat label="Near retirement" value={flaggedReeds.length} alert={flaggedReeds.length > 0} />
          </div>

          {reeds.length === 0 && (
            <p style={mutedText}>No active reeds. <Link to="/reeds">Add one.</Link></p>
          )}

          {flaggedReeds.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <p style={{ margin: '0 0 0.375rem', fontSize: '0.8rem', fontWeight: 600, color: '#92400e' }}>
                Consider retiring:
              </p>
              {flaggedReeds.map(r => (
                <div key={r.id} style={flaggedReedRow}>
                  <span style={{ fontWeight: 500 }}>{r.identifier}</span>
                  <span style={{ fontSize: '0.8rem', color: '#b45309' }}>
                    {formatDuration(r.usageMinutes)} used
                  </span>
                </div>
              ))}
            </div>
          )}

          {reeds.length > 0 && flaggedReeds.length === 0 && (
            <p style={{ ...mutedText, margin: 0 }}>All reeds are in good shape.</p>
          )}
        </section>
      </div>

      {/* AI Insights */}
      <AIInsightsPanel
        insights={insights}
        isLoading={insightsLoading}
        isError={insightsError}
        isFetching={insightsFetching}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['insights'] })}
      />
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────

function SummaryCard({ label, value, sub, color }) {
  return (
    <div style={{ ...panelStyle, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.25rem' }}>
        {sub}
      </div>
    </div>
  )
}

function QuickLink({ to, label, desc }) {
  return (
    <Link
      to={to}
      style={{
        display: 'block', padding: '0.875rem 1rem',
        background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 8,
        textDecoration: 'none', color: 'inherit',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ fontWeight: 600, color: '#0066cc', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontSize: '0.8rem', color: '#888' }}>{desc}</div>
    </Link>
  )
}

function Chip({ label, bg, color }) {
  return (
    <span style={{ background: bg, color, padding: '0.1rem 0.4rem', borderRadius: 3, fontSize: '0.75rem' }}>
      {label}
    </span>
  )
}

function Stat({ label, value, alert }) {
  return (
    <div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: alert ? '#b45309' : '#222' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#888' }}>{label}</div>
    </div>
  )
}

function AIInsightsPanel({ insights, isLoading, isError, isFetching, onRefresh }) {
  return (
    <section style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, ...panelHeadStyle }}>AI Insights</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#999' }}>Updates daily</span>
          <button onClick={onRefresh} disabled={isFetching} style={refreshBtnStyle}>
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {isLoading && <InsightsSkeleton />}

      {isError && (
        <p style={{ color: '#c00', fontSize: '0.9rem', margin: 0 }}>
          Could not load insights. Check that ANTHROPIC_API_KEY is set and try again.
        </p>
      )}

      {!isLoading && !isError && insights?.insufficient && (
        <div style={emptyInsightsStyle}>
          <p style={{ margin: 0 }}>
            Log at least 5 practice sessions to unlock AI insights.
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#888' }}>
            You have {insights.sessionCount} session{insights.sessionCount === 1 ? '' : 's'} so far.
          </p>
        </div>
      )}

      {!isLoading && !isError && insights && !insights.insufficient && (
        <>
          <div style={insightsGridStyle}>
            <InsightSection title="Strengths" items={insights.strengths} dotColor="#16a34a" />
            <InsightSection title="Areas to Focus On" items={insights.focusAreas} dotColor="#d97706" />
            <InsightSection title="This Week's Recommendations" items={insights.recommendations} dotColor="#2563eb" />
          </div>
          {insights.patterns && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#f8f8f8', borderRadius: 6, borderLeft: '3px solid #e5e7eb' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#555', fontStyle: 'italic' }}>
                {insights.patterns}
              </p>
            </div>
          )}
          {insights.generatedAt && (
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', color: '#bbb', textAlign: 'right' }}>
              Generated {new Date(insights.generatedAt).toLocaleString()}
            </p>
          )}
        </>
      )}
    </section>
  )
}

function InsightSection({ title, items = [], dotColor }) {
  return (
    <div style={insightBoxStyle}>
      <h3 style={{ margin: '0 0 0.625rem', fontSize: '0.8rem', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {title}
      </h3>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem', color: '#444', lineHeight: 1.45 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: '0.4rem' }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function InsightsSkeleton() {
  return (
    <div style={insightsGridStyle}>
      {[1, 2, 3].map(i => (
        <div key={i} style={insightBoxStyle}>
          <div style={{ ...skeletonLine, width: '50%', height: 12, marginBottom: '0.875rem' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ ...skeletonLine, width: '90%' }} />
            <div style={{ ...skeletonLine, width: '75%' }} />
            <div style={{ ...skeletonLine, width: '82%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────

const panelStyle = {
  background: '#fafafa',
  border: '1px solid #eee',
  borderRadius: 8,
  padding: '1.1rem 1.25rem',
}
const panelHeadStyle = {
  margin: 0,
  fontSize: '0.95rem',
  fontWeight: 600,
}
const cardGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '0.75rem',
}
const recentSessionRow = {
  padding: '0.5rem 0.625rem',
  border: '1px solid #e5e7eb',
  borderRadius: 5,
  background: 'white',
}
const flaggedReedRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.35rem 0.625rem',
  background: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: 4,
  fontSize: '0.875rem',
}
const mutedText = { color: '#888', fontSize: '0.875rem', margin: 0 }
const refreshBtnStyle = {
  padding: '0.3rem 0.75rem',
  fontSize: '0.8rem',
  border: '1px solid #ccc',
  borderRadius: 4,
  background: 'white',
  cursor: 'pointer',
  color: '#444',
}
const emptyInsightsStyle = {
  padding: '1rem',
  background: '#fff8e1',
  border: '1px solid #ffe082',
  borderRadius: 6,
  color: '#795548',
}
const insightsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: '0.875rem',
}
const insightBoxStyle = {
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  padding: '0.875rem 1rem',
}
const skeletonLine = {
  height: 14,
  borderRadius: 4,
  background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
}
