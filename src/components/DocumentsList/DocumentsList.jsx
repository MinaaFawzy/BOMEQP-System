import { FileText } from 'lucide-react';
import DocumentItem from '../DocumentItem/DocumentItem';
import './DocumentsList.css';

const DocumentsList = ({ documents, title = 'Documents' }) => {
  if (!documents || documents.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="documents-header">
        <FileText size={18} className="documents-header-icon" />
        {title}
      </p>
      <div className="documents-list">
        {documents.map((doc, index) => (
          <DocumentItem key={index} document={doc} index={index} />
        ))}
      </div>
    </div>
  );
};

export default DocumentsList;

