import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { notificationsAPI } from '../services/api';

const NotificationsContext = createContext(null);

export const useNotificationsContext = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotificationsContext must be used within a NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    perPage: 15,
    total: 0,
  });

  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async (filters = {}, page = 1, perPage = 15) => {
    // Prevent concurrent duplicate requests
    if (isFetchingRef.current) {
      console.log('🔄 Notifications fetch already in progress, skipping duplicate request');
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        ...filters,
        page,
        per_page: perPage,
      };
      
      const response = await notificationsAPI.getNotifications(params);
      
      if (response.success) {
        const notificationsList = response.notifications || [];
        setNotifications(notificationsList);
        setUnreadCount(response.unread_count || 0);
        
        if (response.pagination) {
          setPagination({
            currentPage: response.pagination.current_page || page,
            lastPage: response.pagination.last_page || 1,
            perPage: response.pagination.per_page || perPage,
            total: response.pagination.total || 0,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Fetch unread count only
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.unread_count || 0);
      }
    } catch (err) {
      // Silently fail
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (id) => {
    try {
      const response = await notificationsAPI.markAsRead(id);
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === id 
              ? { ...n, is_read: true, read_at: response.notification?.read_at || new Date().toISOString() }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark as read:', err);
      throw err;
    }
  }, []);

  // Mark notification as unread
  const markAsUnread = useCallback(async (id) => {
    try {
      const response = await notificationsAPI.markAsUnread(id);
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === id 
              ? { ...n, is_read: false, read_at: null }
              : n
          )
        );
        setUnreadCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Failed to mark as unread:', err);
      throw err;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await notificationsAPI.markAllAsRead();
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      throw err;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (id) => {
    try {
      const response = await notificationsAPI.deleteNotification(id);
      if (response.success) {
        setNotifications(prev => {
          const notification = prev.find(n => n.id === id);
          const wasUnread = notification && !notification.is_read;
          const filtered = prev.filter(n => n.id !== id);
          if (wasUnread) {
            setUnreadCount(prevCount => Math.max(0, prevCount - 1));
          }
          return filtered;
        });
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
      throw err;
    }
  }, []);

  // Delete all read notifications
  const deleteAllRead = useCallback(async () => {
    try {
      const response = await notificationsAPI.deleteAllRead();
      if (response.success) {
        setNotifications(prev => prev.filter(n => !n.is_read));
      }
    } catch (err) {
      console.error('Failed to delete all read notifications:', err);
      throw err;
    }
  }, []);

  // Fetch notifications only once on mount (when page loads or reloads)
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchNotifications({}, 1, 15);
    }
  }, [fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    pagination,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    refresh: () => fetchNotifications({}, pagination.currentPage, pagination.perPage),
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

