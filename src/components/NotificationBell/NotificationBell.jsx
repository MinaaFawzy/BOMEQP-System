import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Trash2, CheckCheck } from 'lucide-react';
import { useNotificationsContext } from '../../context/NotificationsContext';
import { useTranslation } from '../../hooks/useTranslation';
import './NotificationBell.css';

const NotificationBell = () => {
  const { t } = useTranslation('notifications');
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    fetchNotifications,
  } = useNotificationsContext();

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 400;
      const maxDropdownWidth = window.innerWidth - 32;
      const actualDropdownWidth = Math.min(dropdownWidth, maxDropdownWidth);

      const isRTL = document.dir === 'rtl' || document.body.dir === 'rtl';

      if (isRTL) {
        // RTL: Align left edge or ensuring it stays on screen
        let leftPosition = buttonRect.left;

        // If it overflows right edge
        if (leftPosition + actualDropdownWidth > window.innerWidth - 16) {
          leftPosition = window.innerWidth - actualDropdownWidth - 16;
        }

        // Ensure minimum margin from left
        if (leftPosition < 16) {
          leftPosition = 16;
        }

        setDropdownPosition({
          top: buttonRect.bottom + 12,
          left: leftPosition,
          right: 'auto',
        });
      } else {
        // LTR: Align right edge
        let rightPosition = window.innerWidth - buttonRect.right;
        if (rightPosition + actualDropdownWidth > window.innerWidth - 16) {
          rightPosition = 16; // Minimum margin from screen edge
        }

        setDropdownPosition({
          top: buttonRect.bottom + 12,
          right: rightPosition,
          left: 'auto',
        });
      }

      // Refresh notifications when opening dropdown (only if not already loading)
      if (!loading) {
        fetchNotifications({}, 1, 15);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleDeleteAllRead = async () => {
    try {
      await deleteAllRead();
    } catch (error) {
      console.error('Failed to delete all read notifications:', error);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return t('time.just_now');
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return t('time.minutes_ago', { minutes });
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return t('time.hours_ago', { hours });
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return t('time.days_ago', { days });
    } else {
      return date.toLocaleDateString();
    }
  };

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  return (
    <>
      <div className="notification-bell-container" ref={buttonRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="notification-bell-button"
          aria-label="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>
      </div>

      {isOpen && (
        <div
          className="notification-dropdown"
          ref={dropdownRef}
          style={{
            top: `${dropdownPosition.top}px`,
            right: dropdownPosition.right === 'auto' ? 'auto' : `${dropdownPosition.right}px`,
            left: dropdownPosition.left === 'auto' ? 'auto' : `${dropdownPosition.left}px`,
          }}
        >
          <div className="notification-header">
            <h3 className="notification-title">{t('title')}</h3>
            <div className="notification-actions">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="notification-action-btn"
                  title={t('actions.mark_all_read')}
                >
                  <CheckCheck size={16} />
                </button>
              )}
              {readNotifications.length > 0 && (
                <button
                  onClick={handleDeleteAllRead}
                  className="notification-action-btn"
                  title={t('actions.delete_all_read')}
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="notification-action-btn"
                title={t('actions.close')}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="notification-list">
            {loading && notifications.length === 0 ? (
              <div className="notification-empty">
                <div className="notification-loading">{t('loading')}</div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={48} className="notification-empty-icon" />
                <p className="notification-empty-text">{t('empty')}</p>
              </div>
            ) : (
              <>
                {unreadNotifications.length > 0 && (
                  <div className="notification-section">
                    <div className="notification-section-header">{t('sections.unread')}</div>
                    {unreadNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="notification-item unread"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="notification-item-content">
                          <div className="notification-item-header">
                            <h4 className="notification-item-title">{notification.title}</h4>
                            <button
                              onClick={(e) => handleDeleteNotification(e, notification.id)}
                              className="notification-delete-btn"
                              title={t('actions.delete')}
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <p className="notification-item-message">{notification.message}</p>
                          <div className="notification-item-footer">
                            <span className="notification-item-time">
                              {formatTime(notification.created_at)}
                            </span>
                            <div className="notification-item-actions">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="notification-item-action"
                                title={t('actions.mark_as_read')}
                              >
                                <Check size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="notification-indicator"></div>
                      </div>
                    ))}
                  </div>
                )}

                {readNotifications.length > 0 && (
                  <div className="notification-section">
                    <div className="notification-section-header">{t('sections.read')}</div>
                    {readNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="notification-item"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="notification-item-content">
                          <div className="notification-item-header">
                            <h4 className="notification-item-title">{notification.title}</h4>
                            <button
                              onClick={(e) => handleDeleteNotification(e, notification.id)}
                              className="notification-delete-btn"
                              title={t('actions.delete')}
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <p className="notification-item-message">{notification.message}</p>
                          <div className="notification-item-footer">
                            <span className="notification-item-time">
                              {formatTime(notification.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationBell;

