import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { useTranslation } from '../../../hooks/useTranslation';
import {
    CreditCard, Edit2, Plus, CheckCircle, XCircle,
    AlertCircle, Image as ImageIcon,
    Layers, Calendar, FileText,
} from 'lucide-react';
import './TraineeCardTemplateScreen.css';

const TraineeCardTemplateScreen = () => {
    const navigate = useNavigate();
    const { setHeaderTitle, setHeaderSubtitle, setHeaderActions } = useHeader();
    const { t } = useTranslation('accreditation');

    const [cardTemplate, setCardTemplate] = useState(null);   // the one ACC card (first found)
    const [firstTemplateId, setFirstTemplateId] = useState(null); // fallback when no card yet
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toggling, setToggling] = useState(false);

    // ──────────────────────────────
    // Header
    // ──────────────────────────────
    useEffect(() => {
        setHeaderTitle(t('trainee_card_template.header.title'));
        setHeaderSubtitle(t('trainee_card_template.header.subtitle'));
        setHeaderActions(null);
        return () => {
            setHeaderTitle(null);
            setHeaderSubtitle(null);
            setHeaderActions(null);
        };
    }, [setHeaderTitle, setHeaderSubtitle, setHeaderActions, t]);

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
            setError(t('trainee_card_template.error.load_failed'));
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
            alert(t('trainee_card_template.messages.toggle_failed'));
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
                <p className="tct-muted">{t('trainee_card_template.loading')}</p>
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
                <button onClick={loadCard} className="tct-btn tct-btn-primary mt-4">{t('trainee_card_template.error.retry')}</button>
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

                <h2 className="tct-no-card-title">{t('trainee_card_template.no_card.title')}</h2>
                <p className="tct-no-card-desc">
                    {t('trainee_card_template.no_card.description')}
                </p>

                {firstTemplateId ? (
                    <button
                        onClick={() => navigate(`/acc/certificate-templates/${firstTemplateId}/card-design`)}
                        className="tct-btn tct-btn-primary tct-btn-lg"
                    >
                        <CreditCard size={20} />
                        {t('trainee_card_template.no_card.go_to_design')}
                    </button>
                ) : (
                    <div className="tct-center">
                        <p className="tct-no-card-desc">
                            {t('trainee_card_template.no_card.no_cert_templates')}
                        </p>
                        <button
                            onClick={() => navigate('/acc/certificate-templates')}
                            className="tct-btn tct-btn-primary tct-btn-lg mt-2"
                        >
                            <FileText size={20} />
                            {t('trainee_card_template.no_card.go_to_cert_templates')}
                        </button>
                    </div>
                )}

                <div className="tct-how-it-works">
                    <p className="tct-hiw-title">{t('trainee_card_template.no_card.how_it_works')}</p>
                    <ol className="tct-hiw-list">
                        <li dangerouslySetInnerHTML={{ __html: t('trainee_card_template.no_card.step_1') }} />
                        <li>{t('trainee_card_template.no_card.step_2')}</li>
                        <li>{t('trainee_card_template.no_card.step_3')}</li>
                        <li dangerouslySetInnerHTML={{ __html: t('trainee_card_template.no_card.step_4') }} />
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
                <span dangerouslySetInnerHTML={{ __html: t('trainee_card_template.banner.text') }} />
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
                            <span>{t('trainee_card_template.preview.no_background')}</span>
                        </div>
                    )}

                    {/* Status chip */}
                    <div className={`tct-chip ${designed ? 'tct-chip-green' : 'tct-chip-gray'}`}>
                        {designed ? <CheckCircle size={13} /> : <XCircle size={13} />}
                        {designed ? t('trainee_card_template.preview.design_configured') : t('trainee_card_template.preview.no_design')}
                    </div>
                </div>

                {/* Info panel */}
                <div className="tct-info-panel">
                    <div className="tct-info-header">
                        <div>
                            <h2 className="tct-template-name">{t('trainee_card_template.info.global_card_title')}</h2>
                            <p className="tct-template-sub">
                                {t('trainee_card_template.info.global_card_subtitle')}
                                &nbsp;·&nbsp;
                                <span>#{cardTemplate.id}</span>
                            </p>
                        </div>
                        <span className={`tct-status-badge ${cardTemplate.status === 'active' ? 'tct-badge-active' : 'tct-badge-inactive'}`}>
                            {cardTemplate.status?.toUpperCase()}
                        </span>
                    </div>

                    {/* Action buttons */}
                    <div className="tct-actions">
                        <button
                            onClick={handleDesign}
                            className="tct-btn tct-btn-primary tct-btn-lg"
                        >
                            {designed ? <Edit2 size={20} /> : <Plus size={20} />}
                            {designed ? t('trainee_card_template.actions.edit_design') : t('trainee_card_template.actions.create_design')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TraineeCardTemplateScreen;
