import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import {
    CreditCard, Edit2, Plus, CheckCircle, XCircle,
    ToggleLeft, ToggleRight, AlertCircle, Image as ImageIcon,
    Layers, Calendar, Hash, FileText,
} from 'lucide-react';
import './TraineeCardTemplateScreen.css';

const TraineeCardTemplateScreen = () => {
    const navigate = useNavigate();
    const { setHeaderTitle, setHeaderSubtitle, setHeaderActions } = useHeader();

    const [cardTemplate, setCardTemplate] = useState(null);   // the one ACC card (first found)
    const [firstTemplateId, setFirstTemplateId] = useState(null); // fallback when no card yet
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toggling, setToggling] = useState(false);

    // ──────────────────────────────
    // Header
    // ──────────────────────────────
    useEffect(() => {
        setHeaderTitle('Trainee Card Template');
        setHeaderSubtitle('Design the wallet-sized ID card that appears on every certificate PDF');
        setHeaderActions(null);
        return () => {
            setHeaderTitle(null);
            setHeaderSubtitle(null);
            setHeaderActions(null);
        };
    }, [setHeaderTitle, setHeaderSubtitle, setHeaderActions]);

    // ──────────────────────────────
    // Load – use the dedicated card-template endpoint
    // ──────────────────────────────
    useEffect(() => {
        loadCard();
    }, []);

    const loadCard = async () => {
        setLoading(true);
        setError(null);
        try {
            // First: check for existing card designs
            const cardData = await accAPI.getCardTemplates();
            const list = cardData.card_templates || cardData.templates || cardData.data || [];

            if (Array.isArray(list) && list.length > 0) {
                setCardTemplate(list[0]);
            } else {
                setCardTemplate(null);
                // No card yet — fetch first certificate template for direct navigation
                const certData = await accAPI.listCertificateTemplates({ per_page: 1 });
                const certList = certData.data || certData.templates || [];
                if (Array.isArray(certList) && certList.length > 0) {
                    setFirstTemplateId(certList[0].id);
                }
            }
        } catch (err) {
            console.error('Failed to load card template:', err);
            setError('Failed to load card template. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ──────────────────────────────
    // Toggle include_card
    // ──────────────────────────────
    const handleToggle = async () => {
        if (!cardTemplate || toggling) return;
        setToggling(true);
        try {
            await accAPI.updateCardSettings(cardTemplate.id, { include_card: !cardTemplate.include_card });
            setCardTemplate(prev => ({ ...prev, include_card: !prev.include_card }));
        } catch (err) {
            console.error('Toggle failed:', err);
            alert('Failed to update card setting. Please try again.');
        } finally {
            setToggling(false);
        }
    };

    // ──────────────────────────────
    // Navigate to designer
    // ──────────────────────────────
    const handleDesign = () => {
        if (!cardTemplate) return;
        navigate(`/acc/certificate-templates/${cardTemplate.id}/card-design`);
    };

    // ──────────────────────────────
    // Helpers
    // ──────────────────────────────
    const hasDesign = (t) => !!(t?.card_template_html || t?.card_background_image_url || t?.card_config_json);

    const countElements = (t) => {
        if (!t?.card_config_json) return 0;
        const cfg = t.card_config_json;
        return Array.isArray(cfg) ? cfg.length : (cfg?.elements?.length || 0);
    };

    // ──────────────────────────────
    // Loading
    // ──────────────────────────────
    if (loading) {
        return (
            <div className="tct-center">
                <div className="tct-spinner" />
                <p className="tct-muted">Loading card template…</p>
            </div>
        );
    }

    // ──────────────────────────────
    // Error
    // ──────────────────────────────
    if (error) {
        return (
            <div className="tct-center">
                <AlertCircle size={36} className="text-red-400 mb-3" />
                <p className="tct-error-text">{error}</p>
                <button onClick={loadCard} className="tct-btn tct-btn-primary mt-4">Retry</button>
            </div>
        );
    }

    // ──────────────────────────────
    // No card yet – pick a template
    // ──────────────────────────────
    if (!cardTemplate) {
        return (
            <div className="tct-no-card-page">
                <div className="tct-no-card-hero">
                    {/* Decorative card mockup */}
                    <div className="tct-mockup-card">
                        <div className="tct-mockup-stripe" />
                        <div className="tct-mockup-avatar" />
                        <div className="tct-mockup-lines">
                            <div className="tct-mockup-line" style={{ width: '60%' }} />
                            <div className="tct-mockup-line" style={{ width: '45%' }} />
                            <div className="tct-mockup-line" style={{ width: '30%' }} />
                        </div>
                        <div className="tct-mockup-qr" />
                    </div>
                </div>

                <h2 className="tct-no-card-title">No Card Design Yet</h2>
                <p className="tct-no-card-desc">
                    Your ACC doesn't have a trainee card design yet. Click below to open the
                    card designer and create one now.
                </p>

                {firstTemplateId ? (
                    <button
                        onClick={() => navigate(`/acc/certificate-templates/${firstTemplateId}/card-design`)}
                        className="tct-btn tct-btn-primary tct-btn-lg"
                    >
                        <CreditCard size={20} />
                        Go To Card Template Design
                    </button>
                ) : (
                    <div className="tct-center">
                        <p className="tct-no-card-desc">
                            No certificate templates found. Please create a certificate template first.
                        </p>
                        <button
                            onClick={() => navigate('/acc/certificate-templates')}
                            className="tct-btn tct-btn-primary tct-btn-lg mt-2"
                        >
                            <FileText size={20} />
                            Go to Certificate Templates
                        </button>
                    </div>
                )}

                <div className="tct-how-it-works">
                    <p className="tct-hiw-title">How it works</p>
                    <ol className="tct-hiw-list">
                        <li>Click <strong>Go To Card Template Design</strong> to open the card canvas.</li>
                        <li>Upload a card background (CR80 wallet size) and drag elements onto the canvas.</li>
                        <li>Save — the card design will appear on this page.</li>
                        <li>Toggle <strong>Include Card</strong> to attach it to every certificate PDF.</li>
                    </ol>
                </div>
            </div>
        );
    }

    // ──────────────────────────────
    // Card exists — show overview
    // ──────────────────────────────
    const elCount = countElements(cardTemplate);
    const designed = hasDesign(cardTemplate);

    return (
        <div className="tct-overview-page">

            {/* ── Top info banner ── */}
            <div className="tct-banner">
                <Layers size={18} className="flex-shrink-0" />
                <span>
                    This card is appended as <strong>page 2</strong> to every certificate PDF when
                    {' '}<strong>Include Card</strong> is enabled.
                </span>
            </div>

            {/* ── Main card ── */}
            <div className="tct-main-card">

                {/* Preview panel */}
                <div className="tct-preview-panel">
                    {cardTemplate.card_background_image_url ? (
                        <img
                            src={cardTemplate.card_background_image_url}
                            alt="Card background"
                            className="tct-preview-img"
                        />
                    ) : (
                        <div className="tct-preview-empty">
                            <CreditCard size={64} className="tct-preview-empty-icon" />
                            <span>No background image</span>
                        </div>
                    )}

                    {/* Status chip */}
                    <div className={`tct-chip ${designed ? 'tct-chip-green' : 'tct-chip-gray'}`}>
                        {designed ? <CheckCircle size={13} /> : <XCircle size={13} />}
                        {designed ? 'Design configured' : 'No design yet'}
                    </div>
                </div>

                {/* Info panel */}
                <div className="tct-info-panel">
                    <div className="tct-info-header">
                        <div>
                            <h2 className="tct-template-name">{cardTemplate.name}</h2>
                            <p className="tct-template-sub">
                                Certificate Template #{cardTemplate.id}
                                &nbsp;·&nbsp;
                                <span className="capitalize">{cardTemplate.template_type || 'course'}</span>
                            </p>
                        </div>
                        <span className={`tct-status-badge ${cardTemplate.status === 'active' ? 'tct-badge-active' : 'tct-badge-inactive'}`}>
                            {cardTemplate.status?.toUpperCase()}
                        </span>
                    </div>

                    {/* Stats row */}
                    <div className="tct-stats-row">
                        <div className="tct-stat">
                            <Layers size={16} />
                            <span><strong>{elCount}</strong> element{elCount !== 1 ? 's' : ''}</span>
                        </div>
                        {cardTemplate.updated_at && (
                            <div className="tct-stat">
                                <Calendar size={16} />
                                <span>Updated {new Date(cardTemplate.updated_at).toLocaleDateString()}</span>
                            </div>
                        )}
                        <div className="tct-stat">
                            <Hash size={16} />
                            <span>ID {cardTemplate.id}</span>
                        </div>
                    </div>

                    {/* Include card toggle */}
                    <div className="tct-toggle-box">
                        <div>
                            <p className="tct-toggle-title">Include Card in PDF</p>
                            <p className="tct-toggle-hint">
                                {cardTemplate.include_card
                                    ? 'Enabled — PDFs will have 2 pages (certificate + card).'
                                    : 'Disabled — PDFs are single-page (card design is saved but not printed).'}
                            </p>
                        </div>
                        <button
                            onClick={handleToggle}
                            disabled={toggling}
                            className={`tct-toggle-btn ${cardTemplate.include_card ? 'tct-toggle-on' : 'tct-toggle-off'}`}
                        >
                            {toggling ? (
                                <span className="tct-spin-sm" />
                            ) : cardTemplate.include_card ? (
                                <ToggleRight size={32} />
                            ) : (
                                <ToggleLeft size={32} />
                            )}
                        </button>
                    </div>

                    {/* Action buttons */}
                    <div className="tct-actions">
                        <button
                            onClick={handleDesign}
                            className="tct-btn tct-btn-primary tct-btn-lg"
                        >
                            {designed ? <Edit2 size={20} /> : <Plus size={20} />}
                            {designed ? 'Edit Card Design' : 'Create Card Design'}
                        </button>

                        <button
                            onClick={() => navigate(`/acc/certificate-templates/${cardTemplate.id}/design`)}
                            className="tct-btn tct-btn-secondary"
                        >
                            <ImageIcon size={18} />
                            Certificate Design
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TraineeCardTemplateScreen;
