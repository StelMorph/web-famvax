import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function StatCard({ icon, title, count, colorClass }) {
    return (
        <div className="stat-card">
            <div className="stat-info">
                <span className="stat-title">{title}</span>
                <span className="stat-count">{count}</span>
            </div>
            <div className={`stat-icon ${colorClass}`}>
                <FontAwesomeIcon icon={icon} />
            </div>
        </div>
    );
}

export default StatCard;