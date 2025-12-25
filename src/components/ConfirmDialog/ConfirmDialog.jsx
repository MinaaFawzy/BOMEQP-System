import { AlertTriangle } from 'lucide-react';
import Button from '../Button/Button';
import './ConfirmDialog.css';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', cancelText = 'Cancel', variant = 'danger' }) => {
  if (!isOpen) return null;

  const buttonVariant = variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'primary';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-scale-in">
        <div className="p-6">
          <div className="flex items-center mb-4 animate-slide-down">
            <div className={`p-3 rounded-full ${
              variant === 'danger' ? 'bg-red-100' : variant === 'warning' ? 'bg-yellow-100' : 'bg-primary-100'
            } mr-4 animate-pulse`}>
              <AlertTriangle className={`${
                variant === 'danger' ? 'text-red-600' : variant === 'warning' ? 'text-yellow-600' : 'text-primary-600'
              }`} size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          </div>
          <p className="text-gray-600 mb-6 ml-16 animate-fade-in">{message}</p>
          <div className="flex justify-end space-x-3 animate-slide-up">
            <Button
              variant="outline"
              onClick={onClose}
            >
              {cancelText}
            </Button>
            <Button
              variant={buttonVariant}
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
