import { FileText, Download } from 'lucide-react';
import './DocumentItem.css';

const DocumentItem = ({ document, index }) => {
  return (
    <div className="document-item">
      <div className="document-content">
        <FileText size={20} className="document-icon" />
        <div className="document-info">
          <p className="document-name">
            {document.type ? document.type.charAt(0).toUpperCase() + document.type.slice(1) : `Document ${index + 1}`}
          </p>
          {document.file_name && (
            <p className="document-filename">{document.file_name}</p>
          )}
        </div>
      </div>
      {document.file_url && (
        <a
          href={document.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="document-download"
          title="Download document"
        >
          <Download size={18} />
        </a>
      )}
    </div>
  );
};

export default DocumentItem;

