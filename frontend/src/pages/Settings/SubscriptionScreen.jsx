// src/pages/Settings/SubscriptionScreen.jsx
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCheckCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import api from '../../api/apiService.js';

/* ------------------------------ helpers ------------------------------ */
const fmtDate = (d) => {
  if (!d) return 'N/A';
  const t = new Date(d);
  return Number.isNaN(+t)
    ? 'N/A'
    : t.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const centsToUSD = (c) => `$${(Number(c || 0) / 100).toFixed(2)}`;

const normalizeHistory = (arr) =>
  Array.isArray(arr)
    ? arr.map((h) => ({
        createdAt: h.createdAt ?? h.created ?? h.date ?? h.timestamp ?? null,
        endDate:
          h.endDate ??
          h.current_period_end ??
          h.currentPeriodEnd ??
          h.periodEnd ??
          h.renewalDate ??
          null,
        planRaw: (h.plan ?? h.price?.nickname ?? 'monthly').toString().toLowerCase(),
        isTrial:
          !!h.trial ||
          String(h.status || h.state || h.phase || '')
            .toLowerCase()
            .includes('trial') ||
          String(h.plan || '').toLowerCase() === 'trial',
        status: (h.status ?? h.state ?? 'paid')?.toLowerCase(),
        invoiceUrl: h.invoiceUrl ?? h.hosted_invoice_url ?? h.url ?? null,
        amountCents: h.amount_cents ?? h.amountCents ?? h.amount ?? h.price?.unit_amount ?? 399,
      }))
    : [];

const sortByCreatedDesc = (a, b) =>
  (b.createdAt ? +new Date(b.createdAt) : 0) - (a.createdAt ? +new Date(a.createdAt) : 0);

const latestRow = (rows) =>
  Array.isArray(rows) && rows.length ? [...rows].sort(sortByCreatedDesc)[0] : null;

/* ------------------------------- small UI ------------------------------ */
const Toggle = ({ checked, onChange, disabled }) => (
  <button
    className={`toggle ${checked ? 'on' : 'off'}`}
    onClick={() => onChange(!checked)}
    disabled={disabled}
    aria-pressed={checked}
    style={{
      width: 54,
      height: 30,
      borderRadius: 20,
      border: '1px solid var(--border-color, #ddd)',
      background: checked ? 'var(--primary-color, #0ea5a4)' : '#e5e7eb',
      position: 'relative',
      transition: 'background 120ms',
    }}
  >
    <span
      style={{
        position: 'absolute',
        top: 3,
        left: checked ? 28 : 3,
        width: 24,
        height: 24,
        borderRadius: 12,
        background: 'white',
        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        transition: 'left 120ms',
      }}
    />
  </button>
);

const BillingHistoryTable = ({ history }) => {
  if (!history || history.length === 0)
    return <div className="empty-history-message">No billing history found.</div>;
  return (
    <div className="billing-history-table">
      <h3>Billing History</h3>
      <table className="history-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>End date</th>
            <th>Plan</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {history.map((r, i) => (
            <tr key={r.createdAt || i}>
              <td>{fmtDate(r.createdAt)}</td>
              <td>{fmtDate(r.endDate)}</td>
              <td style={{ textTransform: 'capitalize' }}>
                {r.isTrial ? 'Trial' : `${r.planRaw} Plan`}
              </td>
              <td>{centsToUSD(r.amountCents)}</td>
              <td>
                <span className={`status-badge status-${r.status}`}>{r.status}</span>
              </td>
              <td>
                {r.invoiceUrl ? (
                  <a className="btn-text" href={r.invoiceUrl} target="_blank" rel="noreferrer">
                    View invoice
                  </a>
                ) : (
                  <button
                    className="btn-text"
                    onClick={() => alert('Invoice download coming soon!')}
                  >
                    View invoice
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ------------------------------- main screen ------------------------------ */
export default function SubscriptionScreen() {
  const {
    goBack,
    showNotification,
    subscription,
    setSubscription,
    subscriptionHistory,
    setSubscriptionHistory,
  } = useContext(AppContext);

  const [isToggling, setIsToggling] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const historyRows = useMemo(() => normalizeHistory(subscriptionHistory), [subscriptionHistory]);
  const last = useMemo(() => latestRow(historyRows), [historyRows]);

  // Trial label driven by latest history row already prefetched
  const isTrialActive = useMemo(() => {
    if (!last) return false;
    if (!last.isTrial) return false;
    return !last.endDate || new Date(last.endDate) >= new Date();
  }, [last]);

  // Renewal is ON iff cancelAtPeriodEnd is false
  const renewalEnabled = !(subscription?.cancelAtPeriodEnd ?? false);

  const planLabel = useMemo(() => {
    if (isTrialActive) return 'Trial';
    const p = subscription?.plan;
    if (p) return p.charAt(0).toUpperCase() + p.slice(1);
    const fromHist = last?.planRaw
      ? last.planRaw.charAt(0).toUpperCase() + last.planRaw.slice(1)
      : 'Monthly';
    return fromHist;
  }, [isTrialActive, subscription?.plan, last]);

  const nextDateIso =
    subscription?.endDate ||
    subscription?.current_period_end ||
    subscription?.currentPeriodEnd ||
    subscription?.periodEnd ||
    subscription?.renewalDate ||
    last?.endDate;

  const nextDateText = fmtDate(nextDateIso);
  const nextLabel = renewalEnabled ? 'Next renewal' : 'Ends on'; // <-- key change

  const toggleRenewal = async (wantEnabled) => {
    if (isToggling) return;
    const already = renewalEnabled === wantEnabled;
    if (already) return;

    setIsToggling(true);
    try {
      const updated = await api.updateSubscriptionStatus({ cancelAtPeriodEnd: !wantEnabled });

      // Apply minimal local update so UI reflects immediately
      setSubscription((prev) => ({
        ...prev,
        ...updated,
        cancelAtPeriodEnd:
          updated?.cancelAtPeriodEnd ?? updated?.cancel_at_period_end ?? !wantEnabled,
        endDate:
          updated?.endDate ??
          updated?.current_period_end ??
          updated?.currentPeriodEnd ??
          updated?.periodEnd ??
          updated?.renewalDate ??
          prev?.endDate ??
          null,
      }));

      showNotification({
        type: 'success',
        message: wantEnabled ? 'Renewal has been enabled.' : 'Renewal has been canceled.',
      });
    } catch (e) {
      console.error(e);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Could not update renewal setting.',
      });
    } finally {
      setIsToggling(false);
    }
  };

  const startTrial = async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      const created = await api.createSubscription({ plan: 'monthly', trial: true });
      setSubscription((prev) => ({
        ...prev,
        ...created,
        cancelAtPeriodEnd: created?.cancelAtPeriodEnd ?? created?.cancel_at_period_end ?? false,
      }));

      if (!Array.isArray(subscriptionHistory) || subscriptionHistory.length === 0) {
        try {
          const hist = await api.getSubscriptionHistory();
          setSubscriptionHistory(Array.isArray(hist) ? hist : []);
        } catch {}
      }

      showNotification({
        type: 'success',
        title: 'Subscribed',
        message: 'Your trial has started.',
      });
    } catch (e) {
      console.error(e);
      showNotification({ type: 'error', title: 'Error', message: 'Could not start trial.' });
    } finally {
      setIsStarting(false);
    }
  };

  const hasSub =
    typeof subscription?.cancelAtPeriodEnd === 'boolean' || !!subscription?.endDate || !!last;

  return (
    <div className="screen active" id="subscription-screen">
      <nav className="simple-nav">
        <button className="btn-icon back-button" onClick={goBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h2>Subscription</h2>
      </nav>

      <div className="content-wrapper subscription-page-content">
        <div className="subscription-container">
          {hasSub ? (
            <>
              <div className="subscription-grid">
                <div className="status-column">
                  <div className="sub-status-card-pro">
                    <div
                      className={`sub-badge ${renewalEnabled ? 'status-active' : 'status-canceled'}`}
                    >
                      {renewalEnabled ? 'Active' : 'Renewal Off'}
                    </div>

                    <div className="sub-details">
                      <p>
                        <strong>Plan:</strong>{' '}
                        <span style={{ textTransform: 'capitalize' }}>
                          {planLabel === 'Trial' ? 'Trial' : `${planLabel} Plan`}
                        </span>
                      </p>
                      <p>
                        <strong>{nextLabel}:</strong> {nextDateText}
                      </p>
                    </div>

                    <div
                      className="sub-actions"
                      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <span style={{ fontWeight: 600 }}>Renewal</span>
                      <Toggle
                        checked={renewalEnabled}
                        onChange={toggleRenewal}
                        disabled={isToggling}
                      />
                      {isToggling && (
                        <FontAwesomeIcon icon={faSpinner} spin style={{ marginLeft: 8 }} />
                      )}
                    </div>
                  </div>
                </div>

                <div className="payment-column">
                  <div className="payment-methods-card">
                    <h4>Payment methods</h4>
                    <button
                      className="btn-text"
                      onClick={() =>
                        showNotification({
                          type: 'info',
                          message: 'Payment method management is coming soon!',
                        })
                      }
                    >
                      Add payment method
                    </button>
                  </div>
                </div>
              </div>

              <BillingHistoryTable history={historyRows} />
            </>
          ) : (
            <>
              <div className="no-subscription-card-pro">
                <div className="plan-header">
                  <div className="plan-title-group">
                    <div className="sub-badge status-none">No Active Subscription</div>
                    <h2>FamVax Premium</h2>
                  </div>
                  <div className="plan-price-group">
                    <div className="plan-price">$3.99/mo</div>
                    <div className="plan-trial">7-day free trial available</div>
                  </div>
                </div>
                <div className="plan-actions">
                  <button
                    className="btn btn-primary btn-large"
                    onClick={startTrial}
                    disabled={isStarting}
                  >
                    {isStarting ? (
                      <FontAwesomeIcon icon={faSpinner} spin />
                    ) : (
                      'Start 7-Day Free Trial'
                    )}
                  </button>
                </div>
                <p className="plan-footer-note">
                  Cancel anytime.{' '}
                  <span className="light-text">No charges until your trial ends.</span>
                </p>
              </div>

              <div className="benefits-card">
                <h3>Benefits</h3>
                <ul className="benefits-list">
                  <li>
                    <FontAwesomeIcon icon={faCheckCircle} /> Unlimited family members
                  </li>
                  <li>
                    <FontAwesomeIcon icon={faCheckCircle} /> Unlimited AI document scans
                  </li>
                  <li>
                    <FontAwesomeIcon icon={faCheckCircle} /> Securely share profiles
                  </li>
                  <li>
                    <FontAwesomeIcon icon={faCheckCircle} /> Travel vaccine suggestions
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
