import React, { useState, useRef, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEnvelope, faPlus, faTimes, faChevronRight } from '@fortawesome/free-solid-svg-icons';

// ... (Rest of component is fine, this file just needed the context path fixed)
const FAQItem = ({ faq, isActive, onToggle }) => {
    const contentRef = useRef(null);
    return (
        <div className="faq-item">
            <button className="faq-question" onClick={onToggle}>
                <span>{faq.question}</span>
                <FontAwesomeIcon icon={isActive ? faTimes : faPlus} className="faq-icon" />
            </button>
            <div ref={contentRef} className="faq-answer-wrapper" style={{ maxHeight: isActive ? `${contentRef.current.scrollHeight}px` : '0px' }}>
                <div className="faq-answer"><p>{faq.answer}</p></div>
            </div>
        </div>
    );
};

function HelpCenterScreen() {
    const { goBack, showNotification } = useContext(AppContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeIndex, setActiveIndex] = useState(null);

    const faqs = [
        { question: 'How do I add a family member?', answer: 'Go to the "My Family" tab and tap the "+ Add Member" button. From there, you can either scan a document with AI (Premium feature) or enter the details manually.' },
        { question: 'How does profile sharing work?', answer: 'Navigate to a profile you own, tap the share icon, enter the recipient\'s email, and choose a role. Sharing requires a premium subscription.' },
        { question: 'Is my data secure?', answer: 'Yes. All data is encrypted both in transit and at rest in our secure cloud database. We never sell your personal health information.' },
    ];
    
    const handleAskAI = (e) => {
        e.preventDefault();
        showNotification({type: 'info', title: 'AI Assistant', message: `Asking AI: "${searchTerm}" (This is a placeholder).`});
        setSearchTerm('');
    };
    
    const handleContactSupport = () => window.location.href = "mailto:support@example.com";
    
    return (
        <div className="screen active" id="help-center-screen">
            <nav className="simple-nav"><button className="btn-icon back-button" onClick={goBack}><FontAwesomeIcon icon={faArrowLeft} /></button><h2>Help Center</h2></nav>
            <div className="content-wrapper settings-list">
                <h3>AI Assistant</h3>
                <form onSubmit={handleAskAI} className="ai-assistant-form">
                    <div className="form-group"><input type="text" placeholder="Ask a question..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                    <button type="submit" className="btn btn-primary" style={{width: '100%'}}>Ask AI</button>
                </form>

                <h3 style={{marginTop: '40px'}}>Frequently Asked Questions</h3>
                <div className="faq-list">
                   {faqs.map((faq, index) => <FAQItem key={index} faq={faq} isActive={activeIndex === index} onToggle={() => setActiveIndex(activeIndex === index ? null : index)} />)}
                </div>

                <h3>Contact Support</h3>
                <div className="settings-item" onClick={handleContactSupport}>
                    <FontAwesomeIcon icon={faEnvelope} className="settings-icon" />
                    <span className="settings-item-label">Email Support</span>
                    <FontAwesomeIcon icon={faChevronRight} className="arrow-icon" />
                </div>
            </div>
        </div>
    );
}

export default HelpCenterScreen;