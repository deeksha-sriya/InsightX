import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import './App.css'

function App() {

  const [csvInsights, setCsvInsights] = useState([])
  const [selectedDate, setSelectedDate] = useState('all')
  const filteredInsights =
  selectedDate === 'all'
    ? csvInsights
    : csvInsights.filter((item) => item.date === selectedDate)

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
          <a className="nav-item" href="#inventory">◷ <span>Inventory Risk</span></a>
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

        <section className="metrics-grid">
          <article className="metric-card">
            <div className="metric-heading">DEMAND SPIKE EVENTS <span>↗</span></div>
            <div className="metric-value">{csvInsights.length}</div>
            <div className="metric-caption">Detected across the dataset</div>
            <div className="metric-foot"><span className="metric-dot purple" /> Views + carts + purchases rising</div>
          </article>

          <article className="metric-card">
            <div className="metric-heading">STOCKOUT RISK <span>⚠</span></div>
            <div className="metric-value">
              {csvInsights.filter((item) => String(item.stockout_risk).toLowerCase() === 'true').length}
            </div>
            <div className="metric-caption">Sample alerts shown below</div>
            <div className="metric-foot"><span className="metric-dot red" /> Potential risks using simulated inventory</div>
          </article>

          <article className="metric-card">
            <div className="metric-heading">PRODUCTS ANALYZED <span>▦</span></div>
            <div className="metric-value">
              {new Set(csvInsights.map((item) => item.product_id)).size.toLocaleString()}
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

        <section className="section-heading" id="insights">
          <div>
            <p className="eyebrow">INVESTIGATE</p>
            <h2>Demand signals</h2>
            <p>Products showing unusual increases in shopping activity.</p>
            <div className="filter-bar">
            <label htmlFor="date-filter">Filter by date:</label>
            <select
              id="date-filter"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
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
            onClick={() => 
              document
                .getElementById('insight-table')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
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
            <span className="table-count">Showing {Math.min(csvInsights.length, 10)} of {csvInsights.length} events</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>DETECTED ON</th>
                  <th>VIEWS</th>
                  <th>CART EVENTS</th>
                  <th>PURCHASE EVENTS</th>
                  <th>RISK</th>
                </tr>
              </thead>
              <tbody>

                {[...filteredInsights]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 10)
                  .map((item) => (
                  <tr key={`${item.product_id}-${item.date}`}>
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
                    <td>
                      <span
                        className={`risk-badge ${
                          String(item.stockout_risk).toLowerCase() === 'true'
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
          <div className="table-note">Percentage changes compare observed events with a preceding rolling baseline. Risk labels are illustrative for this demo.</div>
        </section>

        <footer>InsightX <span>•</span> AI-powered demand intelligence <span>•</span> Historical prototype</footer>
      </main>
    </div>
  )
}

export default App