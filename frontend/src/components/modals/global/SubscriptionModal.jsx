// frontend/src/components/modals/SubscriptionModal.jsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';
import api from '../../../api/apiService.js';

function SubscriptionModal({ onClose, onSuccess }) {
  const [selectedPlan, setSelectedPlan] = useState('monthly'); // 'monthly' or 'yearly'
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProceed = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    try {
      const endDate = new Date();
      if (selectedPlan === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const subscriptionData = {
        plan: selectedPlan,
        endDate: endDate.toISOString().split('T')[0],
      };

      await api.createSubscription(subscriptionData);
      onSuccess();
    } catch (error) {
      console.error('Subscription failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-content" style={{ maxWidth: '550px' }}>
      <div className="modal-header">
        <h3>Choose Your Plan</h3>
        <button className="btn-icon modal-close" onClick={onClose} disabled={isProcessing}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      <div className="modal-body" style={{ minHeight: 'auto' }}>
        <div className="plan-selection-container">
          <button
            className={`plan-option ${selectedPlan === 'monthly' ? 'active' : ''}`}
            onClick={() => setSelectedPlan('monthly')}
          >
            <span className="plan-title">Monthly</span>
            <span className="plan-price">$3.99 / month</span>
            <span className="plan-desc">Billed every month</span>
          </button>
          <button
            className={`plan-option ${selectedPlan === 'yearly' ? 'active' : ''}`}
            onClick={() => setSelectedPlan('yearly')}
          >
            <span className="plan-badge">Save 25%</span>
            <span className="plan-title">Yearly</span>
            <span className="plan-price">$35.99 / year</span>
            <span className="plan-desc">Billed annually</span>
          </button>
        </div>
      </div>
      <div className="modal-footer">
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={handleProceed}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin /> Processing...
            </>
          ) : (
            'Proceed to Payment'
          )}
        </button>
      </div>
    </div>
  );
}

export default SubscriptionModal;
