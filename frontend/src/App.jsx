import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ComposedChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  Cell,
} from 'recharts'
import './App.css'
import ReactMarkdown from 'react-markdown'

function getPriorityLevel(score) {
  if (score >= 75) return 'Critical'
  if (score >= 50) return 'High'
  if (score >= 25) return 'Moderate'
  return 'Low'
}

function App() {

  const [csvInsights, setCsvInsights] = useState([])
  const [selectedDate, setSelectedDate] = useState('all')
  const [selectedInsight, setSelectedInsight] = useState(null)
  const [aiQuestion, setAiQuestion] = useState(
    'Explain this demand spike and recommend what the business should do next.'
  )
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [executiveSummary, setExecutiveSummary] = useState('')
  const [executiveMetrics, setExecutiveMetrics] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState('')
  const [timeGrouping, setTimeGrouping] = useState('weekly')
  const [chartMetric, setChartMetric] = useState('events')
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [investigationRequested, setInvestigationRequested] =
  useState(false)
  async function askGemini() {
    if (!selectedInsight || !aiQuestion.trim() || aiLoading) return

    const question = aiQuestion.trim()
    const previousHistory = chatHistory

    setAiLoading(true)
    setAiError('')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          event: selectedInsight,
          history: previousHistory,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Could not get AI analysis.')
      }

      if (!data.answer) {
        throw new Error('Gemini returned an empty response.')
      }

      setChatHistory([
        ...previousHistory,
        { role: 'user', content: question },
        { role: 'assistant', content: data.answer },
      ])

      setAiQuestion('')
    } catch (error) {
      setAiError(error.message || 'Something went wrong.')
    } finally {
      setAiLoading(false)
    }
  }

  async function generateExecutiveSummary() {
    if (summaryLoading) return

    setSummaryLoading(true)
    setSummaryError('')

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/executive-summary`,
        { method: 'POST' }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || 'Could not generate executive summary.'
        )
      }

      setExecutiveSummary(data.summary)
      setExecutiveMetrics(data.metrics)
    } catch (error) {
      setSummaryError(
        error.message || 'Something went wrong.'
      )
    } finally {
      setSummaryLoading(false)
    }
  }


  const filteredInsights =
    selectedDate === 'all'
      ? csvInsights
      : csvInsights.filter((item) => item.date === selectedDate)
  const priorityCounts = {
    critical: filteredInsights.filter(
      (item) => Number(item.priority_score) >= 75
    ).length,

    high: filteredInsights.filter(
      (item) =>
        Number(item.priority_score) >= 50 &&
        Number(item.priority_score) < 75
    ).length,

    moderate: filteredInsights.filter(
      (item) =>
        Number(item.priority_score) >= 25 &&
        Number(item.priority_score) < 50
    ).length,

    low: filteredInsights.filter(
      (item) => Number(item.priority_score) < 25
    ).length,
  }

  const sortedInsights = [...filteredInsights].sort(
    (a, b) => Number(b.priority_score) - Number(a.priority_score)
  );

  const totalPages = Math.max(
    1,
    Math.ceil(sortedInsights.length / ITEMS_PER_PAGE)
  );

  const paginatedInsights = sortedInsights.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const startEvent =
    sortedInsights.length === 0
      ? 0
      : (currentPage - 1) * ITEMS_PER_PAGE + 1;

  const endEvent = Math.min(
    currentPage * ITEMS_PER_PAGE,
    sortedInsights.length
  );

  const chartColors = ['#F27FA7', '#A78BFA', '#55E6B0', '#87788E']

  const priorityChartData = [
    { name: 'Critical', value: priorityCounts.critical, color: '#ff5c7a' },
    { name: 'High', value: priorityCounts.high, color: '#f2b07a' },
    { name: 'Moderate', value: priorityCounts.moderate, color: '#9a8cf2' },
    { name: 'Low', value: priorityCounts.low, color: '#6e6a85' },
  ]


  const dailyChartData = Object.values(
    filteredInsights.reduce((groups, item) => {
      const date = String(item.date)

      if (!groups[date]) {
        groups[date] = {
          date,
          events: 0,
          purchases: 0,
          critical: 0,
          products: new Set(),
        }
      }

      groups[date].events += 1
      groups[date].purchases += Number(item.purchase_events) || 0
      groups[date].products.add(String(item.product_id))

      if (Number(item.priority_score) >= 75) {
        groups[date].critical += 1
      }

      return groups
    }, {})
  )
    .map((item) => ({
      ...item,
      products: item.products.size,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))


  const groupedChartData = (() => {
    const groups = {}

    dailyChartData.forEach((day) => {
      const date = new Date(`${day.date}T00:00:00`)

      let key = day.date

      if (timeGrouping === 'weekly') {
        const weekStart = new Date(date)
        const dayOfWeek = (weekStart.getDay() + 6) % 7
        weekStart.setDate(weekStart.getDate() - dayOfWeek)
        key = weekStart.toISOString().slice(0, 10)
      } else if (timeGrouping === 'monthly') {
        key = day.date.slice(0, 7)
      }

      if (!groups[key]) {
        groups[key] = {
          date: key,
          events: 0,
          purchases: 0,
          critical: 0,
        }
      }

      groups[key].events += day.events
      groups[key].purchases += day.purchases
      groups[key].critical += day.critical
    })

    return Object.values(groups)
      .map((item) => ({
        ...item,
        label:
          timeGrouping === 'monthly'
            ? item.date
            : timeGrouping === 'weekly'
              ? `Week of ${item.date.slice(5)}`
              : item.date.slice(5),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  })()

const chartMean = groupedChartData.length
  ? groupedChartData.reduce(
      (sum, item) => sum + item[chartMetric],
      0
    ) / groupedChartData.length
  : 0

const chartStdDev = groupedChartData.length
  ? Math.sqrt(
      groupedChartData.reduce(
        (sum, item) => sum + (item[chartMetric] - chartMean) ** 2,
        0
      ) / groupedChartData.length
    )
  : 0

const chartThreshold = chartMean + chartStdDev


  const averageDailyEvents = dailyChartData.length
    ? dailyChartData.reduce((sum, day) => sum + day.events, 0) /
      dailyChartData.length
    : 0

  const dailyEventStdDev = dailyChartData.length
    ? Math.sqrt(
        dailyChartData.reduce(
          (sum, day) => sum + (day.events - averageDailyEvents) ** 2,
          0
        ) / dailyChartData.length
      )
    : 0

  const spikeThreshold = averageDailyEvents + dailyEventStdDev

  const timelineData = dailyChartData.map((day) => ({
    ...day,
    isSpike: day.events > spikeThreshold,
  }))


  const topSpikeData = [...filteredInsights]
    .sort(
      (a, b) =>
        (Number(b.purchase_change_pct) || 0) -
        (Number(a.purchase_change_pct) || 0)
    )
    .slice(0, 7)
    .map((item) => ({
      product: `#${item.product_id}`,
      increase: Number(
        (Number(item.purchase_change_pct) || 0).toFixed(1)
      ),
      date: item.date,
      priority: Number(item.priority_score) || 0,
    }))

  function handleTimelineClick(chartItem) {
    const clicked = chartItem

    console.log('Timeline bar clicked:', clicked)

    if (!clicked?.date) {
      console.warn('Could not identify the clicked bar data.')
      return
    }

    const startDate = String(clicked.date)
    let endDate = startDate

    if (timeGrouping === 'weekly') {
      const end = new Date(`${startDate}T00:00:00`)
      end.setDate(end.getDate() + 6)
      endDate = end.toISOString().slice(0, 10)
    } else if (timeGrouping === 'monthly') {
      const [year, month] = startDate.split('-').map(Number)
      endDate = new Date(year, month, 0).toISOString().slice(0, 10)
    }

    const matchingInsights = filteredInsights
      .filter((item) => {
        const date = String(item.date).slice(0, 10)
        return date >= startDate && date <= endDate
      })
      .sort(
        (a, b) =>
          (Number(b.priority_score) || 0) -
          (Number(a.priority_score) || 0)
      )

    console.log('Matching insights:', matchingInsights.length)

    if (matchingInsights.length > 0) {
      setSelectedInsight(matchingInsights[0])
      setChatHistory([])
      setAiError('')
      setAiQuestion(
        'Explain this demand spike and recommend what the business should do next.'
      )
      setInvestigationRequested(true)
    } else {
      console.warn('No insights found for the selected date range.')
    }
  }

  useEffect(() => {
    fetch('/insights.csv')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Could not load insights.csv')
        }
        return response.text()
      })
      .then((csvText) => {
        const result = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
        })

        setCsvInsights(result.data)
        console.log('InsightX loaded CSV rows:', result.data.length)
        console.log('First insight:', result.data[0])
      })
      .catch((error) => {
        console.error('Error loading InsightX data:', error)
      })
  }, [])
  useEffect(() => {
    if (investigationRequested && selectedInsight) {
      document
        .querySelector('.investigation-panel')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })

      setInvestigationRequested(false)
    }
  }, [investigationRequested, selectedInsight])
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">✳</div>
          <div>
            <h2>InsightX</h2>
            <span>DEMAND INTELLIGENCE</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav>
          <a className="nav-item active" href="#overview">▦ <span>Overview</span></a>
          <a className="nav-item" href="#insights">⌁ <span>Demand Insights</span></a>
        </nav>

        <div className="sidebar-bottom">
          <div className="profile-avatar">GM</div>
          <div>
            <strong>GlowMuse</strong>
            <span className="profile-subtitle">Demo workspace</span>
          </div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> Overview</div>
          <div className="demo-badge"><span /> Historical demo data</div>
        </header>

        <section className="welcome">
          <div>
            <p className="eyebrow">BUSINESS OVERVIEW</p>
            <h1>Good morning, GlowMuse <span>✳</span></h1>
            <p className="welcome-text">
              Discover demand spikes, investigate product trends, and identify potential risks.
            </p>
          </div>
          <div className="date-chip">◷ &nbsp; Oct 2019 – Feb 2020</div>
        </section>

        <section className="notice">
          <span className="notice-icon">ⓘ</span>
          <div>
            <strong>Exploring historical retail data</strong>
            <p>This prototype uses historical cosmetics shopping events. Inventory figures are simulated, not live stock levels.</p>
          </div>
        </section>
        <section className="executive-summary-section">
          <div className="executive-summary-header">
            <div>
              <p className="eyebrow">AI BUSINESS BRIEFING</p>
              <h2>Executive Summary ✨</h2>
              <p>
                Understand the biggest demand signals and business priorities
                across your historical dataset.
              </p>
            </div>

            <button
              className="secondary-button"
              onClick={generateExecutiveSummary}
              disabled={summaryLoading}
            >
              {summaryLoading
                ? 'Generating...'
                : executiveSummary
                  ? 'Regenerate Summary'
                  : 'Generate Summary'}
            </button>
          </div>

          <p className="data-note">
            Historical data from October 2019 to February 2020.
            Inventory figures are simulated.
          </p>

          {summaryError && (
            <p className="ai-error">{summaryError}</p>
          )}

          {executiveMetrics && (
            <div className="executive-metrics-grid">
              <div>
                <span>Detected Events</span>
                <strong>{executiveMetrics.total_events}</strong>
              </div>
              <div>
                <span>Critical Events</span>
                <strong>{executiveMetrics.critical_events}</strong>
              </div>
              <div>
                <span>High-Priority Events</span>
                <strong>{executiveMetrics.high_events}</strong>
              </div>
              <div>
                <span>Potential Stockout Flags</span>
                <strong>{executiveMetrics.potential_stockout_events}</strong>
              </div>
            </div>
          )}

          {executiveSummary && (
            <div className="executive-summary-report">
              <h3>GlowMuse Business Report</h3>
              <div className="markdown-response executive-markdown">
                <ReactMarkdown>{executiveSummary}</ReactMarkdown>
              </div>
            </div>
          )}
        </section>
        <section className="metrics-grid">
          <article className="metric-card">
            <div className="metric-heading">DEMAND SPIKE EVENTS <span>↗</span></div>
            <div className="metric-value">{filteredInsights.length}</div>
            <div className="metric-caption">{selectedDate === 'all'
              ? 'Detected across the dataset'
              : `Detected on ${selectedDate}`}</div>
            <div className="metric-foot"><span className="metric-dot purple" /> Views + carts + purchases rising</div>
          </article>

          <article className="metric-card">
            <div className="metric-heading">STOCKOUT RISK <span>⚠</span></div>
            <div className="metric-value">
              {filteredInsights.filter((item) => String(item.stockout_risk).toLowerCase() === 'true').length}
            </div>
            <div className="metric-caption">Sample alerts shown below</div>
            <div className="metric-foot"><span className="metric-dot red" /> Potential risks using simulated inventory</div>
          </article>

          <article className="metric-card">
            <div className="metric-heading">PRODUCTS ANALYZED <span>▦</span></div>
            <div className="metric-value">
              {new Set(filteredInsights.map((item) => item.product_id)).size.toLocaleString()}
            </div>
            <div className="metric-caption">Unique products in detected insights</div>
            <div className="metric-foot"><span className="metric-dot blue" /> Cosmetics retail dataset</div>
          </article>

          <article className="metric-card">
            <div className="metric-heading">DATA COVERAGE <span>◷</span></div>
            <div className="metric-value">5 months</div>
            <div className="metric-caption">October 2019 – February 2020</div>
            <div className="metric-foot"><span className="metric-dot green" /> Historical event records</div>
          </article>
        </section>
        <section className="charts-grid">

          <article className="chart-card chart-main">

          <div className="chart-heading">
            <div>
              <p className="eyebrow">HISTORICAL ACTIVITY</p>
              <h3>Demand Activity Timeline</h3>
              <p>Compare activity and identify unusually busy periods.</p>
            </div>

            <div className="chart-controls">
              <select
                value={timeGrouping}
                onChange={(e) => setTimeGrouping(e.target.value)}
                aria-label="Time grouping"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>

              <select
                value={chartMetric}
                onChange={(e) => setChartMetric(e.target.value)}
                aria-label="Activity metric"
              >
                <option value="events">Detected events</option>
                <option value="purchases">Purchase events</option>
                <option value="critical">Critical events</option>
              </select>
            </div>
          </div>
            <div className="chart-canvas">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={groupedChartData}
                  margin={{ top: 12, right: 12, bottom: 8, left: 0 }}
                >
                  <CartesianGrid
                    stroke="#38243B"
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#B6A6B9', fontSize: 10 }}
                    interval="preserveStartEnd"
                    minTickGap={20}
                  />

                  <YAxis
                    allowDecimals={false}
                    width={42}
                    tick={{ fill: '#B6A6B9', fontSize: 10 }}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1C1220',
                      border: '1px solid #F27FA7',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      color: '#F8F1F7',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                    }}
                    labelStyle={{
                      color: '#F27FA7',
                      fontWeight: 700,
                      marginBottom: '8px',
                    }}
                    itemStyle={{
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                    cursor={{ fill: 'rgba(242, 127, 167, 0.08)' }}
                    formatter={(value) => [
                      Number(value).toLocaleString(),
                      chartMetric === 'events'
                        ? 'Detected events'
                        : chartMetric === 'purchases'
                          ? 'Purchase events'
                          : 'Critical events',
                    ]}
                  />

                  <Bar
                    dataKey={chartMetric}
                    name="Activity"
                    onClick={(data, index) => {
                      console.log('BAR CLICKED', data, index)
                      handleTimelineClick(data)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {groupedChartData.map((item) => (
                    <Cell
                      key={item.date}
                      fill={
                        item[chartMetric] > chartThreshold
                          ? '#FF5C83'
                          : '#A78BFA'
                      }
                    />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-legend">
              <span className="legend-dot lavender" />
              Regular activity
              <span className="legend-dot rose" />
              Unusually busy day
            </div>

            <p className="chart-footnote">
              Each bar represents detected insight events, not total store sales.
              Highlighted days exceed the average daily event count by more than
              one standard deviation. This highlights busy alert days, not a
              replacement for the underlying product-level anomaly detector.
            </p>
          </article>
          <article className="chart-card">
            <div className="chart-heading">
              <div>
                <p className="eyebrow">PRIORITY BREAKDOWN</p>
                <h3>Alert distribution</h3>
                <p>Events grouped by priority score</p>
              </div>
            </div>

            <div className="chart-canvas donut-canvas">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="84%"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {priorityChartData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#1C1220',
                      border: '1px solid #70405F',
                      borderRadius: 10,
                      color: '#F8F1F7',
                    }}
                    formatter={(value, name) => [
                      `${Number(value).toLocaleString()} events`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="donut-center">
                <strong>{filteredInsights.length.toLocaleString()}</strong>
                <span>Events</span>
              </div>
            </div>

            <div className="chart-legend-list">
              {priorityChartData.map((item) => (
                <div className="chart-legend-row" key={item.name}>
                  <span
                    className="legend-dot"
                    style={{ background: item.color }}
                  />
                  <span>{item.name}</span>
                  <strong>{item.value.toLocaleString()}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="chart-card chart-wide">
            <div className="chart-heading">
              <div>
                <p className="eyebrow">GROWTH OPPORTUNITIES</p>
                <h3>Strongest purchase increases</h3>
                <p>Top detected events ranked by purchase change versus baseline</p>
              </div>
            </div>

            <div className="bar-chart-canvas">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topSpikeData}
                  layout="vertical"
                  margin={{ top: 4, right: 24, bottom: 4, left: 12 }}
                >
                  <CartesianGrid
                    stroke="#38243B"
                    strokeDasharray="3 3"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: '#B6A6B9', fontSize: 10 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="product"
                    tick={{ fill: '#F8F1F7', fontSize: 11 }}
                    width={65}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1C1220',
                      border: '1px solid #70405F',
                      borderRadius: 10,
                      color: '#F8F1F7',
                    }}
                    formatter={(value) => [`${value}%`, 'Purchase increase']}
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.date
                        ? `${label} · ${payload[0].payload.date}`
                        : label
                    }
                  />
                  <Bar
                    dataKey="increase"
                    name="Purchase increase"
                    fill="#F27FA7"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={24}
                  >
                  {topSpikeData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        d.priority >= 75
                          ? '#ff5c7a'
                          : d.priority >= 50
                            ? '#f2b07a'
                            : '#9a8cf2'
                      }
                    />
                  ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="chart-footnote">
              Percentage changes are relative to each event's historical rolling
              baseline. These are detected events, not a future demand forecast.
            </p>
          </article>
        </section>
        <section className="section-heading" id="insights">
          <div>
            <p className="eyebrow">INVESTIGATE</p>
            <h2>Demand signals</h2>
            <div className="priority-summary">
              <div>
                <span>Critical</span>
                <strong>{priorityCounts.critical}</strong>
              </div>
              <div>
                <span>High</span>
                <strong>{priorityCounts.high}</strong>
              </div>
              <div>
                <span>Moderate</span>
                <strong>{priorityCounts.moderate}</strong>
              </div>
              <div>
                <span>Low</span>
                <strong>{priorityCounts.low}</strong>
              </div>
              <p>
                Total prioritized events: {priorityCounts.critical +
                  priorityCounts.high +
                  priorityCounts.moderate +
                  priorityCounts.low}
              </p>
            </div>
            <p>Products showing unusual increases in shopping activity.</p>
            <div className="filter-bar">
              <label htmlFor="date-filter">Filter by date:</label>
              <select
                id="date-filter"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All dates</option>
                {[...new Set(csvInsights.map((item) => item.date))]
                  .sort((a, b) => new Date(b) - new Date(a))
                  .map((date) => (
                    <option key={date} value={date}>
                      {date}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <button
            className="secondary-button"
            onClick={() => {
              setCurrentPage(1);
              document
                .getElementById('insight-table')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            View all insights ↗
          </button>
        </section>

        <section className="table-card" id="insight-table">
          <div className="table-top">
            <div>
              <h3>Recent demand spikes</h3>
              <p>Sample events detected in historical data</p>
            </div>
            <span className="table-count">
              Showing {startEvent}–{endEvent} of {sortedInsights.length} events
            </span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>DETECTED ON</th>
                  <th>VIEWS CHANGE</th>
                  <th>CART CHANGE</th>
                  <th>PURCHASE CHANGE</th>
                  <th>VIEWS</th>
                  <th>CART EVENTS</th>
                  <th>PURCHASE EVENTS</th>
                  <th>PRIORITY / 100</th>
                  <th>SIGNAL STRENGTH</th>
                  <th>RISK</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInsights.map((item) => (
                    <tr
                      key={`${item.product_id}-${item.date}`}
                      onClick={() => {
                        setSelectedInsight(item)
                        setChatHistory([])
                        setAiQuestion(
                          'Explain this demand spike and recommend what the business should do next.'
                        )
                        setAiError('')
                      }}
                    >
                      <td>
                        <div className="product-cell">
                          <div className="product-icon">✳</div>
                          <strong>Product #{item.product_id}</strong>
                        </div>
                      </td>
                      <td>{item.date}</td>
                      <td className="positive">
                        {Number(item.view_change_pct) >= 0 ? '+' : ''}
                        {Number(item.view_change_pct).toFixed(1)}%
                      </td>
                      <td className="positive">
                        {Number(item.cart_change_pct) >= 0 ? '+' : ''}
                        {Number(item.cart_change_pct).toFixed(1)}%
                      </td>
                      <td className="positive">
                        {Number(item.purchase_change_pct) >= 0 ? '+' : ''}
                        {Number(item.purchase_change_pct).toFixed(1)}%
                      </td>
                      <td>{item.views}</td>
                      <td>{item.cart_events}</td>
                      <td>{item.purchase_events}</td>
                      <td>
                        <strong>{Number(item.priority_score).toFixed(1)}</strong>
                        <span> / 100</span>
                        <div className={`lvl lvl-${getPriorityLevel(Number(item.priority_score)).toLowerCase()}`}>
                          {getPriorityLevel(Number(item.priority_score))}
                        </div>
                      </td>
                      <td>{item.signal_strength || 'Not available'}</td>
                      <td>
                        <span
                          className={`risk-badge ${String(item.stockout_risk).toLowerCase() === 'true'
                              ? 'high'
                              : 'moderate'
                            }`}
                        >
                          {String(item.stockout_risk).toLowerCase() === 'true'
                            ? 'High'
                            : 'Moderate'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button
              className="secondary-button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
            >
              ← Previous
            </button>

            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>

            <button
              className="secondary-button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
            >
              Next →
            </button>
          </div>
          <div className="table-note">Percentage changes compare observed events with a preceding rolling baseline. Risk labels are illustrative for this demo.</div>
        </section>
        {selectedInsight && (
          <section className="investigation-panel">
            <p className="eyebrow">INVESTIGATION</p>

            <div className="investigation-header">
              <div>
                <h2>Product #{selectedInsight.product_id}</h2>
                <p>Demand spike detected on {selectedInsight.date}</p>
              </div>

              <button
                className="secondary-button"
                onClick={() => setSelectedInsight(null)}
              >
                Close ✕
              </button>
            </div>

            <div className="investigation-metrics">
              <div className="investigation-metric">
                <span>Views</span>
                <h3>
                  {selectedInsight.views}
                </h3>
                <p>
                  +{Number(selectedInsight.view_change_pct).toFixed(1)}% vs baseline
                </p>
              </div>

              <div className="investigation-metric">
                <span>Cart events</span>
                <h3>
                  {selectedInsight.cart_events}
                </h3>
                <p>
                  +{Number(selectedInsight.cart_change_pct).toFixed(1)}% vs baseline
                </p>
              </div>

              <div className="investigation-metric">
                <span>Purchases</span>
                <h3>
                  {selectedInsight.purchase_events}
                </h3>

                <p>
                  +{Number(selectedInsight.purchase_change_pct).toFixed(1)}% vs baseline
                </p>
              </div>
            </div>

            <div className="why-it-matters">
              <h3>Why this matters</h3>
              <p>
                <strong>Pattern:</strong>{' '}
                {selectedInsight.demand_pattern || 'Not available'}
              </p>

              <p>
                {selectedInsight.explanation || 'Explanation not available'}
              </p>
              <p>
                <strong>Observed evidence:</strong>{' '}
                {selectedInsight.evidence_summary || 'Evidence not available'}
              </p>
              <p>
                <strong>Signal strength:</strong>{' '}
                {selectedInsight.signal_strength || 'Not available'}
              </p>
              <p>
                <strong>Strongest signal:</strong>{' '}
                {selectedInsight.strongest_signal || 'Not available'}
                {' '}(
                {Number(selectedInsight.strongest_signal_change_pct).toFixed(1)}%
                above baseline)
              </p>
              <p>
                <strong>Business interpretation:</strong>{' '}
                {selectedInsight.signal_interpretation || 'Not available'}
              </p>
            </div>

            <div>
              <strong>Normal stock coverage:</strong>{' '}
              {Number(selectedInsight.normal_stock_days).toFixed(1)} days
            </div>

            <div>
              <strong>Current stock coverage:</strong>{' '}
              {Number(selectedInsight.current_stock_days).toFixed(1)} days
            </div>

            <div className="stockout-risk-box">
              <strong>Stockout risk</strong>

              <span
                className={
                  String(selectedInsight.stockout_risk).toLowerCase() === 'true'
                    ? 'risk-badge high'
                    : 'risk-badge moderate'
                }
              >
                {String(selectedInsight.stockout_risk).toLowerCase() === 'true'
                  ? 'High'
                  : 'Moderate'}
              </span>

              <p>
                Estimated stock coverage (simulated inventory):{' '}
                {Number(selectedInsight.current_stock_days).toFixed(1)} days
              </p>
              <p className="data-note">
                Inventory is simulated for this demo, not actual business stock data.
              </p>

            </div>

            <div className="recommendation-box">
              <h3>Recommended action</h3>
              <p>{selectedInsight.recommendation}</p>
            </div>

            <div className="ai-analysis-box">
              <div className="ai-analysis-heading">
                <div>
                  <p className="eyebrow">POWERED BY GEMINI</p>
                  <h3>Ask InsightX AI ✨</h3>
                  <p>Investigate this demand spike using AI.</p>
                </div>
                <button
                  type="button"
                  className="ai-clear-button"
                  onClick={() => {
                    setChatHistory([])
                    setAiError('')
                    setAiQuestion(
                      'Explain this demand spike and recommend what the business should do next.'
                    )
                  }}
                  disabled={aiLoading || chatHistory.length === 0}
                >
                  Clear conversation
                </button>
              </div>
              <textarea
                value={aiQuestion}
                onChange={(event) => setAiQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    askGemini()
                  }
                }}
                placeholder="Ask about this product's demand spike..."
                rows={3}
              />

              <div className="ai-suggestions">
                <span>Suggested questions</span>

                {[
                  'What should the business do first, and why?',
                  'What could be causing this demand spike?',
                  'What additional data would help confirm the root cause?',
                  'How can the business reduce stockout risk?',
                ].map((question) => (
                  <button
                    key={question}
                    type="button"
                    className="ai-suggestion-button"
                    onClick={() => setAiQuestion(question)}
                    disabled={aiLoading}
                  >
                    {question}
                  </button>
                ))}
              </div>

              <button
                className="secondary-button"
                onClick={askGemini}
                disabled={aiLoading || !aiQuestion.trim()}
              >
                {aiLoading ? 'Analyzing...' : '✨ Analyze with Gemini'}
              </button>

              {aiError && (
                <p className="ai-error">{aiError}</p>
              )}

              {aiLoading && (
                <p className="ai-status">
                  InsightX AI is investigating this demand spike...
                </p>
              )}
              <p className="ai-message-count">
                {chatHistory.filter((message) => message.role === 'user').length} questions asked
              </p>
              {chatHistory.length > 0 && (
                <div className="ai-chat-history">
                  {chatHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`ai-chat-message ${message.role}`}
                    >
                      <strong>
                        {message.role === 'user' ? 'You' : 'InsightX AI'}
                      </strong>

                      <div className="markdown-response">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

          </section>
        )}
        <footer>InsightX <span>•</span> AI-powered demand intelligence <span>•</span> Historical prototype</footer>
      </main>
    </div>
  )
}

export default App